import React from 'react';
import {
  formatMoney,
  formatUnsignedPercent,
  formatPercentagePoints,
  formatSignedMoney
} from '../viewModels/formatters.js';

export const rebalanceLabels: Record<string, string> = {
  BITCOIN: 'Bitcoin (BTC)',
  BONDS: 'Obligacje',
  GOLD: 'Złoto (ETF)',
  RYNKI_ROZWINIETE: 'Rynki rozwinięte',
  RYNKI_ROZWIJAJACE_SIE: 'Rynki wschodzące'
};
type DeviationRow = {
  key: string;
  currentValue: number;
  currentWeight: number | null;
  targetWeight: number;
  deviation: number | null;
  deviationAmount: number;
};
export function AllocationDeviationChart({ rows, total }: { rows: DeviationRow[]; total: number }) {
  return (
    <section className="allocationVisual" aria-label="Obecne odchylenia od planu">
      <header className="allocationVisualHeader">
        <div>
          <h3>Obecne odchylenia od planu</h3>
        </div>
      </header>
      <p className="allocationVisualIntro">Cały portfel objęty planem — zapisane cele</p>
      <div className="allocationVisualLegend" aria-hidden="true">
        <span>
          <i /> Teraz
        </span>
        <span>
          <i className="allocationTargetSwatch" /> Cel
        </span>
        <small>Skala 0–100%</small>
      </div>
      <ul className="allocationVisualRows" aria-label="Porównanie obecnych udziałów z celem">
        {rows.map((row) => (
          <li className="allocationVisualRow" key={row.key}>
            <div className="allocationVisualIdentity">
              <strong>{rebalanceLabels[row.key]}</strong>
              <span>{formatMoney(row.currentValue)}</span>
            </div>
            <div className="allocationBars">
              <div className="allocationBarLine">
                <span>Teraz</span>
                <div className="allocationTrack" aria-hidden="true">
                  <div className="allocationCurrentFill" style={{ width: `${row.currentWeight ?? 0}%` }} />
                </div>
                <strong>{formatUnsignedPercent(row.currentWeight)}</strong>
              </div>
              <div className="allocationBarLine">
                <span>Cel</span>
                <div className="allocationTrack" aria-hidden="true">
                  <div className="allocationTargetFill" style={{ width: `${row.targetWeight}%` }} />
                </div>
                <strong>{formatUnsignedPercent(row.targetWeight)}</strong>
              </div>
            </div>
            <div className="allocationDelta">
              <span className="allocationDeltaBadge">{formatPercentagePoints(row.deviation)}</span>
              <strong>{total ? formatSignedMoney(row.deviationAmount) : '—'}</strong>
              <small>
                {!total
                  ? 'Brak udziałów do porównania'
                  : row.deviationAmount > 0
                    ? 'Nadwyżka względem celu'
                    : row.deviationAmount < 0
                      ? 'Niedobór względem celu'
                      : 'Zgodnie z planem kwotowym'}
              </small>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
