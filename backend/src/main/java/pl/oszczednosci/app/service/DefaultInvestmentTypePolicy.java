package pl.oszczednosci.app.service;

import org.springframework.stereotype.Component;

import pl.oszczednosci.app.model.InvestmentType;

@Component
public class DefaultInvestmentTypePolicy implements InvestmentTypePolicy {

    @Override
    public InvestmentType supports() {
        return null;
    }
}
