package pl.oszczednosci.app.domain.model;
/** Two levels: asset classes, then equities only. Cash and unknown compositions stay outside. */
public record PortfolioPlan(double bonds,double stocks,double gold,double developed,double emerging) {
 public PortfolioPlan {
  for(double v:new double[]{bonds,stocks,gold,developed,emerging}) if(!Double.isFinite(v)||v<0||v>100) throw new IllegalArgumentException("Waga musi mieścić się w zakresie 0–100%.");
  if(Math.abs(bonds+stocks+gold-100)>0.000001 || Math.abs(developed+emerging-100)>0.000001) throw new IllegalArgumentException("Wagi na każdym poziomie muszą sumować się do 100%.");
 }
 public static PortfolioPlan defaults(){return new PortfolioPlan(50,50,0,70,30);}
}
