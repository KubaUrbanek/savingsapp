package pl.oszczednosci.app.application.usecase;
import java.util.*;
import pl.oszczednosci.app.application.port.in.*; import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*;
public final class InvestmentEntryUseCase implements CreateInvestmentEntryUseCase, UpdateInvestmentEntryUseCase,
 ListInvestmentEntriesUseCase, DeleteInvestmentEntryUseCase, ImportInvestmentEntriesUseCase, ExportInvestmentEntriesUseCase {
 private final InvestmentEntryRepository repository; private final InvestmentBackupPort storage;
 private final Clock clock; private final IdGenerator ids;
 public InvestmentEntryUseCase(InvestmentEntryRepository repository, InvestmentBackupPort storage, Clock clock, IdGenerator ids) { this.repository=repository; this.storage=storage; this.clock=clock; this.ids=ids; }
 public InvestmentEntry create(CreateInvestmentEntryCommand c) { InvestmentEntry e=InvestmentEntry.create(new InvestmentEntryId(ids.nextId()), AssetCategory.of(c.type(),c.subcategory()), PortfolioOwner.of(c.owner()), Money.positive(c.valuePln()), c.date(), clock.now()); return repository.save(e); }
 public InvestmentEntry update(UUID id, CreateInvestmentEntryCommand c) { InvestmentEntry e=repository.find(new InvestmentEntryId(id)).orElseThrow(()->new InvestmentEntryNotFoundException(id)); return repository.save(e.update(AssetCategory.of(c.type(),c.subcategory()), PortfolioOwner.of(c.owner()), Money.positive(c.valuePln()),c.date(),clock.now())); }
 public List<InvestmentEntry> list(InvestmentFilter f) { if(f.type()!=null&&f.subcategory()!=null) AssetCategory.of(f.type(),f.subcategory()); return repository.matching(new InvestmentEntryCriteria(f.owner(),f.type(),f.subcategory())); }
 public void delete(UUID id) {
  if (repository.delete(new InvestmentEntryId(id)) == DeleteResult.NOT_FOUND) {
   throw new InvestmentEntryNotFoundException(id);
  }
 }
 public byte[] exportDatabase(){return storage.exportBackup();}
 public void importDatabase(ImportInvestmentEntriesCommand command){storage.importBackup(command.contents());}
}
