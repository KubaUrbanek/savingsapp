package pl.oszczednosci.app.adapter.in.web;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import pl.oszczednosci.app.application.port.in.*;
import pl.oszczednosci.app.domain.model.OwnerId;
@RestController @RequestMapping("/api/portfolio-changes")
public final class PortfolioChangeController {
    private final RecordPortfolioChangeUseCase changes;
    public PortfolioChangeController(RecordPortfolioChangeUseCase changes) { this.changes=changes; }
    @PostMapping public RecordPortfolioChangeResult record(@Valid @RequestBody RecordPortfolioChangeRequest r) {
        return changes.record(new RecordPortfolioChangeCommand(r.requestId(),r.kind(),OwnerId.fromExternal(r.owner()),r.type(),r.subcategory(),r.date(),r.amountPln(),r.valuePln(),r.cashType()));
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id) { changes.delete(id); }
}
