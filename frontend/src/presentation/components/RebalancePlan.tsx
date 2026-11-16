// @ts-nocheck
import React from 'react';
import { InlineMessage } from './InlineMessage.js';
import {
  formatMoney,
  formatUnsignedPercent,
  formatPercentagePoints,
  formatSignedMoney
} from '../viewModels/formatters.js';
const labels = {
  BONDS: 'Obligacje',
  GOLD: 'Złoto (ETF)',
  RYNKI_ROZWINIETE: 'Rynki rozwinięte',
  RYNKI_ROZWIJAJACE_SIE: 'Rynki wschodzące'
};
export function RebalancePlan({ plan, showTrades }) {
  return (
    <>
      <section aria-label="Obecne odchylenia od planu">
        <h3>Obecne odchylenia od planu</h3>
        <p>
          Część portfela objęta planem: <strong>{formatMoney(plan.total)}</strong>.
        </p>
        <ul className="allocationComparison">
          {plan.rows.map((row) => (
            <li key={row.key}>
              <strong>{labels[row.key]}</strong>
              <span>Mam: {formatMoney(row.currentValue)}</span>
              <span>
                Udział: {formatUnsignedPercent(row.currentWeight)} · Cel: {formatUnsignedPercent(row.targetWeight)}
              </span>
              <span>Odchylenie: {formatPercentagePoints(row.deviation)}</span>
              <span>
                {!plan.total
                  ? 'Odchylenie kwotowe'
                  : row.deviationAmount > 0
                    ? 'Nadwyżka'
                    : row.deviationAmount < 0
                      ? 'Niedobór'
                      : 'Zgodnie z planem kwotowym'}
                : {plan.total ? formatSignedMoney(row.deviationAmount) : '—'}
              </span>
            </li>
          ))}
        </ul>
      </section>
      {showTrades && (
        <section aria-label="Rebalans obecnego portfela">
          <h3>Rebalans bez dopłaty</h3>
          {plan.total === 0 ? (
            <p>Brak inwestycji do rebalansu.</p>
          ) : plan.tradeTotal === 0 ? (
            <p>Portfel jest zgodny z planem w dokładności do grosza.</p>
          ) : (
            <>
              <p>Najpierw sprzedaj nadwyżki, następnie kup za uzyskane środki.</p>
              {[
                ['Co sprzedać', -1, 'Sprzedaj'],
                ['Co kupić', 1, 'Kup']
              ].map(([title, sign, action]) => (
                <section key={title} aria-label={title}>
                  <h4>{title}</h4>
                  <ul className="purchaseRecommendations" aria-label={title}>
                    {plan.rows
                      .filter((row) => row.tradeAmount * sign > 0)
                      .map((row) => (
                        <li className="purchaseCard" key={row.key}>
                          <h5>{labels[row.key]}</h5>
                          <p>
                            {action} za <strong>{formatMoney(Math.abs(row.tradeAmount))}</strong>
                          </p>
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
              <p>
                Łączna sprzedaż: <strong>{formatMoney(plan.tradeTotal)}</strong> · Łączne zakupy:{' '}
                <strong>{formatMoney(plan.tradeTotal)}</strong>.
              </p>
            </>
          )}
          {plan.total > 0 && (
            <>
              <h4>Po rebalansie</h4>
              <ul className="allocationComparison" aria-label="Po rebalansie">
                {plan.rows.map((row) => (
                  <li key={row.key}>
                    <strong>{labels[row.key]}</strong>
                    <span>{formatMoney(row.afterValue)}</span>
                    <span>
                      Udział: {formatUnsignedPercent(row.afterWeight)} · Cel: {formatUnsignedPercent(row.targetWeight)}
                    </span>
                  </li>
                ))}
              </ul>
              <p>Wartość po rebalansie: {formatMoney(plan.total)}. Udziały uwzględniają zaokrąglenie do groszy.</p>
            </>
          )}
          <p>Kwoty według zapisanych wycen, przed opłatami i podatkami. Plan nie zapisuje transakcji.</p>
          <p>
            Podział dotyczy kategorii inwestycji, bez wyboru rachunków i właścicieli. Nie uwzględnia liczby jednostek,
            ograniczeń rachunków ani kosztów wcześniejszego wykupu obligacji.
          </p>
        </section>
      )}
      <p className="planCash">
        Gotówka {formatMoney(plan.cash)} pozostaje poza proporcjami inwestycji i nie finansuje automatycznie rebalansu.
        Wpisanie kwoty nie zapisuje wpłaty ani zakupu.
      </p>
      {plan.unclassified > 0 && (
        <InlineMessage variant="warning">
          PPK / PPO: {formatMoney(plan.unclassified)}. Nie znamy ich składu, więc nie uwzględniamy ich w tym planie.
        </InlineMessage>
      )}
    </>
  );
}
