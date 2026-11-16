package pl.oszczednosci.app.application.usecase;
import java.util.Map;
import java.util.stream.Stream;
import pl.oszczednosci.app.application.port.in.PreviewBackupUseCase;
import pl.oszczednosci.app.application.port.out.BackupInspectionPort;
import pl.oszczednosci.app.application.port.out.InvestmentBackup;
public final class PreviewBackupService implements PreviewBackupUseCase {
 private final BackupInspectionPort inspection;
 public PreviewBackupService(BackupInspectionPort inspection) {this.inspection=inspection;}
 public Preview preview(byte[] bytes, String selectedPlan) {
  var b=inspection.inspect(bytes); // All plans are validated before any selection.
  var shared=b.plans().get("household");
  if(shared==null && selectedPlan!=null) {
   shared=b.plans().get(selectedPlan);
   if(shared==null) throw new IllegalArgumentException("Wybierz plan dostępny w kopii.");
  }
  byte[] prepared=null;
  if(shared!=null || b.plans().isEmpty()) {
   var canonical=new InvestmentBackup(b.formatVersion(),b.entries(),b.operations(),shared==null ? Map.of() : Map.of("household",shared));
   prepared=inspection.serialize(canonical);
  }
  return new Preview(b.formatVersion(), b.entries().size(), b.operations().size(),
   Stream.concat(b.entries().stream().map(e->e.owner().value()), b.operations().stream().map(o->o.owner().value())).distinct().sorted().toList(), shared!=null, prepared);
 }
}
