package pl.oszczednosci.app.application.usecase;
import java.math.BigDecimal; import java.util.*;
import pl.oszczednosci.app.application.port.in.*; import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*; import pl.oszczednosci.app.domain.service.*;
public final class InvestmentEntryUseCase implements CreateInvestmentEntryUseCase, UpdateInvestmentEntryUseCase,
 ListInvestmentEntriesUseCase, DeleteInvestmentEntryUseCase, ImportInvestmentEntriesUseCase, ExportInvestmentEntriesUseCase {
 private final InvestmentEntryRepository repository; private final InvestmentDatabaseStorage storage;
 private final InvestmentTypePolicyRegistry policies; private final Clock clock;
 public InvestmentEntryUseCase(InvestmentEntryRepository repository, InvestmentDatabaseStorage storage, InvestmentTypePolicyRegistry policies, Clock clock) { this.repository=repository; this.storage=storage; this.policies=policies; this.clock=clock; }
 public InvestmentEntry create(CreateInvestmentEntryCommand c) { InvestmentCategoryRules.validate(c.type(),c.subcategory()); BigDecimal value=policies.forType(c.type()).normalizePln(c.valuePln()); InvestmentEntry e=new InvestmentEntry(c.type(),c.owner(),c.subcategory(),value,c.date()); e.prepareForSave(clock.now()); return repository.save(e); }
 public InvestmentEntry update(UUID id, CreateInvestmentEntryCommand c) { InvestmentCategoryRules.validate(c.type(),c.subcategory()); InvestmentEntry e=repository.findById(id).orElseThrow(()->new InvestmentEntryNotFoundException(id)); e.update(c.type(),c.owner(),c.subcategory(),policies.forType(c.type()).normalizePln(c.valuePln()),c.date(),clock.now()); return repository.save(e); }
 public List<InvestmentEntry> list(InvestmentFilter f) { if(f.type()!=null&&f.subcategory()!=null) InvestmentCategoryRules.validate(f.type(),f.subcategory()); return repository.findByOwner(f.owner()).stream().filter(e->f.type()==null||e.getType()==f.type()).filter(e->f.subcategory()==null||e.getSubcategory()==f.subcategory()).toList(); }
 public void delete(UUID id){repository.deleteById(id);} public byte[] exportDatabase(){return storage.exportDatabase();}
 public void importDatabase(ImportInvestmentEntriesCommand command){storage.importDatabase(command.contents());}
}
