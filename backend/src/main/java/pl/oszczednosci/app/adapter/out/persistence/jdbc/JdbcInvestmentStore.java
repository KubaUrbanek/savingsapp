package pl.oszczednosci.app.adapter.out.persistence.jdbc;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.function.UnaryOperator;
import org.h2.jdbcx.JdbcConnectionPool;
import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.DatabaseFactory;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import pl.oszczednosci.app.adapter.out.persistence.InvestmentBackupValidator;
import pl.oszczednosci.app.adapter.out.persistence.json.InvestmentBackupJsonCodec;
import pl.oszczednosci.app.application.exception.PersistenceException;
import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*;
import tools.jackson.databind.ObjectMapper;

/** Embedded relational storage. A database row lock serializes complete use-case transactions. */
public final class JdbcInvestmentStore implements InvestmentUnitOfWork, InvestmentBackupPort, AutoCloseable {
    private final JdbcConnectionPool pool;
    private final InvestmentBackupJsonCodec codec;

    public JdbcInvestmentStore(ObjectMapper mapper, Path databasePath) {
        codec = new InvestmentBackupJsonCodec(mapper);
        Path path = databasePath.toAbsolutePath().normalize();
        if (path.toString().contains(";")) throw new IllegalArgumentException("Database path cannot contain a semicolon");
        pool = JdbcConnectionPool.create("jdbc:h2:file:" + path + ";WRITE_DELAY=0;DB_CLOSE_ON_EXIT=FALSE", "sa", "");
        try {
            Files.createDirectories(path.getParent());
            try (var connection = pool.getConnection();
                    var resources = new ClassLoaderResourceAccessor();
                    var migrations = new Liquibase("db/changelog/db.changelog-master.xml", resources,
                            DatabaseFactory.getInstance().findCorrectDatabaseImplementation(new JdbcConnection(connection)))) {
                migrations.update(new Contexts(), new LabelExpression());
            }

        } catch (Exception exception) {
            pool.dispose();
            throw new PersistenceException("Unable to initialize investment database", exception);
        }
    }

    @Override public InvestmentBackup snapshot() { return transaction(this::read); }
    @Override public void replaceAll(InvestmentBackup backup) {
        InvestmentBackupValidator.validate(Objects.requireNonNull(backup));
        transaction(connection -> { write(connection, backup); return null; });
    }
    @Override public void update(UnaryOperator<InvestmentBackup> change) {
        Objects.requireNonNull(change);
        transaction(connection -> {
            var changed = Objects.requireNonNull(change.apply(read(connection)));
            InvestmentBackupValidator.validate(changed);
            write(connection, changed);
            return null;
        });
    }
    @Override public byte[] exportBackup() { return codec.serialize(snapshot()); }
    @Override public void importBackup(byte[] document) { replaceAll(codec.parse(document.clone(), true)); }
    @Override public void close() { pool.dispose(); }

    private InvestmentBackup read(Connection connection) throws SQLException {
        try { return readRows(connection); }
        catch (IllegalArgumentException exception) { throw new PersistenceException("Invalid investment database", exception); }
    }

    private InvestmentBackup readRows(Connection connection) throws SQLException {
        var entries = new ArrayList<InvestmentEntry>();
        try (var statement = connection.createStatement(); var rows = statement.executeQuery("SELECT * FROM investment_entries ORDER BY position")) {
            while (rows.next()) entries.add(InvestmentEntry.reconstitute(
                    new InvestmentEntryId(rows.getObject("id", UUID.class)), category(rows), OwnerId.of(rows.getString("owner_id")),
                    Money.zeroOrPositive(rows.getBigDecimal("value_pln")), rows.getObject("valuation_date", java.time.LocalDate.class),
                    rows.getObject("created_at", OffsetDateTime.class).toInstant(), instant(rows, "updated_at")));
        }
        var operations = new ArrayList<InvestmentOperation>();
        try (var statement = connection.createStatement(); var rows = statement.executeQuery("SELECT * FROM investment_operations ORDER BY position")) {
            while (rows.next()) {
                var operation = InvestmentOperation.reconstitute(new InvestmentOperationId(rows.getObject("id", UUID.class)),
                        InvestmentOperationType.valueOf(rows.getString("operation_type")), category(rows), OwnerId.of(rows.getString("owner_id")),
                        Money.zeroOrPositive(rows.getBigDecimal("amount_pln")), Money.zeroOrPositive(rows.getBigDecimal("fee_pln")),
                        Money.zeroOrPositive(rows.getBigDecimal("tax_pln")), rows.getObject("operation_date", java.time.LocalDate.class),
                        rows.getString("note"), rows.getObject("created_at", OffsetDateTime.class).toInstant());
                UUID group = rows.getObject("group_id", UUID.class);
                operations.add(group == null ? operation : operation.withGroup(group));
            }
        }
        var plans = new TreeMap<String, PortfolioPlan>();
        try (var statement = connection.createStatement(); var rows = statement.executeQuery("SELECT * FROM portfolio_plans ORDER BY scope")) {
            while (rows.next()) plans.put(rows.getString("scope"), new PortfolioPlan(rows.getDouble("bonds"), rows.getDouble("stocks"),
                    rows.getDouble("gold"), rows.getDouble("developed"), rows.getDouble("emerging")));
        }
        try {
            var backup = new InvestmentBackup(InvestmentBackup.CURRENT_FORMAT_VERSION, entries, operations, plans);
            InvestmentBackupValidator.validate(backup);
            return backup;
        } catch (IllegalArgumentException exception) { throw new PersistenceException("Invalid investment database", exception); }
    }

    private static java.time.Instant instant(ResultSet rows, String column) throws SQLException {
        var value = rows.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }

    private static AssetCategory category(ResultSet rows) throws SQLException {
        String subcategory = rows.getString("subcategory");
        return AssetCategory.of(InvestmentType.valueOf(rows.getString("asset_type")),
                subcategory == null ? null : InvestmentSubcategory.valueOf(subcategory));
    }

    private void write(Connection connection, InvestmentBackup backup) throws SQLException {
        InvestmentBackupValidator.validate(backup);
        // Preserve the unit-of-work ordering used to replay events with identical timestamps.
        removeMissing(connection, "investment_entries", "id", backup.entries().stream().map(InvestmentEntry::getId).toList());
        removeMissing(connection, "investment_operations", "id", backup.operations().stream().map(InvestmentOperation::getId).toList());
        removeMissing(connection, "portfolio_plans", "scope", new ArrayList<>(backup.plans().keySet()));
        int position = 0;
        try (var statement = connection.prepareStatement("MERGE INTO investment_entries (id,asset_type,owner_id,subcategory,value_pln,valuation_date,created_at,updated_at,position) KEY(id) VALUES (?,?,?,?,?,?,?,?,?)")) {
            for (var entry : backup.entries()) {
                bind(statement, entry.getId(), entry.getType().name(), entry.getOwner().value(), name(entry.getSubcategory()),
                        entry.getValuePln(), entry.getDate(), entry.getCreatedAt().atOffset(ZoneOffset.UTC), entry.getUpdatedAt() == null ? null : entry.getUpdatedAt().atOffset(ZoneOffset.UTC), position++);
                statement.addBatch();
            }
            statement.executeBatch();
        }
        position = 0;
        try (var statement = connection.prepareStatement("MERGE INTO investment_operations (id,operation_type,asset_type,owner_id,subcategory,amount_pln,fee_pln,tax_pln,operation_date,note,created_at,group_id,position) KEY(id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")) {
            for (var operation : backup.operations()) {
                bind(statement, operation.getId(), operation.getOperationType().name(), operation.getType().name(), operation.getOwner().value(),
                        name(operation.getSubcategory()), operation.getAmountPln(), operation.getFeePln(), operation.getTaxPln(), operation.getDate(),
                        operation.getNote(), operation.getCreatedAt().atOffset(ZoneOffset.UTC), operation.getGroupId(), position++);
                statement.addBatch();
            }
            statement.executeBatch();
        }
        try (var statement = connection.prepareStatement("MERGE INTO portfolio_plans (scope,bonds,stocks,gold,developed,emerging) KEY(scope) VALUES (?,?,?,?,?,?)")) {
            for (var entry : backup.plans().entrySet()) {
                var plan = entry.getValue();
                bind(statement, entry.getKey(), plan.bonds(), plan.stocks(), plan.gold(), plan.developed(), plan.emerging());
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static String name(Enum<?> value) { return value == null ? null : value.name(); }
    private static void bind(PreparedStatement statement, Object... values) throws SQLException {
        for (int index = 0; index < values.length; index++) statement.setObject(index + 1, values[index]);
    }
    private static void removeMissing(Connection connection, String table, String key, List<?> retained) throws SQLException {
        var ids = new HashSet<>(retained);
        try (var query = connection.createStatement(); var rows = query.executeQuery("SELECT " + key + " FROM " + table);
                var delete = connection.prepareStatement("DELETE FROM " + table + " WHERE " + key + "=?")) {
            while (rows.next()) if (!ids.contains(rows.getObject(1))) {
                delete.setObject(1, rows.getObject(1)); delete.addBatch();
            }
            delete.executeBatch();
        }
    }

    private <T> T transaction(SqlAction<T> action) {
        try (var connection = pool.getConnection()) {
            connection.setAutoCommit(false);
            try {
                // Every reader and writer participates, so snapshots cannot observe half of a portfolio event.
                try (var statement = connection.createStatement(); var ignored = statement.executeQuery("SELECT id FROM store_state WHERE id=1 FOR UPDATE")) {
                    if (!ignored.next()) throw new SQLException("Missing store lock row");
                }
                T result = action.run(connection);
                connection.commit();
                return result;
            } catch (Exception exception) {
                try { connection.rollback(); } catch (SQLException rollback) { exception.addSuppressed(rollback); }
                if (exception instanceof RuntimeException runtime) throw runtime;
                throw new PersistenceException("Investment database transaction failed", exception);
            }
        } catch (SQLException exception) { throw new PersistenceException("Unable to access investment database", exception); }
    }
    @FunctionalInterface private interface SqlAction<T> { T run(Connection connection) throws Exception; }
}
