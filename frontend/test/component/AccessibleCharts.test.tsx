import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HouseholdDashboard } from '../../src/presentation/components/HouseholdDashboard.js';
import { SummaryChart } from '../../src/presentation/components/SummaryChart.js';

const entries = [
  {
    id: 1,
    owner: 'JAN',
    type: 'OBLIGACJE',
    subcategory: 'TRZYLETNIE',
    valuePln: 50000,
    date: '2026-07-01',
    createdAt: '2026-07-01T10:00:00Z'
  },
  {
    id: 2,
    owner: 'JAN',
    type: 'OBLIGACJE',
    subcategory: 'TRZYLETNIE',
    valuePln: 75000,
    date: '2026-08-01',
    createdAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 3,
    owner: 'JAN',
    type: 'GIELDA',
    subcategory: 'ZLOTO',
    valuePln: 25000,
    date: '2026-08-02',
    createdAt: '2026-08-02T10:00:00Z'
  }
];

afterEach(cleanup);

describe('accessible financial charts', () => {
  it('describes the selected series and exposes every plotted point in a disclosure table', () => {
    render(<SummaryChart entries={entries} types={['OBLIGACJE', 'GIELDA']} />);

    const chart = screen.getByRole('img', { name: 'Wykres słupkowy podsumowania inwestycji' });
    expect(chart).toHaveAccessibleDescription(
      /Wszystkie inwestycje, miesięcznie: aktualna suma 100\s000,00\szł, zmiana kwotowa 50\s000,00\szł, zmiana procentowa \+100%\./
    );
    expect(chart.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');

    const disclosure = screen.getByText('Pokaż dane wykresu');
    expect(disclosure.tagName).toBe('SUMMARY');
    fireEvent.click(disclosure);
    const table = screen.getByRole('table', { name: 'Dane dla: Wszystkie inwestycje, miesięcznie' });
    expect(within(table).getByRole('rowheader', { name: /lip 2026/i })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: /sie 2026/i })).toBeInTheDocument();
    expect(within(table).getByText(/50\s000,00\szł/)).toBeInTheDocument();
    expect(within(table).getByText(/100\s000,00\szł/)).toBeInTheDocument();
  });

  it('announces asset shares and goal completion with bounded progress values', () => {
    render(
      <HouseholdDashboard
        entries={entries}
        users={['JAN']}
        types={['OBLIGACJE', 'GIELDA']}
        preferences={{ householdGoal: () => 200000, changeHouseholdGoal: vi.fn() }}
        onPreferenceError={vi.fn()}
      />
    );

    const bonds = screen.getByRole('progressbar', { name: 'Udział: Obligacje' });
    expect(bonds).toHaveAttribute('aria-valuemin', '0');
    expect(bonds).toHaveAttribute('aria-valuemax', '100');
    expect(bonds).toHaveAttribute('aria-valuenow', '75');
    expect(bonds).toHaveAttribute('aria-valuetext', '75%');

    const goal = screen.getByRole('progressbar', { name: 'Realizacja wspólnego celu' });
    expect(goal).toHaveAttribute('aria-valuenow', '50');
    expect(goal).toHaveAttribute('aria-valuetext', '50%');
    expect(goal).toHaveAccessibleDescription(/100\s000,00\szł z 200\s000,00\szł/);
  });
});
