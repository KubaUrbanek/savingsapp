package pl.oszczednosci.app.adapter.out.persistence.json;

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

final class JsonInvestmentRepositoryContractTest extends InvestmentRepositoryContract {
    @TempDir Path directory;
    private Path file;
    private JsonInvestmentStore store;
    private JsonInvestmentEntryRepository entries;
    private JsonInvestmentOperationRepository operations;

    @BeforeEach void createAdapter() {
        file = directory.resolve("investments.json");
        ObjectMapper mapper = new tools.jackson.databind.json.JsonMapper();
        store = new JsonInvestmentStore(mapper, file);
        entries = new JsonInvestmentEntryRepository(store);
        operations = new JsonInvestmentOperationRepository(store);
    }
    @Override protected InvestmentEntryRepository entries() { return entries; }
    @Override protected InvestmentOperationRepository operations() { return operations; }
    @Override protected InvestmentBackupPort backups() { return store; }
    @Override protected void makeStorageMalformed() throws Exception { Files.writeString(file, "not-json"); }
    @Override protected InvestmentEntry entry(UUID id, LocalDate date, Instant created) {
        return InvestmentEntry.create(new InvestmentEntryId(id), AssetCategory.of(InvestmentType.GIELDA,
                InvestmentSubcategory.RYNKI_ROZWINIETE), PortfolioOwner.of(PortfolioUser.JAKUB),
                Money.positive(new BigDecimal("123.45")), date, created);
    }
    @Override protected InvestmentOperation operation(UUID id, LocalDate date, Instant created) {
        return InvestmentOperation.create(new InvestmentOperationId(id), InvestmentOperationType.DEPOSIT,
                AssetCategory.of(InvestmentType.GIELDA, InvestmentSubcategory.RYNKI_ROZWINIETE),
                PortfolioOwner.of(PortfolioUser.JAKUB), Money.positive(BigDecimal.TEN), Money.zeroOrPositive(BigDecimal.ZERO),
                Money.zeroOrPositive(BigDecimal.ZERO), date, "contract", created);
    }

    @Test void duplicateAggregateIdentifiersInvalidateTheCompleteImport() throws Exception {
        entries.save(entry(UUID.randomUUID(), LocalDate.now(), Instant.now()));
        byte[] before = store.exportBackup();
        ObjectMapper mapper = new tools.jackson.databind.json.JsonMapper();
        var document = mapper.readTree(before);
        var entriesNode = (tools.jackson.databind.node.ArrayNode) document.get("entries");
        entriesNode.add(entriesNode.get(0).deepCopy());

        assertThatThrownBy(() -> store.importBackup(mapper.writeValueAsBytes(document)))
                .isInstanceOf(MalformedImportException.class);
        assertThat(store.exportBackup()).isEqualTo(before);
    }

    @Test void independentlyConstructedAdaptersCoordinateAccessToTheSameDocument() throws Exception {
        int count = 30;
        JsonInvestmentStore otherStore = new JsonInvestmentStore(new tools.jackson.databind.json.JsonMapper(), file);
        JsonInvestmentEntryRepository otherEntries = new JsonInvestmentEntryRepository(otherStore);
        try (ExecutorService executor = Executors.newFixedThreadPool(8)) {
            var tasks = java.util.stream.IntStream.range(0, count).<Callable<Void>>mapToObj(i -> () -> {
                InvestmentEntryRepository repository = i % 2 == 0 ? entries : otherEntries;
                repository.save(entry(UUID.randomUUID(), LocalDate.of(2025, 1, 1), Instant.ofEpochSecond(i + 1)));
                return null;
            }).toList();
            for (Future<Void> future : executor.invokeAll(tasks)) future.get();
        }
        assertThat(store.snapshot().entries()).hasSize(count);
        assertThat(otherStore.snapshot().entries()).hasSize(count);
    }

    @Test void exportingLegacyStorageAlwaysProducesTheCurrentBackupSchema() throws Exception {
        entries.save(entry(UUID.randomUUID(), LocalDate.of(2025, 1, 1), Instant.EPOCH));
        ObjectMapper mapper = new tools.jackson.databind.json.JsonMapper();
        var currentDocument = mapper.readTree(store.exportBackup());
        Files.write(file, mapper.writeValueAsBytes(currentDocument.get("entries")));

        var exported = mapper.readTree(store.exportBackup());

        assertThat(exported.get("formatVersion").asInt()).isEqualTo(InvestmentBackup.CURRENT_FORMAT_VERSION);
        assertThat(exported.get("entries").size()).isOne();
        assertThat(exported.get("operations").isArray()).isTrue();
    }
}
