package pl.oszczednosci.app.controller;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.time.LocalDate;

import jakarta.validation.Valid;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import pl.oszczednosci.app.dto.CreateInvestmentEntryRequest;
import pl.oszczednosci.app.dto.InvestmentEntryResponse;
import pl.oszczednosci.app.dto.CreateInvestmentOperationRequest;
import pl.oszczednosci.app.dto.PortfolioPerformanceResponse;
import pl.oszczednosci.app.model.InvestmentOperation;
import pl.oszczednosci.app.model.InvestmentOperationType;
import pl.oszczednosci.app.model.InvestmentSubcategory;
import pl.oszczednosci.app.model.InvestmentType;
import pl.oszczednosci.app.model.PortfolioUser;
import pl.oszczednosci.app.model.AssetCategory;
import pl.oszczednosci.app.service.InvestmentEntryService;
import pl.oszczednosci.app.service.InvestmentOperationService;

@RestController
@RequestMapping("/api")
public class InvestmentEntryController {

    private final InvestmentEntryService service;
    private final InvestmentOperationService operationService;

    public InvestmentEntryController(InvestmentEntryService service, InvestmentOperationService operationService) {
        this.service = service;
        this.operationService = operationService;
    }

    @GetMapping("/investment-types")
    public List<String> investmentTypes() {
        return Arrays.stream(InvestmentType.values())
                .map(Enum::name)
                .toList();
    }

    @GetMapping("/investment-subcategories")
    public List<String> investmentSubcategories(@RequestParam InvestmentType type) {
        return AssetCategory.allowedSubcategories(type).stream()
                .map(Enum::name)
                .toList();
    }

    @GetMapping("/users")
    public List<String> users() {
        return Arrays.stream(PortfolioUser.values())
                .map(Enum::name)
                .toList();
    }

    @GetMapping("/investment-operation-types")
    public List<String> operationTypes() {
        return Arrays.stream(InvestmentOperationType.values()).map(Enum::name).toList();
    }

    @PostMapping("/investment-operations")
    @ResponseStatus(HttpStatus.CREATED)
    public InvestmentOperation createOperation(@Valid @RequestBody CreateInvestmentOperationRequest request) {
        return operationService.create(request);
    }

    @GetMapping("/investment-operations")
    public List<InvestmentOperation> operations(@RequestParam PortfolioUser owner,
            @RequestParam(required = false) InvestmentType type,
            @RequestParam(required = false) InvestmentSubcategory subcategory) {
        return operationService.list(owner, type, subcategory);
    }

    @DeleteMapping("/investment-operations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOperation(@PathVariable UUID id) { operationService.delete(id); }

    @GetMapping("/portfolio-performance")
    public PortfolioPerformanceResponse performance(@RequestParam PortfolioUser owner,
            @RequestParam(required = false) InvestmentType type,
            @RequestParam(required = false) InvestmentSubcategory subcategory,
            @RequestParam(required = false) LocalDate valuationDate) {
        return operationService.performance(owner, type, subcategory,
                valuationDate == null ? LocalDate.now() : valuationDate);
    }

    @PostMapping("/investments")
    @ResponseStatus(HttpStatus.CREATED)
    public InvestmentEntryResponse create(@Valid @RequestBody CreateInvestmentEntryRequest request) {
        return InvestmentEntryResponse.fromEntity(service.create(request));
    }

    @PutMapping("/investments/{id}")
    public InvestmentEntryResponse update(@PathVariable UUID id, @Valid @RequestBody CreateInvestmentEntryRequest request) {
        return InvestmentEntryResponse.fromEntity(service.update(id, request));
    }

    @GetMapping("/investments")
    public List<InvestmentEntryResponse> list(
            @RequestParam PortfolioUser owner,
            @RequestParam(required = false) InvestmentType type,
            @RequestParam(required = false) InvestmentSubcategory subcategory
    ) {
        return service.list(owner, type, subcategory).stream()
                .map(InvestmentEntryResponse::fromEntity)
                .toList();
    }


    @GetMapping(value = "/database/export", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> exportDatabase() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("investment-entries-database.json")
                        .build()
                        .toString())
                .body(service.exportDatabase());
    }

    @PostMapping(value = "/database/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void importDatabase(@RequestParam("file") MultipartFile file) throws java.io.IOException {
        service.importDatabase(file.getBytes());
    }

    @DeleteMapping("/investments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
