package pl.oszczednosci.app.application.port.out; public interface InvestmentDatabaseStorage { byte[] exportDatabase(); void importDatabase(byte[] contents); }
