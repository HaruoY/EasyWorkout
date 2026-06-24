import { NavLink, useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          DIARIO<span className="tag">/ allenamento</span>
        </div>
        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>
            Oggi
          </NavLink>
          <NavLink to="/plans" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Schede
          </NavLink>
          <NavLink to="/progress" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Progressi
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Profilo
          </NavLink>
          {user && (
            <button className="btn btn-small" onClick={handleLogout} style={{ marginLeft: 8 }}>
              Esci
            </button>
          )}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
