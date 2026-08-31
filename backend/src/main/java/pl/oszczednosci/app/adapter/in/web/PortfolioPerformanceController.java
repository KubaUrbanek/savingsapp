package pl.oszczednosci.app.adapter.in.web;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import pl.oszczednosci.app.application.port.in.CalculatePortfolioPerformanceUseCase;

@RestController @RequestMapping("/api/portfolio-performance")
public class PortfolioPerformanceController {
    private final CalculatePortfolioPerformanceUseCase performance;
    private final InvestmentWebMapper mapper;
    public PortfolioPerformanceController(CalculatePortfolioPerformanceUseCase performance, InvestmentWebMapper mapper) {
        this.performance=performance; this.mapper=mapper;
    }
    @GetMapping public PortfolioPerformanceResponse performance(@Valid @ModelAttribute PortfolioPerformanceRequest request) {
        return mapper.toResponse(performance.calculate(mapper.toFilter(request.filter()), request.valuationDate()));
    }
}
