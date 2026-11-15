import React from 'react';
import {
  availableGroups,
  buildOverviewDistribution,
  buildOverviewHistory,
  resolveOverviewRange,
  type OverviewEntry,
  type OverviewGrouping,
  type OverviewRange
} from '../../domain/portfolio/overviewVisualization.js';
import { formatMoney, formatUnsignedPercent } from '../viewModels/formatters.js';
import { overviewDateLabel, overviewGroupLabel, overviewGroupStyle } from '../viewModels/overviewVisualization.js';
import { DataTable } from './DataTable.js';
import { Field } from './Field.js';

type OverviewChartsProps = { entries: OverviewEntry[]; grouping: OverviewGrouping; today: string };
type HistoryPoint = ReturnType<typeof buildOverviewHistory>[number];
type ChartSeries = { key: string; label: string; color: string; dash: string };
const totalSeries: ChartSeries = { key: 'total', label: 'Łączna wartość', color: 'var(--color-ink)', dash: '' };
const time = (date: string) => Date.parse(`${date}T00:00:00Z`);
const shortMoney = (value: number) =>
  new Intl.NumberFormat('pl-PL', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

function HistoryLines({
  points,
  series,
  start,
  end,
  descriptionId
}: {
  points: HistoryPoint[];
  series: ChartSeries[];
  start: string;
  end: string;
  descriptionId: string;
}) {
  const maximum = points.reduce((largest, point) => Math.max(largest, point.total), 1);
  const duration = time(end) - time(start);
  const x = (date: string) => (duration ? 88 + ((time(date) - time(start)) / duration) * 366 : 271);
  const y = (value: number) => 216 - (value / maximum) * 184;
  const value = (point: HistoryPoint, key: string) => (key === 'total' ? point.total : (point.groups[key] ?? 0));
  const path = (key: string) =>
    points
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'H'} ${x(point.date)} ${index === 0 ? '' : 'V'} ${y(value(point, key))}`
      )
      .join(' ');
  return (
    <>
      <div
        className="overviewHistoryGraphic"
        role="img"
        aria-label="Historia wartości oszczędności"
        aria-describedby={descriptionId}
      >
        <svg viewBox="0 0 480 244" aria-hidden="true" focusable="false">
          {[0, 0.5, 1].map((fraction) => (
            <g key={fraction}>
              <line
                className="overviewGridLine"
                x1="88"
                x2="454"
                y1={y(maximum * fraction)}
                y2={y(maximum * fraction)}
              />
              <text className="overviewAxisLabel" x="80" y={y(maximum * fraction) + 5} textAnchor="end">
                {shortMoney(maximum * fraction)}
              </text>
            </g>
          ))}
          <text className="overviewAxisLabel" x="88" y="17">
            PLN
          </text>
          {series.map((item) => (
            <g key={item.key}>
              <path
                d={path(item.key)}
                fill="none"
                stroke={item.color}
                strokeWidth={item.key === 'total' ? 3 : 2}
                strokeDasharray={item.dash}
              />
              {points.length === 1 && (
                <circle cx={x(points[0]!.date)} cy={y(value(points[0]!, item.key))} r="4" fill={item.color} />
              )}
            </g>
          ))}
        </svg>
      </div>
      <div className="overviewChartDates" aria-hidden="true">
        <span>{overviewDateLabel(start)}</span>
        {start !== end && <span>{overviewDateLabel(end)}</span>}
      </div>
      <ul className="overviewLegend" aria-label="Serie historii wartości">
        {series.map((item) => (
          <li key={item.key}>
            <svg viewBox="0 0 32 12" aria-hidden="true" focusable="false">
              <line x1="0" x2="32" y1="6" y2="6" stroke={item.color} strokeWidth="3" strokeDasharray={item.dash} />
            </svg>
            {item.label}
          </li>
        ))}
      </ul>
    </>
  );
}

export function OverviewCharts({ entries, grouping, today }: OverviewChartsProps) {
  const [range, setRange] = React.useState<OverviewRange>('1y');
  const [breakdown, setBreakdown] = React.useState(false);
  const [customStart, setCustomStart] = React.useState('');
  const [customEnd, setCustomEnd] = React.useState('');
  const historyDescriptionId = React.useId();
  const rangeHintId = React.useId();
  const rangeErrorId = React.useId();
  const distributionHeadingId = React.useId();
  const historyHeadingId = React.useId();
  const distribution = buildOverviewDistribution(entries, grouping);
  const total = distribution.reduce((sum, group) => sum + group.value, 0);
  const groups = availableGroups(entries, grouping);
  const { start, end, error } = resolveOverviewRange(entries, today, range, customStart, customEnd);
  const points = error ? [] : buildOverviewHistory(entries, grouping, start, end);
  const series = [
    totalSeries,
    ...(breakdown
      ? groups.map((key) => ({ key, label: overviewGroupLabel(key, grouping), ...overviewGroupStyle(key) }))
      : [])
  ];
  const latest = points.at(-1);
  return (
    <div className="overviewCharts">
      <section className="overviewChartPanel" aria-labelledby={distributionHeadingId}>
        <h2 id={distributionHeadingId}>Rozkład oszczędności</h2>
        <p className="overviewHint">Obecna wartość zaznaczonych inwestycji</p>
        <p className="overviewChartTotal">{formatMoney(total)}</p>
        {distribution.length === 0 ? (
          <p>Nie wybrano inwestycji. Zaznacz grupy, aby zobaczyć rozkład i historię wartości.</p>
        ) : (
          <ul className="overviewDistribution" aria-label="Udziały zaznaczonych inwestycji">
            {distribution.map((group) => (
              <li key={group.key}>
                <div className="overviewDistributionLabel">
                  <span>{overviewGroupLabel(group.key, grouping)}</span>
                  <strong>{formatMoney(group.value)}</strong>
                </div>
                <div className="overviewDistributionShare">
                  <div className="overviewDistributionTrack" aria-hidden="true">
                    <span style={{ width: `${group.share}%`, background: overviewGroupStyle(group.key).color }} />
                  </div>
                  <span>{formatUnsignedPercent(group.share)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {grouping === 'assetClasses' && groups.includes('UNCLASSIFIED') && (
          <p className="overviewHint">PPK i PPO mają nieznany skład. Pokazujemy je osobno.</p>
        )}
      </section>
      <section className="overviewChartPanel" aria-labelledby={historyHeadingId}>
        <h2 id={historyHeadingId}>Historia wartości</h2>
        <div className="overviewHistoryControls">
          <Field
            label="Zakres czasu"
            control={
              <select
                value={range}
                aria-describedby={rangeHintId}
                onChange={(event) => setRange(event.target.value as OverviewRange)}
              >
                <option value="1m">1 miesiąc</option>
                <option value="3m">3 miesiące</option>
                <option value="6m">6 miesięcy</option>
                <option value="1y">1 rok</option>
                <option value="all">Cała historia</option>
                <option value="custom">Własny zakres</option>
              </select>
            }
          />
          <label className="overviewCheckbox">
            <input type="checkbox" checked={breakdown} onChange={(event) => setBreakdown(event.target.checked)} />
            Pokaż rozbicie
          </label>
          {range === 'custom' && (
            <div className="overviewCustomRange">
              <Field
                label="Od"
                control={
                  <input
                    type="date"
                    max={today}
                    value={customStart}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? rangeErrorId : undefined}
                    onChange={(event) => setCustomStart(event.target.value)}
                  />
                }
              />
              <Field
                label="Do"
                control={
                  <input
                    type="date"
                    max={today}
                    value={customEnd}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? rangeErrorId : undefined}
                    onChange={(event) => setCustomEnd(event.target.value)}
                  />
                }
              />
            </div>
          )}
        </div>
        <p className="overviewHint" id={rangeHintId}>
          Zakres czasu dotyczy tylko historii. Podsumowanie i rozkład pokazują obecną wartość.
        </p>
        {error ? (
          <p className="fieldError" id={rangeErrorId} role="alert">
            {error}
          </p>
        ) : latest ? (
          <>
            <p id={historyDescriptionId} className="overviewHint">
              Od {overviewDateLabel(points[0]!.date)} do {overviewDateLabel(latest.date)}. Wartość na koniec zakresu:{' '}
              {formatMoney(latest.total)}.
              {breakdown
                ? ' Łączna wartość oraz rozbicie według wybranego podziału.'
                : ' Łączna wartość zaznaczonych inwestycji.'}
            </p>
            <HistoryLines
              points={points}
              series={series}
              start={start}
              end={end}
              descriptionId={historyDescriptionId}
            />
            <details className="chartDataDisclosure">
              <summary>Pokaż dane wykresu</summary>
              <div className="overviewHistoryTable" tabIndex={0} role="region" aria-label="Dane historii wartości">
                <DataTable
                  caption="Historia wartości zaznaczonych inwestycji"
                  rows={points}
                  rowKey={(point) => point.date}
                  columns={[
                    { key: 'date', header: 'Data', rowHeader: true, cell: (point) => point.date },
                    ...series.map((item) => ({
                      key: item.key,
                      header: item.label,
                      cell: (point: HistoryPoint) =>
                        formatMoney(item.key === 'total' ? point.total : (point.groups[item.key] ?? 0))
                    }))
                  ]}
                />
              </div>
            </details>
          </>
        ) : (
          <p>Brak danych do narysowania wykresu dla wybranego zakresu.</p>
        )}
        <p className="overviewHint">Zmiana wartości obejmuje wpłaty i wypłaty. Nie jest zyskiem z inwestycji.</p>
        <p className="overviewHint">
          Pomiędzy wycenami pokazujemy ostatnią znaną wartość. Inwestycję uwzględniamy od jej pierwszej wyceny;
          wcześniej jej wartość jest nieznana.
        </p>
      </section>
    </div>
  );
}
