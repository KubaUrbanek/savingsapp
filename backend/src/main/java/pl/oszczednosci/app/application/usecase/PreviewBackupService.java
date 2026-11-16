package pl.oszczednosci.app.application.usecase;
import java.util.stream.Stream;
import pl.oszczednosci.app.application.port.in.PreviewBackupUseCase;
import pl.oszczednosci.app.application.port.out.BackupInspectionPort;
public final class PreviewBackupService implements PreviewBackupUseCase {
 private final BackupInspectionPort inspection;
 public PreviewBackupService(BackupInspectionPort inspection) {this.inspection=inspection;}
 public Preview preview(byte[] bytes) {
  var b=inspection.inspect(bytes);
  return new Preview(b.formatVersion(), b.entries().size(), b.operations().size(),
   Stream.concat(b.entries().stream().map(e->e.owner().value()), b.operations().stream().map(o->o.owner().value())).distinct().sorted().toList(), b.plans().containsKey("household"));
 }
}
