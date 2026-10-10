package pl.oszczednosci.app.adapter.in.web;
import org.springframework.web.bind.annotation.*;
import pl.oszczednosci.app.application.port.in.PortfolioPlanUseCase;
import pl.oszczednosci.app.domain.model.PortfolioPlan;
@RestController @RequestMapping("/api/portfolio-plans")
public final class PortfolioPlanController {
 private final PortfolioPlanUseCase plans;
 public PortfolioPlanController(PortfolioPlanUseCase plans){this.plans=plans;}
 public record PlanResponse(@jakarta.validation.constraints.NotNull Double bonds,@jakarta.validation.constraints.NotNull Double stocks,@jakarta.validation.constraints.NotNull Double gold,@jakarta.validation.constraints.NotNull Double developed,@jakarta.validation.constraints.NotNull Double emerging) {
  static PlanResponse from(PortfolioPlan p){return new PlanResponse(p.bonds(),p.stocks(),p.gold(),p.developed(),p.emerging());}
 }
 @GetMapping public PlanResponse load(@RequestParam String scope){return PlanResponse.from(plans.load(scope));}
 @PutMapping public PlanResponse save(@RequestParam String scope,@jakarta.validation.Valid @RequestBody PlanResponse p){var plan=new PortfolioPlan(p.bonds(),p.stocks(),p.gold(),p.developed(),p.emerging());plans.save(scope,plan);return PlanResponse.from(plan);}
}
