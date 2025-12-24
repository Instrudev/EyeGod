import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface FilterOption {
  id?: number;
  puesto?: string;
}

interface ReportFilters {
  departamentos: string[];
  municipios: string[];
  puestos: FilterOption[];
}

interface MesaDetalle {
  mesa: number;
  estado: string;
  testigo_nombre?: string | null;
  testigo_email?: string | null;
  enviado_en?: string | null;
  resultado_id?: number | null;
}

interface ReportRow {
  puesto_id: number;
  puesto: string;
  municipio: string;
  departamento: string;
  total_mesas_asignadas: number;
  total_enviadas: number;
  total_pendientes: number;
  total_incidencias: number;
  mesas_detalle: MesaDetalle[];
}

interface Totales {
  total_mesas_asignadas: number;
  total_enviadas: number;
  total_pendientes: number;
  total_incidencias: number;
}

const PAGE_SIZE = 10;

const AdminReportStatsPage = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ReportFilters>({
    departamentos: [],
    municipios: [],
    puestos: [],
  });
  const [departamento, setDepartamento] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [puestoId, setPuestoId] = useState("");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof ReportRow>("puesto");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const loadFilters = async (dept?: string, muni?: string) => {
    const params: Record<string, string> = {};
    if (dept) params.departamento = dept;
    if (muni) params.municipio = muni;
    const { data } = await api.get<ReportFilters>("/dashboard/reportes-filtros/", { params });
    setFilters(data);
  };

  const loadStats = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const params: Record<string, string> = {};
      if (departamento) params.departamento = departamento;
      if (municipio) params.municipio = municipio;
      if (puestoId) params.puesto_id = puestoId;
      const { data } = await api.get<{ totales: Totales; filas: ReportRow[] }>(
        "/dashboard/estadisticas-reportes/",
        { params }
      );
      setTotales(data.totales);
      setRows(data.filas);
    } catch (err) {
      console.error(err);
      setAlert("No fue posible cargar las estadísticas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadFilters(departamento || undefined, municipio || undefined);
    setMunicipio("");
    setPuestoId("");
  }, [departamento]);

  useEffect(() => {
    loadFilters(departamento || undefined, municipio || undefined);
    setPuestoId("");
  }, [municipio]);

  useEffect(() => {
    loadStats();
    setPage(1);
  }, [departamento, municipio, puestoId]);

  const sortedRows = useMemo(() => {
    const next = [...rows];
    next.sort((a, b) => {
      const valueA = a[sortKey];
      const valueB = b[sortKey];
      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }
      return sortDirection === "asc"
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });
    return next;
  }, [rows, sortKey, sortDirection]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [page, sortedRows]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));

  const toggleSort = (key: keyof ReportRow) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 font-weight-bold mb-0">Estadísticas de reportes electorales</h1>
          <p className="text-muted mb-0">Seguimiento de reportes enviados por testigos electorales.</p>
        </div>
        {loading && <span className="badge badge-info">Cargando...</span>}
      </div>

      {alert && (
        <div className="alert alert-danger" role="alert">
          {alert}
        </div>
      )}

      <div className="card card-outline card-primary mb-3">
        <div className="card-header">
          <h3 className="card-title mb-0">Filtros</h3>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4 col-12 mb-2">
              <label className="text-muted small">Departamento</label>
              <select
                className="form-control"
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
              >
                <option value="">Todos</option>
                {filters.departamentos.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4 col-12 mb-2">
              <label className="text-muted small">Municipio</label>
              <select
                className="form-control"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
              >
                <option value="">Todos</option>
                {filters.municipios.map((mun) => (
                  <option key={mun} value={mun}>
                    {mun}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4 col-12 mb-2">
              <label className="text-muted small">Puesto</label>
              <select className="form-control" value={puestoId} onChange={(e) => setPuestoId(e.target.value)}>
                <option value="">Todos</option>
                {filters.puestos.map((puesto) => (
                  <option key={puesto.id} value={puesto.id}>
                    {puesto.puesto}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {totales && (
        <div className="row mb-3">
          <div className="col-lg-3 col-6 mb-2">
            <div className="small-box bg-primary">
              <div className="inner">
                <h3>{totales.total_mesas_asignadas}</h3>
                <p>Mesas asignadas</p>
              </div>
              <div className="icon">
                <i className="fas fa-table" />
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-6 mb-2">
            <div className="small-box bg-success">
              <div className="inner">
                <h3>{totales.total_enviadas}</h3>
                <p>Reportes enviados</p>
              </div>
              <div className="icon">
                <i className="fas fa-check-circle" />
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-6 mb-2">
            <div className="small-box bg-warning">
              <div className="inner">
                <h3>{totales.total_pendientes}</h3>
                <p>Reportes pendientes</p>
              </div>
              <div className="icon">
                <i className="fas fa-hourglass-half" />
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-6 mb-2">
            <div className="small-box bg-danger">
              <div className="inner">
                <h3>{totales.total_incidencias}</h3>
                <p>Incidencias</p>
              </div>
              <div className="icon">
                <i className="fas fa-exclamation-triangle" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card card-outline card-secondary">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title mb-0">Resumen por puesto</h3>
          <span className="text-muted small">
            Página {page} de {totalPages}
          </span>
        </div>
        <div className="card-body p-0 table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th onClick={() => toggleSort("departamento")} role="button">
                  Departamento
                </th>
                <th onClick={() => toggleSort("municipio")} role="button">
                  Municipio
                </th>
                <th onClick={() => toggleSort("puesto")} role="button">
                  Puesto
                </th>
                <th onClick={() => toggleSort("total_mesas_asignadas")} role="button">
                  Asignadas
                </th>
                <th onClick={() => toggleSort("total_enviadas")} role="button">
                  Enviadas
                </th>
                <th onClick={() => toggleSort("total_pendientes")} role="button">
                  Pendientes
                </th>
                <th onClick={() => toggleSort("total_incidencias")} role="button">
                  Incidencias
                </th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row) => (
                <tbody key={row.puesto_id}>
                  <tr>
                    <td>{row.departamento}</td>
                    <td>{row.municipio}</td>
                    <td>{row.puesto}</td>
                    <td>{row.total_mesas_asignadas}</td>
                    <td>{row.total_enviadas}</td>
                    <td>{row.total_pendientes}</td>
                    <td>{row.total_incidencias}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [row.puesto_id]: !prev[row.puesto_id],
                          }))
                        }
                      >
                        {expanded[row.puesto_id] ? "Ocultar" : "Ver"}
                      </button>
                    </td>
                  </tr>
                  {expanded[row.puesto_id] && (
                    <tr>
                      <td colSpan={8} className="bg-light">
                        <div className="table-responsive">
                          <table className="table table-sm mb-0">
                            <thead>
                              <tr>
                                <th>Mesa</th>
                                <th>Estado</th>
                                <th>Testigo</th>
                                <th>Hora reporte</th>
                                <th>Resultados</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.mesas_detalle.map((mesa) => (
                                <tr key={`${row.puesto_id}-${mesa.mesa}`}>
                                  <td>Mesa {mesa.mesa}</td>
                                  <td>{mesa.estado}</td>
                                  <td>
                                    {mesa.testigo_nombre ? (
                                      <>
                                        {mesa.testigo_nombre}
                                        <div className="text-muted small">{mesa.testigo_email}</div>
                                      </>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                  <td>{mesa.enviado_en ? new Date(mesa.enviado_en).toLocaleString() : "-"}</td>
                                  <td>{mesa.resultado_id ? `Resultado #${mesa.resultado_id}` : "-"}</td>
                                </tr>
                              ))}
                              {!row.mesas_detalle.length && (
                                <tr>
                                  <td colSpan={5} className="text-muted text-center">
                                    Sin mesas asignadas en este puesto.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              ))}
              {!paginatedRows.length && (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    No hay información para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer d-flex justify-content-between align-items-center">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Anterior
          </button>
          <span className="text-muted small">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminReportStatsPage;
