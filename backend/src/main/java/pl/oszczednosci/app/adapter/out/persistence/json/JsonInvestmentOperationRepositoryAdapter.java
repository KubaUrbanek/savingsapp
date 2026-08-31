package pl.oszczednosci.app.adapter.out.persistence.json;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import pl.oszczednosci.app.application.port.out.InvestmentOperationRepository;
import pl.oszczednosci.app.application.exception.PersistenceException;
import pl.oszczednosci.app.domain.model.InvestmentOperation;
import pl.oszczednosci.app.domain.model.PortfolioUser;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.DatabindException;
import tools.jackson.databind.ObjectMapper;

public final class JsonInvestmentOperationRepositoryAdapter implements InvestmentOperationRepository {
    private static final TypeReference<List<InvestmentOperation>> LIST = new TypeReference<>() {};
    private static final Comparator<InvestmentOperation> NEWEST_FIRST = Comparator
            .comparing(InvestmentOperation::getDate, Comparator.reverseOrder())
            .thenComparing(InvestmentOperation::getCreatedAt, Comparator.reverseOrder());
    private final ObjectMapper objectMapper;
    private final Path path;

    public JsonInvestmentOperationRepositoryAdapter(ObjectMapper objectMapper,
            Path path) {
        this.objectMapper = objectMapper;
        this.path = path;
    }

    public synchronized InvestmentOperation save(InvestmentOperation operation) {
        List<InvestmentOperation> operations = read();
        operations.add(operation);
        write(operations);
        return operation;
    }

    public synchronized List<InvestmentOperation> findByOwner(PortfolioUser owner) {
        return read().stream().filter(value -> value.getOwner() == owner).sorted(NEWEST_FIRST).toList();
    }

    public synchronized void deleteById(UUID id) {
        List<InvestmentOperation> operations = read();
        if (operations.removeIf(value -> value.getId().equals(id))) write(operations);
    }

    private List<InvestmentOperation> read() {
        if (Files.notExists(path)) return new ArrayList<>();
        try { return new ArrayList<>(objectMapper.readValue(path.toFile(), LIST)); }
        catch (DatabindException exception) { throw new PersistenceException("Unable to read operations database: " + path, exception); }
    }

    private void write(List<InvestmentOperation> operations) {
        try {
            Path parent = path.getParent();
            if (parent != null) Files.createDirectories(parent);
            Path temporary = Files.createTempFile(parent, path.getFileName().toString(), ".tmp");
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(temporary.toFile(), operations);
            Files.move(temporary, path, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException exception) { throw new PersistenceException("Unable to write operations database: " + path, exception); }
    }
}
