import { Navigate } from "react-router-dom";
import { useAuth, User } from "../context/AuthContext";

type PrivateRouteProps = {
  children: React.ReactNode;
  allowedRoles?: User["role"][];
};

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectPath = user.role === "CANDIDATO" ? "/candidato" : "/";
    return <Navigate to={redirectPath} replace />;
  }
  return <>{children}</>;
};

export default PrivateRoute;
