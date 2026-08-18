package pl.oszczednosci.app.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import pl.oszczednosci.app.dto.CreateInvestmentOperationRequest;
import pl.oszczednosci.app.dto.PortfolioPerformanceResponse;
import pl.oszczednosci.app.model.InvestmentEntry;
import pl.oszczednosci.app.model.InvestmentOperation;
import pl.oszczednosci.app.model.InvestmentOperationType;
import pl.oszczednosci.app.model.InvestmentSubcategory;
import pl.oszczednosci.app.model.InvestmentType;
import pl.oszczednosci.app.model.PortfolioUser;
import pl.oszczednosci.app.repository.InvestmentEntryRepository;
import pl.oszczednosci.app.repository.InvestmentOperationRepository;

@Service
public class InvestmentOperationService {
    private static final int SCALE = 2;
    private final InvestmentOperationRepository operationRepository;
    private final InvestmentEntryRepository entryRepository;

    public InvestmentOperationService(InvestmentOperationRepository operationRepository,
            InvestmentEntryRepository entryRepository) {
        this.operationRepository = operationRepository;
        this.entryRepository = entryRepository;
    }

    public InvestmentOperation create(CreateInvestmentOperationRequest request) {
        InvestmentCategoryRules.validate(request.type(), request.subcategory());
        return operationRepository.save(new InvestmentOperation(null, request.operationType(), request.type(), request.owner(),
                request.subcategory(), money(request.amountPln()), moneyOrZero(request.feePln()), moneyOrZero(request.taxPln()),
                request.date(), request.note() == null ? null : request.note().trim(), null));
    }

    public List<InvestmentOperation> list(PortfolioUser owner, InvestmentType type, InvestmentSubcategory subcategory) {
        if (type != null && subcategory != null) InvestmentCategoryRules.validate(type, subcategory);
        return operationRepository.findByOwner(owner).stream()
                .filter(operation -> type == null || operation.getType() == type)
                .filter(operation -> subcategory == null || operation.getSubcategory() == subcategory)
                .toList();
    }

    public void delete(UUID id) { operationRepository.deleteById(id); }

    public PortfolioPerformanceResponse performance(PortfolioUser owner, InvestmentType type,
            InvestmentSubcategory subcategory, LocalDate valuationDate) {
        List<InvestmentOperation> operations = list(owner, type, subcategory).stream()
                .filter(operation -> !operation.getDate().isAfter(valuationDate)).toList();
        BigDecimal currentValue = currentValue(owner, type, subcategory, valuationDate);
        BigDecimal deposits = sum(operations, InvestmentOperationType.DEPOSIT);
        BigDecimal withdrawals = sum(operations, InvestmentOperationType.WITHDRAWAL);
        BigDecimal capital = deposits.subtract(withdrawals);
        BigDecimal fees = operations.stream().map(InvestmentOperation::getFeePln).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal taxes = operations.stream().map(InvestmentOperation::getTaxPln).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal nominal = currentValue.subtract(capital);
        BigDecimal rate = capital.signum() > 0
                ? nominal.multiply(BigDecimal.valueOf(100)).divide(capital, 4, RoundingMode.HALF_UP) : null;
        BigDecimal xirr = calculateXirr(operations, currentValue, valuationDate);
        LocalDate monthStart = valuationDate.withDayOfMonth(1);
        BigDecimal openingValue = currentValue(owner, type, subcategory, monthStart.minusDays(1));
        List<InvestmentOperation> monthlyOperations = operations.stream()
                .filter(operation -> !operation.getDate().isBefore(monthStart)).toList();
        BigDecimal monthlyDeposits = sum(monthlyOperations, InvestmentOperationType.DEPOSIT);
        BigDecimal monthlyWithdrawals = sum(monthlyOperations, InvestmentOperationType.WITHDRAWAL);
        BigDecimal monthlyResult = currentValue.subtract(openingValue).subtract(monthlyDeposits).add(monthlyWithdrawals);
        BigDecimal monthlyBase = openingValue.add(monthlyDeposits);
        BigDecimal monthlyRate = monthlyBase.signum() > 0
                ? monthlyResult.multiply(BigDecimal.valueOf(100)).divide(monthlyBase, 4, RoundingMode.HALF_UP) : null;
        return new PortfolioPerformanceResponse(money(currentValue), money(capital), money(nominal), rate,
                money(fees), money(taxes), money(nominal.subtract(fees).subtract(taxes)), xirr,
                money(monthlyResult), monthlyRate);
    }

    private BigDecimal currentValue(PortfolioUser owner, InvestmentType type, InvestmentSubcategory subcategory,
            LocalDate valuationDate) {
        Map<String, InvestmentEntry> latest = new HashMap<>();
        entryRepository.findByOwnerOrderByDateDescCreatedAtDesc(owner).stream()
                .filter(entry -> !entry.getDate().isAfter(valuationDate))
                .filter(entry -> type == null || entry.getType() == type)
                .filter(entry -> subcategory == null || entry.getSubcategory() == subcategory)
                .forEach(entry -> latest.putIfAbsent(entry.getType() + ":" + entry.getSubcategory(), entry));
        return latest.values().stream().map(InvestmentEntry::getValuePln).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sum(List<InvestmentOperation> operations, InvestmentOperationType operationType) {
        return operations.stream().filter(value -> value.getOperationType() == operationType)
                .map(InvestmentOperation::getAmountPln).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateXirr(List<InvestmentOperation> operations, BigDecimal currentValue, LocalDate valuationDate) {
        List<CashFlow> flows = new ArrayList<>();
        operations.forEach(operation -> {
            if (operation.getOperationType() == InvestmentOperationType.DEPOSIT) {
                flows.add(new CashFlow(operation.getDate(), operation.getAmountPln().add(operation.getFeePln()).negate().doubleValue()));
            } else if (operation.getOperationType() == InvestmentOperationType.WITHDRAWAL) {
                flows.add(new CashFlow(operation.getDate(), operation.getAmountPln().subtract(operation.getFeePln())
                        .subtract(operation.getTaxPln()).doubleValue()));
            }
        });
        if (currentValue.signum() != 0) flows.add(new CashFlow(valuationDate, currentValue.doubleValue()));
        if (flows.stream().noneMatch(flow -> flow.amount < 0) || flows.stream().noneMatch(flow -> flow.amount > 0)) return null;
        LocalDate start = flows.stream().map(CashFlow::date).min(LocalDate::compareTo).orElse(valuationDate);
        double low = -0.9999;
        double high = 10.0;
        double lowValue = npv(flows, start, low);
        double highValue = npv(flows, start, high);
        while (Math.signum(lowValue) == Math.signum(highValue) && high < 1_000_000) {
            high *= 10;
            highValue = npv(flows, start, high);
        }
        if (Math.signum(lowValue) == Math.signum(highValue)) return null;
        for (int index = 0; index < 150; index++) {
            double middle = (low + high) / 2;
            double value = npv(flows, start, middle);
            if (Math.abs(value) < 0.000001) {
                return BigDecimal.valueOf(middle * 100).setScale(4, RoundingMode.HALF_UP);
            }
            if (Math.signum(value) == Math.signum(lowValue)) { low = middle; lowValue = value; }
            else high = middle;
        }
        return BigDecimal.valueOf(((low + high) / 2) * 100).setScale(4, RoundingMode.HALF_UP);
    }

    private double npv(List<CashFlow> flows, LocalDate start, double rate) {
        return flows.stream().mapToDouble(flow -> flow.amount / Math.pow(1 + rate,
                ChronoUnit.DAYS.between(start, flow.date) / 365.0)).sum();
    }

    private BigDecimal money(BigDecimal value) { return value.setScale(SCALE, RoundingMode.HALF_UP); }
    private BigDecimal moneyOrZero(BigDecimal value) { return money(value == null ? BigDecimal.ZERO : value); }
    private record CashFlow(LocalDate date, double amount) {}
}
