import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OverviewCharts } from '../../src/presentation/components/OverviewCharts.js';
import { OverviewFilters } from '../../src/presentation/components/OverviewFilters.js';
import type { OverviewEntry } from '../../src/domain/portfolio/overviewVisualization.js';
import { expectNoAccessibilityViolations } from './accessibility.js';

const entries: OverviewEntry[] = [
  { id: '1', owner: 'JAN', type: 'PPK', valuePln: 1000, date: '2025-10-01', createdAt: '2025-10-01T10:00:00Z' },
  { id: '2', owner: 'JAN', type: 'PPK', valuePln: 1200, date: '2026-10-01', createdAt: '2026-10-01T10:00:00Z' },
  {
    id: '3',
    owner: 'JAN',
    type: 'IKE',
    subcategory: 'ZLOTO',
    valuePln: 800,
    date: '2026-10-15',
    createdAt: '2026-10-15T10:00:00Z'
  }
];
afterEach(cleanup);

function historyTable() {
  fireEvent.click(screen.getByText('Pokaż dane wykresu'));
  return screen.getByRole('table', { name: 'Historia wartości zaznaczonych inwestycji' });
}

describe('overview visualization', () => {
  it('shows current shares and one year of carried-forward value with an accessible exact-data table', () => {
    render(<OverviewCharts entries={entries} grouping="accounts" today="2026-11-15" />);
    expect(screen.getByLabelText('Zakres czasu')).toHaveValue('1y');
    expect(screen.getByLabelText('Pokaż rozbicie')).not.toBeChecked();
    const distribution = screen.getByRole('region', { name: 'Rozkład oszczędności' });
    expect(distribution).toHaveTextContent(/2\s?000,00\szł/);
    expect(distribution).toHaveTextContent('60%');
    expect(distribution).toHaveTextContent('40%');
    expect(screen.getByRole('img', { name: 'Historia wartości oszczędności' })).toHaveAccessibleDescription(
      /2\s?000,00\szł/
    );
    const table = historyTable();
    expect(within(table).getAllByRole('columnheader')).toHaveLength(2);
    expect(within(table).getByRole('rowheader', { name: '2025-11-15' }).parentElement).toHaveTextContent(
      /1\s?000,00\szł/
    );
    expect(within(table).getByRole('rowheader', { name: '2026-11-15' }).parentElement).toHaveTextContent(
      /2\s?000,00\szł/
    );
    expect(screen.getByText(/Zmiana wartości obejmuje wpłaty i wypłaty/)).toBeVisible();
  });

  it('adds breakdown series with exact group values, labels and distinct line patterns', () => {
    render(<OverviewCharts entries={entries} grouping="assetClasses" today="2026-11-15" />);
    fireEvent.click(screen.getByLabelText('Pokaż rozbicie'));
    const legend = screen.getByRole('list', { name: 'Serie historii wartości' });
    expect(within(legend).getByText('Łączna wartość')).toBeVisible();
    expect(within(legend).getByText('Złoto')).toBeVisible();
    expect(within(legend).getByText('Nieznany skład')).toBeVisible();
    const patterns = Array.from(legend.querySelectorAll('line')).map((line) => line.getAttribute('stroke-dasharray'));
    expect(new Set(patterns).size).toBe(3);
    const table = historyTable();
    expect(within(table).getAllByRole('columnheader')).toHaveLength(4);
    expect(within(table).getByRole('rowheader', { name: '2026-11-15' }).parentElement).toHaveTextContent(
      /2\s?000,00\szł800,00\szł1\s?200,00\szł/
    );
    expect(screen.getByText('PPK i PPO mają nieznany skład. Pokazujemy je osobno.')).toBeVisible();
  });

  it('changes the historical range without changing current distribution and rejects invalid custom dates', () => {
    render(<OverviewCharts entries={entries} grouping="accounts" today="2026-11-15" />);
    fireEvent.change(screen.getByLabelText('Zakres czasu'), { target: { value: 'custom' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Od')).toHaveValue('2025-11-15');
    expect(screen.getByLabelText('Do')).toHaveValue('2026-11-15');
    fireEvent.change(screen.getByLabelText('Od'), { target: { value: '2025-10-01' } });
    fireEvent.change(screen.getByLabelText('Do'), { target: { value: '2025-10-01' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const chart = screen.getByRole('img', { name: 'Historia wartości oszczędności' });
    expect(chart).toHaveAccessibleDescription(/1\s?000,00\szł/);
    expect(chart.querySelector('circle')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Rozkład oszczędności' })).toHaveTextContent(/2\s?000,00\szł/);
    fireEvent.change(screen.getByLabelText('Od'), { target: { value: '2026-11-16' } });
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('handles empty selection and an interval with no known valuations without invalid charts', () => {
    const { rerender } = render(<OverviewCharts entries={[]} grouping="accounts" today="2026-11-15" />);
    expect(screen.getByText(/Nie wybrano inwestycji/)).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    rerender(<OverviewCharts entries={entries} grouping="accounts" today="2026-11-15" />);
    fireEvent.change(screen.getByLabelText('Zakres czasu'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('Od'), { target: { value: '2024-10-01' } });
    fireEvent.change(screen.getByLabelText('Do'), { target: { value: '2024-11-01' } });
    expect(screen.getByText(/Brak danych dla wybranego zakresu/)).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('emits independent group selections and supports selecting all without hiding excluded options', () => {
    const onGroupingChange = vi.fn();
    const onExcludedGroupsChange = vi.fn();
    const { rerender } = render(
      <OverviewFilters
        grouping="accounts"
        groups={['PPK', 'PPO']}
        excludedGroups={[]}
        onGroupingChange={onGroupingChange}
        onExcludedGroupsChange={onExcludedGroupsChange}
      />
    );
    fireEvent.click(screen.getByLabelText('PPK'));
    expect(onExcludedGroupsChange).toHaveBeenLastCalledWith(['PPK']);
    rerender(
      <OverviewFilters
        grouping="accounts"
        groups={['PPK', 'PPO']}
        excludedGroups={['PPK']}
        onGroupingChange={onGroupingChange}
        onExcludedGroupsChange={onExcludedGroupsChange}
      />
    );
    expect(screen.getByLabelText('PPK')).not.toBeChecked();
    expect(screen.getByLabelText('PPO')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż wszystkie' }));
    expect(onExcludedGroupsChange).toHaveBeenLastCalledWith([]);
    fireEvent.click(screen.getByRole('button', { name: 'Odznacz wszystkie' }));
    expect(onExcludedGroupsChange).toHaveBeenLastCalledWith(['PPK', 'PPO']);
    fireEvent.click(screen.getByRole('button', { name: 'Według rodzaju inwestycji' }));
    expect(onGroupingChange).toHaveBeenLastCalledWith('assetClasses');
  });

  it('has no detected accessibility violations with filters, breakdown and expanded data', async () => {
    const { container } = render(
      <>
        <OverviewFilters
          grouping="accounts"
          groups={['IKE', 'PPK']}
          excludedGroups={[]}
          onGroupingChange={vi.fn()}
          onExcludedGroupsChange={vi.fn()}
        />
        <OverviewCharts entries={entries} grouping="accounts" today="2026-11-15" />
      </>
    );
    fireEvent.click(screen.getByLabelText('Pokaż rozbicie'));
    historyTable();
    await expectNoAccessibilityViolations(container);
  });
});
