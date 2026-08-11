import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import './styles.css';

const USER_STORAGE_KEY = 'oszczednosci.selectedUser';
const FALLBACK_USERS = ['JAKUB', 'ZOSIA'];
const SUBCATEGORIES_BY_TYPE = {
  OBLIGACJE: ['TRZYLETNIE', 'DZIESIECIOLETNIE', 'DWUNASTOLETNIE'],
  GIELDA: ['ZLOTO', 'RYNKI_ROZWINIETE', 'RYNKI_ROZWIJAJACE_SIE'],
  IKE: ['ZLOTO', 'RYNKI_ROZWINIETE', 'RYNKI_ROZWIJAJACE_SIE'],
  IKZE: ['ZLOTO', 'RYNKI_ROZWINIETE', 'RYNKI_ROZWIJAJACE_SIE']
};
const TYPE_LABELS = {
  OBLIGACJE: 'Obligacje',
  GIELDA: 'Giełda',
  IKE: 'IKE',
  IKZE: 'IKZE',
  KONTO_OSZCZEDNOSCIOWE: 'Konto oszczędnościowe',
  KONTO_BANKOWE: 'Konto bankowe',
  PPK: 'PPK'
};
const SUBCATEGORY_LABELS = {
  ZLOTO: 'Złoto',
  RYNKI_ROZWINIETE: 'Rynki rozwinięte',
  RYNKI_ROZWIJAJACE_SIE: 'Rynki rozwijające się',
  TRZYLETNIE: '3-letnie',
  DZIESIECIOLETNIE: '10-letnie',
  DWUNASTOLETNIE: '12-letnie'
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(Number(value));
}

function displayName(user) {
  return user.charAt(0) + user.slice(1).toLowerCase();
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(value)}%`;
}

function monthKey(dateValue) {
  return dateValue.slice(0, 7);
}

function yearKey(dateValue) {
  return dateValue.slice(0, 4);
}

function monthLabel(key) {
  const [year, month] = key.split('-');
  return new Intl.DateTimeFormat('pl-PL', { month: 'short', year: 'numeric' }).format(new Date(Number(year), Number(month) - 1, 1));
}

function buildSummary(entries, period) {
  const keyFor = period === 'yearly' ? yearKey : monthKey;
  const labelFor = period === 'yearly' ? (key) => key : monthLabel;
  const totals = entries.reduce((result, entry) => {
    const key = keyFor(entry.date);
    result[key] = (result[key] || 0) + Number(entry.valuePln);
    return result;
  }, {});

  return Object.entries(totals)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, total], index, sorted) => {
      const previousTotal = index > 0 ? sorted[index - 1][1] : null;
      const changeAmount = previousTotal === null ? 0 : total - previousTotal;
      const changePercent = previousTotal > 0 ? (changeAmount / previousTotal) * 100 : null;
      return { key, label: labelFor(key), total, changeAmount, changePercent };
    });
}

function SummaryChart({ entries, types }) {
  const [selectedType, setSelectedType] = React.useState('ALL');
  const [period, setPeriod] = React.useState('monthly');
  const filteredEntries = selectedType === 'ALL' ? entries : entries.filter((entry) => entry.type === selectedType);
  const points = buildSummary(filteredEntries, period);
  const latestPoint = points[points.length - 1];
  const maxTotal = Math.max(...points.map((point) => point.total), 0);
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
          <label>Zakres inwestycji
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
              <option value="ALL">Wszystkie inwestycje</option>
              {types.map((type) => <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>)}
            </select>
          </label>
          <label>Okres
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="monthly">Miesięcznie</option>
              <option value="yearly">Rocznie</option>
            </select>
          </label>
        </div>
      </div>

      <div className="metricGrid">
        <div className="metricCard"><span>Aktualna suma</span><strong>{formatMoney(latestPoint?.total || 0)}</strong></div>
        <div className={latestPoint?.changeAmount >= 0 ? 'metricCard positive' : 'metricCard negative'}><span>Zmiana kwotowa</span><strong>{formatMoney(latestPoint?.changeAmount || 0)}</strong></div>
        <div className={latestPoint?.changePercent >= 0 ? 'metricCard positive' : 'metricCard negative'}><span>Zmiana procentowa</span><strong>{formatPercent(latestPoint?.changePercent)}</strong></div>
      </div>

      {points.length === 0 ? <p>Brak danych do narysowania wykresu dla wybranego zakresu.</p> : (
        <div className="chartScroller" role="img" aria-label="Wykres słupkowy podsumowania inwestycji">
          <svg className="summaryChart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#3f9d63" />
                <stop offset="100%" stopColor="#173d27" />
              </linearGradient>
            </defs>
            <line x1={padding.left} x2={chartWidth - padding.right} y1={chartHeight - padding.bottom} y2={chartHeight - padding.bottom} />
            {points.map((point, index) => {
              const height = maxTotal ? (point.total / maxTotal) * innerHeight : 0;
              const x = padding.left + index * (barWidth + barGap);
              const y = padding.top + innerHeight - height;
              return (
                <g key={point.key}>
                  <rect className="chartBar" x={x} y={y} width={barWidth} height={height} rx="8" />
                  <text className="chartValue" x={x + barWidth / 2} y={Math.max(18, y - 8)} textAnchor="middle">{formatMoney(point.total)}</text>
                  <text className={point.changeAmount >= 0 ? 'chartChange positiveText' : 'chartChange negativeText'} x={x + barWidth / 2} y={chartHeight - 34} textAnchor="middle">{formatPercent(point.changePercent)}</text>
                  <text className="chartLabel" x={x + barWidth / 2} y={chartHeight - 12} textAnchor="middle">{point.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}

function subcategoriesFor(type) {
  return SUBCATEGORIES_BY_TYPE[type] || [];
}

function Home() {
  const [users, setUsers] = React.useState(FALLBACK_USERS);
  const [selectedUser, setSelectedUser] = React.useState(() => localStorage.getItem(USER_STORAGE_KEY) || FALLBACK_USERS[0]);
  const [types, setTypes] = React.useState([]);
  const [entries, setEntries] = React.useState([]);
  const [graphEntries, setGraphEntries] = React.useState([]);
  const [typeFilter, setTypeFilter] = React.useState('');
  const [subcategoryFilter, setSubcategoryFilter] = React.useState('');
  const [form, setForm] = React.useState({ type: '', subcategory: '', valuePln: '', date: today() });
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');
  const importInputRef = React.useRef(null);

  const loadGraphEntries = React.useCallback(() => {
    const params = new URLSearchParams({ owner: selectedUser });
    return fetch(`/api/investments?${params}`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(setGraphEntries);
  }, [selectedUser]);

  const loadEntries = React.useCallback(() => {
    const params = new URLSearchParams({ owner: selectedUser });
    if (typeFilter) params.set('type', typeFilter);
    if (typeFilter && subcategoryFilter) params.set('subcategory', subcategoryFilter);

    return fetch(`/api/investments?${params}`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(setEntries);
  }, [selectedUser, typeFilter, subcategoryFilter]);

  React.useEffect(() => {
    Promise.all([
      fetch('/api/users').then((response) => response.json()),
      fetch('/api/investment-types').then((response) => response.json())
    ])
      .then(([loadedUsers, loadedTypes]) => {
        const firstType = loadedTypes[0] || '';
        setUsers(loadedUsers);
        setTypes(loadedTypes);
        setTypeFilter(firstType);
        setForm((current) => ({
          ...current,
          type: current.type || firstType,
          subcategory: subcategoriesFor(current.type || firstType)[0] || ''
        }));
        if (!loadedUsers.includes(selectedUser)) setSelectedUser(loadedUsers[0]);
      })
      .catch((fetchError) => setError(fetchError.message));
  }, []);

  React.useEffect(() => {
    localStorage.setItem(USER_STORAGE_KEY, selectedUser);
    setStatus('');
    Promise.all([loadEntries(), loadGraphEntries()]).catch((fetchError) => setError(fetchError.message));
  }, [selectedUser, typeFilter, subcategoryFilter, loadEntries, loadGraphEntries]);

  const totalsByType = entries.reduce((totals, entry) => {
    totals[entry.type] = (totals[entry.type] || 0) + Number(entry.valuePln);
    return totals;
  }, {});
  const totalValue = entries.reduce((sum, entry) => sum + Number(entry.valuePln), 0);
  const currentSubcategories = subcategoriesFor(form.type);
  const filterSubcategories = subcategoriesFor(typeFilter);

  function changeType(nextType) {
    const nextSubcategories = subcategoriesFor(nextType);
    setTypeFilter(nextType);
    setSubcategoryFilter('');
    setForm((current) => ({ ...current, type: nextType, subcategory: nextSubcategories[0] || '' }));
  }


  function exportDatabase() {
    setError('');
    setStatus('Przygotowywanie eksportu...');

    fetch('/api/database/export')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `oszczednosci-database-${today()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);
        setStatus('Wyeksportowano bazę danych do pliku JSON.');
      })
      .catch((fetchError) => {
        setStatus('');
        setError(fetchError.message);
      });
  }

  function chooseImportFile() {
    importInputRef.current?.click();
  }

  function importDatabase(event) {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) return;

    const confirmed = window.confirm('Import nadpisze aktualną bazę danych. Czy na pewno chcesz kontynuować?');
    if (!confirmed) return;

    const payload = new FormData();
    payload.append('file', file);
    setError('');
    setStatus('Importowanie bazy danych...');

    fetch('/api/database/import', {
      method: 'POST',
      body: payload
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setStatus('Zaimportowano bazę danych i odświeżono widok.');
        return Promise.all([loadEntries(), loadGraphEntries()]);
      })
      .catch((fetchError) => {
        setStatus('');
        setError(fetchError.message);
      });
  }

  function submitEntry(event) {
    event.preventDefault();
    setError('');
    setStatus('Zapisywanie...');
    const payload = {
      ...form,
      owner: selectedUser,
      subcategory: currentSubcategories.length ? form.subcategory : null,
      valuePln: Number(form.valuePln)
    };

    fetch('/api/investments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(() => {
        setForm((current) => ({ ...current, valuePln: '', date: current.date || today() }));
        setStatus(`Dodano wpis dla: ${displayName(selectedUser)}.`);
        return Promise.all([loadEntries(), loadGraphEntries()]);
      })
      .catch((fetchError) => {
        setStatus('');
        setError(fetchError.message);
      });
  }

  function deleteEntry(id) {
    fetch(`/api/investments/${id}`, { method: 'DELETE' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setStatus('Usunięto wpis.');
        return Promise.all([loadEntries(), loadGraphEntries()]);
      })
      .catch((fetchError) => setError(fetchError.message));
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Portfele użytkowników</p>
        <h1>Zarządzaj inwestycjami po polsku.</h1>
        <p>Wybierz osobę, typ inwestycji i podkategorię, a następnie dopisz wartość z konkretną datą.</p>
      </section>

      <section className="userSwitcher" aria-label="Wybór użytkownika">
        {users.map((user) => (
          <button className={user === selectedUser ? 'userPill active' : 'userPill'} key={user} type="button" onClick={() => setSelectedUser(user)}>
            {displayName(user)}
          </button>
        ))}
      </section>

      <section className="typeNav" aria-label="Rodzaje inwestycji">
        {types.map((type) => (
          <button className={type === typeFilter ? 'typeTab active' : 'typeTab'} key={type} type="button" onClick={() => changeType(type)}>
            {TYPE_LABELS[type] || type}
          </button>
        ))}
      </section>

      {filterSubcategories.length > 0 && (
        <section className="subtypeNav" aria-label="Podkategorie inwestycji">
          <button className={!subcategoryFilter ? 'subtypeTab active' : 'subtypeTab'} type="button" onClick={() => setSubcategoryFilter('')}>Wszystkie</button>
          {filterSubcategories.map((subcategory) => (
            <button className={subcategory === subcategoryFilter ? 'subtypeTab active' : 'subtypeTab'} key={subcategory} type="button" onClick={() => setSubcategoryFilter(subcategory)}>
              {SUBCATEGORY_LABELS[subcategory] || subcategory}
            </button>
          ))}
        </section>
      )}


      <section className="panel databasePanel">
        <div>
          <p className="eyebrow">Kopia danych</p>
          <h2>Eksport i import jednoplikowej bazy JSON</h2>
          <p>Pobierz aktualny plik bazy danych lub wgraj wcześniej wyeksportowany plik. Import nadpisuje całą obecną bazę.</p>
        </div>
        <div className="databaseActions">
          <button className="button primaryButton" type="button" onClick={exportDatabase}>Eksportuj bazę</button>
          <button className="button dangerButton" type="button" onClick={chooseImportFile}>Importuj i nadpisz</button>
          <input ref={importInputRef} className="visuallyHidden" type="file" accept="application/json,.json" onChange={importDatabase} />
        </div>
      </section>

      <section className="dashboardGrid">
        <article className="panel summaryPanel">
          <p className="eyebrow">Aktualny widok</p>
          <h2>{displayName(selectedUser)} — {typeFilter ? TYPE_LABELS[typeFilter] : 'wszystkie inwestycje'}</h2>
          <p className="totalValue">{formatMoney(totalValue)}</p>
          <div className="summaryGrid">
            {types.map((type) => <div className="summaryCard" key={type}><span>{TYPE_LABELS[type] || type}</span><strong>{formatMoney(totalsByType[type] || 0)}</strong></div>)}
          </div>
        </article>

        <form className="panel formPanel" onSubmit={submitEntry}>
          <h2>Dodaj wartość dla: {displayName(selectedUser)}</h2>
          <label>Typ inwestycji
            <select value={form.type} onChange={(event) => {
              const nextType = event.target.value;
              setForm({ ...form, type: nextType, subcategory: subcategoriesFor(nextType)[0] || '' });
            }} required>
              {types.map((type) => <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>)}
            </select>
          </label>
          {currentSubcategories.length > 0 && <label>Podkategoria
            <select value={form.subcategory} onChange={(event) => setForm({ ...form, subcategory: event.target.value })} required>
              {currentSubcategories.map((subcategory) => <option key={subcategory} value={subcategory}>{SUBCATEGORY_LABELS[subcategory] || subcategory}</option>)}
            </select>
          </label>}
          <label>Wartość w PLN
            <input min="0.01" step="0.01" type="number" value={form.valuePln} onChange={(event) => setForm({ ...form, valuePln: event.target.value })} required />
          </label>
          <label>Data wpisu
            <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
          </label>
          <button className="button primaryButton" type="submit">Dodaj do portfela</button>
          {status && <p className="success">{status}</p>}
          {error && <p className="error">Nie udało się wykonać operacji: {error}</p>}
        </form>
      </section>

      <SummaryChart entries={graphEntries} types={types} />

      <section className="panel entriesPanel">
        <div className="entriesHeader"><h2>Wpisy: {displayName(selectedUser)}</h2></div>
        {entries.length === 0 ? <p>Brak wpisów w wybranym widoku.</p> : (
          <div className="entryList">
            {entries.map((entry) => <div className="entryRow" key={entry.id}>
              <div><strong>{TYPE_LABELS[entry.type] || entry.type}</strong><span>{entry.subcategory ? SUBCATEGORY_LABELS[entry.subcategory] : 'Bez podkategorii'} · {entry.date}</span></div>
              <strong>{formatMoney(entry.valuePln)}</strong>
              <button type="button" onClick={() => deleteEntry(entry.id)}>Usuń</button>
            </div>)}
          </div>
        )}
      </section>
    </main>
  );
}

function About() {
  return <main className="page"><section className="hero heroCompact"><p className="eyebrow">Informacje</p><h1>Portfele bez logowania.</h1><p>Wybór użytkownika filtruje i dodaje wpisy dla konkretnej osoby.</p></section></main>;
}

function NotFound() {
  return <main className="page"><section className="panel"><h1>Nie znaleziono strony</h1><p>Wróć na stronę główną i spróbuj ponownie.</p><Link className="button" to="/">Strona główna</Link></section></main>;
}

function App() {
  return (
    <BrowserRouter>
      <header className="topbar"><Link className="brand" to="/">Oszczędności</Link><nav aria-label="Główne"><NavLink to="/" end>Portfele</NavLink><NavLink to="/about">Informacje</NavLink></nav></header>
      <Routes><Route path="/" element={<Home />} /><Route path="/about" element={<About />} /><Route path="*" element={<NotFound />} /></Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
