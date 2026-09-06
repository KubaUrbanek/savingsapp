// @ts-nocheck
import React from 'react';
import { buildSummary } from '../../domain/portfolio/summary.js';
import { mapTimeSeriesViewModel } from '../viewModels/portfolioViewModelMappers.js';
import { DataTable, type DataColumn } from './DataTable.js';
import { Field } from './Field.js';
import { Metric } from './Metric.js';
import { SectionHeader } from './SectionHeader.js';

export function SummaryChart({ id = undefined, entries, types }) {
  const summaryId = React.useId();
  const scrollHintId = React.useId();
  const [selectedType, setSelectedType] = React.useState('ALL');
  const [period, setPeriod] = React.useState('monthly');
  const filteredEntries = selectedType === 'ALL' ? entries : entries.filter((entry) => entry.type === selectedType);
  const points = buildSummary(filteredEntries, period);
  const viewModel = mapTimeSeriesViewModel(points, types, selectedType, period);
  const chartWidth = 760;
  const chartHeight = 300;
  const padding = { top: 22, right: 24, bottom: 58, left: 62 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const barGap = 14;
  const barWidth = points.length ? Math.max(18, (innerWidth - barGap * (points.length - 1)) / points.length) : 0;
  const selectedTypeLabel =
    viewModel.typeOptions.find((option) => option.value === selectedType)?.label || selectedType;
  const periodLabel = period === 'yearly' ? 'rocznie' : 'miesięcznie';
  const latestPoint = points.at(-1);
  const changeSymbol = (latestPoint?.changeAmount || 0) >= 0 ? '↑' : '↓';

  return (
    <section className="ledgerSection graphPanel sectionAnchor" id={id}>
      <div className="graphHeader">
        <SectionHeader eyebrow="Analiza wzrostu" title="Miesięczne i roczne podsumowanie inwestycji" />
        <div className="graphControls">
          <Field
            label="Zakres inwestycji"
            control={
              <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
                {viewModel.typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            }
          />
          <Field
            label="Okres"
            control={
              <select value={period} onChange={(event) => setPeriod(event.target.value)}>
                <option value="monthly">Miesięcznie</option>
                <option value="yearly">Rocznie</option>
              </select>
            }
          />
        </div>
      </div>

      <div className="metricGrid">
        <Metric label="Aktualna suma" value={viewModel.total} />
        <Metric
          label="Zmiana kwotowa"
          value={`${changeSymbol} ${viewModel.change}`}
          tone={(latestPoint?.changeAmount || 0) >= 0 ? 'positive' : 'negative'}
        />
        <Metric
          label="Zmiana procentowa"
          value={`${changeSymbol} ${viewModel.changePercent}`}
          tone={(latestPoint?.changeAmount || 0) >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <p id={summaryId} className="chartTextSummary">
        {selectedTypeLabel}, {periodLabel}: aktualna suma {viewModel.total}, zmiana kwotowa {viewModel.change}, zmiana
        procentowa {viewModel.changePercent}.
      </p>

      {viewModel.rows.length === 0 ? (
        <p>Brak danych do narysowania wykresu dla wybranego zakresu.</p>
      ) : (
        <>
          <p className="visuallyHidden" id={scrollHintId}>
            Wykres przewija się poziomo. Użyj klawiszy strzałek, aby zobaczyć pozostałe okresy.
          </p>
          <div
            className="chartScroller"
            role="region"
            aria-label="Przewijany wykres podsumowania inwestycji"
            aria-describedby={scrollHintId}
            tabIndex={0}
          >
            <div role="img" aria-label="Wykres słupkowy podsumowania inwestycji" aria-describedby={summaryId}>
              <svg
                aria-hidden="true"
                className="summaryChart"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
              >
                <line
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={chartHeight - padding.bottom}
                  y2={chartHeight - padding.bottom}
                />
                {viewModel.rows.map((point, index) => {
                  const height = point.heightRatio * innerHeight;
                  const x = padding.left + index * (barWidth + barGap);
                  const y = padding.top + innerHeight - height;
                  return (
                    <g key={point.key}>
                      <rect className="chartBar" x={x} y={y} width={barWidth} height={height} rx="8" />
                      <text className="chartValue" x={x + barWidth / 2} y={Math.max(18, y - 8)} textAnchor="middle">
                        {point.valueLabel}
                      </text>
                      <text
                        className={`chartChange ${point.changeClass}`}
                        x={x + barWidth / 2}
                        y={chartHeight - 34}
                        textAnchor="middle"
                      >
                        {point.changeLabel}
                      </text>
                      <text className="chartLabel" x={x + barWidth / 2} y={chartHeight - 12} textAnchor="middle">
                        {point.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </>
      )}
      {viewModel.rows.length > 0 && (
        <details className="chartDataDisclosure">
          <summary>Pokaż dane wykresu</summary>
          <DataTable
            caption={`Dane dla: ${selectedTypeLabel}, ${periodLabel}`}
            rows={viewModel.rows}
            rowKey={(point) => point.key}
            columns={
              [
                { key: 'period', header: 'Okres', rowHeader: true, cell: (point) => point.label },
                { key: 'value', header: 'Wartość', cell: (point) => point.valueLabel },
                {
                  key: 'change',
                  header: 'Zmiana',
                  cell: (point) => `${point.changeAmount >= 0 ? '↑' : '↓'} ${point.changeLabel}`
                }
              ] satisfies DataColumn<(typeof viewModel.rows)[number]>[]
            }
          />
        </details>
      )}
    </section>
  );
}
