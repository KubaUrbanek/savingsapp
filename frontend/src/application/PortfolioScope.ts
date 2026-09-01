// @ts-nocheck
import { OwnerId } from '../domain/portfolio/values.js';

export const PortfolioScopeKind = Object.freeze({
  OWNER: 'OWNER',
  HOUSEHOLD: 'HOUSEHOLD'
});

export function OwnerPortfolio(ownerId) {
  return Object.freeze({ kind: PortfolioScopeKind.OWNER, ownerId: OwnerId.parse(ownerId) });
}

export function HouseholdPortfolio(ownerIds) {
  if (!Array.isArray(ownerIds) || ownerIds.length === 0) {
    throw new TypeError('ownerIds must be a non-empty array');
  }
  const uniqueOwnerIds = [...new Set(ownerIds.map(OwnerId.parse))];
  return Object.freeze({ kind: PortfolioScopeKind.HOUSEHOLD, ownerIds: Object.freeze(uniqueOwnerIds) });
}

export function ownersIn(scope) {
  if (scope?.kind === PortfolioScopeKind.OWNER) return [scope.ownerId];
  if (scope?.kind === PortfolioScopeKind.HOUSEHOLD) return scope.ownerIds;
  throw new TypeError('A valid portfolio scope is required');
}
