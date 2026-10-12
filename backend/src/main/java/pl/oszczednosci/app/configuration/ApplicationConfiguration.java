package pl.oszczednosci.app.configuration;
import pl.oszczednosci.app.adapter.out.persistence.UnitOfWorkInvestmentOperationRepository;
import pl.oszczednosci.app.adapter.out.persistence.UnitOfWorkInvestmentEntryRepository;
import java.nio.file.Path; import java.time.Instant; import java.util.List; import java.util.UUID;
import org.springframework.beans.factory.annotation.Value; import org.springframework.context.annotation.*;
import tools.jackson.databind.ObjectMapper;
import pl.oszczednosci.app.adapter.out.persistence.jdbc.JdbcInvestmentStore; import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.adapter.out.persistence.ConfiguredOwnerDirectory;
import pl.oszczednosci.app.application.usecase.*; import pl.oszczednosci.app.domain.service.*;
import pl.oszczednosci.app.domain.model.OwnerId;
@Configuration
public class ApplicationConfiguration {
 @Bean JdbcInvestmentStore investmentStore(ObjectMapper mapper, @Value("${app.database.path:./backend/data/portfolio}") Path path) { return new JdbcInvestmentStore(mapper,path); }
 @Bean UnitOfWorkInvestmentEntryRepository entryRepository(JdbcInvestmentStore store) { return new UnitOfWorkInvestmentEntryRepository(store); }
 @Bean UnitOfWorkInvestmentOperationRepository operationRepository(JdbcInvestmentStore store) { return new UnitOfWorkInvestmentOperationRepository(store); }
 @Bean Clock clock(){ return Instant::now; }
 @Bean IdGenerator idGenerator(){ return UUID::randomUUID; }
 @Bean InvestmentEntryUseCase investmentEntryUseCase(InvestmentEntryRepository repository, InvestmentBackupPort backup, Clock clock, IdGenerator ids){ return new InvestmentEntryUseCase(repository,backup,clock,ids); }
 @Bean InvestmentOperationUseCase investmentOperationUseCase(InvestmentOperationRepository operations, Clock clock, IdGenerator ids){ return new InvestmentOperationUseCase(operations,clock,ids); }
 @Bean PortfolioPlanService portfolioPlanService(InvestmentUnitOfWork work){return new PortfolioPlanService(work);}
 @Bean RecordPortfolioChangeService recordPortfolioChangeService(InvestmentUnitOfWork work, Clock clock, IdGenerator ids){ return new RecordPortfolioChangeService(work,clock,ids); }
 @Bean RateOfReturnCalculator rateOfReturnCalculator(){ return new NumericalRateOfReturnCalculator(); }
 @Bean PortfolioPerformanceCalculator portfolioPerformanceCalculator(RateOfReturnCalculator rates){ return new PortfolioPerformanceCalculator(rates); }
 @Bean CalculatePortfolioPerformanceService calculatePortfolioPerformanceService(InvestmentUnitOfWork work, PortfolioPerformanceCalculator calculator, Clock clock){ return new CalculatePortfolioPerformanceService(work,calculator,clock); }
 @Bean OwnerDirectory ownerDirectory(){ return new ConfiguredOwnerDirectory(List.of(OwnerId.of("jakub"), OwnerId.of("zosia"))); }
 @Bean ReferenceDataUseCase referenceDataUseCase(OwnerDirectory owners){ return new ReferenceDataUseCase(owners); }
}
