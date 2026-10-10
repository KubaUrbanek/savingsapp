// @ts-nocheck
import React from 'react';
import { Field } from './Field.js';
import { Button } from './Button.js';
import { InlineMessage } from './InlineMessage.js';
import { DataTable } from './DataTable.js';
import { planPurchases, validWeights } from '../../domain/portfolio/services/PurchasePlanningService.js';
import { formatMoney, formatUnsignedPercent } from '../viewModels/formatters.js';
const defaults = { bonds: 50, stocks: 50, gold: 0, developed: 70, emerging: 30 };
const labels = {
  BONDS: 'Obligacje',
  GOLD: 'Złoto',
  RYNKI_ROZWINIETE: 'Rynki rozwinięte',
  RYNKI_ROZWIJAJACE_SIE: 'Rynki rozwijające się'
};
export function PurchasePlanPanel({ entries, scope, useCases }) {
  const [saved, setSaved] = React.useState(defaults),
    [draft, setDraft] = React.useState(defaults),
    [budget, setBudget] = React.useState(''),
    [state, setState] = React.useState('loading'),
    [message, setMessage] = React.useState('');
  React.useEffect(() => {
    const abort = new AbortController();
    setState('loading');
    setMessage('');
    setBudget('');
    Promise.resolve(useCases.loadPortfolioPlan?.execute({ scope, signal: abort.signal }) || defaults).then(
      (p) => {
        if (!abort.signal.aborted) {
          setSaved(p);
          setDraft(p);
          setState('ready');
        }
      },
      () => {
        if (!abort.signal.aborted) {
          setState('error');
          setMessage('Nie udało się wczytać planu. Odśwież stronę.');
        }
      }
    );
    return () => abort.abort();
  }, [scope, useCases]);
  const global = { BONDS: draft.bonds, STOCKS: draft.stocks, GOLD: draft.gold },
    equity = { RYNKI_ROZWINIETE: draft.developed, RYNKI_ROZWIJAJACE_SIE: draft.emerging };
  const valid = validWeights(global) && validWeights(equity),
    amount = Number(budget || 0),
    budgetValid = Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(Math.round(amount * 100));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const plan =
    valid && budgetValid && !dirty && state === 'ready' ? planPurchases(entries, global, equity, amount) : null;
  async function save() {
    if (!valid) return;
    setState('saving');
    setMessage('');
    try {
      const result = await (useCases.savePortfolioPlan?.execute({ scope, plan: draft }) || Promise.resolve(draft));
      setSaved(result);
      setDraft(result);
      setMessage('Zapisano plan.');
      setState('ready');
    } catch {
      setState('ready');
      setMessage('Nie udało się zapisać planu. Spróbuj ponownie.');
    }
  }
  return (
    <section className="ledgerSection purchasePlanPanel" aria-busy={state === 'loading' || state === 'saving'}>
      <h2>Co dokupić?</h2>
      <p>
        Plan dotyczy {scope === 'household' ? 'wspólnego portfela' : `portfela: ${scope}`}. Wagi zapisujemy z danymi i
        kopią bezpieczeństwa.
      </p>
      <h3>1. Podział inwestycji</h3>
      <div className="allocationInputs">
        {[
          ['bonds', 'Obligacje'],
          ['stocks', 'Akcje'],
          ['gold', 'Złoto (opcjonalnie)']
        ].map(([key, label]) => (
          <Field
            key={key}
            label={`${label} — % całego planu`}
            control={
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={state !== 'ready'}
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            }
          />
        ))}
      </div>
      <h3>2. Podział części akcyjnej</h3>
      <p>Te procenty dotyczą tylko akcji. Złoto jest osobną klasą.</p>
      <div className="allocationInputs">
        {[
          ['developed', 'Rynki rozwinięte'],
          ['emerging', 'Rynki rozwijające się']
        ].map(([key, label]) => (
          <Field
            key={key}
            label={`${label} — % akcji`}
            control={
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={state !== 'ready'}
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            }
          />
        ))}
      </div>
      {!valid && (
        <InlineMessage variant="warning">
          Na każdym poziomie ustaw łącznie 100%. Niepoprawne wagi nie są zapisywane i nie tworzą rekomendacji.
        </InlineMessage>
      )}
      {dirty && valid && <p>Zapisz zmiany wag, aby obliczyć zakupy.</p>}
      <Button type="button" disabled={!valid || !dirty || state !== 'ready'} onClick={save}>
        Zapisz mój plan
      </Button>
      <Button type="button" variant="quiet" disabled={state !== 'ready'} onClick={() => setDraft(defaults)}>
        Ustaw 50% obligacji i 50% akcji
      </Button>
      {message && <p role={state === 'error' ? 'alert' : 'status'}>{message}</p>}
      <Field
        label="Mam do zainwestowania — zł"
        control={
          <input
            type="number"
            min="0"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="np. 1000"
          />
        }
      />
      {!budgetValid && <InlineMessage variant="warning">Podaj poprawną, nieujemną kwotę.</InlineMessage>}
      {plan && (
        <>
          <p>
            Plan obejmuje {formatMoney(plan.total)} inwestycji. Gotówka {formatMoney(plan.cash)} pozostaje poza wagami.
            Wpisany budżet nie zmienia salda i nie oznacza nowej wpłaty.
          </p>
          {plan.unclassified > 0 && (
            <InlineMessage variant="warning">
              PPK / PPO o wartości {formatMoney(plan.unclassified)} ma nieznany skład. Te środki są pokazane w
              oszczędnościach, ale pominięte w planie zakupów.
            </InlineMessage>
          )}
          <p>
            {amount > 0
              ? `Dokup za łącznie ${formatMoney(amount)}. Plan nie wymaga sprzedaży.`
              : 'Wpisz budżet, aby zobaczyć wykonalne zakupy.'}{' '}
            Brak do celu opisuje dzisiejszy portfel; zakupy uwzględniają także nową kwotę.
          </p>
          <div className="tableScroller" role="region" aria-label="Plan zakupów według budżetu" tabIndex={0}>
            <DataTable
              caption="Co kupić według mojego planu"
              rows={plan.rows}
              rowKey={(r) => r.key}
              columns={[
                { key: 'asset', header: 'Inwestycja', rowHeader: true, cell: (r) => labels[r.key] },
                { key: 'now', header: 'Mam teraz', cell: (r) => formatMoney(r.currentValue) },
                {
                  key: 'weight',
                  header: 'Udział / cel',
                  cell: (r) => `${formatUnsignedPercent(r.currentWeight)} / ${formatUnsignedPercent(r.targetWeight)}`
                },
                { key: 'missing', header: 'Brakuje do celu dziś', cell: (r) => formatMoney(r.missingAmount) },
                {
                  key: 'purchase',
                  header: 'Dokup za',
                  cell: (r) => (r.purchaseAmount > 0 ? formatMoney(r.purchaseAmount) : 'Nie dokupuj')
                },
                { key: 'after', header: 'Udział po zakupie', cell: (r) => formatUnsignedPercent(r.afterWeight) }
              ]}
            />
          </div>
          <p>
            To kwoty zakupów według ustawionych wag. Liczbę sztuk ustalisz po cenie instrumentu. Mała dopłata może
            przybliżyć do celu, ale nie wyrówna wszystkich wag.
          </p>
        </>
      )}
    </section>
  );
}
