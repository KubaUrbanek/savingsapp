import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { PurchasePlanPanel } from '../../src/presentation/components/PurchasePlanPanel.js';
import { expectNoAccessibilityViolations } from './accessibility.js';
afterEach(cleanup);
const plan = { bonds: 50, stocks: 50, gold: 50, developed: 35, emerging: 15 };
const entries = [
  {
    owner: 'jakub',
    type: 'OBLIGACJE',
    subcategory: 'TRZYLETNIE',
    valuePln: 10000,
    date: '2026-01-01',
    createdAt: '2026-01-01T00:00:00Z'
  }
];
const deps = () => ({
  loadPortfolioPlan: { execute: vi.fn(async () => plan) },
  savePortfolioPlan: { execute: vi.fn(async ({ plan: next }) => next) }
});
it('shows deviations without budget, balances trades and keeps rebalancing independent of invalid budget', async () => {
  const useCases = deps();
  const { container } = render(<PurchasePlanPanel entries={entries} scope="jakub" useCases={useCases} />);
  expect(await screen.findByRole('region', { name: 'Obecne odchylenia od planu' })).toHaveTextContent('+50 pp');
  fireEvent.change(screen.getByLabelText('Mam do zainwestowania — zł'), { target: { value: '-1' } });
  fireEvent.click(screen.getByLabelText('Rebalans obecnego portfela'));
  expect(screen.queryByLabelText('Mam do zainwestowania — zł')).not.toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Co sprzedać' })).toHaveTextContent(/5\s?000,00/);
  expect(within(screen.getByRole('list', { name: 'Co kupić' })).getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getByRole('list', { name: 'Po rebalansie' })).toHaveTextContent('25%');
  expect(useCases.savePortfolioPlan.execute).not.toHaveBeenCalled();
  await expectNoAccessibilityViolations(container);
  fireEvent.click(screen.getByText('Zmień mój plan'));
  fireEvent.change(screen.getByLabelText('Obligacje — % całego planu'), { target: { value: '80' } });
  expect(screen.queryByRole('region', { name: 'Obecne odchylenia od planu' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Anuluj zmiany planu' }));
  expect(screen.getByRole('list', { name: 'Co sprzedać' })).toBeInTheDocument();
});
it('shows excluded cash and empty rebalance instead of claiming success', async () => {
  render(
    <PurchasePlanPanel
      entries={[{ ...entries[0], type: 'KONTO_BANKOWE', subcategory: null }]}
      scope="household"
      useCases={deps()}
    />
  );
  await screen.findByRole('region', { name: 'Obecne odchylenia od planu' });
  fireEvent.click(screen.getByLabelText('Rebalans obecnego portfela'));
  expect(screen.getByText('Brak inwestycji do rebalansu.')).toBeVisible();
  expect(screen.queryByRole('list', { name: 'Co sprzedać' })).not.toBeInTheDocument();
});
it('ignores an old save response after switching scope and resets the mode', async () => {
  let finish: (value: typeof plan) => void = () => {};
  const useCases = deps();
  useCases.savePortfolioPlan.execute = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const { rerender } = render(<PurchasePlanPanel entries={entries} scope="jakub" useCases={useCases} />);
  await screen.findByRole('region', { name: 'Obecne odchylenia od planu' });
  fireEvent.click(screen.getByLabelText('Rebalans obecnego portfela'));
  fireEvent.click(screen.getByText('Zmień mój plan'));
  fireEvent.change(screen.getByLabelText('Rynki rozwinięte — % akcji'), { target: { value: '40' } });
  fireEvent.change(screen.getByLabelText('Rynki wschodzące — % akcji'), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Zapisz mój plan' }));
  rerender(<PurchasePlanPanel entries={[]} scope="zosia" useCases={useCases} />);
  await screen.findByRole('region', { name: 'Obecne odchylenia od planu' });
  finish({ ...plan, developed: 40, emerging: 10 });
  await waitFor(() => expect(screen.getByLabelText('Dokupowanie')).toBeChecked());
  expect(screen.getByRole('list', { name: 'Podział akcji w zapisanym planie' })).toHaveTextContent(
    '17,5% całego planu'
  );
});
it('load errors suppress recommendations', async () => {
  render(
    <PurchasePlanPanel
      entries={entries}
      scope="jakub"
      useCases={{
        loadPortfolioPlan: {
          execute: async () => {
            throw Error('offline');
          }
        }
      }}
    />
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się wczytać planu');
  expect(screen.queryByRole('region', { name: 'Obecne odchylenia od planu' })).not.toBeInTheDocument();
});
