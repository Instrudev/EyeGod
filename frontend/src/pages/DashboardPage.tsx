import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { AxiosError } from "axios";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import api from "../services/api";

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

const coverageColors: Record<string, string> = {
  SIN_COBERTURA: "#dc3545",
  BAJA: "#fd7e14",
  MEDIA: "#ffc107",
  CUMPLIDA: "#28a745",
};

const DashboardPage = () => {
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [resumen, setResumen] = useState<DashboardKPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpiRestricted, setKpiRestricted] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setKpiRestricted(false);
      try {
        const coverageRes = await api.get<Coverage[]>("/cobertura/zonas");
        setCoverage(coverageRes.data);
        try {
          const resumenRes = await api.get<DashboardKPI>("/dashboard/resumen/");
          setResumen(resumenRes.data);
        } catch (err) {
          const axiosErr = err as AxiosError;
          if (axiosErr.response?.status === 403) {
            setResumen(null);
            setKpiRestricted(true);
          } else {
            throw err;
          }
        }
      } catch (err) {
        setError("No pudimos cargar los datos del tablero. Intenta nuevamente.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const chartData = useMemo(() => {
    const grouped: Record<string, { municipio: string; total: number }> = {};
    coverage.forEach((zona) => {
      if (!grouped[zona.municipio_nombre]) {
        grouped[zona.municipio_nombre] = { municipio: zona.municipio_nombre, total: 0 };
      }
      grouped[zona.municipio_nombre].total += zona.total_encuestas;
    });
    return Object.values(grouped);
  }, [coverage]);

  return (
    <div className="pb-5">
      <div className="row mb-3">
        <div className="col-12">
          <h1 className="h4 text-dark font-weight-bold">Panel de control territorial</h1>
          <p className="text-muted">Seguimiento de cobertura, necesidades y rutas activas.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {kpiRestricted && (
        <div className="alert alert-warning" role="alert">
          Tu rol no tiene acceso al resumen consolidado, pero puedes consultar la cobertura zonal.
        </div>
      )}

      {loading && <div className="alert alert-info">Cargando datos...</div>}

      {!loading && !kpiRestricted && resumen && (
        <div className="row">
          <KpiCard title="Encuestas totales" icon="fas fa-poll" color="bg-primary" value={resumen.total_encuestas} />
          <KpiCard title="Zonas cumplidas" icon="fas fa-check-circle" color="bg-success" value={resumen.zonas_cumplidas} />
          <KpiCard title="Zonas sin cobertura" icon="fas fa-map-marker-alt" color="bg-danger" value={resumen.zonas_sin_cobertura} />
          <KpiCard title="Casos activos" icon="fas fa-exclamation-triangle" color="bg-warning" value={resumen.casos_activos} />
        </div>
      )}

      <div className="row mt-3">
        <div className="col-lg-8 col-12">
          <div className="card card-primary card-outline">
            <div className="card-header">
              <h3 className="card-title">Mapa de cobertura</h3>
            </div>
            <div className="card-body p-0">
              <MapContainer center={[6.2442, -75.5812]} zoom={11} style={{ height: "360px", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {coverage.map((zona) => (
                  <CircleMarker
                    key={zona.zona}
                    center={[6.2442 + zona.zona / 1000, -75.5812 + zona.zona / 1000]}
                    pathOptions={{ color: coverageColors[zona.estado_cobertura] || "#6c757d" }}
                    radius={8}
                  >
                    <Popup>
                      <strong>{zona.zona_nombre}</strong>
                      <p className="mb-0">
                        {zona.total_encuestas}/{zona.meta_encuestas} ({zona.cobertura_porcentaje}%)
                      </p>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
        <div className="col-lg-4 col-12">
          <div className="card card-secondary card-outline">
            <div className="card-header">
              <h3 className="card-title">Top necesidades</h3>
            </div>
            <div className="card-body">
              {resumen?.top_necesidades?.length ? (
                <ul className="list-group list-group-flush">
                  {resumen.top_necesidades.map((need) => (
                    <li key={need.necesidad__nombre} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>{need.necesidad__nombre}</span>
                      <span className="badge badge-primary badge-pill">{need.total}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mb-0">Sin información disponible.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-6 col-12">
          <div className="card card-outline card-info">
            <div className="card-header">
              <h3 className="card-title">Encuestas por municipio</h3>
            </div>
            <div className="card-body">
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="municipio" stroke="#6c757d" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#17a2b8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6 col-12">
          <div className="card card-outline card-success">
            <div className="card-header">
              <h3 className="card-title">Cobertura por zona</h3>
            </div>
            <div className="card-body table-responsive p-0" style={{ maxHeight: 320 }}>
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>Zona</th>
                    <th>Municipio</th>
                    <th>Meta</th>
                    <th>Realizadas</th>
                    <th>Cobertura</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.map((item) => (
                    <tr key={item.zona}>
                      <td>{item.zona_nombre}</td>
                      <td>{item.municipio_nombre}</td>
                      <td>{item.meta_encuestas}</td>
                      <td>{item.total_encuestas}</td>
                      <td>
                        <span className={`badge ${getCoverageBadge(item.estado_cobertura)}`}>
                          {item.cobertura_porcentaje}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) => (
  <div className="col-lg-3 col-6">
    <div className={`small-box ${color}`}>
      <div className="inner">
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
      <div className="icon">
        <i className={icon} />
      </div>
    </div>
  </div>
);

const getCoverageBadge = (estado: string) => {
  switch (estado) {
    case "CUMPLIDA":
      return "badge-success";
    case "MEDIA":
      return "badge-warning";
    case "BAJA":
      return "badge-info";
    default:
      return "badge-danger";
  }
};

export default DashboardPage;
