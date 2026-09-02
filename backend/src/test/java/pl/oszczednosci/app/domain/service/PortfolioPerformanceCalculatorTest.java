package pl.oszczednosci.app.domain.service;
import static org.assertj.core.api.Assertions.assertThat;
import java.math.BigDecimal; import java.time.*; import java.util.*;
import org.junit.jupiter.api.Test; import pl.oszczednosci.app.domain.model.*;
class PortfolioPerformanceCalculatorTest {
 static Money m(String n){return new Money(new BigDecimal(n));}
 static AssetKey key(InvestmentType t,InvestmentSubcategory s){return new AssetKey(t,s);}
 @Test void handles_cutoffs_subcategories_cash_costs_months_and_absent_opening_values(){
  AssetKey stock=key(InvestmentType.GIELDA,InvestmentSubcategory.ZLOTO), bond=key(InvestmentType.OBLIGACJE,InvestmentSubcategory.TRZYLETNIE);
  List<ValuationSnapshot> snapshots=List.of(v(stock,"2024-01-31","100"),v(stock,"2024-02-29","130"),v(stock,"2024-03-01","999"),v(bond,"2024-02-20","50"));
  List<InvestmentOperation> ops=List.of(o(InvestmentOperationType.DEPOSIT,"2024-01-01","100","2","0",stock),o(InvestmentOperationType.WITHDRAWAL,"2024-02-15","20","1","3",bond));
  PortfolioPerformance p=new PortfolioPerformanceCalculator(new NumericalRateOfReturnCalculator()).calculate(new PortfolioHistory(snapshots,ops),new ValuationDate(LocalDate.parse("2024-02-29")));
  assertThat(p.currentValue().amount()).isEqualByComparingTo("180"); assertThat(p.contributedCapital().amount()).isEqualByComparingTo("80");
  assertThat(p.nominalResult().amount()).isEqualByComparingTo("100"); assertThat(p.fees().amount()).isEqualByComparingTo("3"); assertThat(p.taxes().amount()).isEqualByComparingTo("3");
  assertThat(p.resultAfterFeesAndTaxes().amount()).isEqualByComparingTo("94"); assertThat(p.monthlyResult().amount()).isEqualByComparingTo("100");
 }
 private ValuationSnapshot v(AssetKey k,String d,String n){return new ValuationSnapshot(k,new ValuationDate(LocalDate.parse(d)),m(n));}
 private InvestmentOperation o(InvestmentOperationType t,String d,String a,String f,String tax,AssetKey k){return InvestmentOperation.create(new InvestmentOperationId(UUID.randomUUID()),t,AssetCategory.of(k.type(),k.subcategory()),OwnerId.of("jakub"),m(a),m(f),m(tax),LocalDate.parse(d),null,Instant.EPOCH);}
}
