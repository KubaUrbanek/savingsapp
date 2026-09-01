import { LoadPortfolio } from '../application/LoadPortfolio.js';
import { LoadPortfolioPerformance } from '../application/LoadPortfolioPerformance.js';
import { LoadReferenceData } from '../application/LoadReferenceData.js';
import { RecordPortfolioChange } from '../application/portfolio/RecordPortfolioChange.js';
import { DeleteInvestmentEntry } from '../application/DeleteInvestmentEntry.js';
import { DeleteInvestmentOperation } from '../application/DeleteInvestmentOperation.js';
import { ExportDatabaseBackup } from '../application/ExportDatabaseBackup.js';
import { ImportDatabaseBackup } from '../application/ImportDatabaseBackup.js';
import { FetchHttpClient } from '../infrastructure/http/FetchHttpClient.js';
import { FetchInvestmentEntryRepository } from '../infrastructure/http/FetchInvestmentEntryRepository.js';
import { FetchInvestmentOperationRepository } from '../infrastructure/http/FetchInvestmentOperationRepository.js';
import { FetchPortfolioQueryGateway } from '../infrastructure/http/FetchPortfolioQueryGateway.js';
import { FetchReferenceDataGateway } from '../infrastructure/http/FetchReferenceDataGateway.js';
import { FetchDatabaseBackupGateway } from '../infrastructure/http/FetchDatabaseBackupGateway.js';
import { FetchPortfolioCommandGateway } from '../infrastructure/http/FetchPortfolioCommandGateway.js';
import { BrowserPortfolioStorage } from '../infrastructure/storage/BrowserPortfolioStorage.js';

export function createApplicationDependencies(browser = window) {
  const http = new FetchHttpClient(browser.fetch.bind(browser));
  const entries = new FetchInvestmentEntryRepository(http);
  const operations = new FetchInvestmentOperationRepository(http);
  const portfolioQuery = new FetchPortfolioQueryGateway(http);
  const referenceData = new FetchReferenceDataGateway(http);
  const backups = new FetchDatabaseBackupGateway(http);
  const portfolioCommands = new FetchPortfolioCommandGateway(entries, operations);
  const useCases = Object.freeze({
    loadPortfolio: new LoadPortfolio(entries),
    loadPortfolioPerformance: new LoadPortfolioPerformance(operations, portfolioQuery),
    loadReferenceData: new LoadReferenceData(referenceData),
    recordPortfolioChange: new RecordPortfolioChange(portfolioCommands),
    deleteInvestmentEntry: new DeleteInvestmentEntry(entries),
    deleteInvestmentOperation: new DeleteInvestmentOperation(operations),
    exportDatabaseBackup: new ExportDatabaseBackup(backups),
    importDatabaseBackup: new ImportDatabaseBackup(backups)
  });
  return { useCases, storage: new BrowserPortfolioStorage(browser.localStorage) };
}
