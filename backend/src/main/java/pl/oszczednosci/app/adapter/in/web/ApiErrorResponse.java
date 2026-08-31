package pl.oszczednosci.app.adapter.in.web;

import java.time.Instant;
import java.util.Map;

public record ApiErrorResponse(String code, String message, Instant timestamp, Map<String, String> fieldErrors) {
}
