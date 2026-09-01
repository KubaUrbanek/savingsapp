// @ts-nocheck
import React from 'react';

// The hook is deliberately transport-agnostic: its dependencies are application use cases.
export function usePortfolioCommands(useCases) {
  return React.useMemo(
    () => ({
      loadPortfolio: (query) => useCases.loadPortfolio.execute(query),
      loadPortfolioPerformance: (filters) => useCases.loadPortfolioPerformance.execute(filters),
      loadReferenceData: () => useCases.loadReferenceData.execute(),
      recordPortfolioChange: (command) => useCases.recordPortfolioChange.execute(command),
      deleteInvestmentEntry: (id) => useCases.deleteInvestmentEntry.execute(id),
      deleteInvestmentOperation: (id) => useCases.deleteInvestmentOperation.execute(id),
      exportDatabaseBackup: () => useCases.exportDatabaseBackup.execute(),
      importDatabaseBackup: (file) => useCases.importDatabaseBackup.execute(file)
    }),
    [useCases]
  );
}
