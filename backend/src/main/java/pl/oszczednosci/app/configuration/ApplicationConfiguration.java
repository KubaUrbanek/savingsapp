package pl.oszczednosci.app.configuration;
import java.nio.file.Path; import java.time.Instant; import java.util.UUID;
import org.springframework.beans.factory.annotation.Value; import org.springframework.context.annotation.*;
import tools.jackson.databind.ObjectMapper;
import pl.oszczednosci.app.adapter.out.persistence.json.*; import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.application.usecase.*; import pl.oszczednosci.app.domain.service.*;
@Configuration
public class ApplicationConfiguration {
 @Bean JsonInvestmentStore investmentStore(ObjectMapper mapper, @Value("${app.database.file:./backend/data/investments.json}") Path path) { return new JsonInvestmentStore(mapper,path); }
 @Bean JsonInvestmentEntryRepository entryRepository(JsonInvestmentStore store) { return new JsonInvestmentEntryRepository(store); }
 @Bean JsonInvestmentOperationRepository operationRepository(JsonInvestmentStore store) { return new JsonInvestmentOperationRepository(store); }
 @Bean Clock clock(){ return Instant::now; }
 @Bean IdGenerator idGenerator(){ return UUID::randomUUID; }
 @Bean InvestmentEntryUseCase investmentEntryUseCase(InvestmentEntryRepository repository, InvestmentBackupPort backup, Clock clock, IdGenerator ids){ return new InvestmentEntryUseCase(repository,backup,clock,ids); }
 @Bean InvestmentOperationUseCase investmentOperationUseCase(InvestmentOperationRepository operations, Clock clock, IdGenerator ids){ return new InvestmentOperationUseCase(operations,clock,ids); }
 @Bean RateOfReturnCalculator rateOfReturnCalculator(){ return new NumericalRateOfReturnCalculator(); }
 @Bean PortfolioPerformanceCalculator portfolioPerformanceCalculator(RateOfReturnCalculator rates){ return new PortfolioPerformanceCalculator(rates); }
 @Bean CalculatePortfolioPerformanceService calculatePortfolioPerformanceService(InvestmentEntryRepository entries, InvestmentOperationRepository operations, PortfolioPerformanceCalculator calculator, Clock clock){ return new CalculatePortfolioPerformanceService(entries,operations,calculator,clock); }
 @Bean ReferenceDataUseCase referenceDataUseCase(){ return new ReferenceDataUseCase(); }
}
