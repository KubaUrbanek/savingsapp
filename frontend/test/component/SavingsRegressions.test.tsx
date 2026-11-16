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
const plan = { bonds: 50, gold: 25, developed: 17.5, emerging: 7.5 };
describe('savings regressions', () => {
  it('combines investments without owners or write actions in both layouts', async () => {
    const entries = [
      { ...entry, type: 'IKZE', valuePln: 4836 },
      { ...entry, id: 'zosia-gold', owner: 'zosia', type: 'IKE', valuePln: 9590.54, date: '2026-11-15' }
    ];
    const assets = entries.map((value, index) => ({
      ...value,
      performance: { nominalResultPln: index ? -777.41 : 436.11, contributedCapitalPln: 100 }
    }));
    const { container } = render(
      <PortfolioOverview household entries={entries} assets={assets} performance={null} onUpdate={vi.fn()} />
    );
    const table = screen.getByRole('table');
    const cards = screen.getByRole('list', { name: 'Nasze inwestycje' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(cards).getAllByRole('listitem')).toHaveLength(1);
    for (const layout of [table, cards]) {
      expect(layout).toHaveTextContent(/14\s426,54/);
      expect(layout).toHaveTextContent(/-341,30/);
      expect(layout).not.toHaveTextContent(/Jakub|Zosia|IKE|IKZE/);
      expect(within(layout).queryByRole('button')).not.toBeInTheDocument();
      fireEvent.click(within(layout).getByText('Szczegóły'));
      expect(layout).toHaveTextContent('2026-09-01 – 2026-11-15');
    }
    await expectNoAccessibilityViolations(container);
  });
  it('offers separate contribution and management actions in both holding layouts', () => {
    const complete = vi.fn(),
      manage = vi.fn();
    render(<PortfolioOverview entries={[entry]} performance={null} onCompleteBasis={complete} onManage={manage} />);
    for (const summary of screen.getAllByText('Szczegóły')) fireEvent.click(summary);
    for (const button of screen.getAllByRole('button', { name: 'Podaj sumę dotychczasowych wpłat' })) {
      expect(button).toHaveClass('button--secondary');
      fireEvent.click(button);
      expect(complete).toHaveBeenLastCalledWith(expect.objectContaining({ id: entry.id }));
    }
    for (const button of screen.getAllByRole('button', { name: 'Historia tej inwestycji' })) {
      fireEvent.click(button);
      expect(manage).toHaveBeenLastCalledWith(expect.objectContaining({ id: entry.id }));
    }
  });
  it('saves four whole-plan shares and shows purchase amounts', async () => {
    const save = vi.fn(async ({ plan: next }) => next);
    render(
      <PurchasePlanPanel
        entries={[]}
        scope="jakub"
        useCases={{ loadPortfolioPlan: { execute: async () => plan }, savePortfolioPlan: { execute: save } }}
      />
    );
    await screen.findByLabelText('Kwota na zakupy — zł');
    fireEvent.click(screen.getByText('Zmień proporcje'));
    fireEvent.change(screen.getByLabelText('Akcje — rynki rozwinięte — %'), { target: { value: '20' } });
    expect(screen.getByRole('button', { name: 'Zapisz wspólny plan' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Akcje — rynki wschodzące — %'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz wspólny plan' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        scope: 'household',
        plan: { bitcoin: '0', bonds: '50', gold: '25', developed: '20', emerging: '5' }
      })
    );
    await screen.findByText('Zapisano wspólny plan.');
    fireEvent.change(screen.getByLabelText('Kwota na zakupy — zł'), { target: { value: '1000' } });
    const purchases = screen.getByRole('list', { name: 'Proponowane zakupy' });
    expect(within(purchases).getByText('Akcje — rynki rozwinięte').parentElement).toHaveTextContent('200,00');
    expect(within(purchases).getByText('Akcje — rynki wschodzące').parentElement).toHaveTextContent('50,00');
    expect(within(purchases).getByText('Złoto').parentElement).toHaveTextContent('250,00');
  });
  it('shows value without inventing profit or zero cost when the history is incomplete', () => {
    render(
      <PortfolioOverview entries={[entry]} performance={{ nominalResultPln: null, contributedCapitalPln: null }} />
    );
    expect(screen.getAllByText('Wartość oszczędności')[0]!.parentElement).toHaveTextContent('200,00');
    expect(screen.getAllByText(/Niepełne dane o wpłatach\./)).toHaveLength(1);
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByText('Wynik').parentElement).toHaveTextContent('—');
    expect(screen.queryByText('+200,00 zł')).not.toBeInTheDocument();
    expect(screen.getByText(/Według ostatnich zapisanych wartości/)).toBeVisible();
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
    await waitFor(() => expect(screen.getByLabelText('Kwota na zakupy — zł')).toBeEnabled());
    fireEvent.click(screen.getByText('Zmień proporcje'));
    fireEvent.change(screen.getByLabelText('Kwota na zakupy — zł'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Obligacje — %'), { target: { value: '80' } });
    expect(screen.getByRole('button', { name: 'Zapisz wspólny plan' })).toBeDisabled();
    expect(screen.queryByRole('list', { name: 'Proponowane zakupy' })).not.toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
  it('budget and flat plan have no detectable accessibility violations', async () => {
    const { container } = render(
      <PurchasePlanPanel
        entries={[entry]}
        scope="household"
        useCases={{ loadPortfolioPlan: { execute: async () => plan } }}
      />
    );
    await waitFor(() => expect(screen.getByLabelText('Kwota na zakupy — zł')).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Kwota na zakupy — zł'), { target: { value: '100' } });
    expect(screen.getByText(/Dokup za łącznie/)).toHaveTextContent(/Dokup za łącznie 100,00/);
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
    fireEvent.click(await screen.findByText('Filtruj inwestycje'));
    fireEvent.click(screen.getByRole('button', { name: 'Według rodzaju inwestycji' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Akcje/ }));
    const summary = screen.getByRole('tabpanel', { name: 'Przegląd' });
    await waitFor(() =>
      expect(within(summary).getAllByText('Wartość wybranych inwestycji')[0]!.parentElement).toHaveTextContent('200,00')
    );
    expect(within(summary).queryByRole('rowheader', { name: /Rynki rozwinięte/ })).not.toBeInTheDocument();
    expect(within(summary).getByRole('heading', { name: 'Historia wartości' })).toBeVisible();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dodaj wpis' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj wpis' }));
    expect(screen.getByRole('dialog', { name: 'Dodaj wpis' })).toBeVisible();
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
            loadPortfolio: { execute: async () => [{ ...entry, type: 'KONTO_BANKOWE', subcategory: null }] },
            loadPortfolioPerformance: { execute: async () => ({ operations: [], performance: null }) },
            recordPortfolioChange: { execute }
          }
        }}
      />
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dodaj wpis' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj wpis' }));
    fireEvent.change(screen.getByLabelText('Co chcesz zrobić?'), { target: { value: 'DEPOSIT' } });
    fireEvent.change(screen.getByLabelText('Konto lub produkt'), { target: { value: 'KONTO_BANKOWE' } });
    fireEvent.change(await screen.findByLabelText('Kwota — zł'), { target: { value: '10' } });
    fireEvent.click(
      screen.getByRole('button', { name: /^Zapisz (wpłatę|zakup|sprzedaż|wypłatę|wartość|oszczędności)$/ })
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /^Zapisz (wpłatę|zakup|sprzedaż|wypłatę|wartość|oszczędności)$/ })
      ).toBeEnabled()
    );
    fireEvent.click(
      screen.getByRole('button', { name: /^Zapisz (wpłatę|zakup|sprzedaż|wypłatę|wartość|oszczędności)$/ })
    );
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
    expect(execute.mock.calls[0]?.[0]).toBe(execute.mock.calls[1]?.[0]);
  });
});

it('E13 retains a failed shared save and can cancel it after switching scope', async () => {
  const cases = {
    loadPortfolioPlan: { execute: async () => plan },
    savePortfolioPlan: {
      execute: vi.fn(async () => {
        throw new Error('network');
      })
    }
  };
  const { rerender } = render(<PurchasePlanPanel entries={[]} scope="jakub" useCases={cases} />);
  await screen.findByLabelText('Kwota na zakupy — zł');
  fireEvent.click(screen.getByText('Zmień proporcje'));
  fireEvent.change(screen.getByLabelText('Obligacje — %'), { target: { value: '49' } });
  fireEvent.change(screen.getByLabelText('Złoto — %'), { target: { value: '26' } });
  fireEvent.click(screen.getByRole('button', { name: 'Zapisz wspólny plan' }));
  await screen.findByText('Nie udało się zapisać planu. Spróbuj ponownie.');
  expect(screen.getByLabelText('Obligacje — %')).toHaveValue('49');
  rerender(<PurchasePlanPanel entries={[]} scope="zosia" useCases={cases} />);
  expect(screen.getByLabelText('Obligacje — %')).toHaveValue('49');
  expect(screen.queryByRole('list', { name: 'Proponowane zakupy' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Anuluj zmiany planu' }));
  expect(screen.getByLabelText('Obligacje — %')).toHaveValue('50');
});
