import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlobalAllocationPanel } from '../../src/presentation/components/GlobalAllocationPanel.js';
import { StockAllocationPanel } from '../../src/presentation/components/StockAllocationPanel.js';

const entries = [
  {
    id: 1,
    owner: 'JAN',
    type: 'OBLIGACJE',
    subcategory: 'TRZYLETNIE',
    valuePln: 60000,
    date: '2026-08-01',
    createdAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 2,
    owner: 'JAN',
    type: 'GIELDA',
    subcategory: 'ZLOTO',
    valuePln: 20000,
    date: '2026-08-02',
    createdAt: '2026-08-02T10:00:00Z'
  },
  {
    id: 3,
    owner: 'JAN',
    type: 'GIELDA',
    subcategory: 'RYNKI_ROZWINIETE',
    valuePln: 12000,
    date: '2026-08-03',
    createdAt: '2026-08-03T10:00:00Z'
  },
  {
    id: 4,
    owner: 'JAN',
    type: 'GIELDA',
    subcategory: 'RYNKI_ROZWIJAJACE_SIE',
    valuePln: 8000,
    date: '2026-08-04',
    createdAt: '2026-08-04T10:00:00Z'
  }
];

const preferences = {
  globalAllocation: () => ({ BONDS: 50, STOCKS: 30, GOLD: 20 }),
  changeGlobalAllocation: vi.fn(),
  stockAllocation: () => ({ ZLOTO: 40, RYNKI_ROZWINIETE: 30, RYNKI_ROZWIJAJACE_SIE: 30 }),
  changeStockAllocation: vi.fn()
};

afterEach(cleanup);

describe('responsive allocation representations', () => {
  it('repeats every global allocation record and field in the mobile definition-list view', () => {
    render(<GlobalAllocationPanel entries={entries} preferences={preferences} onPreferenceError={vi.fn()} />);

    const desktop = screen.getByRole('table', { name: 'Globalna alokacja majątku' });
    const mobile = screen.getByLabelText('Globalna alokacja majątku — widok mobilny');
    for (const label of ['Obligacje', 'Akcje', 'Złoto']) {
      expect(within(desktop).getByText(label)).toBeInTheDocument();
      expect(within(mobile).getByRole('heading', { name: label })).toBeInTheDocument();
    }
    for (const field of ['Aktualnie', 'Cel', 'Odchylenie', 'Kup / sprzedaj', 'Tylko nowe wpłaty']) {
      expect(within(mobile).getAllByText(field)).toHaveLength(3);
    }
    expect(within(mobile).getByText('60 000,00 zł')).toBeInTheDocument();
  });

  it('repeats every stock allocation record and field in the mobile definition-list view', () => {
    render(
      <StockAllocationPanel
        entries={entries}
        onAddStockValue={vi.fn()}
        preferences={preferences}
        onPreferenceError={vi.fn()}
      />
    );

    const desktop = screen.getByRole('table', { name: 'Docelowa alokacja giełdowa' });
    const mobile = screen.getByLabelText('Docelowa alokacja giełdowa — widok mobilny');
    for (const label of ['Złoto', 'Rynki rozwinięte', 'Rynki rozwijające się']) {
      expect(within(desktop).getByText(label)).toBeInTheDocument();
      expect(within(mobile).getByRole('heading', { name: label })).toBeInTheDocument();
    }
    for (const field of ['Obecnie', 'Powinno być', 'Różnica', 'Udział', 'Odchylenie']) {
      expect(within(mobile).getAllByText(field)).toHaveLength(3);
    }
    expect(within(mobile).getByText('20 000,00 zł')).toBeInTheDocument();
    expect(within(mobile).getByText('Aktualizacja: 2026-08-02')).toBeInTheDocument();
  });
});
