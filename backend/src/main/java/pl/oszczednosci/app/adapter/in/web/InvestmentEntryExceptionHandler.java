package pl.oszczednosci.app.adapter.in.web;
import java.util.Map; import org.springframework.http.*; import org.springframework.web.bind.annotation.*;
import pl.oszczednosci.app.domain.model.InvestmentEntryNotFoundException;
@RestControllerAdvice
public class InvestmentEntryExceptionHandler {
 @ExceptionHandler(InvestmentEntryNotFoundException.class)
 public ResponseEntity<Map<String,String>> notFound(InvestmentEntryNotFoundException exception) { return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", exception.getMessage())); }
}
