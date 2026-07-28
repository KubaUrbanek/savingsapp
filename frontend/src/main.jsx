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

function subcategoriesFor(type) {
  return SUBCATEGORIES_BY_TYPE[type] || [];
}

function Home() {
  const [users, setUsers] = React.useState(FALLBACK_USERS);
  const [selectedUser, setSelectedUser] = React.useState(() => localStorage.getItem(USER_STORAGE_KEY) || FALLBACK_USERS[0]);
  const [types, setTypes] = React.useState([]);
  const [entries, setEntries] = React.useState([]);
  const [typeFilter, setTypeFilter] = React.useState('');
  const [subcategoryFilter, setSubcategoryFilter] = React.useState('');
  const [form, setForm] = React.useState({ type: '', subcategory: '', valuePln: '', date: today() });
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');

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
    loadEntries().catch((fetchError) => setError(fetchError.message));
  }, [selectedUser, typeFilter, subcategoryFilter, loadEntries]);

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
        return loadEntries();
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
        return loadEntries();
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
