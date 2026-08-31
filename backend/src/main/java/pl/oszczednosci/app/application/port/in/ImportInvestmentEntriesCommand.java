package pl.oszczednosci.app.application.port.in;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import pl.oszczednosci.app.application.exception.MalformedImportException;

public record ImportInvestmentEntriesCommand(byte[] contents) {
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    public ImportInvestmentEntriesCommand {
        contents = Arrays.copyOf(contents, contents.length);
        if (contents.length > MAX_BYTES) throw new MalformedImportException("Import file exceeds 5 MiB.");
    }
    public static ImportInvestmentEntriesCommand from(InputStream input) throws IOException {
        return new ImportInvestmentEntriesCommand(input.readNBytes(MAX_BYTES + 1));
    }
    @Override public byte[] contents() { return Arrays.copyOf(contents, contents.length); }
}
