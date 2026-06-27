import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Chiude il menu mobile ad ogni cambio di rotta
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const linkClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          DIARIO<span className="tag">/ allenamento</span>
        </div>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <nav className={`nav-links${menuOpen ? ' open' : ''}`}>
          <NavLink to="/" className={linkClass} end>
            Oggi
          </NavLink>
          <NavLink to="/plans" className={linkClass}>
            Schede
          </NavLink>
          <NavLink to="/log" className={linkClass}>
            Registra
          </NavLink>
          <NavLink to="/progress" className={linkClass}>
            Progressi
          </NavLink>
          <NavLink to="/exercises" className={linkClass}>
            Esercizi
          </NavLink>
          <NavLink to="/profile" className={linkClass}>
            Profilo
          </NavLink>
          {user && (
            <button className="btn btn-small" onClick={handleLogout} style={{ marginTop: 12 }}>
              Esci
            </button>
          )}
        </nav>
      </header>

      <div className={`nav-overlay${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />

      <main>{children}</main>
    </div>
  );
}
