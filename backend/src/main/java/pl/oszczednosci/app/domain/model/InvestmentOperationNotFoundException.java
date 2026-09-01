package pl.oszczednosci.app.domain.model;

import java.util.UUID;

public final class InvestmentOperationNotFoundException extends RuntimeException {
    public InvestmentOperationNotFoundException(UUID id) {
        super("Investment operation not found: " + id);
    }
}
