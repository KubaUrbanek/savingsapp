// @ts-nocheck
import React from 'react';
import { PortfolioScopeKind } from '../../../application/PortfolioScope.js';
import { affectedQueries, PortfolioQuery } from './refreshPolicy.js';
import { failure, idle, loading, success } from './queryState.js';
import { useLatestQuery } from './useLatestQuery.js';

const initialVersions = Object.fromEntries(Object.values(PortfolioQuery).map((query) => [query, 0]));
export const PROJECTION_WAIT_LIMIT_MS = 5_000;

function containsAsset(entries, asset, valuePln) {
  return entries.some(
    (entry) =>
      entry.owner === asset.owner &&
      entry.type === asset.type &&
      (entry.subcategory || '') === (asset.subcategory || '') &&
      entry.date === asset.date &&
      Number(entry.valuePln) === Number(valuePln)
  );
}

function projectionIsVisible(command, queryStates) {
  if (command.name === 'recordPortfolioChange') {
    const { request, result } = command;
    const valuationVisible =
      containsAsset(queryStates.entries.data || [], request.asset, result.nextValue) &&
      containsAsset(queryStates.snapshot.data || [], request.asset, result.nextValue);
    if (!valuationVisible) return false;
    if (request.kind === 'VALUATION') return true;
    return (queryStates.operations.data || []).some(
      (operation) =>
        operation.owner === request.asset.owner &&
        operation.type === request.asset.type &&
        (operation.subcategory || '') === (request.asset.subcategory || '') &&
        operation.date === request.asset.date &&
        operation.operationType === request.kind &&
        Number(operation.amountPln) === Number(request.amountPln)
    );
  }
  if (command.name === 'deleteInvestmentEntry') {
    return [queryStates.entries.data || [], queryStates.snapshot.data || []].every(
      (entries) => !entries.some((entry) => entry.id === command.request)
    );
  }
  if (command.name === 'deleteInvestmentOperation') {
    return !(queryStates.operations.data || []).some((operation) => operation.id === command.request);
  }
  // The import response contains no version or record identity. A successful query
  // refresh therefore cannot prove that the imported projection is already visible.
  return false;
}

export function usePortfolioController(useCases, scope, filters) {
  const [versions, invalidate] = React.useReducer((current, queries) => {
    const next = { ...current };
    for (const query of queries) next[query] += 1;
    return next;
  }, initialVersions);
  const [mutation, setMutation] = React.useState(idle);
  const [projection, setProjection] = React.useState(idle);
  const commandGeneration = React.useRef(0);
  const type = filters.type || undefined;
  const subcategory = (type && filters.subcategory) || undefined;
  const isOwner = scope.kind === PortfolioScopeKind.OWNER;
  const scopeKey =
    scope.kind === PortfolioScopeKind.OWNER ? `owner:${scope.ownerId}` : `household:${scope.ownerIds.join(',')}`;
  const filteredQueryKey = `${scopeKey}|${type || ''}|${subcategory || ''}`;

  const referenceData = useLatestQuery(
    (signal) => useCases.loadReferenceData.execute({ signal }),
    [useCases, versions.referenceData],
    { queryKey: 'referenceData', refreshVersions: { referenceData: versions.referenceData } }
  );
  const entries = useLatestQuery(
    (signal) => useCases.loadPortfolio.execute({ scope, filters: { type, subcategory }, signal }),
    [useCases, scope, type, subcategory, versions.entries],
    { queryKey: filteredQueryKey, refreshVersions: { entries: versions.entries } }
  );
  const snapshot = useLatestQuery(
    (signal) => useCases.loadPortfolio.execute({ scope, signal }),
    [useCases, scope, versions.snapshot],
    { queryKey: scopeKey, refreshVersions: { snapshot: versions.snapshot } }
  );
  const performanceResult = useLatestQuery(
    (signal) => useCases.loadPortfolioPerformance.execute({ scope, filters: { type, subcategory }, signal }),
    [useCases, scope, type, subcategory, versions.operations, versions.performance],
    {
      enabled: isOwner,
      queryKey: filteredQueryKey,
      refreshVersions: { operations: versions.operations, performance: versions.performance }
    }
  );

  const operations = React.useMemo(() => {
    if (performanceResult.status === 'success')
      return { ...success(performanceResult.data.operations), refreshVersions: performanceResult.refreshVersions };
    if (performanceResult.status === 'loading')
      return { ...loading(performanceResult.data?.operations), refreshVersions: performanceResult.refreshVersions };
    return performanceResult.status === 'failure'
      ? { ...failure(performanceResult.error), refreshVersions: performanceResult.refreshVersions }
      : idle();
  }, [performanceResult]);
  const performance = React.useMemo(() => {
    if (performanceResult.status === 'success')
      return { ...success(performanceResult.data.performance), refreshVersions: performanceResult.refreshVersions };
    if (performanceResult.status === 'loading')
      return { ...loading(performanceResult.data?.performance), refreshVersions: performanceResult.refreshVersions };
    return performanceResult.status === 'failure'
      ? { ...failure(performanceResult.error), refreshVersions: performanceResult.refreshVersions }
      : idle();
  }, [performanceResult]);

  const queryStates = React.useMemo(
    () => ({ entries, snapshot, operations, performance, referenceData }),
    [entries, snapshot, operations, performance, referenceData]
  );

  React.useEffect(() => {
    if (projection.status !== 'refreshing') return undefined;
    const affectedStates = projection.data.affectedQueries.map((query) => [query, queryStates[query]]);
    const isCurrentRefresh = ([query, state]) =>
      state.refreshVersions?.[query] === projection.data.targetVersions[query];
    if (affectedStates.some((pair) => isCurrentRefresh(pair) && pair[1].status === 'failure')) {
      setProjection(success({ ...projection.data, phase: 'pending', reason: 'refresh-failed' }));
      return undefined;
    }
    const allSettled = affectedStates.every((pair) => isCurrentRefresh(pair) && pair[1].status === 'success');
    if (allSettled && projectionIsVisible(projection.data.command, queryStates)) {
      setProjection(success({ ...projection.data, phase: 'confirmed' }));
      return undefined;
    }
    const remainingWait = Math.max(0, projection.data.waitStartedAt + PROJECTION_WAIT_LIMIT_MS - Date.now());
    const timeout = window.setTimeout(() => {
      setProjection((current) =>
        current.status === 'refreshing'
          ? success({ ...current.data, phase: 'pending', reason: 'not-confirmed' })
          : current
      );
    }, remainingWait);
    return () => window.clearTimeout(timeout);
  }, [projection, queryStates]);

  const runCommand = React.useCallback(
    async (name, request, execute) => {
      const generation = ++commandGeneration.current;
      setMutation(loading());
      setProjection(idle());
      try {
        const result = await execute();
        if (generation !== commandGeneration.current) return result;
        const queries = affectedQueries(name);
        const command = { name, request, result };
        const targetVersions = Object.fromEntries(queries.map((query) => [query, versions[query] + 1]));
        setMutation(success({ command: name, result }));
        setProjection({
          status: 'refreshing',
          data: { command, affectedQueries: queries, targetVersions, waitStartedAt: Date.now(), phase: 'refreshing' }
        });
        invalidate(queries);
        return result;
      } catch (error) {
        if (generation === commandGeneration.current) setMutation(failure(error));
        throw error;
      }
    },
    [versions]
  );

  const commands = React.useMemo(
    () => ({
      recordPortfolioChange: (command) =>
        runCommand('recordPortfolioChange', command, () => useCases.recordPortfolioChange.execute(command)),
      deleteInvestmentEntry: (id) =>
        runCommand('deleteInvestmentEntry', id, () => useCases.deleteInvestmentEntry.execute(id)),
      deleteInvestmentOperation: (id) =>
        runCommand('deleteInvestmentOperation', id, () => useCases.deleteInvestmentOperation.execute(id)),
      importDatabaseBackup: (file) =>
        runCommand('importDatabaseBackup', file, () => useCases.importDatabaseBackup.execute(file)),
      exportDatabaseBackup: () => useCases.exportDatabaseBackup.execute()
    }),
    [runCommand, useCases]
  );

  const retry = React.useMemo(
    () => ({
      referenceData: () => invalidate([PortfolioQuery.REFERENCE_DATA]),
      entries: () => invalidate([PortfolioQuery.ENTRIES]),
      snapshot: () => invalidate([PortfolioQuery.SNAPSHOT]),
      operations: () => invalidate([PortfolioQuery.OPERATIONS]),
      performance: () => invalidate([PortfolioQuery.PERFORMANCE])
    }),
    []
  );

  const retryProjection = React.useCallback(() => {
    if (projection.status !== 'success' || projection.data.phase !== 'pending') return;
    const targetVersions = Object.fromEntries(
      projection.data.affectedQueries.map((query) => [query, versions[query] + 1])
    );
    setProjection({
      status: 'refreshing',
      data: { ...projection.data, targetVersions, waitStartedAt: Date.now(), phase: 'refreshing' }
    });
    invalidate(projection.data.affectedQueries);
  }, [projection, versions]);

  return {
    entries,
    snapshot,
    referenceData,
    operations,
    performance,
    mutation,
    projection,
    commands,
    retry,
    retryProjection
  };
}
