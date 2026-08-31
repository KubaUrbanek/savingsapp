package pl.oszczednosci.app.domain.service;
import static org.assertj.core.api.Assertions.assertThat;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.List;
import org.junit.jupiter.api.Test; import pl.oszczednosci.app.domain.model.*;
class NumericalRateOfReturnCalculatorTest {
 private final NumericalRateOfReturnCalculator calculator=new NumericalRateOfReturnCalculator();
 private CashFlow f(String d,String a){BigDecimal n=new BigDecimal(a);Money m=n.signum()<0?new Money(n.negate()).negate():new Money(n);return new CashFlow(LocalDate.parse(d),m);}
 @Test void makes_failure_modes_explicit(){
  assertThat(calculator.calculate(List.of()).status()).isEqualTo(RateOfReturnResult.Status.ZERO_CASH_FLOWS);
  assertThat(calculator.calculate(List.of(f("2024-01-01","-100"),f("2024-01-01","110"))).status()).isEqualTo(RateOfReturnResult.Status.SAME_DAY_FLOWS);
  assertThat(calculator.calculate(List.of(f("2024-01-01","100"),f("2025-01-01","110"))).status()).isEqualTo(RateOfReturnResult.Status.NO_SIGN_CHANGE);
  assertThat(calculator.calculate(List.of(f("2023-01-01","-100"),f("2024-01-01","230"),f("2025-01-01","-132"))).status()).isEqualTo(RateOfReturnResult.Status.MULTIPLE_ROOTS);
  assertThat(calculator.calculate(List.of(f("2023-01-01","-100"),f("2024-01-01","50"),f("2025-01-01","-100"))).status()).isEqualTo(RateOfReturnResult.Status.CONVERGENCE_FAILURE);
 }
 @Test void calculates_extreme_rate(){RateOfReturnResult r=calculator.calculate(List.of(f("2024-01-01","-1"),f("2025-01-01","100000")));assertThat(r.status()).isEqualTo(RateOfReturnResult.Status.CALCULATED);assertThat(r.percent()).isGreaterThan(new BigDecimal("9000000"));}
}
