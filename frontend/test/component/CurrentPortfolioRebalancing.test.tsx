import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { PurchasePlanPanel } from '../../src/presentation/components/PurchasePlanPanel.js';
import { expectNoAccessibilityViolations } from './accessibility.js';
afterEach(cleanup);
const plan = { bonds: 50, gold: 25, developed: 17.5, emerging: 7.5 };
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
  fireEvent.change(screen.getByLabelText('Kwota na zakupy — zł'), { target: { value: '-1' } });
  fireEvent.click(screen.getByLabelText('Rebalans obecnego portfela'));
  expect(screen.queryByLabelText('Kwota na zakupy — zł')).not.toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Co sprzedać' })).toHaveTextContent(/5\s?000,00/);
  expect(within(screen.getByRole('list', { name: 'Co kupić' })).getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getByRole('list', { name: 'Po rebalansie' })).toHaveTextContent('25%');
  expect(useCases.savePortfolioPlan.execute).not.toHaveBeenCalled();
  await expectNoAccessibilityViolations(container);
  fireEvent.click(screen.getByText('Zmień proporcje'));
  fireEvent.change(screen.getByLabelText('Obligacje — %'), { target: { value: '80' } });
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
it('uses the shared plan for the selected scope and suppresses calculations while assets reload', async () => {
  const useCases = deps();
  const { rerender } = render(<PurchasePlanPanel entries={entries} scope="jakub" useCases={useCases} />);
  await screen.findByRole('region', { name: 'Obecne odchylenia od planu' });
  fireEvent.click(screen.getByLabelText('Rebalans obecnego portfela'));
  rerender(<PurchasePlanPanel entries={[]} scope="zosia" useCases={useCases} assetsReady={false} />);
  expect(screen.queryByRole('region', { name: 'Obecne odchylenia od planu' })).not.toBeInTheDocument();
  rerender(<PurchasePlanPanel entries={[]} scope="zosia" useCases={useCases} assetsReady={true} />);
  await waitFor(() => expect(screen.getByLabelText('Dokupowanie')).toBeChecked());
  expect(useCases.loadPortfolioPlan.execute).toHaveBeenCalledWith(expect.objectContaining({ scope: 'household' }));
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
