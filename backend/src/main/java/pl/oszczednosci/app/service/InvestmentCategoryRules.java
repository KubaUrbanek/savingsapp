package pl.oszczednosci.app.service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import pl.oszczednosci.app.model.InvestmentSubcategory;
import pl.oszczednosci.app.model.InvestmentType;

public final class InvestmentCategoryRules {

    private static final Map<InvestmentType, List<InvestmentSubcategory>> ALLOWED_SUBCATEGORIES = new EnumMap<>(InvestmentType.class);

    static {
        List<InvestmentSubcategory> marketSubcategories = List.of(
                InvestmentSubcategory.ZLOTO,
                InvestmentSubcategory.RYNKI_ROZWINIETE,
                InvestmentSubcategory.RYNKI_ROZWIJAJACE_SIE
        );
        ALLOWED_SUBCATEGORIES.put(InvestmentType.GIELDA, marketSubcategories);
        ALLOWED_SUBCATEGORIES.put(InvestmentType.IKE, marketSubcategories);
        ALLOWED_SUBCATEGORIES.put(InvestmentType.IKZE, marketSubcategories);
        ALLOWED_SUBCATEGORIES.put(InvestmentType.OBLIGACJE, List.of(
                InvestmentSubcategory.TRZYLETNIE,
                InvestmentSubcategory.DZIESIECIOLETNIE,
                InvestmentSubcategory.DWUNASTOLETNIE
        ));
    }

    private InvestmentCategoryRules() {
    }

    public static List<InvestmentSubcategory> allowedSubcategories(InvestmentType type) {
        return ALLOWED_SUBCATEGORIES.getOrDefault(type, List.of());
    }

    public static boolean requiresSubcategory(InvestmentType type) {
        return !allowedSubcategories(type).isEmpty();
    }

    public static void validate(InvestmentType type, InvestmentSubcategory subcategory) {
        List<InvestmentSubcategory> allowed = allowedSubcategories(type);
        if (allowed.isEmpty() && subcategory != null) {
            throw new IllegalArgumentException("Ten typ inwestycji nie obsluguje podkategorii");
        }
        if (!allowed.isEmpty() && !allowed.contains(subcategory)) {
            throw new IllegalArgumentException("Wybierz prawidlowa podkategorie dla typu inwestycji");
        }
    }
}
