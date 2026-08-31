package pl.oszczednosci.app.application.exception;

public class MalformedImportException extends RuntimeException {
    public MalformedImportException(String message) { super(message); }
    public MalformedImportException(String message, Throwable cause) { super(message, cause); }
}
