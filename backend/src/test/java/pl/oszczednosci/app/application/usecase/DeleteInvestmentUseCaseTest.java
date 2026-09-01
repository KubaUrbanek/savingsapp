package pl.oszczednosci.app.application.usecase;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import pl.oszczednosci.app.application.port.out.Clock;
import pl.oszczednosci.app.application.port.out.DeleteResult;
import pl.oszczednosci.app.application.port.out.IdGenerator;
import pl.oszczednosci.app.application.port.out.InvestmentBackupPort;
import pl.oszczednosci.app.application.port.out.InvestmentEntryRepository;
import pl.oszczednosci.app.application.port.out.InvestmentOperationRepository;
import pl.oszczednosci.app.domain.model.InvestmentEntryId;
import pl.oszczednosci.app.domain.model.InvestmentEntryNotFoundException;
import pl.oszczednosci.app.domain.model.InvestmentOperationId;
import pl.oszczednosci.app.domain.model.InvestmentOperationNotFoundException;

final class DeleteInvestmentUseCaseTest {
    private static final Clock CLOCK = () -> Instant.EPOCH;
    private static final IdGenerator IDS = UUID::randomUUID;

    @Test
    void reportsMissingInvestmentEntry() {
        UUID id = UUID.randomUUID();
        InvestmentEntryRepository repository = mock(InvestmentEntryRepository.class);
        when(repository.delete(new InvestmentEntryId(id))).thenReturn(DeleteResult.NOT_FOUND);
        InvestmentEntryUseCase useCase = new InvestmentEntryUseCase(repository, mock(InvestmentBackupPort.class),
                CLOCK, IDS);

        assertThatThrownBy(() -> useCase.delete(id))
                .isInstanceOf(InvestmentEntryNotFoundException.class)
                .hasMessageContaining(id.toString());
    }

    @Test
    void reportsMissingInvestmentOperation() {
        UUID id = UUID.randomUUID();
        InvestmentOperationRepository repository = mock(InvestmentOperationRepository.class);
        when(repository.delete(new InvestmentOperationId(id))).thenReturn(DeleteResult.NOT_FOUND);
        InvestmentOperationUseCase useCase = new InvestmentOperationUseCase(repository, CLOCK, IDS);

        assertThatThrownBy(() -> useCase.delete(id))
                .isInstanceOf(InvestmentOperationNotFoundException.class)
                .hasMessageContaining(id.toString());
    }
}
