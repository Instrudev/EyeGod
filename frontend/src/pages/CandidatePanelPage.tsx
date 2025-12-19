import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";

interface CandidateDashboard {
  total_registros: number;
  votantes_validos: number;
  votantes_potenciales: number;
  cobertura_municipios: CandidateMunicipio[];
  ranking_lideres: LeaderRanking[];
  alertas: CandidateAlert[];
}

interface CandidateMunicipio {
  municipio_id: number;
  municipio_nombre: string;
  lat?: number | null;
  lon?: number | null;
  total_registros: number;
  votantes_validos: number;
  votantes_potenciales: number;
  cumplimiento_porcentaje: number;
}

interface LeaderRanking {
  lider_id: number;
  lider_nombre: string;
  meta_votantes: number;
  votantes_validos: number;
  cumplimiento_porcentaje: number;
  score_confiabilidad: number;
}

interface CandidateAlert {
  tipo: string;
  nivel: string;
  leader_id: number;
  leader_nombre: string;
  mensaje: string;
  fecha_evaluacion?: string;
}

const CandidatePanelPage = () => {
  const [data, setData] = useState<CandidateDashboard | null>(null);
  const [alerts, setAlerts] = useState<CandidateAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardRes, alertsRes] = await Promise.all([
        api.get<CandidateDashboard>("/dashboard/candidato/"),
        api.get<CandidateAlert[]>("/dashboard/alertas/"),
      ]);
      setData(dashboardRes.data);
      setAlerts(alertsRes.data);
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar el tablero del candidato.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const coverage = data?.cobertura_municipios ?? [];
  const mapCenter = useMemo(() => {
    const withCoords = coverage.find((c) => c.lat && c.lon);
    if (withCoords && withCoords.lat && withCoords.lon) {
      return [Number(withCoords.lat), Number(withCoords.lon)] as [number, number];
    }
    return [6.2476, -75.5658] as [number, number];
  }, [coverage]);

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 70) return "#28a745";
    if (percentage >= 40) return "#ffc107";
    return "#dc3545";
  };

  return (
    <div className="pb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h1 className="h4 font-weight-bold mb-0">Tablero del candidato</h1>
          <p className="text-muted mb-0">
            Indicadores consolidados de avance, confiabilidad y cobertura territorial.
          </p>
        </div>
        {loading && <span className="badge badge-info">Cargando...</span>}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="row mb-3">
            <div className="col-md-3 col-12 mb-2">
              <div className="card border-left-primary h-100">
                <div className="card-body">
                  <p className="text-muted mb-1">Votantes válidos</p>
                  <h3 className="mb-0">{data.votantes_validos}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-12 mb-2">
              <div className="card border-left-warning h-100">
                <div className="card-body">
                  <p className="text-muted mb-1">Votantes potenciales</p>
                  <h3 className="mb-0">{data.votantes_potenciales}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-12 mb-2">
              <div className="card border-left-info h-100">
                <div className="card-body">
                  <p className="text-muted mb-1">Total registros</p>
                  <h3 className="mb-0">{data.total_registros}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-12 mb-2">
              <div className="card border-left-success h-100">
                <div className="card-body">
                  <p className="text-muted mb-1">Cobertura territorial</p>
                  <h3 className="mb-0">
                    {coverage.length
                      ? Math.round(
                          coverage.reduce((sum, item) => sum + item.cumplimiento_porcentaje, 0) / coverage.length
                        )
                      : 0}
                    %
                  </h3>
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-lg-7 col-12 mb-3">
              <div className="card h-100">
                <div className="card-header">
                  <h3 className="card-title mb-0">Cobertura por municipio</h3>
                </div>
                <div className="card-body">
                  {coverage.length === 0 && (
                    <div className="text-muted">No hay cobertura registrada aún.</div>
                  )}
                  {coverage.length > 0 && (
                    <MapContainer center={mapCenter} zoom={9} style={{ height: "320px", width: "100%" }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {coverage.map((item) =>
                        item.lat && item.lon ? (
                          <CircleMarker
                            key={item.municipio_id}
                            center={[Number(item.lat), Number(item.lon)]}
                            radius={14}
                            pathOptions={{ color: getCoverageColor(item.cumplimiento_porcentaje) }}
                          >
                            <Popup>
                              <strong>{item.municipio_nombre}</strong>
                              <br />
                              Válidos: {item.votantes_validos}
                              <br />
                              Potenciales: {item.votantes_potenciales}
                              <br />
                              Total: {item.total_registros}
                            </Popup>
                          </CircleMarker>
                        ) : null
                      )}
                    </MapContainer>
                  )}
                </div>
              </div>
            </div>
            <div className="col-lg-5 col-12 mb-3">
              <div className="card h-100">
                <div className="card-header">
                  <h3 className="card-title mb-0">Alertas del sistema</h3>
                </div>
                <div className="card-body">
                  {alerts.length === 0 && (
                    <div className="text-muted">Sin alertas activas.</div>
                  )}
                  {alerts.length > 0 && (
                    <ul className="list-group list-group-flush">
                      {alerts.map((alerta, index) => (
                        <li key={`${alerta.tipo}-${alerta.leader_id}-${index}`} className="list-group-item d-flex justify-content-between">
                          <span>{alerta.mensaje}</span>
                          <span className="badge badge-secondary">{alerta.nivel}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title mb-0">Ranking de líderes</h3>
            </div>
            <div className="card-body table-responsive">
              {data.ranking_lideres.length === 0 ? (
                <div className="text-muted">No hay líderes con registros todavía.</div>
              ) : (
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Líder</th>
                      <th>Meta</th>
                      <th>Válidos</th>
                      <th>% cumplimiento</th>
                      <th>Score confiabilidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ranking_lideres.map((leader) => (
                      <tr key={leader.lider_id}>
                        <td>{leader.lider_nombre}</td>
                        <td>{leader.meta_votantes}</td>
                        <td>{leader.votantes_validos}</td>
                        <td>{leader.cumplimiento_porcentaje}%</td>
                        <td>{leader.score_confiabilidad}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CandidatePanelPage;
