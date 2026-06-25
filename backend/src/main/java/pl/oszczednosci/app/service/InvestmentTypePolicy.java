package pl.oszczednosci.app.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

import pl.oszczednosci.app.model.InvestmentType;

public interface InvestmentTypePolicy {

    InvestmentType supports();

    default BigDecimal normalizePln(BigDecimal value) {
        if (value == null) {
            throw new IllegalArgumentException("Value is required");
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
