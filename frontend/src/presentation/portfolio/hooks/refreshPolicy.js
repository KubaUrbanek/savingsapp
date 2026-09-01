export const PortfolioQuery = Object.freeze({
  ENTRIES: 'entries',
  SNAPSHOT: 'snapshot',
  OPERATIONS: 'operations',
  PERFORMANCE: 'performance',
  REFERENCE_DATA: 'referenceData'
});

const policy = Object.freeze({
  recordPortfolioChange: [PortfolioQuery.ENTRIES, PortfolioQuery.SNAPSHOT, PortfolioQuery.OPERATIONS, PortfolioQuery.PERFORMANCE],
  deleteInvestmentEntry: [PortfolioQuery.ENTRIES, PortfolioQuery.SNAPSHOT, PortfolioQuery.PERFORMANCE],
  deleteInvestmentOperation: [PortfolioQuery.OPERATIONS, PortfolioQuery.PERFORMANCE],
  importDatabaseBackup: Object.values(PortfolioQuery)
});

export function affectedQueries(commandName) {
  return policy[commandName] || [];
}
