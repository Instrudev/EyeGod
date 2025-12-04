import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../services/api";

interface ResumenGeneral {
  total_departamentos: number;
  total_municipios: number;
  total_zonas: number;
  total_encuestas: number;
  total_necesidades: number;
  total_casos: number;
}

interface CoberturaZona {
  id: number;
  nombre: string;
  municipio: string;
  meta_encuestas: number;
  total_encuestas: number;
  cobertura_porcentaje: number;
  estado: string;
}

interface CoberturaMunicipio {
  municipio: string;
  total_zonas: number;
  total_encuestas: number;
  meta_total: number;
  cobertura_porcentaje: number;
}

interface NecesidadDistribucion {
  necesidad__nombre?: string;
  total: number;
  encuesta__zona__municipio__nombre?: string;
  encuesta__zona__nombre?: string;
  encuesta__zona__id?: number;
}

interface NecesidadZonaDetalle {
  encuesta__zona__id: number;
  encuesta__zona__nombre: string;
  encuesta__zona__municipio__nombre: string;
  necesidad__nombre: string;
  total: number;
}

interface Comentario {
  zona: string;
  municipio: string;
  comentario: string;
  fecha: string;
  encuestador: string;
  caso_critico: boolean;
}

interface CasoDetalle {
  id: number;
  prioridad: string;
  estado: string;
  zona: string;
  municipio: string;
}

interface RutaDetalle {
  id: number;
  nombre: string;
  estado: string;
  colaboradores: number;
  zonas: { nombre: string; municipio: string; meta_encuestas: number; total_encuestas: number; cobertura_porcentaje: number }[];
  avance: number;
}

interface EncuestadorDetalle {
  id: number;
  nombre: string;
  total_encuestas: number;
  zonas: string[];
  necesidades_top: { nombre: string; total: number }[];
  serie: { fecha: string; total: number }[];
}

interface ReporteUnico {
  titulo: string;
  generado_en: string;
  resumen_general: ResumenGeneral;
  cobertura: { zonas: CoberturaZona[]; municipios: CoberturaMunicipio[] };
  necesidades: {
    top: NecesidadDistribucion[];
    por_municipio: NecesidadDistribucion[];
    por_municipio_zona: NecesidadDistribucion[];
    por_zona_detalle: NecesidadZonaDetalle[];
    por_zona: NecesidadDistribucion[];
  };
  comentarios: { detalle: Comentario[]; temas_recurrentes: { tema: string; total: number }[] };
  casos: { total: number; por_prioridad: { nivel_prioridad: string; total: number }[]; por_estado: { estado: string; total: number }[]; criticos: CasoDetalle[] };
  rutas: { total: number; detalle: RutaDetalle[] };
  encuestadores: EncuestadorDetalle[];
}

const estadoColors: Record<string, string> = {
  SIN_COBERTURA: "badge badge-danger",
  BAJA: "badge badge-warning",
  MEDIA: "badge badge-info",
  CUMPLIDA: "badge badge-success",
};

const piePalette = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ac"];

const UnifiedReportPage = () => {
  const [reporte, setReporte] = useState<ReporteUnico | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [municipioNecesidades, setMunicipioNecesidades] = useState<string>("");
  const [zonaSeleccionadaId, setZonaSeleccionadaId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ReporteUnico>("/reportes/", {
        params: {
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        },
      });
      setReporte(res.data);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar el reporte unificado. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const descargarPdf = async () => {
    try {
      const res = await api.get("/reportes/pdf/", {
        params: {
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "reporte_unico.pdf");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("No pudimos generar el PDF. Intenta nuevamente.");
    }
  };

  const topNecesidadesChart = useMemo(() => {
    return (
      reporte?.necesidades.top.map((item, index) => ({
        nombre: item.necesidad__nombre || "N/D",
        total: item.total,
        fill: piePalette[index % piePalette.length],
      })) || []
    );
  }, [reporte]);

  const necesidadesPorMunicipioChart = useMemo(() => {
    return (
      reporte?.necesidades.por_municipio.map((item) => ({
        municipio: item.encuesta__zona__municipio__nombre || "N/D",
        total: item.total,
      })) || []
    );
  }, [reporte]);

  const municipiosParaDesglose = useMemo(() => {
    const nombres = reporte?.necesidades.por_municipio_zona.map(
      (item) => item.encuesta__zona__municipio__nombre || "N/D"
    );
    return Array.from(new Set(nombres || [])).filter(Boolean);
  }, [reporte]);

  useEffect(() => {
    if (municipiosParaDesglose.length > 0 && !municipioNecesidades) {
      setMunicipioNecesidades(municipiosParaDesglose[0]);
    }
  }, [municipiosParaDesglose, municipioNecesidades]);

  const necesidadesPorZonaYMunicipioChart = useMemo(() => {
    if (!reporte) return [];
    return reporte.necesidades.por_municipio_zona
      .filter(
        (item) =>
          (municipioNecesidades && item.encuesta__zona__municipio__nombre === municipioNecesidades) ||
          (!municipioNecesidades && item.encuesta__zona__municipio__nombre)
      )
      .map((item, index) => ({
        zona: item.encuesta__zona__nombre || "N/D",
        total: item.total,
        zonaId: item.encuesta__zona__id,
        fill: piePalette[index % piePalette.length],
      }));
  }, [reporte, municipioNecesidades]);

  useEffect(() => {
    if (necesidadesPorZonaYMunicipioChart.length > 0) {
      const firstZona = necesidadesPorZonaYMunicipioChart[0];
      setZonaSeleccionadaId((prev) => prev ?? firstZona.zonaId || null);
    } else {
      setZonaSeleccionadaId(null);
    }
  }, [necesidadesPorZonaYMunicipioChart]);

  const detalleZonaSeleccionada = useMemo(() => {
    if (!reporte || !zonaSeleccionadaId) return [];
    return reporte.necesidades.por_zona_detalle.filter(
      (item) => item.encuesta__zona__id === zonaSeleccionadaId
    );
  }, [reporte, zonaSeleccionadaId]);

  const totalDetalleZonaSeleccionada = useMemo(
    () => detalleZonaSeleccionada.reduce((acc, item) => acc + item.total, 0),
    [detalleZonaSeleccionada]
  );

  const prioridadCasosChart = useMemo(() => {
    return (
      reporte?.casos.por_prioridad.map((item, index) => ({
        prioridad: item.nivel_prioridad,
        total: item.total,
        fill: piePalette[index % piePalette.length],
      })) || []
    );
  }, [reporte]);

  return (
    <div className="pb-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 text-dark font-weight-bold">Reporte único de inteligencia territorial</h1>
          <p className="text-muted mb-0">Resumen integral y descargable en PDF.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <input type="date" className="form-control mr-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="form-control mr-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <button className="btn btn-primary mr-2" onClick={load} disabled={loading}>
            {loading ? "Buscando..." : "Actualizar"}
          </button>
          <button className="btn btn-outline-secondary" onClick={descargarPdf}>
            <i className="fas fa-file-pdf mr-1" /> PDF
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="alert alert-info">Cargando reporte...</div>}

      {reporte && (
        <>
          <div className="row">
            {[{ label: "Departamentos", value: reporte.resumen_general.total_departamentos }, { label: "Municipios", value: reporte.resumen_general.total_municipios }, { label: "Zonas", value: reporte.resumen_general.total_zonas }, { label: "Encuestas", value: reporte.resumen_general.total_encuestas }, { label: "Necesidades", value: reporte.resumen_general.total_necesidades }, { label: "Casos ciudadanos", value: reporte.resumen_general.total_casos }].map((item) => (
              <div className="col-md-2 col-6 mb-3" key={item.label}>
                <div className="info-box bg-light h-100">
                  <span className="info-box-icon text-primary">
                    <i className="fas fa-chart-bar" />
                  </span>
                  <div className="info-box-content">
                    <span className="info-box-text text-muted text-truncate">{item.label}</span>
                    <span className="info-box-number h5 mb-0">{item.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="row">
            <div className="col-lg-7 col-12 mb-3">
              <div className="card card-outline card-primary h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h3 className="card-title">Cobertura por zona</h3>
                </div>
                <div className="card-body table-responsive p-0" style={{ maxHeight: 360 }}>
                  <table className="table table-hover table-sm mb-0">
                    <thead className="thead-light">
                      <tr>
                        <th>Zona</th>
                        <th>Municipio</th>
                        <th>Meta</th>
                        <th>Encuestas</th>
                        <th>%</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.cobertura.zonas.map((zona) => (
                        <tr key={zona.id}>
                          <td>{zona.nombre}</td>
                          <td>{zona.municipio}</td>
                          <td>{zona.meta_encuestas}</td>
                          <td>{zona.total_encuestas}</td>
                          <td>{zona.cobertura_porcentaje}%</td>
                          <td>
                            <span className={estadoColors[zona.estado] || "badge badge-secondary"}>{zona.estado}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-lg-5 col-12 mb-3">
              <div className="card card-outline card-secondary h-100">
                <div className="card-header">
                  <h3 className="card-title">Resumen por municipio</h3>
                </div>
                <div className="card-body table-responsive p-0" style={{ maxHeight: 360 }}>
                  <table className="table table-striped table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Municipio</th>
                        <th>Zonas</th>
                        <th>Encuestas</th>
                        <th>Meta</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.cobertura.municipios.map((item) => (
                        <tr key={item.municipio}>
                          <td>{item.municipio}</td>
                          <td>{item.total_zonas}</td>
                          <td>{item.total_encuestas}</td>
                          <td>{item.meta_total}</td>
                          <td>{item.cobertura_porcentaje}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 col-12 mb-3">
              <div className="card card-outline card-info h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h3 className="card-title">Top necesidades</h3>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={topNecesidadesChart} dataKey="total" nameKey="nombre" outerRadius={90} label>
                        {topNecesidadesChart.map((entry, index) => (
                          <Cell key={entry.nombre + index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-12 mb-3">
              <div className="card card-outline card-warning h-100">
                <div className="card-header">
                  <h3 className="card-title">Necesidades por municipio</h3>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={necesidadesPorMunicipioChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="municipio" hide={necesidadesPorMunicipioChart.length > 6} angle={-25} interval={0} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" name="Necesidades" fill="#4e79a7" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-outline card-primary mb-3">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center">
              <h3 className="card-title mb-0">Desglose de necesidades por zona</h3>
              <div className="d-flex align-items-center">
                <span className="mr-2 text-muted">Municipio:</span>
                <select
                  className="form-control"
                  style={{ minWidth: 200 }}
                  value={municipioNecesidades}
                  onChange={(e) => setMunicipioNecesidades(e.target.value)}
                >
                  {municipiosParaDesglose.map((mun) => (
                    <option key={mun} value={mun}>
                      {mun}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="card-body" style={{ minHeight: 240 }}>
              {necesidadesPorZonaYMunicipioChart.length === 0 && (
                <p className="text-muted mb-0">No hay necesidades registradas para este municipio.</p>
              )}
              {necesidadesPorZonaYMunicipioChart.length > 0 && (
                <div className="row align-items-start">
                  <div className="col-lg-8 col-12">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={necesidadesPorZonaYMunicipioChart}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        onClick={(data) => {
                          if (data && data.activePayload && data.activePayload[0]) {
                            const zonaId = data.activePayload[0].payload.zonaId as number | undefined;
                            setZonaSeleccionadaId(zonaId ?? null);
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="zona" interval={0} angle={-25} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total" name="Necesidades" radius={[4, 4, 0, 0]}>
                          {necesidadesPorZonaYMunicipioChart.map((entry) => (
                            <Cell
                              key={entry.zona}
                              fill={entry.zonaId === zonaSeleccionadaId ? "#f28e2b" : entry.fill}
                              strokeWidth={entry.zonaId === zonaSeleccionadaId ? 2 : 0}
                              stroke={entry.zonaId === zonaSeleccionadaId ? "#d97900" : undefined}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="col-lg-4 col-12 mt-3 mt-lg-0">
                    {detalleZonaSeleccionada.length === 0 && (
                      <p className="text-muted mb-0">Selecciona una barra para ver el detalle.</p>
                    )}
                    {detalleZonaSeleccionada.length > 0 && (
                      <>
                        <h6 className="text-primary font-weight-bold mb-2">
                          {detalleZonaSeleccionada[0].encuesta__zona__nombre} ({detalleZonaSeleccionada[0].encuesta__zona__municipio__nombre})
                        </h6>
                        <p className="text-muted small mb-2">
                          Total necesidades registradas: <strong>{totalDetalleZonaSeleccionada}</strong>
                        </p>
                        <ul className="list-group list-group-flush small">
                          {detalleZonaSeleccionada.map((item) => (
                            <li className="list-group-item d-flex justify-content-between" key={`${item.encuesta__zona__id}-${item.necesidad__nombre}`}>
                              <span>{item.necesidad__nombre}</span>
                              <span className="badge badge-primary">{item.total}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card card-outline card-light mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title mb-0">Tabla de necesidades por zona</h3>
              <span className="text-muted small">Top 50 filas</span>
            </div>
            <div className="card-body table-responsive p-0" style={{ maxHeight: 260 }}>
              <table className="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Municipio</th>
                    <th>Zona</th>
                    <th>Total necesidades</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.necesidades.por_zona.slice(0, 50).map((item, idx) => (
                    <tr key={`${item.encuesta__zona__nombre}-${idx}`}>
                      <td>{item.encuesta__zona__municipio__nombre}</td>
                      <td>{item.encuesta__zona__nombre}</td>
                      <td>{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-7 col-12 mb-3">
              <div className="card card-outline card-success h-100">
                <div className="card-header">
                  <h3 className="card-title">Comentarios y problemas reportados</h3>
                </div>
                <div className="card-body table-responsive p-0" style={{ maxHeight: 280 }}>
                  <table className="table table-hover table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Zona</th>
                        <th>Municipio</th>
                        <th>Comentario</th>
                        <th>Encuestador</th>
                        <th>Crítico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.comentarios.detalle.map((item, idx) => (
                        <tr key={`${item.zona}-${idx}`}>
                          <td>{item.zona}</td>
                          <td>{item.municipio}</td>
                          <td className="text-wrap" style={{ maxWidth: 280 }}>{item.comentario}</td>
                          <td>{item.encuestador}</td>
                          <td>{item.caso_critico ? <span className="badge badge-danger">Sí</span> : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-lg-5 col-12 mb-3">
              <div className="card card-outline card-secondary h-100">
                <div className="card-header">
                  <h3 className="card-title">Temas recurrentes</h3>
                </div>
                <div className="card-body">
                  {reporte.comentarios.temas_recurrentes.length === 0 && <p className="text-muted mb-0">Sin palabras clave destacadas.</p>}
                  {reporte.comentarios.temas_recurrentes.length > 0 && (
                    <ul className="list-group list-group-flush">
                      {reporte.comentarios.temas_recurrentes.map((tema) => (
                        <li className="list-group-item d-flex justify-content-between" key={tema.tema}>
                          <span>{tema.tema}</span>
                          <span className="badge badge-primary">{tema.total}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-4 col-12 mb-3">
              <div className="card card-outline card-danger h-100">
                <div className="card-header">
                  <h3 className="card-title">Situación de casos ciudadanos</h3>
                </div>
                <div className="card-body">
                  <p className="mb-1">Total casos: <strong>{reporte.casos.total}</strong></p>
                  <p className="mb-2 text-muted">Distribución por estado:</p>
                  <div className="d-flex flex-wrap mb-2">
                    {reporte.casos.por_estado.map((item) => (
                      <span className="badge badge-secondary mr-2 mb-2" key={item.estado}>
                        {item.estado}: {item.total}
                      </span>
                    ))}
                  </div>
                  <p className="text-muted small">Distribución por prioridad</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={prioridadCasosChart} dataKey="total" nameKey="prioridad" outerRadius={70} label>
                        {prioridadCasosChart.map((entry, idx) => (
                          <Cell key={entry.prioridad + idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="col-md-8 col-12 mb-3">
              <div className="card card-outline card-dark h-100">
                <div className="card-header">
                  <h3 className="card-title">Casos críticos</h3>
                </div>
                <div className="card-body table-responsive p-0" style={{ maxHeight: 220 }}>
                  <table className="table table-sm table-striped mb-0">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Prioridad</th>
                        <th>Estado</th>
                        <th>Zona</th>
                        <th>Municipio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.casos.criticos.map((caso) => (
                        <tr key={caso.id}>
                          <td>{caso.id}</td>
                          <td>{caso.prioridad}</td>
                          <td>{caso.estado}</td>
                          <td>{caso.zona}</td>
                          <td>{caso.municipio}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 col-12 mb-3">
              <div className="card card-outline card-primary h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h3 className="card-title">Actividad por rutas</h3>
                  <span className="badge badge-primary">Total rutas: {reporte.rutas.total}</span>
                </div>
                <div className="card-body table-responsive p-0" style={{ maxHeight: 260 }}>
                  <table className="table table-sm table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Ruta</th>
                        <th>Estado</th>
                        <th>Colaboradores</th>
                        <th>Avance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.rutas.detalle.map((ruta) => (
                        <tr key={ruta.id}>
                          <td>{ruta.nombre}</td>
                          <td>{ruta.estado}</td>
                          <td>{ruta.colaboradores}</td>
                          <td>{ruta.avance}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-12 mb-3">
              <div className="card card-outline card-secondary h-100">
                <div className="card-header">
                  <h3 className="card-title">Zonas por ruta</h3>
                </div>
                <div className="card-body table-responsive p-0" style={{ maxHeight: 260 }}>
                  <table className="table table-sm table-striped mb-0">
                    <thead>
                      <tr>
                        <th>Ruta</th>
                        <th>Zonas</th>
                        <th>% cobertura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.rutas.detalle.flatMap((ruta) =>
                        ruta.zonas.map((zona, idx) => (
                          <tr key={`${ruta.id}-${idx}`}>
                            <td>{ruta.nombre}</td>
                            <td>{zona.nombre}</td>
                            <td>{zona.cobertura_porcentaje}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-outline card-info">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">Actividad por encuestadores</h3>
            </div>
            <div className="card-body table-responsive p-0" style={{ maxHeight: 320 }}>
              <table className="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Encuestador</th>
                    <th>Encuestas</th>
                    <th>Zonas</th>
                    <th>Necesidades frecuentes</th>
                    <th>Últimas fechas</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.encuestadores.map((enc) => (
                    <tr key={enc.id}>
                      <td>{enc.nombre}</td>
                      <td>{enc.total_encuestas}</td>
                      <td className="text-wrap" style={{ maxWidth: 200 }}>{enc.zonas.join(", ")}</td>
                      <td>
                        {enc.necesidades_top.map((n) => (
                          <span className="badge badge-light mr-1" key={`${enc.id}-${n.nombre}`}>
                            {n.nombre} ({n.total})
                          </span>
                        ))}
                      </td>
                      <td>
                        {enc.serie.slice(-3).map((punto) => (
                          <span className="badge badge-primary mr-1" key={`${enc.id}-${punto.fecha}`}>
                            {punto.fecha}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 d-flex justify-content-between align-items-center flex-wrap">
            <small className="text-muted">Generado el {new Date(reporte.generado_en).toLocaleString()}</small>
            <small className="text-muted">Reporte confidencial - Uso institucional</small>
          </div>
        </>
      )}
    </div>
  );
};

export default UnifiedReportPage;
