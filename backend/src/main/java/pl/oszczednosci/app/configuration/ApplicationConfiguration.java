package pl.oszczednosci.app.configuration;
import java.nio.file.Path; import java.time.Instant; import java.util.List; import java.util.UUID;
import org.springframework.beans.factory.annotation.Value; import org.springframework.context.annotation.*;
import tools.jackson.databind.ObjectMapper;
import pl.oszczednosci.app.adapter.out.persistence.json.*; import pl.oszczednosci.app.application.port.out.Clock; import pl.oszczednosci.app.application.port.out.IdGenerator;
import pl.oszczednosci.app.application.usecase.*; import pl.oszczednosci.app.domain.service.*;
@Configuration
public class ApplicationConfiguration {
 @Bean JsonInvestmentStore investmentStore(ObjectMapper mapper, @Value("${app.database.file:./backend/data/investments.json}") Path path) { return new JsonInvestmentStore(mapper,path); }
 @Bean JsonInvestmentEntryRepository entryRepository(JsonInvestmentStore store) { return new JsonInvestmentEntryRepository(store); }
 @Bean JsonInvestmentOperationRepository operationRepository(JsonInvestmentStore store) { return new JsonInvestmentOperationRepository(store); }
 @Bean Clock clock(){ return Instant::now; }
 @Bean IdGenerator idGenerator(){ return UUID::randomUUID; }
 @Bean DefaultInvestmentTypePolicy defaultPolicy(){ return new DefaultInvestmentTypePolicy(); }
 @Bean InvestmentTypePolicyRegistry policyRegistry(DefaultInvestmentTypePolicy policy){ return new InvestmentTypePolicyRegistry(List.of(policy)); }
 @Bean InvestmentEntryUseCase investmentEntryUseCase(JsonInvestmentEntryRepository repository, JsonInvestmentStore store, InvestmentTypePolicyRegistry policies, Clock clock, IdGenerator ids){ return new InvestmentEntryUseCase(repository,store,policies,clock,ids); }
 @Bean InvestmentOperationUseCase investmentOperationUseCase(JsonInvestmentOperationRepository operations, Clock clock, IdGenerator ids){ return new InvestmentOperationUseCase(operations,clock,ids); }
 @Bean RateOfReturnCalculator rateOfReturnCalculator(){ return new NumericalRateOfReturnCalculator(); }
 @Bean PortfolioPerformanceCalculator portfolioPerformanceCalculator(RateOfReturnCalculator rates){ return new PortfolioPerformanceCalculator(rates); }
 @Bean CalculatePortfolioPerformanceService calculatePortfolioPerformanceService(JsonInvestmentEntryRepository entries, JsonInvestmentOperationRepository operations, PortfolioPerformanceCalculator calculator, Clock clock){ return new CalculatePortfolioPerformanceService(entries,operations,calculator,clock); }
 @Bean ReferenceDataUseCase referenceDataUseCase(){ return new ReferenceDataUseCase(); }
}
