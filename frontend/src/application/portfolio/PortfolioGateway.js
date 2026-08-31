/**
 * Input/output port implemented by an external portfolio data source.
 * @typedef {Object} PortfolioGateway
 * @property {(filters?: object) => Promise<object[]>} getInvestments
 * @property {(payload: object) => Promise<object>} saveInvestment
 */
export const PortfolioGateway = Object.freeze({});
