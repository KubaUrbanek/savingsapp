import { createPortfolioUseCases } from '../application/portfolio/createPortfolioUseCases.js';
import { FetchPortfolioGateway } from '../infrastructure/http/FetchPortfolioGateway.js';
import { BrowserPortfolioStorage } from '../infrastructure/storage/BrowserPortfolioStorage.js';

export function createApplicationDependencies(browser = window) {
  const gateway = new FetchPortfolioGateway(browser.fetch.bind(browser));
  return { portfolio: createPortfolioUseCases(gateway), storage: new BrowserPortfolioStorage(browser.localStorage) };
}
