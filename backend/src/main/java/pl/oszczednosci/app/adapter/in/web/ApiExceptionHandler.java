package pl.oszczednosci.app.adapter.in.web;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import pl.oszczednosci.app.application.exception.*;
import pl.oszczednosci.app.domain.model.InvestmentEntryNotFoundException;
import pl.oszczednosci.app.domain.model.InvestmentOperationNotFoundException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    ResponseEntity<ApiErrorResponse> validation(Exception exception) {
        var binding = exception instanceof MethodArgumentNotValidException method ? method.getBindingResult()
                : ((BindException) exception).getBindingResult();
        Map<String, String> fields = new LinkedHashMap<>();
        binding.getFieldErrors().forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return response(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Request validation failed.", fields);
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, IllegalArgumentException.class})
    ResponseEntity<ApiErrorResponse> invalidRequest(Exception exception) {
        return response(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", exception.getMessage(), Map.of());
    }

    @ExceptionHandler({InvestmentEntryNotFoundException.class, InvestmentOperationNotFoundException.class})
    ResponseEntity<ApiErrorResponse> notFound(RuntimeException exception) {
        return response(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage(), Map.of());
    }

    @ExceptionHandler({MalformedImportException.class, IOException.class})
    ResponseEntity<ApiErrorResponse> malformedImport(Exception exception) {
        return response(HttpStatus.BAD_REQUEST, "MALFORMED_IMPORT", exception.getMessage(), Map.of());
    }

    @ExceptionHandler(PersistenceException.class)
    ResponseEntity<ApiErrorResponse> persistence(PersistenceException exception) {
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "PERSISTENCE_ERROR",
                "The data store could not complete the request.", Map.of());
    }

    private ResponseEntity<ApiErrorResponse> response(HttpStatus status, String code, String message,
            Map<String, String> fields) {
        return ResponseEntity.status(status).body(new ApiErrorResponse(code, message, Instant.now(), fields));
    }
}
