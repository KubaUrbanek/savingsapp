package pl.oszczednosci.app.adapter.out.persistence.json;

import java.util.List;

record InvestmentBackupJsonDocument(int formatVersion, List<InvestmentEntryJsonRecord> entries,
        List<InvestmentOperationJsonRecord> operations) { }
