package pl.oszczednosci.app.controller;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import pl.oszczednosci.app.dto.CreateInvestmentEntryRequest;
import pl.oszczednosci.app.dto.InvestmentEntryResponse;
import pl.oszczednosci.app.model.InvestmentType;
import pl.oszczednosci.app.service.InvestmentEntryService;

@RestController
@RequestMapping("/api")
public class InvestmentEntryController {

    private final InvestmentEntryService service;

    public InvestmentEntryController(InvestmentEntryService service) {
        this.service = service;
    }

    @GetMapping("/investment-types")
    public List<String> investmentTypes() {
        return Arrays.stream(InvestmentType.values())
                .map(Enum::name)
                .toList();
    }

    @PostMapping("/investments")
    @ResponseStatus(HttpStatus.CREATED)
    public InvestmentEntryResponse create(@Valid @RequestBody CreateInvestmentEntryRequest request) {
        return InvestmentEntryResponse.fromEntity(service.create(request));
    }

    @GetMapping("/investments")
    public List<InvestmentEntryResponse> list(@RequestParam(required = false) InvestmentType type) {
        return service.list(type).stream()
                .map(InvestmentEntryResponse::fromEntity)
                .toList();
    }

    @DeleteMapping("/investments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
