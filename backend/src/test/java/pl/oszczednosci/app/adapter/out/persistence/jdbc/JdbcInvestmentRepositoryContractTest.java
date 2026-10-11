package pl.oszczednosci.app.adapter.out.persistence.jdbc;
import pl.oszczednosci.app.adapter.out.persistence.UnitOfWorkInvestmentOperationRepository;
import pl.oszczednosci.app.adapter.out.persistence.UnitOfWorkInvestmentEntryRepository;

import static org.assertj.core.api.Assertions.*;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.*;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import pl.oszczednosci.app.adapter.out.persistence.InvestmentRepositoryContract;
import pl.oszczednosci.app.application.exception.*;
import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*;
import tools.jackson.databind.ObjectMapper;

final class JdbcInvestmentRepositoryContractTest extends InvestmentRepositoryContract {
    @TempDir Path directory;
    private Path file;
    private JdbcInvestmentStore store;
    private UnitOfWorkInvestmentEntryRepository entries;
    private UnitOfWorkInvestmentOperationRepository operations;

    @BeforeEach void createAdapter() {
        file = directory.resolve("portfolio");
        reloadAdapters();
    }

    @Override protected void reloadAdapters() {
        ObjectMapper mapper = new tools.jackson.databind.json.JsonMapper();
        if (store != null) store.close();
        store = new JdbcInvestmentStore(mapper, file);
        entries = new UnitOfWorkInvestmentEntryRepository(store);
        operations = new UnitOfWorkInvestmentOperationRepository(store);
    }
    @Override protected InvestmentEntryRepository entries() { return entries; }
    @Override protected InvestmentOperationRepository operations() { return operations; }
    @Override protected InvestmentBackupPort backups() { return store; }
    @Override protected void makeStorageMalformed() throws Exception { try (var connection = java.sql.DriverManager.getConnection("jdbc:h2:file:" + file, "sa", "");
                var statement = connection.createStatement()) { statement.execute("DROP TABLE investment_entries"); } }
    @Override protected InvestmentEntry entry(UUID id, LocalDate date, Instant created) {
        return InvestmentEntry.create(new InvestmentEntryId(id), AssetCategory.of(InvestmentType.GIELDA,
                InvestmentSubcategory.RYNKI_ROZWINIETE), OwnerId.of("jakub"),
                Money.positive(new BigDecimal("123.45")), date, created);
    }
    @Override protected InvestmentOperation operation(UUID id, LocalDate date, Instant created) {
        return InvestmentOperation.create(new InvestmentOperationId(id), InvestmentOperationType.DEPOSIT,
                AssetCategory.of(InvestmentType.GIELDA, InvestmentSubcategory.RYNKI_ROZWINIETE),
                OwnerId.of("jakub"), Money.positive(BigDecimal.TEN), Money.zeroOrPositive(BigDecimal.ZERO),
                Money.zeroOrPositive(BigDecimal.ZERO), date, "contract", created);
    }

    @AfterEach void closeDatabase() { if (store != null) store.close(); }

    @Test void newDatabaseIgnoresLegacyJsonAndPersistsItsOwnData() throws Exception {
        Files.writeString(directory.resolve("investment-entries.json"), "obsolete or malformed JSON");
        reloadAdapters();
        assertThat(store.snapshot()).isEqualTo(InvestmentBackup.empty());
        var saved = entry(UUID.randomUUID(), LocalDate.of(2025,1,1), Instant.parse("2025-01-01T00:00:00.123456789Z"));
        entries.save(saved);
        reloadAdapters();
        assertThat(store.snapshot().entries()).usingRecursiveComparison().isEqualTo(java.util.List.of(saved));
        assertThat(Files.exists(Path.of(file + ".mv.db"))).isTrue();
    }

    @Test void sqlFailureRollsBackDeletesAndWritesAcrossTables() {
        entries.save(entry(UUID.randomUUID(), LocalDate.of(2025, 1, 1), Instant.EPOCH));
        byte[] before = store.exportBackup();
        var huge = InvestmentOperation.create(new InvestmentOperationId(UUID.randomUUID()), InvestmentOperationType.DEPOSIT,
                AssetCategory.of(InvestmentType.KONTO_BANKOWE, null), OwnerId.of("jakub"),
                Money.positive(new BigDecimal("1E40")), Money.zeroOrPositive(BigDecimal.ZERO), Money.zeroOrPositive(BigDecimal.ZERO),
                LocalDate.of(2025,1,1), null, Instant.EPOCH);
        assertThatThrownBy(() -> store.replaceAll(new InvestmentBackup(2, java.util.List.of(), java.util.List.of(huge))))
                .isInstanceOf(PersistenceException.class);
        reloadAdapters();
        assertThat(store.exportBackup()).isEqualTo(before);
    }

    @Test void independentConnectionsSerializeReadModifyWriteTransactions() throws Exception {
        try (var other = new JdbcInvestmentStore(new tools.jackson.databind.json.JsonMapper(), file);
                var executor = Executors.newFixedThreadPool(8)) {
            var otherEntries = new UnitOfWorkInvestmentEntryRepository(other);
            var tasks = java.util.stream.IntStream.range(0, 30).<Callable<Void>>mapToObj(i -> () -> {
                (i % 2 == 0 ? entries : otherEntries).save(entry(UUID.randomUUID(), LocalDate.of(2025,1,1), Instant.ofEpochSecond(i)));
                return null;
            }).toList();
            for (var future : executor.invokeAll(tasks)) future.get();
            assertThat(store.snapshot().entries()).hasSize(30);
        }
    }
    @Test void liquibaseRecordsInitialMigrationOnlyOnceAcrossRestarts() throws Exception {
        entries.save(entry(UUID.randomUUID(), LocalDate.of(2025, 1, 1), Instant.EPOCH));
        reloadAdapters();
        reloadAdapters();
        try (var connection = java.sql.DriverManager.getConnection("jdbc:h2:file:" + file, "sa", "");
                var statement = connection.createStatement();
                var rows = statement.executeQuery("SELECT ID, AUTHOR, MD5SUM, EXECTYPE FROM DATABASECHANGELOG")) {
            assertThat(rows.next()).isTrue();
            assertThat(rows.getString("ID")).isEqualTo("001-portfolio");
            assertThat(rows.getString("AUTHOR")).isEqualTo("savingsapp");
            assertThat(rows.getString("MD5SUM")).isNotBlank();
            assertThat(rows.getString("EXECTYPE")).isEqualTo("EXECUTED");
            assertThat(rows.next()).isFalse();
        }
        assertThat(store.snapshot().entries()).hasSize(1);
    }

    @Test void incompatibleMigrationChecksumStopsStartupWithoutChangingPortfolio() throws Exception {
        var saved = entry(UUID.randomUUID(), LocalDate.of(2025, 1, 1), Instant.EPOCH);
        entries.save(saved);
        store.close();
        try (var connection = java.sql.DriverManager.getConnection("jdbc:h2:file:" + file, "sa", "");
                var statement = connection.createStatement()) {
            statement.executeUpdate("UPDATE DATABASECHANGELOG SET MD5SUM='9:00000000000000000000000000000000'");
        }
        assertThatThrownBy(() -> new JdbcInvestmentStore(new tools.jackson.databind.json.JsonMapper(), file))
                .isInstanceOf(PersistenceException.class)
                .hasStackTraceContaining("ValidationFailedException");
        try (var connection = java.sql.DriverManager.getConnection("jdbc:h2:file:" + file, "sa", "");
                var statement = connection.createStatement();
                var rows = statement.executeQuery("SELECT id, value_pln FROM investment_entries")) {
            assertThat(rows.next()).isTrue();
            assertThat(rows.getObject("id", UUID.class)).isEqualTo(saved.getId());
            assertThat(rows.getBigDecimal("value_pln")).isEqualByComparingTo(saved.getValuePln());
            assertThat(rows.next()).isFalse();
        }
    }

    @Test void committedDataSurvivesAbruptJvmExit() throws Exception {
        Path databasePath = directory.resolve("process");
        Path output = directory.resolve("child.log");
        Process process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", System.getProperty("java.class.path"), CrashWriter.class.getName(), databasePath.toString())
                .redirectErrorStream(true).redirectOutput(output.toFile()).start();
        try {
            assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue();
            assertThat(process.exitValue()).withFailMessage(Files.readString(output)).isZero();
        } finally { if (process.isAlive()) process.destroyForcibly(); }
        try (var restarted = new JdbcInvestmentStore(new tools.jackson.databind.json.JsonMapper(), databasePath)) {
            assertThat(restarted.snapshot().entries()).hasSize(1);
            assertThat(restarted.snapshot().entries().getFirst().getValuePln()).isEqualByComparingTo("123.45");
            assertThat(restarted.snapshot().plans()).containsEntry("household", PortfolioPlan.defaults());
        }
    }

    public static final class CrashWriter {
        public static void main(String[] arguments) {
            var database = new JdbcInvestmentStore(new tools.jackson.databind.json.JsonMapper(), Path.of(arguments[0]));
            var entry = InvestmentEntry.create(new InvestmentEntryId(UUID.randomUUID()),
                    AssetCategory.of(InvestmentType.KONTO_BANKOWE, null), OwnerId.of("jakub"),
                    Money.positive(new BigDecimal("123.45")), LocalDate.of(2025,1,1), Instant.EPOCH);
            database.replaceAll(new InvestmentBackup(2, java.util.List.of(entry), java.util.List.of(),
                    java.util.Map.of("household", PortfolioPlan.defaults())));
            Runtime.getRuntime().halt(0); // No shutdown hooks or graceful connection close.
        }
    }

}
