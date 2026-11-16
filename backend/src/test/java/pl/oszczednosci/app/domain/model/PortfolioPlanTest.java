package pl.oszczednosci.app.domain.model;
import static org.assertj.core.api.Assertions.*;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
class PortfolioPlanTest {
 @Test void flatPlanIsExactAndValidatesAllFourWeights() {
  assertThat(PortfolioPlan.defaults()).isEqualTo(new PortfolioPlan(50,25,17.5,7.5));
  for (double[] v : new double[][]{{50,25,17.5,7.4},{-1,101,0,0},{Double.NaN,0,0,0},{101,0,0,0}})
   assertThatThrownBy(()->new PortfolioPlan(v[0],v[1],v[2],v[3])).isInstanceOf(IllegalArgumentException.class);
  assertThat(new PortfolioPlan(100,0,0,0).gold()).isEqualByComparingTo("0");
 }
 @Test void legacyConversionPreservesEffectivePrecision() {
  assertThat(PortfolioPlan.fromLegacy(30,60,10,80,20)).isEqualTo(new PortfolioPlan(30,35,28,7));
  var converted=PortfolioPlan.fromTwoLevel(new BigDecimal("33.333333333"),new BigDecimal("66.666666667"),new BigDecimal("33.333333333"),new BigDecimal("33.333333333"),new BigDecimal("33.333333334"));
  assertThat(converted.gold()).isEqualByComparingTo("22.22222222211111111111");
  assertThat(converted.bonds().add(converted.gold()).add(converted.developed()).add(converted.emerging())).isEqualByComparingTo("100");
 }
}
