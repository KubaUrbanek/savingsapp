package pl.oszczednosci.app.domain.service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;


import pl.oszczednosci.app.domain.model.InvestmentType;

public class InvestmentTypePolicyRegistry {

    private final Map<InvestmentType, InvestmentTypePolicy> policies = new EnumMap<>(InvestmentType.class);
    private final InvestmentTypePolicy defaultPolicy;

    public InvestmentTypePolicyRegistry(List<InvestmentTypePolicy> policyList) {
        this.defaultPolicy = policyList.stream()
                .filter(policy -> policy.supports() == null)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Default investment policy is missing"));

        policyList.stream()
                .filter(policy -> policy.supports() != null)
                .forEach(policy -> policies.put(policy.supports(), policy));
    }

    public InvestmentTypePolicy forType(InvestmentType type) {
        return policies.getOrDefault(type, defaultPolicy);
    }
}
