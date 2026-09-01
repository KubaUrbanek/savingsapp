// @ts-nocheck
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import { Home } from '../presentation/pages/Home.jsx';
import { About } from '../presentation/pages/About.jsx';
import { NotFound } from '../presentation/pages/NotFound.jsx';
export function AppRouter({ dependencies }) {
  return (
    <BrowserRouter>
      <header className="siteHeader">
        <div className="topbar">
          <Link className="brand" to="/">
            <span className="brandMark" aria-hidden="true">
              O
            </span>
            <span>
              Oszczędności<small>Twój portfel</small>
            </span>
          </Link>
          <nav aria-label="Główne">
            <NavLink to="/" end>
              Portfele
            </NavLink>
            <NavLink to="/about">Informacje</NavLink>
          </nav>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Home dependencies={dependencies} />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
