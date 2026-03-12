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
import { useAuth } from "../context/AuthContext";
import { usePollingStations } from "../context/PollingStationsContext";
import styles from "./Dashboard.module.css";

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

interface SystemAlert {
  tipo: string;
  nivel: string;
  leader_id: number;
  leader_nombre: string;
  mensaje: string;
  fecha_evaluacion: string;
}

interface CoordinatorMesa {
  mesa: number;
  estado?: string | null;
  testigo_id: number;
  testigo_nombre: string;
  testigo_email: string;
}

interface CoordinatorPuesto {
  puesto_id: number;
  puesto_nombre: string;
  municipio?: string | null;
  mesas_totales: number;
  mesas_asignadas: CoordinatorMesa[];
  mesas_sin_testigo: number[];
}

const coverageColors: Record<string, string> = {
  SIN_COBERTURA: "#dc3545",
  BAJA: "#fd7e14",
  MEDIA: "#ffc107",
  CUMPLIDA: "#28a745",
};

const DashboardPage = () => {
  const { user } = useAuth();
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
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [coordinatorAssignments, setCoordinatorAssignments] = useState<CoordinatorPuesto[]>([]);
  const { stations: pollingStations, fetchStations } = usePollingStations();
  const isLeader = user?.role === "LIDER";
  const isCollaborator = user?.role === "COLABORADOR";
  const isCoordinator = user?.role === "COORDINADOR_ELECTORAL";
  const showFullDashboard = user?.role === "ADMIN";

  const mapCenter = useMemo(() => {
    const withCoords = coverage.find((c) => c.lat && c.lon);
    if (withCoords && withCoords.lat && withCoords.lon) {
      return [Number(withCoords.lat), Number(withCoords.lon)] as [number, number];
    }
    const withMunicipio = coverage.find((c) => c.municipio_lat && c.municipio_lon);
    if (withMunicipio && withMunicipio.municipio_lat && withMunicipio.municipio_lon) {
      return [Number(withMunicipio.municipio_lat), Number(withMunicipio.municipio_lon)] as [number, number];
    }
    return [2.935432, -75.277327] as [number, number];
  }, [coverage]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setKpiRestricted(false);
      try {
        if (isCoordinator) {
          const assignmentsRes = await api.get<CoordinatorPuesto[]>("/dashboard/mesas-coordinador/");
          setCoordinatorAssignments(assignmentsRes.data);
          setLoading(false);
          return;
        }
        const coverageRes = await api.get<Coverage[]>("/cobertura/zonas");
        setCoverage(coverageRes.data);
        if (!isCollaborator) {
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
        } else {
          setResumen(null);
          setKpiRestricted(true);
        }
      } catch (err) {
        setError("No pudimos cargar los datos del tablero. Intenta nuevamente.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isCollaborator, isCoordinator]);

  useEffect(() => {
    if (!isCollaborator && !isCoordinator) {
      loadCharts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCollaborator, isCoordinator]);

  useEffect(() => {
    const loadAlerts = async () => {
      if (isCoordinator) return;
      try {
        const { data } = await api.get<SystemAlert[]>("/dashboard/alertas/");
        setAlerts(data);
      } catch (err) {
        console.error(err);
      }
    };
    loadAlerts();
  }, [isCoordinator]);

  useEffect(() => {
    if (!pollingStations.length && !isCoordinator) {
      fetchStations();
    }
  }, [fetchStations, isCoordinator, pollingStations.length]);

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
    <div className={styles.dashboardContainer}>
      <div className="row mb-4">
        <div className="col-12">
          <h1 className={styles.headerTitle}>Panel de control territorial</h1>
          <p className={styles.headerSubtitle}>Seguimiento de cobertura, necesidades y rutas activas.</p>
        </div>
      </div>

      {error && (
        <div className={`alert ${styles.glassAlertDanger}`} role="alert">
          {error}
        </div>
      )}

      {kpiRestricted && showFullDashboard && (
        <div className={`alert ${styles.glassAlertWarning}`} role="alert">
          Tu rol no tiene acceso al resumen consolidado, pero puedes consultar la cobertura zonal.
        </div>
      )}

      {loading && <div className={`alert ${styles.glassAlert}`}>Cargando datos espaciales...</div>}

      {showFullDashboard && (
        <div className={`row align-items-end mb-4 ${styles.glassCard} p-3`}>
          <div className="col-md-3 col-12 mb-2 mb-md-0">
            <label className="text-light small mb-1">Fecha inicio</label>
            <input
              type="date"
              className={`form-control ${styles.glassInput}`}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="col-md-3 col-12 mb-2 mb-md-0">
            <label className="text-light small mb-1">Fecha fin</label>
            <input
              type="date"
              className={`form-control ${styles.glassInput}`}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="col-md-3 col-12">
            <button className={`btn btn-block ${styles.glassBtn}`} onClick={loadCharts} disabled={chartLoading}>
              {chartLoading ? "Buscando..." : "Buscar por rango"}
            </button>
          </div>
        </div>
      )}

      {isLeader && (
        <div className="row mb-3">
          <div className="col-md-4 col-12 mb-2">
            <div className="card border-left-primary h-100">
              <div className="card-body">
                <p className="text-muted mb-1">Meta de votantes asignada</p>
                <h3 className="mb-0">{user?.meta_votantes ?? 0}</h3>
              </div>
            </div>
          </div>
        </div>
      )}



      {isCoordinator && !loading && (
        <div className={styles.glassCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Mesas asignadas por ti</h3>
          </div>
          <div className={styles.cardBodyNoPad}>
            {coordinatorAssignments.length ? (
              <div className="p-4">
                {coordinatorAssignments.map((puesto) => (
                  <div key={puesto.puesto_id} className="mb-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-2">
                      <div>
                        <h4 className="h6 mb-1 text-light">{puesto.puesto_nombre}</h4>
                        <div className="text-light opacity-75 small">{puesto.municipio || "-"}</div>
                      </div>
                      <div className="text-light opacity-75 small">
                        Total mesas: <strong className="text-white">{puesto.mesas_totales}</strong>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-lg-6 col-12 mb-3 mb-lg-0">
                        <div className="border rounded p-3 h-100">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <strong>Mesas con testigo</strong>
                            <span className="badge badge-success">{puesto.mesas_asignadas.length}</span>
                          </div>
                          {puesto.mesas_asignadas.length ? (
                            <ul className="list-group list-group-flush">
                              {puesto.mesas_asignadas.map((mesa) => (
                                <li
                                  key={`${puesto.puesto_id}-${mesa.mesa}-${mesa.testigo_id}`}
                                  className="list-group-item d-flex justify-content-between align-items-start"
                                >
                                  <div>
                                    <div className="font-weight-bold">Mesa {mesa.mesa}</div>
                                    <div className="text-muted small">{mesa.testigo_nombre}</div>
                                    <div className="text-muted small">{mesa.testigo_email}</div>
                                  </div>
                                  <span className="badge badge-light">{mesa.estado || "Asignada"}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted mb-0">No tienes mesas asignadas en este puesto.</p>
                          )}
                        </div>
                      </div>
                      <div className="col-lg-6 col-12">
                        <div className="border rounded p-3 h-100">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <strong>Mesas sin testigo</strong>
                            <span className="badge badge-danger">{puesto.mesas_sin_testigo.length}</span>
                          </div>
                          {puesto.mesas_sin_testigo.length ? (
                            <div className="d-flex flex-wrap" style={{ gap: "0.5rem" }}>
                              {puesto.mesas_sin_testigo.map((mesa) => (
                                <span key={`${puesto.puesto_id}-sin-${mesa}`} className="badge badge-danger">
                                  Mesa {mesa} · Sin testigo
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-success font-weight-bold">Cobertura completa</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-muted">Aún no has asignado mesas de votación.</div>
            )}
          </div>
        </div>
      )}

      {!loading && showFullDashboard && !kpiRestricted && resumen && !isCoordinator && (
        <div className="row">
          <KpiCard title="Registros totales" icon="fas fa-poll" color="bg-primary" value={resumen.total_encuestas} />
          <KpiCard title="Zonas cumplidas" icon="fas fa-check-circle" color="bg-success" value={resumen.zonas_cumplidas} />
          <KpiCard title="Zonas sin cobertura" icon="fas fa-map-marker-alt" color="bg-danger" value={resumen.zonas_sin_cobertura} />
          <KpiCard title="Casos activos" icon="fas fa-exclamation-triangle" color="bg-warning" value={resumen.casos_activos} />
        </div>
      )}

      {showFullDashboard && !isCoordinator && (
        <div className="row mt-4">
          <div className="col-lg-8 col-12 mb-4">
            <div className={styles.glassCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Mapa de cobertura</h3>
              </div>
              <div className={`${styles.cardBodyNoPad} ${styles.mapWrapper}`}>
                <MapContainer center={mapCenter} zoom={7} style={{ height: "400px", width: "100%", background: "transparent" }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  {coverage.map((zona) => (
                    (zona.lat || zona.lon || zona.municipio_lat || zona.municipio_lon) && (
                      <CircleMarker
                        key={zona.zona}
                        center={[
                          Number(zona.lat ?? zona.municipio_lat ?? mapCenter[0]),
                          Number(zona.lon ?? zona.municipio_lon ?? mapCenter[1]),
                        ]}
                        pathOptions={{ color: coverageColors[zona.estado_cobertura] || "#6c757d", fillOpacity: 0.8 }}
                        radius={9}
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
                  {pollingStations.map((station) => (
                    <CircleMarker
                      key={`puesto-${station.id}`}
                      center={[Number(station.latitud), Number(station.longitud)]}
                      pathOptions={{ color: "#007bff", fillColor: "#007bff" }}
                      radius={6}
                    >
                      <Popup>
                        <strong>{station.nombre}</strong>
                        <p className="mb-0 text-muted small">Puesto de votación</p>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>
          <div className="col-lg-4 col-12 mb-4">
            <div className={`${styles.glassCard} h-100 mb-0`}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Top necesidades</h3>
              </div>
              <div className={styles.cardBodyNoPad}>
                {resumen?.top_necesidades?.length ? (
                  <ul className={`list-group list-group-flush ${styles.glassListGroup}`}>
                    {resumen.top_necesidades.map((need) => (
                      <li key={need.necesidad__nombre} className={`list-group-item d-flex justify-content-between align-items-center ${styles.glassListItem}`}>
                        <span>{need.necesidad__nombre}</span>
                        <span className="badge badge-primary badge-pill bg-primary border-0">{need.total}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-light opacity-50">Sin información disponible.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isCoordinator && (
        <div className="row">
          {showFullDashboard && (
          <div className="col-lg-6 col-12 mb-4">
            <div className={styles.glassCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Registros por municipio</h3>
              </div>
              <div className={styles.cardBody}>
                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="municipio" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                      <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(13, 20, 24, 0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} />
                      <Bar dataKey="total" fill="#4ade80" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
          )}
          <div className={showFullDashboard ? "col-lg-6 col-12 mb-4" : "col-12 mb-4"}>
            <div className={styles.glassCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Cobertura por zona</h3>
            </div>
            <div className={`${styles.cardBodyNoPad} table-responsive`} style={{ maxHeight: 360 }}>
              <table className={`table text-nowrap ${styles.glassTable}`}>
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
          <div className="col-lg-6 col-12 mb-4">
            <div className={styles.glassCard}>
            <div className={`${styles.cardHeader} justify-content-between`}>
              <h3 className={styles.cardTitle}>Registros por día</h3>
              {chartLoading && <span className="badge badge-light border bg-transparent text-light">Actualizando...</span>}
            </div>
            <div className={styles.cardBody} style={{ height: 320 }}>
              {encuestasDiarias.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={encuestasDiarias}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="fecha_creacion" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} stroke="rgba(255,255,255,0.5)" />
                    <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} stroke="rgba(255,255,255,0.5)" />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(13, 20, 24, 0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-light opacity-50 text-center mt-5">No hay datos para el rango seleccionado.</p>
              )}
            </div>
          </div>
          </div>
        </div>
      )}

      {showFullDashboard && !isCoordinator && (
        <div className="row mt-2">
          <div className="col-lg-6 col-12 mb-4">
            <div className={styles.glassCard}>
              <div className={`${styles.cardHeader} justify-content-between`}>
                <h3 className={styles.cardTitle}>Avance por colaborador</h3>
                {chartLoading && <span className="badge badge-light border bg-transparent text-light">Actualizando...</span>}
              </div>
              <div className={`${styles.cardBody} d-flex justify-content-center`} style={{ height: 320 }}>
                {colaboradorDoughnutData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={colaboradorDoughnutData}
                        dataKey="encuestas_realizadas"
                        nameKey="nombre"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={4}
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth={2}
                      >
                        {colaboradorDoughnutData.map((entry, index) => (
                          <Cell key={entry.id} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(13, 20, 24, 0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-light opacity-50 align-self-center">No hay colaboradores con registros en este rango.</p>
                )}
              </div>
            </div>
          </div>
          <div className="col-lg-6 col-12 mb-4">
            <div className={styles.glassCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Metas vs Registros</h3>
              </div>
              <div className={`${styles.cardBodyNoPad} table-responsive`} style={{ maxHeight: 320 }}>
                <table className={`table mb-0 ${styles.glassTable}`}>
                  <thead>
                    <tr>
                      <th>Colaborador</th>
                      <th>Registros</th>
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
      )}
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
}) => {
  // Map bootstrap colors to custom CSS modifiers
  const colorClass = color.includes("primary") ? styles.kpiPrimary : 
                     color.includes("success") ? styles.kpiSuccess : 
                     color.includes("danger") ? styles.kpiDanger : 
                     styles.kpiWarning;

  return (
    <div className="col-lg-3 col-6 mb-4">
      <div className={`${styles.kpiCard} ${colorClass}`}>
        <div className={styles.inner}>
          <h3>{value}</h3>
          <p>{title}</p>
        </div>
        <div className={styles.icon}>
          <i className={icon} />
        </div>
      </div>
    </div>
  );
};

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
