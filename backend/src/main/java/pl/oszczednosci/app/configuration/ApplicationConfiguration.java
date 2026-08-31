package pl.oszczednosci.app.configuration;
import java.nio.file.Path; import java.time.Instant; import java.util.List;
import org.springframework.beans.factory.annotation.Value; import org.springframework.context.annotation.*;
import tools.jackson.databind.ObjectMapper;
import pl.oszczednosci.app.adapter.out.persistence.json.*; import pl.oszczednosci.app.application.port.out.Clock;
import pl.oszczednosci.app.application.usecase.*; import pl.oszczednosci.app.domain.service.*;
@Configuration
public class ApplicationConfiguration {
 @Bean JsonInvestmentEntryRepositoryAdapter entryAdapter(ObjectMapper mapper, @Value("${app.database.file:./backend/data/investment-entries.json}") Path path) { return new JsonInvestmentEntryRepositoryAdapter(mapper,path); }
 @Bean JsonInvestmentOperationRepositoryAdapter operationAdapter(ObjectMapper mapper, @Value("${app.operations.file:./backend/data/investment-operations.json}") Path path) { return new JsonInvestmentOperationRepositoryAdapter(mapper,path); }
 @Bean Clock clock(){ return Instant::now; }
 @Bean DefaultInvestmentTypePolicy defaultPolicy(){ return new DefaultInvestmentTypePolicy(); }
 @Bean InvestmentTypePolicyRegistry policyRegistry(DefaultInvestmentTypePolicy policy){ return new InvestmentTypePolicyRegistry(List.of(policy)); }
 @Bean InvestmentEntryUseCase investmentEntryUseCase(JsonInvestmentEntryRepositoryAdapter adapter, InvestmentTypePolicyRegistry policies, Clock clock){ return new InvestmentEntryUseCase(adapter,adapter,policies,clock); }
 @Bean InvestmentOperationUseCase investmentOperationUseCase(JsonInvestmentOperationRepositoryAdapter operations, JsonInvestmentEntryRepositoryAdapter entries, Clock clock){ return new InvestmentOperationUseCase(operations,entries,clock); }
}
