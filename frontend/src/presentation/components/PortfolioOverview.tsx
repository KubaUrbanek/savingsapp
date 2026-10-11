// @ts-nocheck
import React from 'react';
import { Button } from './Button.js';
import { Metric } from './Metric.js';
import { DataTable } from './DataTable.js';
import {
  displayName,
  formatMoney,
  formatSignedMoney,
  formatUnsignedPercent,
  TYPE_LABELS,
  SUBCATEGORY_LABELS
} from '../viewModels/formatters.js';
import { buildCurrentSnapshot } from '../../domain/portfolio/snapshot.js';

function HoldingDetails({ asset, loading, onCompleteBasis, onManage }) {
  return (
    <details className="holdingDetails">
      <summary>
        Szczegóły
        <span className="visuallyHidden">
          {' '}
          — {SUBCATEGORY_LABELS[asset.subcategory] || TYPE_LABELS[asset.type]} · {displayName(asset.owner)}
        </span>
      </summary>
      <div className="holdingDetailsContent">
        <dl>
          <div>
            <dt>Wkład po wypłatach</dt>
            <dd>
              {loading
                ? 'Wczytywanie…'
                : asset.performance?.contributedCapitalPln == null
                  ? 'Brak danych'
                  : formatMoney(asset.performance.contributedCapitalPln)}
            </dd>
          </div>
          <div>
            <dt>Data wyceny</dt>
            <dd>{asset.date}</dd>
          </div>
        </dl>
        {!loading && asset.performance?.nominalResultPln == null && onCompleteBasis && (
          <Button onClick={() => onCompleteBasis(asset)}>Uzupełnij wpłaty</Button>
        )}
        {onManage && <Button onClick={() => onManage(asset)}>Edytuj / usuń</Button>}
      </div>
    </details>
  );
}
function HoldingValue({ asset, loading }) {
  const result = asset.performance?.nominalResultPln;
  return (
    <div className="holdingAmount">
      <strong>{formatMoney(asset.valuePln)}</strong>
      {!loading && result != null && (
        <small className={result < 0 ? 'negativeText' : 'positiveText'}>Wynik: {formatSignedMoney(result)}</small>
      )}
    </div>
  );
}
export function PortfolioOverview({
  entries,
  performance,
  assets = [],
  loading = false,
  onUpdate = undefined,
  onCompleteBasis = undefined as ((asset: object) => void) | undefined,
  onManage = undefined as ((asset: object) => void) | undefined
}) {
  const current = buildCurrentSnapshot(entries),
    total = current.reduce((s, e) => s + Number(e.valuePln), 0);
  const rows = current.map((e) => ({
    ...e,
    performance: assets.find((a) => a.owner === e.owner && a.type === e.type && a.subcategory === e.subcategory)
      ?.performance
  }));
  const dates = current.map((e) => e.date).sort(),
    oldest = dates[0],
    newest = dates.at(-1);
  const known = performance?.nominalResultPln != null;
  const metric = (value) => (loading ? 'Wczytywanie…' : value == null ? '—' : formatMoney(value));
  const missingBasis = !loading && rows.some((row) => row.performance?.nominalResultPln == null);
  return (
    <>
      <div className="savingsHeadline" aria-busy={loading}>
        <Metric
          label="Wpłaciłem"
          value={metric(!known && performance?.depositsTotalPln === 0 ? null : performance?.depositsTotalPln)}
          detail="Wpłaty i znany wkład początkowy"
        />
        <Metric
          className="summaryTotal"
          label="Mam teraz"
          value={formatMoney(total)}
          detail={
            !oldest ? 'Brak wycen' : oldest === newest ? `Wyceny z ${oldest}` : `Wyceny od ${oldest} do ${newest}`
          }
        />
        <Metric
          label={known ? (performance.nominalResultPln < 0 ? 'Straciłem' : 'Zarobiłem') : 'Zysk / strata'}
          value={loading ? 'Wczytywanie…' : known ? formatSignedMoney(performance.nominalResultPln) : '—'}
          tone={known ? (performance.nominalResultPln >= 0 ? 'positive' : 'negative') : 'neutral'}
          detail={known ? 'Wynik od początku, po uwzględnieniu wypłat' : 'Wynik wymaga danych o wpłatach'}
        />
      </div>
      {performance?.withdrawalsTotalPln > 0 && (
        <p>
          Wypłaciłem: {formatMoney(performance.withdrawalsTotalPln)}. Kapitał po wypłatach:{' '}
          {metric(performance.contributedCapitalPln)}.
        </p>
      )}
      <h2>Moje inwestycje</h2>
      {missingBasis && (
        <p className="holdingsNotice">
          Brak danych o wpłatach. Uzupełnij je w szczegółach inwestycji, aby zobaczyć zysk lub stratę.
        </p>
      )}
      <div className="tableScroller holdingsTable" role="region" aria-label="Wartości i wyniki inwestycji" tabIndex={0}>
        <DataTable
          caption="Wpłaty, wartość i wynik każdej inwestycji"
          rows={rows}
          rowKey={(e) => e.id}
          columns={[
            {
              key: 'asset',
              header: 'Inwestycja',
              rowHeader: true,
              cell: (e) => (
                <>
                  {SUBCATEGORY_LABELS[e.subcategory] || TYPE_LABELS[e.type]}
                  <small>
                    {TYPE_LABELS[e.type]} · {displayName(e.owner)}
                  </small>
                </>
              )
            },
            { key: 'value', header: 'Wartość', cell: (e) => <HoldingValue asset={e} loading={loading} /> },
            {
              key: 'action',
              header: 'Działania',
              cell: (e) => (
                <div className="holdingActions">
                  <Button onClick={() => onUpdate?.(e)}>Aktualizuj wartość</Button>
                  <HoldingDetails asset={e} loading={loading} onCompleteBasis={onCompleteBasis} onManage={onManage} />
                </div>
              )
            }
          ]}
        />
      </div>
      <ul className="holdingsCards" aria-label="Moje inwestycje">
        {rows.map((e) => (
          <li className="holdingCard" key={e.id}>
            <div className="holdingCardHeading">
              <div>
                <h3>{SUBCATEGORY_LABELS[e.subcategory] || TYPE_LABELS[e.type]}</h3>
                <small>
                  {TYPE_LABELS[e.type]} · {displayName(e.owner)}
                </small>
              </div>
              <HoldingValue asset={e} loading={loading} />
            </div>
            <div className="holdingActions">
              <Button onClick={() => onUpdate?.(e)}>Aktualizuj wartość</Button>
              <HoldingDetails asset={e} loading={loading} onCompleteBasis={onCompleteBasis} onManage={onManage} />
            </div>
          </li>
        ))}
      </ul>
      {performance?.monthlyResultPln != null && (
        <p>
          Wynik w tym miesiącu: <strong>{formatSignedMoney(performance.monthlyResultPln)}</strong>
          {performance.monthlyReturnRatePercent != null
            ? ` (${formatUnsignedPercent(performance.monthlyReturnRatePercent)})`
            : ''}
          . Wpłaty nie są zyskiem.
        </p>
      )}
    </>
  );
}
