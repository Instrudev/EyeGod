import { Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RoutesPage from "./pages/RoutesPage";
import SurveyPage from "./pages/SurveyPage";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/rutas"
          element={
            <PrivateRoute>
              <RoutesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/encuesta"
          element={
            <PrivateRoute>
              <SurveyPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
