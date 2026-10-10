package pl.oszczednosci.app.adapter.out.persistence.json;
import pl.oszczednosci.app.domain.model.PortfolioPlan;
record PortfolioPlanJsonRecord(double bonds,double stocks,double gold,double developed,double emerging) {
 PortfolioPlan toDomain(){return new PortfolioPlan(bonds,stocks,gold,developed,emerging);}
 static PortfolioPlanJsonRecord from(PortfolioPlan p){return new PortfolioPlanJsonRecord(p.bonds(),p.stocks(),p.gold(),p.developed(),p.emerging());}
}
