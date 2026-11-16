package pl.oszczednosci.app.adapter.in.web;
import org.springframework.web.bind.annotation.*;
import pl.oszczednosci.app.application.port.in.PortfolioPlanUseCase;
import pl.oszczednosci.app.domain.model.PortfolioPlan;
@RestController @RequestMapping("/api/portfolio-plans")
public final class PortfolioPlanController {
 private final PortfolioPlanUseCase plans;
 public PortfolioPlanController(PortfolioPlanUseCase plans){this.plans=plans;}
 public record PlanResponse(@jakarta.validation.constraints.NotNull String bonds,@jakarta.validation.constraints.NotNull String gold,@jakarta.validation.constraints.NotNull String developed,@jakarta.validation.constraints.NotNull String emerging,@jakarta.validation.constraints.NotNull Integer allocationVersion, @jakarta.validation.constraints.NotNull String bitcoin) {
  static PlanResponse from(PortfolioPlan p){return p == null ? null : new PlanResponse(p.bonds().toPlainString(),p.gold().toPlainString(),p.developed().toPlainString(),p.emerging().toPlainString(),4,p.bitcoin().toPlainString());}
 }
 @GetMapping public org.springframework.http.ResponseEntity<PlanResponse> load(@RequestParam(defaultValue="household") String scope){var plan=plans.load(scope);return plan == null ? org.springframework.http.ResponseEntity.noContent().build() : org.springframework.http.ResponseEntity.ok(PlanResponse.from(plan));}
 @PutMapping public PlanResponse save(@RequestParam(defaultValue="household") String scope,@jakarta.validation.Valid @RequestBody PlanResponse p){if(p.allocationVersion()!=4) throw new IllegalArgumentException("Nieobsługiwana wersja planu portfela.");var plan=new PortfolioPlan(new java.math.BigDecimal(p.bonds()),new java.math.BigDecimal(p.gold()),new java.math.BigDecimal(p.developed()),new java.math.BigDecimal(p.emerging()),new java.math.BigDecimal(p.bitcoin()));plans.save(scope,plan);return PlanResponse.from(plan);}
}
