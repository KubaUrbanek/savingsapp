// @ts-nocheck
import React from 'react';
import { PortfolioScopeKind } from '../../../application/PortfolioScope.js';
import { affectedQueries, PortfolioQuery } from './refreshPolicy.js';
import { failure, idle, loading, success } from './queryState.js';
import { useLatestQuery } from './useLatestQuery.js';

const initialVersions = Object.fromEntries(Object.values(PortfolioQuery).map((query) => [query, 0]));

export function usePortfolioController(useCases, scope, filters) {
  const [versions, invalidate] = React.useReducer((current, queries) => {
    const next = { ...current };
    for (const query of queries) next[query] += 1;
    return next;
  }, initialVersions);
  const [mutation, setMutation] = React.useState(idle);
  const type = filters.type || undefined;
  const subcategory = (type && filters.subcategory) || undefined;
  const isOwner = scope.kind === PortfolioScopeKind.OWNER;

  const referenceData = useLatestQuery(
    (signal) => useCases.loadReferenceData.execute({ signal }),
    [useCases, versions.referenceData]
  );
  const entries = useLatestQuery(
    (signal) => useCases.loadPortfolio.execute({ scope, filters: { type, subcategory }, signal }),
    [useCases, scope, type, subcategory, versions.entries]
  );
  const snapshot = useLatestQuery(
    (signal) => useCases.loadPortfolio.execute({ scope, signal }),
    [useCases, scope, versions.snapshot]
  );
  const performanceResult = useLatestQuery(
    (signal) => useCases.loadPortfolioPerformance.execute({ scope, filters: { type, subcategory }, signal }),
    [useCases, scope, type, subcategory, versions.operations, versions.performance],
    { enabled: isOwner }
  );

  const operations = React.useMemo(() => {
    if (performanceResult.status === 'success') return success(performanceResult.data.operations);
    if (performanceResult.status === 'loading') return loading(performanceResult.data?.operations);
    return performanceResult.status === 'failure' ? failure(performanceResult.error) : idle();
  }, [performanceResult]);
  const performance = React.useMemo(() => {
    if (performanceResult.status === 'success') return success(performanceResult.data.performance);
    if (performanceResult.status === 'loading') return loading(performanceResult.data?.performance);
    return performanceResult.status === 'failure' ? failure(performanceResult.error) : idle();
  }, [performanceResult]);

  const runCommand = React.useCallback(async (name, execute) => {
    setMutation(loading());
    try {
      const result = await execute();
      setMutation(success({ command: name, result }));
      invalidate(affectedQueries(name));
      return result;
    } catch (error) {
      setMutation(failure(error));
      throw error;
    }
  }, []);

  const commands = React.useMemo(
    () => ({
      recordPortfolioChange: (command) =>
        runCommand('recordPortfolioChange', () => useCases.recordPortfolioChange.execute(command)),
      deleteInvestmentEntry: (id) =>
        runCommand('deleteInvestmentEntry', () => useCases.deleteInvestmentEntry.execute(id)),
      deleteInvestmentOperation: (id) =>
        runCommand('deleteInvestmentOperation', () => useCases.deleteInvestmentOperation.execute(id)),
      importDatabaseBackup: (file) =>
        runCommand('importDatabaseBackup', () => useCases.importDatabaseBackup.execute(file)),
      exportDatabaseBackup: () => useCases.exportDatabaseBackup.execute()
    }),
    [runCommand, useCases]
  );

  return { entries, snapshot, referenceData, operations, performance, mutation, commands };
}
