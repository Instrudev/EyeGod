import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@pitpc.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError("Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-800 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">PITPC</h1>
          <p className="text-sm text-slate-500">Plataforma de Inteligencia Territorial</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Correo</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-4 py-3 focus:outline-none focus:ring focus:ring-indigo-200"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-4 py-3 focus:outline-none focus:ring focus:ring-indigo-200"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
