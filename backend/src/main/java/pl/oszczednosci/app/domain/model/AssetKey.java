package pl.oszczednosci.app.domain.model;

import java.util.Objects;

/** Stable, typed identity used when selecting the latest valuation of an asset. */
public record AssetKey(InvestmentType type, InvestmentSubcategory subcategory) {
    public AssetKey { AssetCategory.of(Objects.requireNonNull(type), subcategory); }
    public static AssetKey from(AssetCategory category) { return new AssetKey(category.type(), category.subcategory()); }
}
