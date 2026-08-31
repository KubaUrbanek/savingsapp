package pl.oszczednosci.app.domain.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import pl.oszczednosci.app.domain.model.*;

/** Deterministic XIRR solver. BigDecimal is converted to double only here; IEEE-754 precision is lost at this numerical boundary. */
public final class NumericalRateOfReturnCalculator implements RateOfReturnCalculator {
    private static final double MIN_RATE = -0.999999;
    private static final double MAX_RATE = 1_000_000;
    private static final int ITERATIONS = 200;

    @Override public RateOfReturnResult calculate(List<CashFlow> flows) {
        if (flows.isEmpty() || flows.stream().allMatch(f -> f.amount().isZero()))
            return RateOfReturnResult.failure(RateOfReturnResult.Status.ZERO_CASH_FLOWS);
        LocalDate first=flows.stream().map(CashFlow::date).min(LocalDate::compareTo).orElseThrow();
        LocalDate last=flows.stream().map(CashFlow::date).max(LocalDate::compareTo).orElseThrow();
        if (first.equals(last)) return RateOfReturnResult.failure(RateOfReturnResult.Status.SAME_DAY_FLOWS);
        if (flows.stream().noneMatch(f -> f.amount().amount().signum()<0) || flows.stream().noneMatch(f -> f.amount().amount().signum()>0))
            return RateOfReturnResult.failure(RateOfReturnResult.Status.NO_SIGN_CHANGE);

        List<double[]> brackets=new ArrayList<>();
        double previous=MIN_RATE, previousValue=npv(flows, first, previous);
        // Logarithmic sampling covers rates close to -100% and extreme positive rates.
        for (int i=1;i<=4000;i++) {
            double x=-1.0 + Math.exp(Math.log(1.0+MIN_RATE) + i*(Math.log(1.0+MAX_RATE)-Math.log(1.0+MIN_RATE))/4000.0);
            double value=npv(flows, first, x);
            if (Double.isFinite(value) && Double.isFinite(previousValue) && Math.signum(value)!=Math.signum(previousValue)) brackets.add(new double[]{previous,x});
            previous=x; previousValue=value;
        }
        if (brackets.isEmpty()) return RateOfReturnResult.failure(RateOfReturnResult.Status.CONVERGENCE_FAILURE);
        if (brackets.size()>1) return RateOfReturnResult.failure(RateOfReturnResult.Status.MULTIPLE_ROOTS);
        double low=brackets.get(0)[0], high=brackets.get(0)[1], lowValue=npv(flows,first,low);
        for(int i=0;i<ITERATIONS;i++) {
            double middle=(low+high)/2, value=npv(flows,first,middle);
            if (!Double.isFinite(value)) return RateOfReturnResult.failure(RateOfReturnResult.Status.CONVERGENCE_FAILURE);
            if (Math.abs(value)<1e-8 || Math.abs(high-low)<1e-12)
                return RateOfReturnResult.calculated(BigDecimal.valueOf(middle*100).setScale(4,RoundingMode.HALF_UP));
            if (Math.signum(value)==Math.signum(lowValue)) { low=middle; lowValue=value; } else high=middle;
        }
        return RateOfReturnResult.failure(RateOfReturnResult.Status.CONVERGENCE_FAILURE);
    }
    private double npv(List<CashFlow> flows, LocalDate first, double rate) {
        return flows.stream().mapToDouble(f -> f.amount().amount().doubleValue()/Math.pow(1+rate, ChronoUnit.DAYS.between(first,f.date())/365.0)).sum();
    }
}
