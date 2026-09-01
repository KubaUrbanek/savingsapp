/**
 * Application-owned command boundary. Implementations must report whether the
 * operation and resulting valuation were committed atomically.
 */
export class PortfolioCommandGateway {
  recordPortfolioChange(_change) { throw new Error('Not implemented'); }
}
