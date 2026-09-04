import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OwnerPortfolio } from '../../src/application/PortfolioScope.js';
import {
  PROJECTION_WAIT_LIMIT_MS,
  usePortfolioController
} from '../../src/presentation/portfolio/hooks/usePortfolioController.js';

function deferred<T = unknown>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const scope = OwnerPortfolio('jakub');
const filters = { type: 'KONTO_BANKOWE', subcategory: '' };
const command = {
  kind: 'DEPOSIT',
  asset: { owner: 'jakub', type: 'KONTO_BANKOWE', subcategory: '', date: '2026-09-04' },
  amountPln: 10
};

function makeUseCases(overrides = {}) {
  return {
    loadReferenceData: { execute: vi.fn(async () => ({ users: ['jakub'], types: ['KONTO_BANKOWE'] })) },
    loadPortfolio: { execute: vi.fn(async () => []) },
    loadPortfolioPerformance: { execute: vi.fn(async () => ({ operations: [], performance: null })) },
    recordPortfolioChange: {
      execute: vi.fn(async () => ({ nextValue: 10, kind: 'DEPOSIT', atomic: true }))
    },
    deleteInvestmentEntry: { execute: vi.fn(async () => undefined) },
    deleteInvestmentOperation: { execute: vi.fn(async () => undefined) },
    importDatabaseBackup: { execute: vi.fn(async () => undefined) },
    exportDatabaseBackup: { execute: vi.fn(async () => new Blob()) },
    ...overrides
  };
}

// The JavaScript-first controller currently exposes no static dependency/result contract.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderController(useCases: any): Promise<any> {
  const hook = renderHook(() => usePortfolioController(useCases, scope, filters));
  await waitFor(() => expect(hook.result.current.snapshot.status).toBe('success'));
  return hook;
}

describe('usePortfolioController projection synchronization', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    ['recordPortfolioChange', [2, 1, 0]],
    ['deleteInvestmentEntry', [2, 1, 0]],
    ['deleteInvestmentOperation', [0, 1, 0]],
    ['importDatabaseBackup', [2, 1, 1]]
  ])('invalidates the complete affectedQueries map for %s', async (name, increments) => {
    const useCases = makeUseCases();
    const hook = await renderController(useCases);
    const before = [
      useCases.loadPortfolio.execute.mock.calls.length,
      useCases.loadPortfolioPerformance.execute.mock.calls.length,
      useCases.loadReferenceData.execute.mock.calls.length
    ];

    await act(async () => {
      if (name === 'recordPortfolioChange') await hook.result.current.commands.recordPortfolioChange(command);
      if (name === 'deleteInvestmentEntry') await hook.result.current.commands.deleteInvestmentEntry('entry-1');
      if (name === 'deleteInvestmentOperation')
        await hook.result.current.commands.deleteInvestmentOperation('operation-1');
      if (name === 'importDatabaseBackup')
        await hook.result.current.commands.importDatabaseBackup(new File(['{}'], 'db.json'));
    });

    await waitFor(() =>
      expect([
        useCases.loadPortfolio.execute.mock.calls.length - before[0]!,
        useCases.loadPortfolioPerformance.execute.mock.calls.length - before[1]!,
        useCases.loadReferenceData.execute.mock.calls.length - before[2]!
      ]).toEqual(increments)
    );
  });

  it('waits for every affected query before confirming the visible projection', async () => {
    const entries = deferred<unknown[]>();
    const snapshot = deferred<unknown[]>();
    const performance = deferred<{ operations: unknown[]; performance: null }>();
    let refreshing = false;
    const projectedEntry = { id: 'entry-1', ...command.asset, valuePln: 10 };
    const projectedOperation = { id: 'operation-1', ...command.asset, operationType: 'DEPOSIT', amountPln: 10 };
    const useCases = makeUseCases({
      loadPortfolio: {
        execute: vi.fn(({ filters: queryFilters }) =>
          refreshing ? (queryFilters ? entries.promise : snapshot.promise) : Promise.resolve([])
        )
      },
      loadPortfolioPerformance: {
        execute: vi.fn(() =>
          refreshing ? performance.promise : Promise.resolve({ operations: [], performance: null })
        )
      }
    });
    const hook = await renderController(useCases);
    refreshing = true;
    await act(() => hook.result.current.commands.recordPortfolioChange(command));
    expect(hook.result.current.mutation.status).toBe('success');
    expect(hook.result.current.projection.status).toBe('refreshing');

    await act(async () => entries.resolve([projectedEntry]));
    await act(async () => snapshot.resolve([projectedEntry]));
    expect(hook.result.current.projection.status).toBe('refreshing');
    await act(async () => performance.resolve({ operations: [projectedOperation], performance: null }));
    await waitFor(() => expect(hook.result.current.projection.data.phase).toBe('confirmed'));
  });

  it('keeps the accepted command separate when an affected refresh fails', async () => {
    let refreshing = false;
    const useCases = makeUseCases({
      loadPortfolio: {
        execute: vi.fn(({ filters: queryFilters }) =>
          refreshing && queryFilters ? Promise.reject(new Error('query failed')) : Promise.resolve([])
        )
      }
    });
    const hook = await renderController(useCases);
    refreshing = true;
    await act(() => hook.result.current.commands.deleteInvestmentEntry('entry-1'));

    await waitFor(() => expect(hook.result.current.projection.data.phase).toBe('pending'));
    expect(hook.result.current.projection.data.reason).toBe('refresh-failed');
    expect(hook.result.current.mutation.status).toBe('success');
  });

  it('stops claiming freshness after the wait limit and retries queries without repeating the command', async () => {
    const never = new Promise(() => undefined);
    let refreshing = false;
    const useCases = makeUseCases({
      loadPortfolio: { execute: vi.fn(() => (refreshing ? never : Promise.resolve([]))) }
    });
    const hook = await renderController(useCases);
    vi.useFakeTimers();
    refreshing = true;
    await act(() => hook.result.current.commands.deleteInvestmentEntry('entry-1'));
    await act(async () => vi.advanceTimersByTime(PROJECTION_WAIT_LIMIT_MS));

    expect(hook.result.current.projection.data.phase).toBe('pending');
    expect(hook.result.current.projection.data.reason).toBe('not-confirmed');
    const commandCalls = useCases.deleteInvestmentEntry.execute.mock.calls.length;
    act(() => hook.result.current.retryProjection());
    expect(useCases.deleteInvestmentEntry.execute).toHaveBeenCalledTimes(commandCalls);
    expect(hook.result.current.projection.status).toBe('refreshing');
  });

  it('lets a later mutation supersede pending projection work and ignores stale responses', async () => {
    const staleEntries = deferred<unknown[]>();
    const staleSnapshot = deferred<unknown[]>();
    const stalePerformance = deferred<{ operations: unknown[]; performance: null }>();
    let refreshRound = 0;
    const useCases = makeUseCases({
      loadPortfolio: {
        execute: vi.fn(({ filters: queryFilters }) => {
          if (refreshRound === 1) return queryFilters ? staleEntries.promise : staleSnapshot.promise;
          return Promise.resolve([]);
        })
      },
      loadPortfolioPerformance: {
        execute: vi.fn(() =>
          refreshRound === 1 ? stalePerformance.promise : Promise.resolve({ operations: [], performance: null })
        )
      }
    });
    const hook = await renderController(useCases);
    refreshRound = 1;
    await act(() => hook.result.current.commands.recordPortfolioChange(command));
    refreshRound = 2;
    await act(() => hook.result.current.commands.deleteInvestmentEntry('entry-2'));
    await waitFor(() => expect(hook.result.current.projection.data.phase).toBe('confirmed'));
    expect(hook.result.current.mutation.data.command).toBe('deleteInvestmentEntry');

    await act(async () => {
      staleEntries.resolve([{ id: 'entry-2', ...command.asset, valuePln: 10 }]);
      staleSnapshot.resolve([{ id: 'entry-2', ...command.asset, valuePln: 10 }]);
      stalePerformance.resolve({ operations: [], performance: null });
    });
    expect(hook.result.current.projection.data.phase).toBe('confirmed');
    expect(hook.result.current.mutation.data.command).toBe('deleteInvestmentEntry');
  });
});
