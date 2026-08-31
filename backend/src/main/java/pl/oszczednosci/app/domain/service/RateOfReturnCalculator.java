package pl.oszczednosci.app.domain.service;
import java.util.List;
import pl.oszczednosci.app.domain.model.*;
public interface RateOfReturnCalculator { RateOfReturnResult calculate(List<CashFlow> cashFlows); }
