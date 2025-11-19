import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from "recharts";

interface Coverage {
  zona: number;
  zona_nombre: string;
  municipio_nombre: string;
  meta_encuestas: number;
  total_encuestas: number;
  cobertura_porcentaje: number;
  estado_cobertura: string;
}

interface DashboardKPI {
  total_encuestas: number;
  zonas_cumplidas: number;
  zonas_sin_cobertura: number;
  top_necesidades: { necesidad__nombre: string; total: number }[];
  casos_activos: number;
}

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [resumen, setResumen] = useState<DashboardKPI | null>(null);

  useEffect(() => {
    const load = async () => {
      const [cov, res] = await Promise.all([
        api.get<Coverage[]>("/cobertura/zonas"),
        api.get<DashboardKPI>("/dashboard/resumen"),
      ]);
      setCoverage(cov.data);
      setResumen(res.data);
    };
    load();
  }, []);

  const coverageColors: Record<string, string> = {
    SIN_COBERTURA: "#ef4444",
    BAJA: "#f97316",
    MEDIA: "#eab308",
    CUMPLIDA: "#22c55e",
  };

  const chartData = coverage.reduce((acc: Record<string, { municipio: string; total: number }>, zona) => {
    const key = zona.municipio_nombre;
    if (!acc[key]) acc[key] = { municipio: key, total: 0 };
    acc[key].total += zona.total_encuestas;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-100 p-4 space-y-4">
      <header className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hola, {user?.name}</h1>
          <p className="text-sm text-slate-500">Rol: {user?.role}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/rutas" className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold">
            Planificador de rutas
          </Link>
          <Link to="/encuesta" className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold">
            Nueva encuesta
          </Link>
          <button onClick={logout} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 font-semibold">
            Salir
          </button>
        </div>
      </header>

      {resumen && (
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard title="Encuestas totales" value={resumen.total_encuestas} />
          <KpiCard title="Zonas cumplidas" value={resumen.zonas_cumplidas} />
          <KpiCard title="Zonas sin cobertura" value={resumen.zonas_sin_cobertura} />
          <KpiCard title="Casos ciudadanos" value={resumen.casos_activos} />
        </div>
      )}

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold mb-2">Mapa de cobertura</h2>
          <MapContainer center={[6.2442, -75.5812]} zoom={11} className="h-80 rounded-xl">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {coverage.map((zona) => (
              <CircleMarker
                key={zona.zona}
                center={[6.2442 + zona.zona / 1000, -75.5812 + zona.zona / 1000]}
                pathOptions={{ color: coverageColors[zona.estado_cobertura] || "#94a3b8" }}
                radius={10}
              >
                <Popup>
                  <p className="font-semibold">{zona.zona_nombre}</p>
                  <p>
                    {zona.total_encuestas}/{zona.meta_encuestas} ({zona.cobertura_porcentaje}%)
                  </p>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold mb-2">Encuestas por municipio</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Object.values(chartData)}>
                <XAxis dataKey="municipio" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
};

const KpiCard = ({ title, value }: { title: string; value: number }) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm">
    <p className="text-sm text-slate-500">{title}</p>
    <p className="text-3xl font-bold text-slate-900">{value}</p>
  </div>
);

export default DashboardPage;
