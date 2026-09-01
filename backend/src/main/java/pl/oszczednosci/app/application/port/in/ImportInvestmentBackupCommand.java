package pl.oszczednosci.app.application.port.in;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Objects;
import pl.oszczednosci.app.application.exception.MalformedImportException;

/** Defensive, size-limited transport value for a complete investment backup. */
public record ImportInvestmentBackupCommand(byte[] contents) {
    public static final int MAX_BYTES = 5 * 1024 * 1024;

    public ImportInvestmentBackupCommand {
        Objects.requireNonNull(contents, "contents are required");
        contents = Arrays.copyOf(contents, contents.length);
        if (contents.length > MAX_BYTES) {
            throw new MalformedImportException("Import file exceeds 5 MiB.");
        }
    }

    public static ImportInvestmentBackupCommand from(InputStream input) throws IOException {
        Objects.requireNonNull(input, "input is required");
        return new ImportInvestmentBackupCommand(input.readNBytes(MAX_BYTES + 1));
    }

    @Override
    public byte[] contents() {
        return Arrays.copyOf(contents, contents.length);
    }
}
