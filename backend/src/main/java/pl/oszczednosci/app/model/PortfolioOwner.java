package pl.oszczednosci.app.model;

import java.util.Objects;

public record PortfolioOwner(PortfolioUser value) {
    public PortfolioOwner { Objects.requireNonNull(value, "Portfolio owner is required"); }

    public static PortfolioOwner of(PortfolioUser value) { return new PortfolioOwner(value); }
}
