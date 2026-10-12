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
const plan = { bonds: 50, stocks: 50, gold: 50, developed: 35, emerging: 15 };
describe('savings regressions', () => {
  it('offers separate contribution and management actions in both holding layouts', () => {
    const complete = vi.fn(),
      manage = vi.fn();
    render(<PortfolioOverview entries={[entry]} performance={null} onCompleteBasis={complete} onManage={manage} />);
    for (const summary of screen.getAllByText('Szczegóły')) fireEvent.click(summary);
    for (const button of screen.getAllByRole('button', { name: 'Uzupełnij wpłaty' })) {
      expect(button).toHaveClass('button--secondary');
      fireEvent.click(button);
      expect(complete).toHaveBeenLastCalledWith(expect.objectContaining({ id: entry.id }));
    }
    for (const button of screen.getAllByRole('button', { name: 'Edytuj / usuń' })) {
      fireEvent.click(button);
      expect(manage).toHaveBeenLastCalledWith(expect.objectContaining({ id: entry.id }));
    }
  });
  it('saves equity subweights and shows whole-plan shares and purchase amounts', async () => {
    const save = vi.fn(async ({ plan: next }) => next);
    render(
      <PurchasePlanPanel
        entries={[]}
        scope="jakub"
        useCases={{
          loadPortfolioPlan: { execute: async () => plan },
          savePortfolioPlan: { execute: save }
        }}
      />
    );
    await waitFor(() => expect(screen.getByLabelText('Mam do zainwestowania — zł')).toBeEnabled());
    const breakdown = screen.getByRole('list', { name: 'Podział akcji w zapisanym planie' });
    expect(within(breakdown).getByText('17,5% całego planu')).toBeVisible();
    expect(within(breakdown).getByText('7,5% całego planu')).toBeVisible();
    fireEvent.click(screen.getByText('Zmień mój plan'));
    fireEvent.change(screen.getByLabelText('Rynki rozwinięte — % akcji'), { target: { value: '40' } });
    expect(screen.getByRole('button', { name: 'Zapisz mój plan' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Rynki wschodzące — % akcji'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz mój plan' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({ scope: 'jakub', plan: { ...plan, developed: 40, emerging: 10 } })
    );
    await waitFor(() => expect(within(breakdown).getByText('20% całego planu')).toBeVisible());
    expect(within(breakdown).getByText('5% całego planu')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Mam do zainwestowania — zł'), { target: { value: '1000' } });
    const purchases = screen.getByRole('list', { name: 'Proponowane zakupy' });
    expect(within(purchases).getByText('Rynki rozwinięte').parentElement).toHaveTextContent('200,00');
    expect(within(purchases).getByText('Rynki wschodzące').parentElement).toHaveTextContent('50,00');
    expect(within(purchases).getByText('Złoto (ETF)').parentElement).toHaveTextContent('250,00');
  });
  it('shows value without inventing profit or zero cost when the history is incomplete', () => {
    render(
      <PortfolioOverview entries={[entry]} performance={{ nominalResultPln: null, contributedCapitalPln: null }} />
    );
    expect(screen.getAllByText('Mam teraz')[0]!.parentElement).toHaveTextContent('200,00');
    expect(screen.getAllByText(/Brak danych o wpłatach/)).toHaveLength(1);
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByText('Zysk / strata').parentElement).toHaveTextContent('—');
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
    await waitFor(() => expect(screen.getByLabelText('Mam do zainwestowania — zł')).toBeEnabled());
    fireEvent.click(screen.getByText('Zmień mój plan'));
    fireEvent.change(screen.getByLabelText('Mam do zainwestowania — zł'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Obligacje — % całego planu'), { target: { value: '80' } });
    expect(screen.getByRole('button', { name: 'Zapisz mój plan' })).toBeDisabled();
    expect(screen.queryByRole('list', { name: 'Proponowane zakupy' })).not.toBeInTheDocument();
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
    await waitFor(() => expect(screen.getByLabelText('Mam do zainwestowania — zł')).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Mam do zainwestowania — zł'), { target: { value: '100' } });
    expect(container.querySelector('.purchaseTotal')).toHaveTextContent(/Dokup za łącznie 100,00/);
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
    fireEvent.click(await screen.findByText(/Filtruj inwestycje/));
    fireEvent.click(await screen.findByRole('button', { name: 'Giełda' }));
    fireEvent.click(screen.getByRole('button', { name: 'Złoto' }));
    const summary = screen.getByRole('tabpanel', { name: 'Przegląd' });
    await waitFor(() =>
      expect(within(summary).getAllByText('Mam teraz')[0]!.parentElement).toHaveTextContent('200,00')
    );
    expect(within(summary).queryByRole('rowheader', { name: /Rynki rozwinięte/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Zobacz historię wartości'));
    expect(within(summary).getByText('Aktualna suma').parentElement).toHaveTextContent('200,00');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dodaj zmianę' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj zmianę' }));
    expect(screen.getByRole('dialog', { name: 'Dodaj zmianę' })).toBeVisible();
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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dodaj zmianę' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj zmianę' }));
    fireEvent.change(await screen.findByLabelText('Kwota — zł'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmianę' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Zapisz zmianę' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmianę' }));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
    expect(execute.mock.calls[0]?.[0]).toBe(execute.mock.calls[1]?.[0]);
  });
});
