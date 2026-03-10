import { Route, Routes, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RoutesPage from "./pages/RoutesPage";
import SurveyPage from "./pages/SurveyPage";
import SurveyDataPage from "./pages/SurveyDataPage";
import TerritoryPage from "./pages/TerritoryPage";
import LeadersPage from "./pages/LeadersPage";
import CollaboratorsPage from "./pages/CollaboratorsPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import UnifiedReportPage from "./pages/UnifiedReportPage";
import CandidatesPage from "./pages/CandidatesPage";
import CandidatePanelPage from "./pages/CandidatePanelPage";
import AgendaPage from "./pages/AgendaPage";
import CandidateAgendaPage from "./pages/CandidateAgendaPage";
import CoordinatorsPage from "./pages/CoordinatorsPage";
import PuestosVotacionPage from "./pages/PuestosVotacionPage";
import WitnessesPage from "./pages/WitnessesPage";
import WitnessResultsPage from "./pages/WitnessResultsPage";
import AdminReportStatsPage from "./pages/AdminReportStatsPage";
import CedulaValidationPage from "./pages/CedulaValidationPage";
import CrossReferencePage from "./pages/CrossReferencePage";
// Inversiones
import InvestmentsList from "./pages/investments/InvestmentsList";
import InvestmentsDashboard from "./pages/investments/InvestmentsDashboard";
import InvestmentForm from "./pages/investments/InvestmentForm";
import BudgetsConfig from "./pages/investments/BudgetsConfig";

import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import AdminLayout from "./components/AdminLayout";
import CandidateLayout from "./components/CandidateLayout";
import { PollingStationsProvider } from "./context/PollingStationsContext";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "LIDER", "COLABORADOR", "COORDINADOR_ELECTORAL", "TESTIGO_ELECTORAL"]}>
              <PollingStationsProvider>
                <AdminLayout />
              </PollingStationsProvider>
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="rutas" element={<RoutesPage />} />
          <Route path="encuesta" element={<SurveyPage />} />
          <Route path="encuestas" element={<SurveyDataPage />} />
          <Route path="territorio" element={<TerritoryPage />} />
          <Route path="lideres" element={<LeadersPage />} />
          <Route path="colaboradores" element={<CollaboratorsPage />} />
          <Route path="coordinadores" element={<CoordinatorsPage />} />
          <Route path="asignaciones" element={<AssignmentsPage />} />
          <Route path="testigos" element={<WitnessesPage />} />
          <Route path="resultados-mesa" element={<WitnessResultsPage />} />
          <Route path="puestos-votacion" element={<PuestosVotacionPage />} />
          <Route
            path="reportes-electorales"
            element={
              <PrivateRoute allowedRoles={["ADMIN"]}>
                <AdminReportStatsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="reporte"
            element={
              <PrivateRoute allowedRoles={["ADMIN"]}>
                <UnifiedReportPage />
              </PrivateRoute>
            }
          />
          <Route
            path="cedulas-master"
            element={
              <PrivateRoute allowedRoles={["ADMIN"]}>
                <CedulaValidationPage />
              </PrivateRoute>
            }
          />
          <Route
            path="cruce-datos"
            element={
              <PrivateRoute allowedRoles={["ADMIN"]}>
                <CrossReferencePage />
              </PrivateRoute>
            }
          />
          <Route path="candidatos" element={<CandidatesPage />} />
          <Route path="agenda" element={<AgendaPage />} />

          {/* Módulo Inversiones */}
          <Route path="inversiones" element={
            <PrivateRoute allowedRoles={["ADMIN", "COORDINADOR_ELECTORAL"]}>
              <InvestmentsList />
            </PrivateRoute>
          } />
          <Route path="inversiones/nuevo" element={
            <PrivateRoute allowedRoles={["ADMIN", "COORDINADOR_ELECTORAL"]}>
              <InvestmentForm />
            </PrivateRoute>
          } />
          <Route path="inversiones/editar/:id" element={
            <PrivateRoute allowedRoles={["ADMIN", "COORDINADOR_ELECTORAL"]}>
              <InvestmentForm />
            </PrivateRoute>
          } />
          <Route path="inversiones/dashboard" element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <InvestmentsDashboard />
            </PrivateRoute>
          } />
          <Route path="inversiones/presupuestos" element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <BudgetsConfig />
            </PrivateRoute>
          } />

        </Route>
        <Route
          path="/candidato"
          element={
            <PrivateRoute allowedRoles={["CANDIDATO"]}>
              <CandidateLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<CandidatePanelPage />} />
          <Route path="agenda" element={<CandidateAgendaPage />} />
          <Route path="inversiones/dashboard" element={<InvestmentsDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;