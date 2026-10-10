import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { PortfolioOverview } from '../../src/presentation/components/PortfolioOverview.js';
import { PurchasePlanPanel } from '../../src/presentation/components/PurchasePlanPanel.js';
import { AppRouter } from '../../src/app/AppRouter.js';
import { expectNoAccessibilityViolations } from './accessibility.js';
afterEach(cleanup);
const entry = {
  id: 'gold',
  owner: 'jakub',
  type: 'GIELDA',
  subcategory: 'ZLOTO',
  valuePln: 200,
  date: '2026-09-01',
  createdAt: '2026-09-01T00:00:00Z'
};
const plan = { bonds: 50, stocks: 50, gold: 0, developed: 70, emerging: 30 };
describe('savings regressions', () => {
  it('shows value without inventing profit or zero cost when the history is incomplete', () => {
    render(
      <PortfolioOverview entries={[entry]} performance={{ nominalResultPln: null, contributedCapitalPln: null }} />
    );
    expect(screen.getAllByText('Mam teraz')[0]!.parentElement).toHaveTextContent('200,00');
    expect(screen.getAllByText('Brak danych o koszcie')).toHaveLength(2);
    expect(screen.queryByText('+200,00 zł')).not.toBeInTheDocument();
    expect(screen.getByText('Wyceny z 2026-09-01')).toBeVisible();
  });
  it('invalid and unsaved weights hide purchase recommendations and cannot save', async () => {
    const save = vi.fn(async () => plan);
    render(
      <PurchasePlanPanel
        entries={[entry]}
        scope="jakub"
        useCases={{ loadPortfolioPlan: { execute: async () => plan }, savePortfolioPlan: { execute: save } }}
      />
    );
    await screen.findByRole('table', { name: 'Co kupić według mojego planu' });
    fireEvent.change(screen.getByLabelText('Obligacje — % całego planu'), { target: { value: '80' } });
    expect(screen.getByRole('button', { name: 'Zapisz mój plan' })).toBeDisabled();
    expect(screen.queryByRole('table', { name: 'Co kupić według mojego planu' })).not.toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
  it('budget and two-level plan have no detectable accessibility violations', async () => {
    const { container } = render(
      <PurchasePlanPanel
        entries={[entry]}
        scope="household"
        useCases={{ loadPortfolioPlan: { execute: async () => plan } }}
      />
    );
    await screen.findByRole('table', { name: 'Co kupić według mojego planu' });
    fireEvent.change(screen.getByLabelText('Mam do zainwestowania — zł'), { target: { value: '100' } });
    expect(screen.getByText(/Dokup za łącznie 100,00/)).toBeVisible();
    await expectNoAccessibilityViolations(container);
  });
  it('keeps gold filter value, investment rows and chart in the same scope and hides inactive panels', async () => {
    window.history.pushState({}, '', '/');
    const performance = { nominalResultPln: 0, depositsTotalPln: 200, contributedCapitalPln: 200 };
    const deps = {
      preferences: { selectedOwner: () => 'jakub', selectOwner: vi.fn() },
      useCases: {
        loadReferenceData: { execute: async () => ({ users: ['jakub'], types: ['GIELDA'] }) },
        loadPortfolio: {
          execute: async () => [entry, { ...entry, id: 'developed', subcategory: 'RYNKI_ROZWINIETE', valuePln: 1000 }]
        },
        loadPortfolioPerformance: {
          execute: async () => ({ operations: [], performance, assets: [{ ...entry, performance }] })
        }
      }
    };
    render(<AppRouter dependencies={deps} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Giełda' }));
    fireEvent.click(screen.getByRole('button', { name: 'Złoto' }));
    const summary = screen.getByRole('tabpanel', { name: 'Podsumowanie' });
    await waitFor(() =>
      expect(within(summary).getAllByText('Mam teraz')[0]!.parentElement).toHaveTextContent('200,00')
    );
    expect(within(summary).queryByRole('rowheader', { name: /Rynki rozwinięte/ })).not.toBeInTheDocument();
    expect(within(summary).getByText('Aktualna suma').parentElement).toHaveTextContent('200,00');
    fireEvent.click(screen.getByRole('tab', { name: 'Aktualizacja' }));
    expect(summary).not.toBeVisible();
    expect(screen.getByRole('tabpanel', { name: 'Aktualizacja' })).toBeVisible();
  });
  it('uses the same intent object on retry but a new one after a successful save', async () => {
    window.history.pushState({}, '', '/');
    let first = true;
    const execute = vi.fn(async (_command: unknown) => {
      void _command;
      if (first) {
        first = false;
        throw new Error('lost');
      }
      return { nextValue: 10, kind: 'DEPOSIT', atomic: true };
    });
    render(
      <AppRouter
        dependencies={{
          preferences: { selectedOwner: () => 'jakub', selectOwner: vi.fn() },
          useCases: {
            loadReferenceData: { execute: async () => ({ users: ['jakub'], types: ['KONTO_BANKOWE'] }) },
            loadPortfolio: { execute: async () => [] },
            loadPortfolioPerformance: { execute: async () => ({ operations: [], performance: null }) },
            recordPortfolioChange: { execute }
          }
        }}
      />
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Aktualizacja' }));
    fireEvent.change(await screen.findByLabelText('Kwota dodana'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zaktualizuj portfel' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Zaktualizuj portfel' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Zaktualizuj portfel' }));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
    expect(execute.mock.calls[0]?.[0]).toBe(execute.mock.calls[1]?.[0]);
  });
});
