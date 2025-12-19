import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface SurveyNeed {
  prioridad: number;
  necesidad: { id: number; nombre: string };
}

interface SurveyRow {
  id: number;
  zona: number;
  zona_nombre?: string;
  municipio_nombre?: string;
  colaborador_nombre?: string;
  fecha_hora: string;
  nombre_ciudadano?: string | null;
  cedula?: string | null;
  telefono: string;
  tipo_vivienda: string;
  rango_edad: string;
  ocupacion: string;
  caso_critico: boolean;
  necesidades: SurveyNeed[];
}

const SurveyDataPage = () => {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>("");

  useEffect(() => {
    const fetchSurveys = async () => {
      if (user?.role !== "ADMIN") return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<SurveyRow[]>("/encuestas/");
        setSurveys(data);
      } catch (err) {
        console.error(err);
        setError("No fue posible cargar las encuestas");
      } finally {
        setLoading(false);
      }
    };
    fetchSurveys();
  }, [user]);

  const municipiosDisponibles = useMemo(
    () =>
      Array.from(new Set(surveys.map((s) => s.municipio_nombre).filter(Boolean))) as string[],
    [surveys]
  );

  const filteredSurveys = useMemo(() => {
    if (!selectedMunicipio) return surveys;
    return surveys.filter((s) => s.municipio_nombre === selectedMunicipio);
  }, [selectedMunicipio, surveys]);

  if (user?.role !== "ADMIN") {
    return (
      <div className="alert alert-warning mt-3">Solo los administradores pueden consultar el consolidado de encuestas.</div>
    );
  }

  return (
    <div className="pb-5">
      <div className="row mb-3">
        <div className="col-12">
          <h1 className="h4 text-dark font-weight-bold">Consolidado de encuestas</h1>
          <p className="text-muted">Consulta y filtra la información capturada en territorio.</p>
        </div>
      </div>
      <div className="card card-primary card-outline">
        <div className="card-header d-flex justify-content-between align-items-center flex-wrap">
          <h3 className="card-title mb-0">Listado de encuestas</h3>
          <div className="form-inline">
            <label className="mr-2 mb-0">Municipio</label>
            <select
              className="form-control"
              value={selectedMunicipio}
              onChange={(e) => setSelectedMunicipio(e.target.value)}
            >
              <option value="">Todos</option>
              {municipiosDisponibles.map((muni) => (
                <option key={muni} value={muni}>
                  {muni}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger py-2">{error}</div>}
          {loading ? (
            <p className="text-muted mb-0">Cargando encuestas...</p>
          ) : filteredSurveys.length === 0 ? (
            <p className="text-muted mb-0">No hay encuestas registradas para el filtro seleccionado.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Municipio</th>
                    <th>Zona</th>
                    <th>Colaborador</th>
                    <th>Ciudadano</th>
                    <th>Cédula</th>
                    <th>Teléfono</th>
                    <th>Necesidades priorizadas</th>
                    <th>Crítico</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSurveys.map((survey) => (
                    <tr key={survey.id}>
                      <td>{new Date(survey.fecha_hora).toLocaleString()}</td>
                      <td>{survey.municipio_nombre ?? "-"}</td>
                      <td>{survey.zona_nombre ?? survey.zona}</td>
                      <td>{survey.colaborador_nombre ?? "-"}</td>
                      <td>{survey.nombre_ciudadano || "-"}</td>
                      <td>{survey.cedula || "-"}</td>
                      <td>{survey.telefono}</td>
                      <td>
                        <ul className="list-unstyled mb-0">
                          {survey.necesidades.map((need, idx) => (
                            <li key={`${survey.id}-${idx}`}>
                              <strong>{need.prioridad}.</strong> {need.necesidad?.nombre}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td>{survey.caso_critico ? "Sí" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyDataPage;
