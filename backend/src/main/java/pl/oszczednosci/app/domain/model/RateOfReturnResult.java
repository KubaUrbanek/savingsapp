package pl.oszczednosci.app.domain.model;
import java.math.BigDecimal;
public record RateOfReturnResult(Status status, BigDecimal percent) {
 public enum Status { CALCULATED, ZERO_CASH_FLOWS, SAME_DAY_FLOWS, NO_SIGN_CHANGE, MULTIPLE_ROOTS, CONVERGENCE_FAILURE }
 public RateOfReturnResult { if ((status==Status.CALCULATED) != (percent!=null)) throw new IllegalArgumentException("Only calculated results have a rate"); }
 public static RateOfReturnResult calculated(BigDecimal percent) { return new RateOfReturnResult(Status.CALCULATED, percent); }
 public static RateOfReturnResult failure(Status status) { return new RateOfReturnResult(status, null); }
}
