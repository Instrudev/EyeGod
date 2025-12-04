import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { AxiosError } from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import api from "../services/api";

interface Coverage {
  zona: number;
  zona_nombre: string;
  municipio_nombre: string;
  lat?: number | null;
  lon?: number | null;
  municipio_lat?: number | null;
  municipio_lon?: number | null;
  necesidades?: { nombre: string; total: number }[];
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

interface DailySurvey {
  fecha_creacion: string;
  total: number;
}

interface CollaboratorProgress {
  id: number;
  nombre: string;
  encuestas_realizadas: number;
  meta_encuestas: number;
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
  const [encuestasDiarias, setEncuestasDiarias] = useState<DailySurvey[]>([]);
  const [progresoColaboradores, setProgresoColaboradores] = useState<CollaboratorProgress[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [chartLoading, setChartLoading] = useState(false);

  const mapCenter = useMemo(() => {
    const withCoords = coverage.find((c) => c.lat && c.lon);
    if (withCoords && withCoords.lat && withCoords.lon) {
      return [Number(withCoords.lat), Number(withCoords.lon)] as [number, number];
    }
    const withMunicipio = coverage.find((c) => c.municipio_lat && c.municipio_lon);
    if (withMunicipio && withMunicipio.municipio_lat && withMunicipio.municipio_lon) {
      return [Number(withMunicipio.municipio_lat), Number(withMunicipio.municipio_lon)] as [number, number];
    }
    return [6.2476, -75.5658] as [number, number];
  }, [coverage]);

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

  useEffect(() => {
    loadCharts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCharts = async () => {
    setChartLoading(true);
    try {
      const [diarioRes, progresoRes] = await Promise.all([
        api.get<DailySurvey[]>("/dashboard/encuestas_por_dia/", {
          params: {
            start_date: startDate || undefined,
            end_date: endDate || undefined,
          },
        }),
        api.get<CollaboratorProgress[]>("/dashboard/avance_colaboradores/", {
          params: {
            start_date: startDate || undefined,
            end_date: endDate || undefined,
          },
        }),
      ]);
      setEncuestasDiarias(diarioRes.data);
      setProgresoColaboradores(progresoRes.data);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar los gráficos adicionales. Intenta nuevamente.");
    } finally {
      setChartLoading(false);
    }
  };

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

  const pieColors = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ac"];

  const colaboradorDoughnutData = useMemo(() => {
    if (!progresoColaboradores.length) return [];
    return progresoColaboradores.map((colab, index) => ({
      ...colab,
      fill: pieColors[index % pieColors.length],
    }));
  }, [pieColors, progresoColaboradores]);

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

      <div className="row align-items-end mb-3">
        <div className="col-md-3 col-12 mb-2 mb-md-0">
          <label className="text-muted small mb-1">Fecha inicio</label>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="col-md-3 col-12 mb-2 mb-md-0">
          <label className="text-muted small mb-1">Fecha fin</label>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="col-md-3 col-12">
          <button className="btn btn-primary btn-block" onClick={loadCharts} disabled={chartLoading}>
            {chartLoading ? "Buscando..." : "Buscar por rango"}
          </button>
        </div>
      </div>

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
              <MapContainer center={mapCenter} zoom={11} style={{ height: "360px", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {coverage.map((zona) => (
                  (zona.lat || zona.lon || zona.municipio_lat || zona.municipio_lon) && (
                    <CircleMarker
                      key={zona.zona}
                      center={[
                        Number(zona.lat ?? zona.municipio_lat ?? mapCenter[0]),
                        Number(zona.lon ?? zona.municipio_lon ?? mapCenter[1]),
                      ]}
                      pathOptions={{ color: coverageColors[zona.estado_cobertura] || "#6c757d" }}
                      radius={8}
                      >
                        <Popup>
                          <strong>{zona.zona_nombre}</strong>
                          <p className="mb-0">
                            {zona.total_encuestas}/{zona.meta_encuestas} ({zona.cobertura_porcentaje}%)
                          </p>
                          {zona.necesidades?.length ? (
                            <div className="mt-2">
                              <div className="text-muted small">Necesidades reportadas</div>
                              <ul className="mb-0 pl-3">
                                {zona.necesidades.map((need) => (
                                  <li key={`${zona.zona}-${need.nombre}`}>
                                    {need.nombre} <span className="badge badge-light ml-1">{need.total}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-muted mb-0 small">Sin necesidades registradas</p>
                          )}
                        </Popup>
                      </CircleMarker>
                  )
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
        <div className="col-lg-6 col-12">
          <div className="card card-outline card-primary">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title mb-0">Encuestas por día</h3>
              {chartLoading && <span className="badge badge-secondary">Actualizando...</span>}
            </div>
            <div className="card-body" style={{ height: 320 }}>
              {encuestasDiarias.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={encuestasDiarias}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha_creacion" tick={{ fontSize: 12 }} stroke="#6c757d" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#007bff" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted mb-0">No hay datos para el rango seleccionado.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-3">
        <div className="col-lg-6 col-12">
          <div className="card card-outline card-success">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title mb-0">Avance por colaborador</h3>
              {chartLoading && <span className="badge badge-secondary">Actualizando...</span>}
            </div>
            <div className="card-body d-flex justify-content-center" style={{ height: 320 }}>
              {colaboradorDoughnutData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={colaboradorDoughnutData}
                      dataKey="encuestas_realizadas"
                      nameKey="nombre"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      label
                    >
                      {colaboradorDoughnutData.map((entry, index) => (
                        <Cell key={entry.id} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} encuestas`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted mb-0 align-self-center">No hay colaboradores con encuestas en este rango.</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-6 col-12">
          <div className="card card-outline card-warning">
            <div className="card-header">
              <h3 className="card-title mb-0">Metas vs encuestas</h3>
            </div>
            <div className="card-body p-0 table-responsive" style={{ maxHeight: 320 }}>
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Encuestas</th>
                    <th>Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradorDoughnutData.length ? (
                    colaboradorDoughnutData.map((colab) => (
                      <tr key={colab.id}>
                        <td>{colab.nombre}</td>
                        <td>{colab.encuestas_realizadas}</td>
                        <td>{colab.meta_encuestas}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-center text-muted">
                        No hay datos para mostrar.
                      </td>
                    </tr>
                  )}
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
