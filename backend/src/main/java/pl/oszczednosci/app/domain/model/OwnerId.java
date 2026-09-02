package pl.oszczednosci.app.domain.model;

import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

/** Stable, immutable identity of a portfolio owner. */
public record OwnerId(String value) {
    private static final Pattern FORMAT = Pattern.compile("[a-z][a-z0-9-]{1,63}");

    public OwnerId {
        Objects.requireNonNull(value, "Owner id is required");
        if (!FORMAT.matcher(value).matches()) {
            throw new IllegalArgumentException("Owner id must be a lowercase stable identifier");
        }
    }

    public static OwnerId of(String value) {
        return new OwnerId(value);
    }

    /** Accepts the two enum names used by pre-OwnerId JSON backups. */
    public static OwnerId fromExternal(String value) {
        Objects.requireNonNull(value, "Owner id is required");
        return switch (value) {
            case "JAKUB" -> of("jakub");
            case "ZOSIA" -> of("zosia");
            default -> of(value.toLowerCase(Locale.ROOT));
        };
    }

    @Override public String toString() { return value; }
}
