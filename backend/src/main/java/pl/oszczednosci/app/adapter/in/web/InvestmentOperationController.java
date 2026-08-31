package pl.oszczednosci.app.adapter.in.web;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import pl.oszczednosci.app.application.port.in.*;

@RestController @RequestMapping("/api/investment-operations")
public class InvestmentOperationController {
    private final CreateInvestmentOperationUseCase create;
    private final ListInvestmentOperationsUseCase list;
    private final DeleteInvestmentOperationUseCase delete;
    private final InvestmentWebMapper mapper;
    public InvestmentOperationController(CreateInvestmentOperationUseCase create,
            ListInvestmentOperationsUseCase list, DeleteInvestmentOperationUseCase delete, InvestmentWebMapper mapper) {
        this.create=create; this.list=list; this.delete=delete; this.mapper=mapper;
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public InvestmentOperationResponse create(@Valid @RequestBody CreateInvestmentOperationRequest request) {
        return mapper.toResponse(create.create(mapper.toCommand(request)));
    }
    @GetMapping public List<InvestmentOperationResponse> list(@Valid @ModelAttribute InvestmentFilterRequest request) {
        return list.list(mapper.toFilter(request)).stream().map(mapper::toResponse).toList();
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { delete.delete(id); }
}
