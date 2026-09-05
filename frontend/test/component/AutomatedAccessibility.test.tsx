import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, it, vi } from 'vitest';
import { AppRouter } from '../../src/app/AppRouter.js';
import { GlobalAllocationPanel } from '../../src/presentation/components/GlobalAllocationPanel.js';
import { HouseholdDashboard } from '../../src/presentation/components/HouseholdDashboard.js';
import { StockAllocationPanel } from '../../src/presentation/components/StockAllocationPanel.js';
import { SummaryChart } from '../../src/presentation/components/SummaryChart.js';
import { expectNoAccessibilityViolations } from './accessibility.js';

const entries = [
  {
    id: 1,
    owner: 'jakub',
    type: 'OBLIGACJE',
    subcategory: 'TRZYLETNIE',
    valuePln: 60000,
    date: '2026-08-01',
    createdAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 2,
    owner: 'zosia',
    type: 'GIELDA',
    subcategory: 'ZLOTO',
    valuePln: 40000,
    date: '2026-08-02',
    createdAt: '2026-08-02T10:00:00Z'
  }
];

const preferences = {
  selectedOwner: () => 'jakub',
  selectOwner: vi.fn(),
  globalAllocation: () => ({ BONDS: 50, STOCKS: 30, GOLD: 20 }),
  changeGlobalAllocation: vi.fn(),
  stockAllocation: () => ({ ZLOTO: 40, RYNKI_ROZWINIETE: 30, RYNKI_ROZWIJAJACE_SIE: 30 }),
  changeStockAllocation: vi.fn(),
  householdGoal: () => 200000,
  changeHouseholdGoal: vi.fn()
};

afterEach(cleanup);

describe('automated accessibility checks', () => {
  it('finds no detectable violations in the owner workspace', async () => {
    const dependencies = {
      preferences,
      useCases: {
        loadReferenceData: { execute: async () => ({ users: ['jakub', 'zosia'], types: ['OBLIGACJE', 'GIELDA'] }) },
        loadPortfolio: { execute: async () => entries },
        loadPortfolioPerformance: { execute: async () => ({ operations: [], performance: null }) },
        recordPortfolioChange: { execute: async () => ({ nextValue: 10, kind: 'DEPOSIT', atomic: true }) },
        deleteInvestmentEntry: { execute: async () => undefined },
        deleteInvestmentOperation: { execute: async () => undefined },
        importDatabaseBackup: { execute: async () => undefined },
        exportDatabaseBackup: { execute: async () => new Blob() }
      }
    };
    const { container } = render(<AppRouter dependencies={dependencies} />);

    await screen.findByRole('heading', { level: 1, name: 'Portfel: jakub' });
    await expectNoAccessibilityViolations(container);
  });

  it('finds no detectable violations in charts and household reporting', async () => {
    const { container } = render(
      <>
        <SummaryChart entries={entries} types={['OBLIGACJE', 'GIELDA']} />
        <HouseholdDashboard
          entries={entries}
          users={['jakub', 'zosia']}
          types={['OBLIGACJE', 'GIELDA']}
          preferences={preferences}
          onPreferenceError={vi.fn()}
        />
      </>
    );

    await expectNoAccessibilityViolations(container);
  });

  it('finds no detectable violations in both allocation planners', async () => {
    const { container } = render(
      <>
        <GlobalAllocationPanel entries={entries} preferences={preferences} onPreferenceError={vi.fn()} />
        <StockAllocationPanel
          entries={entries}
          onAddStockValue={vi.fn()}
          preferences={preferences}
          onPreferenceError={vi.fn()}
        />
      </>
    );

    await expectNoAccessibilityViolations(container);
  });
});
