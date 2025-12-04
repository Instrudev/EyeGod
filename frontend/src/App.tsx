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
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import AdminLayout from "./components/AdminLayout";
import CandidateLayout from "./components/CandidateLayout";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "LIDER", "COLABORADOR"]}>
              <AdminLayout />
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
          <Route path="asignaciones" element={<AssignmentsPage />} />
          <Route path="reporte" element={<UnifiedReportPage />} />
          <Route path="candidatos" element={<CandidatesPage />} />
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
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
