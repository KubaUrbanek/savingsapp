package pl.oszczednosci.app.application.usecase;
import java.math.BigDecimal; import java.util.*;
import pl.oszczednosci.app.application.port.in.*; import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*; import pl.oszczednosci.app.domain.service.*;
public final class InvestmentEntryUseCase implements CreateInvestmentEntryUseCase, UpdateInvestmentEntryUseCase,
 ListInvestmentEntriesUseCase, DeleteInvestmentEntryUseCase, ImportInvestmentEntriesUseCase, ExportInvestmentEntriesUseCase {
 private final InvestmentEntryRepository repository; private final InvestmentDatabaseStorage storage;
 private final InvestmentTypePolicyRegistry policies; private final Clock clock; private final IdGenerator ids;
 public InvestmentEntryUseCase(InvestmentEntryRepository repository, InvestmentDatabaseStorage storage, InvestmentTypePolicyRegistry policies, Clock clock, IdGenerator ids) { this.repository=repository; this.storage=storage; this.policies=policies; this.clock=clock; this.ids=ids; }
 public InvestmentEntry create(CreateInvestmentEntryCommand c) { BigDecimal value=policies.forType(c.type()).normalizePln(c.valuePln()); InvestmentEntry e=InvestmentEntry.create(new InvestmentEntryId(ids.nextId()), AssetCategory.of(c.type(),c.subcategory()), PortfolioOwner.of(c.owner()), Money.positive(value), c.date(), clock.now()); return repository.save(e); }
 public InvestmentEntry update(UUID id, CreateInvestmentEntryCommand c) { InvestmentEntry e=repository.findById(id).orElseThrow(()->new InvestmentEntryNotFoundException(id)); return repository.save(e.update(AssetCategory.of(c.type(),c.subcategory()), PortfolioOwner.of(c.owner()), Money.positive(policies.forType(c.type()).normalizePln(c.valuePln())),c.date(),clock.now())); }
 public List<InvestmentEntry> list(InvestmentFilter f) { if(f.type()!=null&&f.subcategory()!=null) AssetCategory.of(f.type(),f.subcategory()); return repository.findByOwner(f.owner()).stream().filter(e->f.type()==null||e.getType()==f.type()).filter(e->f.subcategory()==null||e.getSubcategory()==f.subcategory()).toList(); }
 public void delete(UUID id){repository.deleteById(id);} public byte[] exportDatabase(){return storage.exportDatabase();} public void importDatabase(byte[] bytes){storage.importDatabase(bytes);}
}
