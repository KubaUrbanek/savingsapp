package pl.oszczednosci.app.configuration;
import java.nio.file.Path; import java.time.Instant; import java.util.List; import java.util.UUID;
import org.springframework.beans.factory.annotation.Value; import org.springframework.context.annotation.*;
import tools.jackson.databind.ObjectMapper;
import pl.oszczednosci.app.adapter.out.persistence.json.*; import pl.oszczednosci.app.application.port.out.Clock; import pl.oszczednosci.app.application.port.out.IdGenerator;
import pl.oszczednosci.app.application.usecase.*; import pl.oszczednosci.app.domain.service.*;
@Configuration
public class ApplicationConfiguration {
 @Bean JsonInvestmentEntryRepositoryAdapter entryAdapter(ObjectMapper mapper, @Value("${app.database.file:./backend/data/investment-entries.json}") Path path) { return new JsonInvestmentEntryRepositoryAdapter(mapper,path); }
 @Bean JsonInvestmentOperationRepositoryAdapter operationAdapter(ObjectMapper mapper, @Value("${app.operations.file:./backend/data/investment-operations.json}") Path path) { return new JsonInvestmentOperationRepositoryAdapter(mapper,path); }
 @Bean Clock clock(){ return Instant::now; }
 @Bean IdGenerator idGenerator(){ return UUID::randomUUID; }
 @Bean DefaultInvestmentTypePolicy defaultPolicy(){ return new DefaultInvestmentTypePolicy(); }
 @Bean InvestmentTypePolicyRegistry policyRegistry(DefaultInvestmentTypePolicy policy){ return new InvestmentTypePolicyRegistry(List.of(policy)); }
 @Bean InvestmentEntryUseCase investmentEntryUseCase(JsonInvestmentEntryRepositoryAdapter adapter, InvestmentTypePolicyRegistry policies, Clock clock, IdGenerator ids){ return new InvestmentEntryUseCase(adapter,adapter,policies,clock,ids); }
 @Bean InvestmentOperationUseCase investmentOperationUseCase(JsonInvestmentOperationRepositoryAdapter operations, JsonInvestmentEntryRepositoryAdapter entries, Clock clock, IdGenerator ids){ return new InvestmentOperationUseCase(operations,entries,clock,ids); }
 @Bean RateOfReturnCalculator rateOfReturnCalculator(){ return new NumericalRateOfReturnCalculator(); }
 @Bean PortfolioPerformanceCalculator portfolioPerformanceCalculator(RateOfReturnCalculator rates){ return new PortfolioPerformanceCalculator(rates); }
 @Bean CalculatePortfolioPerformanceService calculatePortfolioPerformanceService(JsonInvestmentEntryRepositoryAdapter entries, JsonInvestmentOperationRepositoryAdapter operations, PortfolioPerformanceCalculator calculator){ return new CalculatePortfolioPerformanceService(entries,operations,calculator); }
}
