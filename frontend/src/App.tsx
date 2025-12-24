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
            path="reporte"
            element={
              <PrivateRoute allowedRoles={["ADMIN"]}>
                <UnifiedReportPage />
              </PrivateRoute>
            }
          />
          <Route path="candidatos" element={<CandidatesPage />} />
          <Route path="agenda" element={<AgendaPage />} />
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
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
