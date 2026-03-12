import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import classNames from "classnames";
import { useAuth } from "../context/AuthContext";

const CandidateLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const content = children ?? <Outlet />;

  return (
    <div className="hold-transition layout-top-nav" style={{ minHeight: "100vh" }}>
      <div className="wrapper">
        <nav className="main-header navbar navbar-expand-lg navbar-white navbar-light border-bottom">
          <div className="container">
            <Link to="/candidato" className="navbar-brand font-weight-bold">
              PITPC <span className="text-sm font-weight-light">Candidato</span>
            </Link>
            
            <button 
              className="navbar-toggler" 
              type="button" 
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <i className="fas fa-bars"></i>
            </button>

            <div className={classNames("collapse navbar-collapse", { "show": menuOpen })}>
              <ul className="navbar-nav mr-auto">
                <li className="nav-item">
                  <Link
                    to="/candidato"
                    onClick={() => setMenuOpen(false)}
                    className={classNames("nav-link", { active: location.pathname === "/candidato" })}
                  >
                  Inicio
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="/candidato/agenda"
                  onClick={() => setMenuOpen(false)}
                  className={classNames("nav-link", { active: location.pathname === "/candidato/agenda" })}
                >
                  Agenda
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="/candidato/inversiones/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className={classNames("nav-link", { active: location.pathname === "/candidato/inversiones/dashboard" })}
                >
                  Dashboard Inversiones
                </Link>
              </li>
            </ul>
            <ul className="navbar-nav ml-auto">
              <li className="nav-item d-flex align-items-center text-sm text-muted mr-3">
                <i className="far fa-user-circle mr-2" /> {user?.name} ({user?.role})
              </li>
              <li className="nav-item">
                <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
                  <i className="fas fa-sign-out-alt mr-1" /> Salir
                </button>
              </li>
            </ul>
            </div>
          </div>
        </nav>

        <div className={classNames("content-wrapper")}>
          <section className="content pt-4">
            <div className="container">{content}</div>
          </section>
        </div>

        <footer className="main-footer text-sm text-muted text-center">
          <strong>PITPC</strong> &nbsp; Panel de candidatos
        </footer>
      </div>
    </div>
  );
};

export default CandidateLayout;
