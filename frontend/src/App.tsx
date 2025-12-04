import { Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RoutesPage from "./pages/RoutesPage";
import SurveyPage from "./pages/SurveyPage";
import SurveyDataPage from "./pages/SurveyDataPage";
import TerritoryPage from "./pages/TerritoryPage";
import LeadersPage from "./pages/LeadersPage";
import CollaboratorsPage from "./pages/CollaboratorsPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import AdminLayout from "./components/AdminLayout";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
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
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
