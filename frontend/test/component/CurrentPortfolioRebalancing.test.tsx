import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { PurchasePlanPanel } from '../../src/presentation/components/PurchasePlanPanel.js';
import { expectNoAccessibilityViolations } from './accessibility.js';
afterEach(cleanup);
const plan = { bonds: 50, gold: 25, developed: 17.5, emerging: 7.5, bitcoin: 0 };
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
  fireEvent.click(screen.getByText('Szczegóły wyliczeń'));
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

it('freezes selected exclusions, keeps the chart unchanged, and preserves selection across modes', async () => {
  const useCases = deps();
  const { container, rerender } = render(<PurchasePlanPanel entries={entries} scope="jakub" useCases={useCases} />);
  const chart = await screen.findByRole('region', { name: 'Obecne odchylenia od planu' });
  const chartText = chart.textContent;
  expect(within(chart).getAllByText('Teraz').length).toBeGreaterThan(0);
  expect(within(chart).getAllByText('Cel').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByLabelText('Rebalans obecnego portfela'));
  const bonds = screen.getByRole('checkbox', { name: /Obligacje/ });
  fireEvent.click(bonds);
  expect(chart.textContent).toBe(chartText);
  expect(screen.getByText('Wybrane aktywa nie mają środków do rebalansu.')).toBeVisible();
  expect(screen.queryByRole('list', { name: 'Po rebalansie' })).not.toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Co sprzedać' })).not.toBeInTheDocument();
  await expectNoAccessibilityViolations(container);
  fireEvent.click(screen.getByLabelText('Dokupowanie'));
  fireEvent.click(screen.getByLabelText('Rebalans obecnego portfela'));
  expect(screen.getByRole('checkbox', { name: /Obligacje/ })).not.toBeChecked();
  for (const checkbox of screen.getAllByRole('checkbox'))
    if ((checkbox as HTMLInputElement).checked) fireEvent.click(checkbox);
  expect(screen.getByText('Wybierz aktywa do rebalansu.')).toBeVisible();
  fireEvent.click(screen.getByRole('checkbox', { name: /Obligacje/ }));
  expect(screen.getByText(/Wybrano jedno aktywo/)).toBeVisible();
  rerender(<PurchasePlanPanel entries={entries} scope="zosia" useCases={useCases} />);
  await waitFor(() => expect(screen.getByLabelText('Dokupowanie')).toBeChecked());
  fireEvent.click(screen.getByLabelText('Rebalans obecnego portfela'));
  expect(screen.getAllByRole('checkbox').every((input) => (input as HTMLInputElement).checked)).toBe(true);
  expect(useCases.savePortfolioPlan.execute).not.toHaveBeenCalled();
});

it('places controls after the global chart and compares selected shares with normalized targets', async () => {
  const useCases = deps();
  useCases.loadPortfolioPlan.execute.mockResolvedValue({ bonds: 50, gold: 15, developed: 30, emerging: 5, bitcoin: 0 });
  render(
    <PurchasePlanPanel
      entries={[
        { ...entries[0], valuePln: 150222.85 },
        { ...entries[0], type: 'GIELDA', subcategory: 'ZLOTO', valuePln: 9590.54 },
        { ...entries[0], type: 'GIELDA', subcategory: 'RYNKI_ROZWINIETE', valuePln: 7192.91 },
        { ...entries[0], type: 'GIELDA', subcategory: 'RYNKI_ROZWIJAJACE_SIE', valuePln: 7192.91 }
      ]}
      scope="jakub"
      useCases={useCases}
    />
  );
  const chart = await screen.findByRole('region', { name: 'Obecne odchylenia od planu' });
  const modes = screen.getByRole('group', { name: 'Sposób planowania' });
  expect(chart.compareDocumentPosition(modes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const original = chart.textContent;
  fireEvent.click(screen.getByLabelText('Rebalans obecnego portfela'));
  fireEvent.click(screen.getByRole('checkbox', { name: /Obligacje/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Bitcoin/ }));
  expect(screen.getByRole('checkbox', { name: /Złoto/ }).closest('label')).toHaveTextContent(
    'Cel wybranej części: 30%'
  );
  fireEvent.click(screen.getByText('Szczegóły wyliczeń'));
  expect(screen.getByRole('list', { name: 'Po rebalansie' })).toHaveTextContent(
    'Udział w wybranej części: 60% · Cel wybranej części: 60%'
  );
  expect(screen.getByRole('region', { name: 'Poza rebalansem — bez zmian' })).toHaveTextContent(/150\s222,85/);
  expect(chart.textContent).toBe(original);
  expect(useCases.savePortfolioPlan.execute).not.toHaveBeenCalled();
});
