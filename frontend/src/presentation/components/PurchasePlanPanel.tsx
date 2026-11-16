// @ts-nocheck
import React from 'react';
import { planRebalancing } from '../../domain/portfolio/services/CurrentPortfolioRebalancing.js';
import { RebalancePlan } from './RebalancePlan.js';
import { Field } from './Field.js';
import { Button } from './Button.js';
import { planFlatPurchases, validWeights } from '../../domain/portfolio/services/PurchasePlanningService.js';
import { decimalText, moneyInput, percentageTotal } from '../../domain/portfolio/decimal.js';
import { displayName, formatMoney, formatUnsignedPercent } from '../viewModels/formatters.js';
const defaults = { bonds: 50, gold: 25, developed: 17.5, emerging: 7.5 };
const categories = [
  ['bonds', 'BONDS', 'Obligacje'],
  ['gold', 'GOLD', 'Złoto'],
  ['developed', 'RYNKI_ROZWINIETE', 'Akcje — rynki rozwinięte'],
  ['emerging', 'RYNKI_ROZWIJAJACE_SIE', 'Akcje — rynki wschodzące']
];
export function PurchasePlanPanel({ entries, scope, useCases, revision = 0, assetsReady = true }) {
  const [saved, setSaved] = React.useState(null),
    [draft, setDraft] = React.useState(defaults);
  const [mode, setMode] = React.useState('purchase');
  React.useEffect(() => setMode('purchase'), [scope]);
  const [budgets, setBudgets] = React.useState({});
  const [state, setState] = React.useState('loading'),
    [message, setMessage] = React.useState('');
  const [retry, setRetry] = React.useState(0);
  const editor = React.useRef(null);
  React.useEffect(() => {
    const abort = new AbortController();
    setState('loading');
    setMessage('');
    Promise.resolve(useCases.loadPortfolioPlan?.execute({ scope: 'household', signal: abort.signal }) ?? null).then(
      (p) => {
        if (!abort.signal.aborted) {
          setSaved(p);
          setDraft(p ?? defaults);
          setState('ready');
        }
      },
      () => {
        if (!abort.signal.aborted) setState('error');
      }
    );
    return () => abort.abort();
  }, [useCases, retry, revision]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved ?? defaults);
  React.useEffect(() => {
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    if (dirty) window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const budget = budgets[scope] ?? '';
  const amount = budget.trim() === '' ? 0 : moneyInput(budget);
  const weights = Object.fromEntries(categories.map(([key, code]) => [code, decimalText(draft[key])]));
  const valid = validWeights(weights),
    total = percentageTotal(Object.values(weights));
  let plan = null,
    rebalance = null,
    calculationError = false,
    basis = 0;
  try {
    basis = planFlatPurchases(
      entries,
      { BONDS: 50, GOLD: 25, RYNKI_ROZWINIETE: 17.5, RYNKI_ROZWIJAJACE_SIE: 7.5 },
      0
    ).total;
    if (valid && !dirty && saved && assetsReady && state === 'ready') {
      rebalance = planRebalancing(entries, weights);
      if (amount != null && mode === 'purchase') plan = planFlatPurchases(entries, weights, amount);
    }
  } catch {
    calculationError = true;
  }
  async function save() {
    if (!valid || state !== 'ready') return;
    setState('saving');
    setMessage('');
    try {
      const p = await useCases.savePortfolioPlan.execute({
        scope: 'household',
        plan: Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, decimalText(v)]))
      });
      setSaved(p);
      setDraft(p);
      setState('ready');
      setMessage('Zapisano wspólny plan.');
      if (editor.current) editor.current.open = false;
    } catch {
      setState('ready');
      setMessage('Nie udało się zapisać planu. Spróbuj ponownie.');
    }
  }
  return (
    <section className="ledgerSection purchasePlanPanel" aria-busy={state === 'loading' || state === 'saving'}>
      <h2>Wspólny plan inwestycji</h2>
      <p>
        Obliczenia dla: <strong>{scope === 'household' ? 'Razem' : displayName(scope)}</strong>
      </p>
      {state === 'loading' ? (
        <p role="status">Wczytywanie planu…</p>
      ) : state === 'error' ? (
        <p role="alert">
          Nie udało się wczytać planu. <Button onClick={() => setRetry((v) => v + 1)}>Spróbuj ponownie</Button>
        </p>
      ) : (
        <>
          <p>Proporcje docelowe inwestycji objętych planem</p>
          <div className="savedPlan">
            <strong>{saved ? 'Zapisany wspólny plan' : 'Propozycja planu — zapisz, aby rozpocząć'}</strong>
            <ul>
              {categories.map(([key, , label]) => (
                <li key={key}>
                  {label}: <strong>{String((saved ?? defaults)[key]).replace('.', ',')}%</strong>
                </li>
              ))}
            </ul>
          </div>
          {assetsReady ? (
            <p>
              Plan obejmuje <strong>{formatMoney(basis)}</strong> inwestycji.
            </p>
          ) : (
            <p>Wczytywanie inwestycji do obliczeń…</p>
          )}
          <details ref={editor} className="planEditor">
            <summary>Zmień proporcje</summary>
            <fieldset className="allocationInputs">
              <legend>Jeden podział całego planu</legend>
              {categories.map(([key, , label]) => (
                <Field
                  key={key}
                  label={`${label} — %`}
                  error={
                    decimalText(draft[key]) !== '' &&
                    (Number(decimalText(draft[key])) < 0 || Number(decimalText(draft[key])) > 100)
                      ? 'Podaj udział od 0 do 100%.'
                      : undefined
                  }
                  control={
                    <input
                      inputMode="decimal"
                      value={draft[key]}
                      disabled={state === 'saving'}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    />
                  }
                />
              ))}
            </fieldset>
            <p role="status">
              Razem: {total?.replace('.', ',') ?? '—'}%.{' '}
              {valid
                ? ''
                : total == null
                  ? 'Uzupełnij poprawne udziały od 0 do 100%.'
                  : Number(total) < 100
                    ? `Dodaj jeszcze ${String(100 - Number(total)).replace('.', ',')}%, aby zapisać.`
                    : 'Zmniejsz udziały do 100%, aby zapisać.'}
            </p>
            {dirty && <p>Niezapisane zmiany. Zapisz lub anuluj zmiany, aby obliczyć zakupy i rebalans.</p>}
            <div className="dialogActions">
              <Button
                onClick={() => {
                  setDraft(saved ?? defaults);
                  editor.current.open = false;
                }}
                disabled={state === 'saving'}
              >
                Anuluj zmiany planu
              </Button>
              <Button variant="primary" onClick={save} disabled={!valid || (!dirty && saved) || state === 'saving'}>
                Zapisz wspólny plan
              </Button>
            </div>
          </details>
          {!saved && (
            <Button variant="primary" onClick={save} disabled={!valid || state === 'saving'}>
              Zapisz propozycję planu
            </Button>
          )}
          {assetsReady && basis === 0 && <p>To plan pierwszych zakupów. Nie zapisano jeszcze inwestycji.</p>}
          <fieldset className="planningModes">
            <legend>Sposób planowania</legend>
            <label>
              <input
                type="radio"
                name="planning-mode"
                checked={mode === 'purchase'}
                onChange={() => setMode('purchase')}
              />{' '}
              Dokupowanie
            </label>
            <label>
              <input
                type="radio"
                name="planning-mode"
                checked={mode === 'rebalance'}
                onChange={() => setMode('rebalance')}
              />{' '}
              Rebalans obecnego portfela
            </label>
          </fieldset>
          {calculationError && <p role="alert">Nie można bezpiecznie obliczyć planu dla podanych wartości.</p>}
          {rebalance && <RebalancePlan plan={rebalance} showTrades={mode === 'rebalance'} />}
          {mode === 'rebalance' && !rebalance && (
            <p>Zapisz poprawny plan i poczekaj na wczytanie inwestycji, aby zobaczyć rebalans.</p>
          )}
          {mode === 'purchase' && (
            <>
              <h3>Kwota na zakupy</h3>
              <Field
                label="Kwota na zakupy — zł"
                hint="Może to być nowa wpłata albo część posiadanej gotówki. Niczego tu nie zapisujesz."
                error={amount == null ? 'Podaj nieujemną kwotę z najwyżej dwoma miejscami po przecinku.' : undefined}
                control={
                  <input
                    className="purchaseBudget"
                    inputMode="decimal"
                    value={budget}
                    onChange={(e) => setBudgets({ ...budgets, [scope]: e.target.value })}
                    placeholder="np. 1000"
                  />
                }
              />
              <h3>Proponowany podział zakupów</h3>
              {plan ? (
                <>
                  {amount > 0 ? (
                    <>
                      <p>
                        Dokup za łącznie <strong>{formatMoney(amount)}</strong>. Bez sprzedawania inwestycji.
                      </p>
                      <ul className="purchaseRecommendations" aria-label="Proponowane zakupy">
                        {plan.rows
                          .filter((r) => r.purchaseAmount > 0)
                          .map((r) => (
                            <li className="purchaseCard" key={r.key}>
                              <h4>{categories.find((c) => c[1] === r.key)[2]}</h4>
                              <p>
                                Dokup za <strong className="purchaseAmount">{formatMoney(r.purchaseAmount)}</strong>
                              </p>
                              <small>
                                Po zakupie: {formatUnsignedPercent(r.afterWeight)} · Cel:{' '}
                                {formatUnsignedPercent(r.targetWeight)}
                              </small>
                            </li>
                          ))}
                      </ul>
                      <p>
                        Zakupy uzupełniają kategorie poniżej celu. Mała dopłata może nie wystarczyć do osiągnięcia
                        proporcji.
                      </p>
                      {plan.rows.some((r) => r.purchaseAmount === 0) && (
                        <p>Pozostałych kategorii teraz nie dokupujesz.</p>
                      )}
                    </>
                  ) : (
                    <p>Wpisz kwotę, aby zobaczyć proponowane zakupy.</p>
                  )}
                  <details className="purchaseDetails">
                    <summary>Porównaj z celem</summary>
                    <div className="tableScroller" role="region" aria-label="Porównanie planu" tabIndex={0}>
                      <table>
                        <thead>
                          <tr>
                            {[
                              'Kategoria',
                              'Obecna wartość',
                              'Obecny udział',
                              'Cel',
                              'Proponowany zakup',
                              'Udział po zakupie'
                            ].map((x) => (
                              <th key={x}>{x}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {plan.rows.map((r) => (
                            <tr key={r.key}>
                              <th scope="row">
                                {categories.find((c) => c[1] === r.key)[2]}
                                <small>
                                  {r.currentWeight < r.targetWeight
                                    ? 'Poniżej celu'
                                    : r.currentWeight > r.targetWeight
                                      ? 'Powyżej celu'
                                      : 'Zgodnie z celem'}
                                </small>
                              </th>
                              <td>{formatMoney(r.currentValue)}</td>
                              <td>{formatUnsignedPercent(r.currentWeight)}</td>
                              <td>{formatUnsignedPercent(r.targetWeight)}</td>
                              <td>{formatMoney(r.purchaseAmount)}</td>
                              <td>{formatUnsignedPercent(r.afterWeight)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </>
              ) : (
                <p>
                  {dirty
                    ? 'Zapisz lub anuluj niezapisane zmiany planu.'
                    : !saved
                      ? 'Najpierw zapisz wspólny plan.'
                      : 'Popraw kwotę na zakupy.'}
                </p>
              )}
            </>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
