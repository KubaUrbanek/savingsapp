// @ts-nocheck
import { ownersIn } from '../PortfolioScope.js';
import { AllocationPlanningService } from '../../domain/portfolio/services/AllocationPlanningService.js';
import { RebalancingService } from '../../domain/portfolio/services/RebalancingService.js';
import { HouseholdAggregationService } from '../../domain/portfolio/services/HouseholdAggregationService.js';
import { TimeSeriesService } from '../../domain/portfolio/services/TimeSeriesService.js';

async function entriesFor(repository, scope, filters = {}, signal) {
  const groups = await Promise.all(
    ownersIn(scope).map((owner) => repository.findAll({ owner, ...filters }, { signal }))
  );
  return groups.flat();
}

/** Query handlers return domain results. Formatting belongs to presentation mappers. */
export class LoadGlobalAllocation {
  constructor(entries, targets) {
    this.entries = entries;
    this.targets = targets;
  }
  async execute({ scope, signal }) {
    const entries = await entriesFor(this.entries, scope, {}, signal);
    return RebalancingService.global(AllocationPlanningService.global(entries, this.targets.getGlobalAllocation()));
  }
}

export class LoadStockAllocation {
  constructor(entries, targets) {
    this.entries = entries;
    this.targets = targets;
  }
  async execute({ scope, contribution = 0, signal }) {
    const entries = await entriesFor(this.entries, scope, {}, signal);
    return RebalancingService.stocks(
      AllocationPlanningService.stocks(entries, this.targets.getStockAllocation()),
      contribution
    );
  }
}

export class LoadHouseholdOverview {
  constructor(entries, preferences) {
    this.entries = entries;
    this.preferences = preferences;
  }
  async execute({ scope, users, types, signal }) {
    const entries = await entriesFor(this.entries, scope, {}, signal);
    const latest = TimeSeriesService.generate(entries, 'monthly').at(-1) || null;
    return HouseholdAggregationService.aggregate(entries, users, types, this.preferences.getHouseholdGoal(), latest);
  }
}

export class LoadPortfolioTimeSeries {
  constructor(entries) {
    this.entries = entries;
  }
  async execute({ scope, type = null, period = 'monthly', signal }) {
    const entries = await entriesFor(this.entries, scope, type ? { type } : {}, signal);
    return TimeSeriesService.generate(entries, period);
  }
}
