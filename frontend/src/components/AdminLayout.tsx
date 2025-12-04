import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import classNames from "classnames";

const baseMenuItems = [
  { to: "/", label: "Dashboard", icon: "fas fa-tachometer-alt" },
  { to: "/rutas", label: "Rutas", icon: "fas fa-route" },
  { to: "/encuesta", label: "Nueva encuesta", icon: "fas fa-file-signature" },
];

const AdminLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const content = children ?? <Outlet />;

  return (
    <div className={classNames("hold-transition sidebar-mini layout-fixed", { "sidebar-collapse": sidebarCollapsed })}>
      <div className="wrapper">
        <nav className="main-header navbar navbar-expand navbar-white navbar-light border-bottom">
          <ul className="navbar-nav">
            <li className="nav-item">
              <button className="nav-link btn btn-link text-dark" onClick={() => setSidebarCollapsed((prev) => !prev)}>
                <i className="fas fa-bars" />
              </button>
            </li>
            <li className="nav-item d-none d-sm-inline-block">
              <span className="nav-link text-muted">PITPC</span>
            </li>
          </ul>
          <ul className="navbar-nav ml-auto">
            <li className="nav-item d-flex align-items-center mr-3 text-sm text-muted">
              <i className="far fa-user-circle mr-2" />
              {user?.name} ({user?.role})
            </li>
            <li className="nav-item">
              <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
                <i className="fas fa-sign-out-alt mr-1" /> Salir
              </button>
            </li>
          </ul>
        </nav>

        <aside className="main-sidebar sidebar-dark-primary elevation-4">
          <Link to="/" className="brand-link text-center">
            <span className="brand-text font-weight-light">PITPC</span>
          </Link>
          <div className="sidebar">
            <nav className="mt-2">
              <ul className="nav nav-pills nav-sidebar flex-column" role="menu">
                {(user?.role === "ADMIN"
                  ? [
                      ...baseMenuItems,
                      { to: "/encuestas", label: "Encuestas", icon: "fas fa-table" },
                      { to: "/territorio", label: "Territorio", icon: "fas fa-map-marked-alt" },
                      { to: "/lideres", label: "Líderes", icon: "fas fa-user-shield" },
                    ]
                  : baseMenuItems
                ).map((item) => (
                  <li className="nav-item" key={item.to}>
                    <Link
                      to={item.to}
                      className={classNames("nav-link", {
                        active: location.pathname === item.to,
                      })}
                    >
                      <i className={`nav-icon ${item.icon}`} />
                      <p>{item.label}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        <div className="content-wrapper">
          <section className="content pt-3">
            <div className="container-fluid">{content}</div>
          </section>
        </div>

        <footer className="main-footer text-sm text-muted text-center">
          <strong>PITPC</strong> &nbsp; Plataforma de Inteligencia Territorial y Participación Ciudadana
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;
