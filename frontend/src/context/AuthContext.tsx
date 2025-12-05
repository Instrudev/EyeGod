import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export type User = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "LIDER" | "COLABORADOR" | "CANDIDATO";
};

type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  token: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("pitpc_auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed.user);
      setToken(parsed.access);
      api.defaults.headers.common.Authorization = `Bearer ${parsed.access}`;
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data.user);
    setToken(data.access);
    localStorage.setItem("pitpc_auth", JSON.stringify(data));
    api.defaults.headers.common.Authorization = `Bearer ${data.access}`;
    navigate(data.user.role === "CANDIDATO" ? "/candidato" : "/");
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("pitpc_auth");
    delete api.defaults.headers.common.Authorization;
    navigate("/login");
  };

  const value = useMemo(
    () => ({ user, login, logout, token, loading }),
    [user, token, loading]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("Auth context missing");
  return ctx;
};
