package pl.oszczednosci.app.adapter.in.web;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pl.oszczednosci.app.application.port.in.*;

@RestController
@RequestMapping("/api")
public class InvestmentEntryController {
    private final CreateInvestmentEntryUseCase create;
    private final UpdateInvestmentEntryUseCase update;
    private final ListInvestmentEntriesUseCase list;
    private final DeleteInvestmentEntryUseCase delete;
    private final ImportInvestmentEntriesUseCase importer;
    private final ExportInvestmentEntriesUseCase exporter;
    private final InvestmentWebMapper mapper;

    public InvestmentEntryController(CreateInvestmentEntryUseCase create, UpdateInvestmentEntryUseCase update,
            ListInvestmentEntriesUseCase list, DeleteInvestmentEntryUseCase delete,
            ImportInvestmentEntriesUseCase importer, ExportInvestmentEntriesUseCase exporter,
            InvestmentWebMapper mapper) {
        this.create = create; this.update = update; this.list = list; this.delete = delete;
        this.importer = importer; this.exporter = exporter; this.mapper = mapper;
    }

    @PostMapping("/investments") @ResponseStatus(HttpStatus.CREATED)
    public InvestmentEntryResponse create(@Valid @RequestBody CreateInvestmentEntryRequest request) {
        return mapper.toResponse(create.create(mapper.toCommand(request)));
    }

    @PutMapping("/investments/{id}")
    public InvestmentEntryResponse update(@PathVariable UUID id,
            @Valid @RequestBody CreateInvestmentEntryRequest request) {
        return mapper.toResponse(update.update(id, mapper.toCommand(request)));
    }

    @GetMapping("/investments")
    public List<InvestmentEntryResponse> list(@Valid @ModelAttribute InvestmentFilterRequest request) {
        return list.list(mapper.toFilter(request)).stream().map(mapper::toResponse).toList();
    }

    @DeleteMapping("/investments/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { delete.delete(id); }

    @GetMapping(value = "/database/export", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> exportDatabase() {
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename("investment-entries-database.json").build().toString())
                .body(exporter.exportDatabase());
    }

    @PostMapping(value = "/database/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void importDatabase(@RequestParam("file") MultipartFile file) throws IOException {
        importer.importDatabase(ImportInvestmentEntriesCommand.from(file.getInputStream()));
    }
}
