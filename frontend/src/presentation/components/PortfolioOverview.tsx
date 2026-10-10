// @ts-nocheck
import React from 'react';
import { Metric } from './Metric.js';
import { DataTable } from './DataTable.js';
import {
  formatMoney,
  formatSignedMoney,
  formatUnsignedPercent,
  TYPE_LABELS,
  SUBCATEGORY_LABELS
} from '../viewModels/formatters.js';
import { buildCurrentSnapshot } from '../../domain/portfolio/snapshot.js';
import { today } from '../viewModels/formatters.js';
export function PortfolioOverview({ entries, performance, assets = [], loading = false }) {
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
  const metric = (value) => (loading ? 'Wczytywanie…' : value == null ? 'Brak danych' : formatMoney(value));
  return (
    <>
      <div className="savingsHeadline" aria-busy={loading}>
        <Metric
          label="Wpłaciłem"
          value={metric(performance?.depositsTotalPln)}
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
          label={known && performance.nominalResultPln < 0 ? 'Straciłem' : 'Zarobiłem'}
          value={
            loading ? 'Wczytywanie…' : known ? formatSignedMoney(performance.nominalResultPln) : 'Brak danych o koszcie'
          }
          tone={known ? (performance.nominalResultPln >= 0 ? 'positive' : 'negative') : 'neutral'}
          detail={
            known ? 'Wynik od początku, po uwzględnieniu wypłat' : 'Uzupełnij wkład początkowy lub historię wpłat.'
          }
        />
      </div>
      {performance?.withdrawalsTotalPln > 0 && (
        <p>
          Wypłaciłem: {formatMoney(performance.withdrawalsTotalPln)}. Kapitał po wypłatach:{' '}
          {metric(performance.contributedCapitalPln)}.
        </p>
      )}
      {oldest && oldest < today() && (
        <p className="dataFreshness">Część wycen jest starsza niż dzisiaj. Daty podajemy przy każdej inwestycji.</p>
      )}
      <h2>Moje inwestycje</h2>
      <div className="tableScroller" role="region" aria-label="Wartości i wyniki inwestycji" tabIndex={0}>
        <DataTable
          caption="Wpłaty, wartość i wynik każdej inwestycji"
          rows={rows}
          rowKey={(e) => e.id}
          columns={[
            {
              key: 'asset',
              header: 'Inwestycja / rachunek',
              rowHeader: true,
              cell: (e) => (
                <>
                  {SUBCATEGORY_LABELS[e.subcategory] || TYPE_LABELS[e.type]}
                  <small>
                    {TYPE_LABELS[e.type]} · {e.owner}
                  </small>
                </>
              )
            },
            { key: 'capital', header: 'Wkład po wypłatach', cell: (e) => metric(e.performance?.contributedCapitalPln) },
            { key: 'value', header: 'Mam teraz', cell: (e) => formatMoney(e.valuePln) },
            {
              key: 'result',
              header: 'Zysk / strata',
              cell: (e) =>
                e.performance?.nominalResultPln == null
                  ? 'Brak danych o koszcie'
                  : formatSignedMoney(e.performance.nominalResultPln)
            },
            { key: 'date', header: 'Data wyceny', cell: (e) => e.date }
          ]}
        />
      </div>
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
