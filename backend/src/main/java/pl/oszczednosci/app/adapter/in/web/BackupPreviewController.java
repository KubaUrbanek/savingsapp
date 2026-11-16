package pl.oszczednosci.app.adapter.in.web;
import java.io.IOException;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import pl.oszczednosci.app.application.port.in.PreviewBackupUseCase;
@RestController
public final class BackupPreviewController {
 private final PreviewBackupUseCase preview;
 public BackupPreviewController(PreviewBackupUseCase preview){this.preview=preview;}
 public record PreviewResponse(int formatVersion,int entries,int operations,java.util.List<String> owners,boolean sharedPlan,String preparedDocument) {}
 @PostMapping(value="/api/database/preview", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
 public PreviewResponse preview(@RequestParam("file") MultipartFile file, @RequestParam(value="selectedPlan", required=false) String selectedPlan) throws IOException {
  var result=preview.preview(file.getBytes(), selectedPlan);
  return new PreviewResponse(result.formatVersion(), result.entries(), result.operations(), result.owners(), result.sharedPlan(), result.document()==null ? null : java.util.Base64.getEncoder().encodeToString(result.document()));
 }
}
