import { Link, Outlet } from "react-router-dom";
import classNames from "classnames";
import { useAuth } from "../context/AuthContext";

const CandidateLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const content = children ?? <Outlet />;

  return (
    <div className="hold-transition layout-top-nav" style={{ minHeight: "100vh" }}>
      <div className="wrapper">
        <nav className="main-header navbar navbar-expand navbar-white navbar-light border-bottom">
          <div className="container">
            <Link to="/candidato" className="navbar-brand font-weight-bold">
              PITPC
            </Link>
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
