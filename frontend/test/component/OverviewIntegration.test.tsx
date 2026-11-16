import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRouter } from '../../src/app/AppRouter.js';
import { aggregatePerformance } from '../../src/domain/portfolio/services/PerformanceAggregationService.js';

const performance = (value: number, deposits: number | null) => ({
  currentValuePln: value,
  depositsTotalPln: deposits,
  withdrawalsTotalPln: 0,
  contributedCapitalPln: deposits,
  nominalResultPln: deposits == null ? null : value - deposits,
  monthlyResultPln: null
});
const base = { owner: 'jakub', date: '2026-01-01', createdAt: '2026-01-01T00:00:00Z', subcategory: null };
const assets = [
  { ...base, id: 'bank', type: 'KONTO_BANKOWE', valuePln: 100, performance: performance(100, 80) },
  { ...base, id: 'ppk', type: 'PPK', valuePln: 200, performance: performance(200, 150) },
  { ...base, id: 'ppo', type: 'PPO', valuePln: 25, performance: performance(25, null) },
  { ...base, id: 'gold', type: 'IKE', subcategory: 'ZLOTO', valuePln: 50, performance: performance(50, 30) }
];
function dependencies(omitPerformanceFor?: string) {
  return {
    preferences: { selectedOwner: () => 'jakub', selectOwner: vi.fn() },
    useCases: {
      loadReferenceData: {
        execute: async () => ({ users: ['jakub', 'zosia'], types: ['KONTO_BANKOWE', 'PPK', 'PPO', 'IKE'] })
      },
      loadPortfolio: { execute: vi.fn(async () => assets) },
      loadPortfolioPerformance: {
        execute: vi.fn(async () => ({
          operations: [],
          assets: assets.filter((asset) => asset.id !== omitPerformanceFor),
          performance: aggregatePerformance(assets.map((asset) => asset.performance))
        }))
      }
    }
  };
}
function metric(label: string) {
  return (
    screen.queryByText(label, { selector: '.savingsHeadline .metricLabel' }) ??
    screen.getByText('Wartość wybranych inwestycji', { selector: '.savingsHeadline .metricLabel' })
  ).parentElement;
}
function overview() {
  return screen.getByRole('tabpanel', { name: 'Przegląd' });
}
beforeEach(() => window.history.pushState({}, '', '/'));
afterEach(cleanup);

describe('shared overview selection', () => {
  it('offers onboarding when the portfolio contains only future valuations', async () => {
    const deps = dependencies();
    deps.useCases.loadPortfolio.execute.mockResolvedValue([
      { ...assets[0]!, date: '2999-01-01', createdAt: '2999-01-01T00:00:00Z' }
    ]);
    render(<AppRouter dependencies={deps} />);
    expect(await screen.findByRole('button', { name: 'Dodaj aktualny stan konta lub inwestycji' })).toBeVisible();
    expect(screen.queryByText(/Brak inwestycji w wybranym zakresie/)).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Konto bankowe' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Historia wartości oszczędności' })).not.toBeInTheDocument();
  });

  it('ignores future values and groups when current valuations are present', async () => {
    const deps = dependencies();
    const futureBank = { ...assets[0]!, id: 'future-bank', date: '2999-01-01', valuePln: 9999 };
    const futureStocks = { ...assets[3]!, id: 'future-stocks', type: 'GIELDA', date: '2999-01-01', valuePln: 9999 };
    deps.useCases.loadPortfolio.execute.mockResolvedValue([...assets, futureBank, futureStocks]);
    render(<AppRouter dependencies={deps} />);
    await waitFor(() => expect(metric('Wartość oszczędności')).toHaveTextContent('375,00'));
    expect(screen.queryByRole('checkbox', { name: 'Giełda' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Rozkład oszczędności' })).not.toHaveTextContent('9999');
    fireEvent.click(screen.getByText('Pokaż dane wykresu'));
    const history = screen.getByRole('table', { name: 'Historia wartości zaznaczonych inwestycji' });
    expect(history).toHaveTextContent('375,00');
    expect(history).not.toHaveTextContent('2999');
    expect(
      within(overview())
        .getByRole('rowheader', { name: /Konto bankowe/ })
        .closest('tr')
    ).toHaveTextContent('100,00');
  });

  it('filters the value, contributions, result and holdings locally without new queries', async () => {
    const deps = dependencies();
    render(<AppRouter dependencies={deps} />);
    await waitFor(() => expect(metric('Wartość oszczędności')).toHaveTextContent('375,00'));
    expect(metric('Wynik')).toHaveTextContent('—');
    fireEvent.click(await screen.findByText('Filtruj inwestycje'));
    fireEvent.click(screen.getByRole('checkbox', { name: /PPO/ }));
    expect(metric('Wartość oszczędności')).toHaveTextContent('350,00');
    await waitFor(() => expect(metric('Wpłaty łącznie')).toHaveTextContent('260,00'));
    const portfolioCalls = deps.useCases.loadPortfolio.execute.mock.calls.length;
    const performanceCalls = deps.useCases.loadPortfolioPerformance.execute.mock.calls.length;
    expect(metric('Wynik')).toHaveTextContent('+90,00');
    fireEvent.click(screen.getByRole('checkbox', { name: /PPK/ }));
    expect(metric('Wartość oszczędności')).toHaveTextContent('150,00');
    expect(metric('Wpłaty łącznie')).toHaveTextContent('110,00');
    expect(metric('Wynik')).toHaveTextContent('+40,00');
    expect(screen.getByRole('region', { name: 'Rozkład oszczędności' })).not.toHaveTextContent('PPK');
    fireEvent.click(screen.getByText('Pokaż dane wykresu'));
    expect(screen.getByRole('table', { name: 'Historia wartości zaznaczonych inwestycji' })).toHaveTextContent(
      '150,00'
    );
    expect(screen.getByRole('table', { name: 'Historia wartości zaznaczonych inwestycji' })).not.toHaveTextContent(
      '375,00'
    );
    expect(within(overview()).queryByRole('rowheader', { name: /PPK/ })).not.toBeInTheDocument();
    expect(within(overview()).queryByRole('rowheader', { name: /PPO/ })).not.toBeInTheDocument();
    expect(deps.useCases.loadPortfolio.execute).toHaveBeenCalledTimes(portfolioCalls);
    expect(deps.useCases.loadPortfolioPerformance.execute).toHaveBeenCalledTimes(performanceCalls);

    fireEvent.click(screen.getByRole('checkbox', { name: /PPK/ }));
    expect(metric('Wartość oszczędności')).toHaveTextContent('350,00');
    expect(metric('Wynik')).toHaveTextContent('+90,00');
  });

  it('keeps missing selected asset results unknown and supports an empty selection', async () => {
    render(<AppRouter dependencies={dependencies('gold')} />);
    fireEvent.click(await screen.findByText('Filtruj inwestycje'));
    await screen.findByRole('checkbox', { name: /PPO/ });
    fireEvent.click(screen.getByRole('checkbox', { name: /PPO/ }));
    expect(metric('Wartość oszczędności')).toHaveTextContent('350,00');
    await waitFor(() => expect(metric('Wynik')).toHaveTextContent('—'));
    fireEvent.click(screen.getByRole('button', { name: 'Odznacz wszystkie' }));
    expect(screen.queryByText('Wartość wybranych inwestycji')).not.toBeInTheDocument();
    expect(screen.getByText('Nie wybrano inwestycji')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Dodaj aktualny stan konta lub inwestycji' })).not.toBeInTheDocument();
    expect(within(overview()).queryAllByRole('rowheader')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż cały portfel' }));
    expect(metric('Wartość oszczędności')).toHaveTextContent('375,00');
  });

  it('restores each grouping selection on grouping changes but preserves it when clicking the active grouping', async () => {
    render(<AppRouter dependencies={dependencies()} />);
    fireEvent.click(await screen.findByText('Filtruj inwestycje'));
    fireEvent.click(screen.getByRole('checkbox', { name: /PPK/ }));
    expect(metric('Wartość oszczędności')).toHaveTextContent('175,00');
    fireEvent.click(screen.getByRole('button', { name: 'Według kont i produktów' }));
    expect(screen.getByRole('checkbox', { name: /PPK/ })).not.toBeChecked();
    fireEvent.change(screen.getByLabelText('Zakres czasu'), { target: { value: 'all' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pokaż rozbicie' }));
    fireEvent.click(screen.getByRole('button', { name: 'Według rodzaju inwestycji' }));
    expect(screen.getByLabelText('Zakres czasu')).toHaveValue('all');
    expect(screen.getByRole('checkbox', { name: 'Pokaż rozbicie' })).toBeChecked();
    expect(metric('Wartość oszczędności')).toHaveTextContent('375,00');
    expect(screen.getByRole('checkbox', { name: /Złoto/ })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: /Nieznany skład/ }));
    expect(metric('Wartość oszczędności')).toHaveTextContent('150,00');
    fireEvent.click(screen.getByRole('button', { name: 'Według kont i produktów' }));
    expect(screen.getByRole('checkbox', { name: /PPK/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /PPO/ })).toBeChecked();
  });

  it.each(['Historia', 'Plan portfela', 'Ustawienia', 'Razem'])(
    'preserves the overview context after %s',
    async (destination) => {
      render(<AppRouter dependencies={dependencies()} />);
      fireEvent.click(await screen.findByText('Filtruj inwestycje'));
      fireEvent.click(screen.getByRole('button', { name: 'Według rodzaju inwestycji' }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Złoto/ }));
      fireEvent.change(screen.getByLabelText('Zakres czasu'), { target: { value: 'all' } });
      fireEvent.click(screen.getByRole('checkbox', { name: 'Pokaż rozbicie' }));
      fireEvent.click(screen.getByRole('tab', { name: 'Przegląd' }));
      expect(screen.getByRole('checkbox', { name: /Złoto/ })).not.toBeChecked();
      fireEvent.click(
        screen.getByRole(destination === 'Historia' || destination === 'Plan portfela' ? 'tab' : 'button', {
          name: destination
        })
      );
      if (destination === 'Historia') {
        expect(await screen.findByRole('tabpanel', { name: 'Historia' })).toHaveTextContent('PPK');
      }
      fireEvent.click(screen.getByRole('tab', { name: 'Przegląd' }));
      if (destination === 'Razem') {
        fireEvent.click(await screen.findByText('Filtruj inwestycje'));
        expect(screen.getByRole('checkbox', { name: /PPK/ })).toBeChecked();
        fireEvent.click(screen.getByRole('button', { name: 'Jakub' }));
      }
      await waitFor(() => expect(screen.getByRole('checkbox', { name: /Złoto/ })).not.toBeChecked());
      expect(screen.getByLabelText('Zakres czasu')).toHaveValue('all');
      expect(screen.getByRole('checkbox', { name: 'Pokaż rozbicie' })).toBeChecked();
      expect(metric('Wartość oszczędności')).toHaveTextContent('325,00');
    }
  );
});
