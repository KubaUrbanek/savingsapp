// @ts-nocheck
import React from 'react';
import { buildSummary } from '../../domain/portfolio/summary.js';
import { mapTimeSeriesViewModel } from '../viewModels/portfolioViewModelMappers.js';

export function SummaryChart({ entries, types }) {
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

  return (
    <section className="panel graphPanel">
      <div className="graphHeader">
        <div>
          <p className="eyebrow">Analiza wzrostu</p>
          <h2>Miesięczne i roczne podsumowanie inwestycji</h2>
        </div>
        <div className="graphControls">
          <label>
            Zakres inwestycji
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
              {viewModel.typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Okres
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="monthly">Miesięcznie</option>
              <option value="yearly">Rocznie</option>
            </select>
          </label>
        </div>
      </div>

      <div className="metricGrid">
        <div className="metricCard">
          <span>Aktualna suma</span>
          <strong>{viewModel.total}</strong>
        </div>
        <div className={viewModel.changeClass}>
          <span>Zmiana kwotowa</span>
          <strong>{viewModel.change}</strong>
        </div>
        <div className={viewModel.percentClass}>
          <span>Zmiana procentowa</span>
          <strong>{viewModel.changePercent}</strong>
        </div>
      </div>

      {viewModel.rows.length === 0 ? (
        <p>Brak danych do narysowania wykresu dla wybranego zakresu.</p>
      ) : (
        <div className="chartScroller" role="img" aria-label="Wykres słupkowy podsumowania inwestycji">
          <svg className="summaryChart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#3f9d63" />
                <stop offset="100%" stopColor="#173d27" />
              </linearGradient>
            </defs>
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
      )}
    </section>
  );
}
