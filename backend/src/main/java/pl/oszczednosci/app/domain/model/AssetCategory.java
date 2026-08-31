package pl.oszczednosci.app.domain.model;

import java.util.List;
import java.util.Map;
import java.util.Objects;

public record AssetCategory(InvestmentType type, InvestmentSubcategory subcategory) {
    private static final List<InvestmentSubcategory> MARKETS = List.of(InvestmentSubcategory.ZLOTO,
            InvestmentSubcategory.RYNKI_ROZWINIETE, InvestmentSubcategory.RYNKI_ROZWIJAJACE_SIE);
    private static final Map<InvestmentType, List<InvestmentSubcategory>> ALLOWED = Map.of(
            InvestmentType.GIELDA, MARKETS, InvestmentType.IKE, MARKETS, InvestmentType.IKZE, MARKETS,
            InvestmentType.OBLIGACJE, List.of(InvestmentSubcategory.TRZYLETNIE,
                    InvestmentSubcategory.DZIESIECIOLETNIE, InvestmentSubcategory.DWUNASTOLETNIE));

    public AssetCategory {
        Objects.requireNonNull(type, "Investment type is required");
        List<InvestmentSubcategory> allowed = allowedSubcategories(type);
        if (allowed.isEmpty() && subcategory != null)
            throw new IllegalArgumentException("This investment type does not support a subcategory");
        if (!allowed.isEmpty() && (subcategory == null || !allowed.contains(subcategory)))
            throw new IllegalArgumentException("A compatible subcategory is required");
    }

    public static AssetCategory of(InvestmentType type, InvestmentSubcategory subcategory) {
        return new AssetCategory(type, subcategory);
    }

    public static List<InvestmentSubcategory> allowedSubcategories(InvestmentType type) {
        return ALLOWED.getOrDefault(Objects.requireNonNull(type, "Investment type is required"), List.of());
    }
}
