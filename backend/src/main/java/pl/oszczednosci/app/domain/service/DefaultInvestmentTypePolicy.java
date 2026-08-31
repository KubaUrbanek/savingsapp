package pl.oszczednosci.app.domain.service;


import pl.oszczednosci.app.domain.model.InvestmentType;

public class DefaultInvestmentTypePolicy implements InvestmentTypePolicy {

    @Override
    public InvestmentType supports() {
        return null;
    }
}
