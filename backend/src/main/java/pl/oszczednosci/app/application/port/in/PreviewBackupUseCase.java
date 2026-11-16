package pl.oszczednosci.app.application.port.in;
import java.util.List;
public interface PreviewBackupUseCase {
 record Preview(int formatVersion, int entries, int operations, List<String> owners, boolean sharedPlan) {}
 Preview preview(byte[] document);
}
