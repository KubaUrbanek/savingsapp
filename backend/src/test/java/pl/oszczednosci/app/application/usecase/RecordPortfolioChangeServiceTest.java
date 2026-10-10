package pl.oszczednosci.app.application.usecase;
import static org.assertj.core.api.Assertions.*;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.json.JsonMapper;
import pl.oszczednosci.app.adapter.out.persistence.json.JsonInvestmentStore;
import pl.oszczednosci.app.application.port.in.*;
import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*;
import pl.oszczednosci.app.domain.service.PortfolioChangeCalculator;
class RecordPortfolioChangeServiceTest {
 @TempDir Path temp;
 private JsonInvestmentStore store;
 private RecordPortfolioChangeService service;
 @BeforeEach void setup(){store=new JsonInvestmentStore(new JsonMapper(),temp.resolve("data.json"));var tick=new AtomicInteger();service=new RecordPortfolioChangeService(store,()->Instant.parse("2026-10-10T12:00:00Z").plusNanos(tick.getAndIncrement()), UUID::randomUUID);}
 private RecordPortfolioChangeCommand c(String kind,InvestmentType type,String date,String amount,String value){return new RecordPortfolioChangeCommand(UUID.randomUUID(),kind,OwnerId.of("jakub"),type,type==InvestmentType.GIELDA?InvestmentSubcategory.RYNKI_ROZWINIETE:null,LocalDate.parse(date),amount==null?null:new BigDecimal(amount),value==null?null:new BigDecimal(value),InvestmentType.KONTO_BANKOWE);}
 private BigDecimal value(InvestmentType type,String date){return PortfolioChangeCalculator.valueAt(store.snapshot().entries(),OwnerId.of("jakub"),AssetCategory.of(type,type==InvestmentType.GIELDA?InvestmentSubcategory.RYNKI_ROZWINIETE:null),LocalDate.parse(date)).amount();}
 @Test void repeatedRequestAndConcurrentRetryDoNotDuplicateCashFlow() throws Exception {
  var request=c("DEPOSIT",InvestmentType.KONTO_BANKOWE,"2026-10-10","1000",null);
  try(var threads=Executors.newFixedThreadPool(2)){var a=threads.submit(()->service.record(request));var b=threads.submit(()->service.record(request));assertThat(a.get()).isEqualTo(b.get());}
  assertThat(store.snapshot().entries()).hasSize(1);assertThat(store.snapshot().operations()).hasSize(1);assertThat(value(InvestmentType.KONTO_BANKOWE,"2026-10-10")).isEqualByComparingTo("1000");
 }
 @Test void changedPayloadCannotReuseRequestIdentifier(){
  var request=c("DEPOSIT",InvestmentType.KONTO_BANKOWE,"2026-10-10","100",null);service.record(request);
  assertThatThrownBy(()->service.record(new RecordPortfolioChangeCommand(request.requestId(),request.kind(),request.owner(),request.type(),request.subcategory(),request.date(),new BigDecimal("200"),null,request.cashType()))).isInstanceOf(IllegalArgumentException.class);
  assertThat(store.snapshot().operations()).hasSize(1);
 }
 @Test void failedTransferDoesNotSaveEitherLeg(){
  byte[] before=store.exportBackup();assertThatThrownBy(()->service.record(c("BUY",InvestmentType.GIELDA,"2026-10-10","100",null))).isInstanceOf(IllegalArgumentException.class);
  assertThat(store.exportBackup()).isEqualTo(before);
 }
 @Test void transferAndItsDeletionAreAtomicInBothDirections(){
  service.record(c("DEPOSIT",InvestmentType.KONTO_BANKOWE,"2026-09-01","1000",null));var buy=c("BUY",InvestmentType.GIELDA,"2026-10-10","100",null);service.record(buy);
  assertThat(value(InvestmentType.KONTO_BANKOWE,"2026-10-10")).isEqualByComparingTo("900");assertThat(value(InvestmentType.GIELDA,"2026-10-10")).isEqualByComparingTo("100");
  var source=store.snapshot().operations().stream().filter(o->buy.requestId().equals(o.getGroupId()) && !o.getId().equals(buy.requestId())).findFirst().orElseThrow();service.delete(source.getId());
  assertThat(store.snapshot().operations()).hasSize(1);assertThat(store.snapshot().entries()).hasSize(1);assertThat(value(InvestmentType.KONTO_BANKOWE,"2026-10-10")).isEqualByComparingTo("1000");
 }
 @Test void historicalDepositUsesHistoricalValueAndReplaysLaterEventsButNotActualValuations(){
  service.record(c("DEPOSIT",InvestmentType.KONTO_BANKOWE,"2026-09-01","1000",null));service.record(c("DEPOSIT",InvestmentType.KONTO_BANKOWE,"2026-10-01","100",null));
  service.record(c("DEPOSIT",InvestmentType.KONTO_BANKOWE,"2026-09-15","50",null));
  assertThat(value(InvestmentType.KONTO_BANKOWE,"2026-09-15")).isEqualByComparingTo("1050");assertThat(value(InvestmentType.KONTO_BANKOWE,"2026-10-01")).isEqualByComparingTo("1150");
  service.record(c("VALUATION",InvestmentType.KONTO_BANKOWE,"2026-10-05",null,"1200"));service.record(c("DEPOSIT",InvestmentType.KONTO_BANKOWE,"2026-09-20","20",null));
  assertThat(value(InvestmentType.KONTO_BANKOWE,"2026-10-05")).isEqualByComparingTo("1200");
 }
 @Test void undoReplaysDependentBalancesAndRejectsUndoThatWouldOverdraw(){
  var deposit=c("DEPOSIT",InvestmentType.KONTO_BANKOWE,"2026-09-01","100",null);service.record(deposit);var withdrawal=c("WITHDRAWAL",InvestmentType.KONTO_BANKOWE,"2026-09-02","50",null);service.record(withdrawal);
  byte[] before=store.exportBackup();assertThatThrownBy(()->service.delete(deposit.requestId())).isInstanceOf(IllegalArgumentException.class);assertThat(store.exportBackup()).isEqualTo(before);
  service.delete(withdrawal.requestId());service.delete(deposit.requestId());assertThat(store.snapshot().entries()).isEmpty();assertThat(store.snapshot().operations()).isEmpty();
 }
 @Test void allowsZeroValuationAndZeroInitialCostButRejectsFutureAndNegativeInputs(){
  service.record(c("INITIAL",InvestmentType.KONTO_BANKOWE,"2026-09-01","0","500"));service.record(c("VALUATION",InvestmentType.KONTO_BANKOWE,"2026-10-10",null,"0"));
  assertThat(value(InvestmentType.KONTO_BANKOWE,"2026-10-10")).isZero();
  assertThatThrownBy(()->service.record(c("DEPOSIT",InvestmentType.KONTO_BANKOWE,"2026-11-01","10",null))).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->service.record(c("DEPOSIT",InvestmentType.KONTO_BANKOWE,"2026-10-10","-10",null))).isInstanceOf(IllegalArgumentException.class);
 }
 @Test void plansSurvivePortfolioChangesAndExportImport(){
  var plans=new PortfolioPlanService(store);var plan=new PortfolioPlan(60,40,0,80,20);plans.save("jakub",plan);plans.save("household",new PortfolioPlan(30,60,10,70,30));
  service.record(c("DEPOSIT",InvestmentType.KONTO_BANKOWE,"2026-09-01","100",null));var clone=new JsonInvestmentStore(new JsonMapper(),temp.resolve("clone.json"));clone.importBackup(store.exportBackup());
  assertThat(new PortfolioPlanService(clone).load("jakub")).isEqualTo(plan);assertThat(new PortfolioPlanService(clone).load("zosia")).isEqualTo(PortfolioPlan.defaults());assertThat(clone.snapshot().operations()).hasSize(1);
  assertThatThrownBy(()->new PortfolioPlan(80,30,20,70,30)).isInstanceOf(IllegalArgumentException.class);
 }
 @Test void writerFailureNeverLeavesAnOperationWithoutItsValuation() throws Exception {
  var blocked=temp.resolve("blocked");Files.writeString(blocked,"not a directory");var broken=new RecordPortfolioChangeService(new JsonInvestmentStore(new JsonMapper(),blocked.resolve("db.json")),()->Instant.parse("2026-10-10T12:00:00Z"), UUID::randomUUID);
  assertThatThrownBy(()->broken.record(c("DEPOSIT",InvestmentType.KONTO_BANKOWE,"2026-09-01","100",null))).isInstanceOf(pl.oszczednosci.app.application.exception.PersistenceException.class);
  assertThat(Files.readString(blocked)).isEqualTo("not a directory");
 }
 @Test void malformedTransferImportIsRejectedWithoutChangingTheStore() {
  service.record(c("DEPOSIT",InvestmentType.KONTO_BANKOWE,"2026-09-01","1000",null));
  service.record(c("BUY",InvestmentType.GIELDA,"2026-10-10","100",null));
  byte[] before=store.exportBackup();
  String corrupted=new String(before,java.nio.charset.StandardCharsets.UTF_8).replace("\"operationType\" : \"SELL\"", "\"operationType\" : \"WITHDRAWAL\"");
  assertThat(corrupted).isNotEqualTo(new String(before,java.nio.charset.StandardCharsets.UTF_8));
  assertThatThrownBy(()->store.importBackup(corrupted.getBytes(java.nio.charset.StandardCharsets.UTF_8))).isInstanceOf(RuntimeException.class);
  assertThat(store.exportBackup()).isEqualTo(before);
 }
 @Test void initialCostCanCompleteAnExistingUnknownValuation() {
  service.record(c("VALUATION",InvestmentType.KONTO_BANKOWE,"2026-09-01",null,"500"));
  service.record(c("INITIAL",InvestmentType.KONTO_BANKOWE,"2026-09-02","400","500"));
  var history=new PortfolioHistory(store.snapshot().entries().stream().map(e->new ValuationSnapshot(AssetKey.from(e.category()),new ValuationDate(e.date()),e.value())).toList(),store.snapshot().operations());
  var result=new pl.oszczednosci.app.domain.service.PortfolioPerformanceCalculator(new pl.oszczednosci.app.domain.service.NumericalRateOfReturnCalculator()).calculate(history,new ValuationDate(LocalDate.parse("2026-10-10")));
  assertThat(result.nominalResult().amount()).isEqualByComparingTo("100");
 }
}
