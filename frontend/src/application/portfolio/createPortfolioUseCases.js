export function createPortfolioUseCases(gateway) {
  const investmentsForOwners = (owners, filters = {}) =>
    Promise.all(owners.map((owner) => gateway.getInvestments({ owner, ...filters }))).then((groups) => groups.flat());

  return {
    loadReferenceData: () => Promise.all([gateway.getUsers(), gateway.getInvestmentTypes()]),
    investmentsForOwners,
    loadActivity: (filters) => Promise.all([gateway.getOperations(filters), gateway.getPerformance(filters)]),
    saveInvestment: (payload) => gateway.saveInvestment(payload),
    deleteInvestment: (id) => gateway.deleteInvestment(id),
    saveOperation: (payload) => gateway.saveOperation(payload),
    deleteOperation: (id) => gateway.deleteOperation(id),
    exportDatabase: () => gateway.exportDatabase(),
    importDatabase: (file) => gateway.importDatabase(file)
  };
}
