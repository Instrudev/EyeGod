import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Ruta {
  id: number;
  nombre_ruta: string;
  estado: string;
  avance: number;
  ruta_zonas: { zona: { nombre: string; meta?: { meta_encuestas: number } } }[];
}

interface ZonaOption {
  id: number;
  nombre: string;
}

const RoutesPage = () => {
  const { user } = useAuth();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<ZonaOption[]>([]);
  const [nombreRuta, setNombreRuta] = useState("");
  const [selectedZonas, setSelectedZonas] = useState<number[]>([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setRoutesError(null);
      try {
        const endpoint = user?.role === "COLABORADOR" ? "/rutas/mis-rutas/" : "/rutas/";
        const { data } = await api.get<Ruta[]>(endpoint);
        setRutas(data);
      } catch (err) {
        console.error(err);
        setRoutesError("No fue posible cargar las rutas");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    const loadZones = async () => {
      if (user?.role === "LIDER" || user?.role === "ADMIN") {
        try {
          const { data } = await api.get<ZonaOption[]>("/zonas/");
          setZones(data);
        } catch (err) {
          console.error(err);
        }
      }
    };
    loadZones();
  }, [user]);

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);
    if (!nombreRuta.trim()) {
      setFormError("El nombre de la ruta es obligatorio");
      return;
    }
    if (!selectedZonas.length) {
      setFormError("Selecciona al menos una zona");
      return;
    }
    setSaving(true);
    setFormError(null);
    setFormMessage(null);
    try {
      await api.post("/rutas/", {
        nombre_ruta: nombreRuta,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        ruta_zonas: selectedZonas.map((zonaId) => ({ zona_id: zonaId })),
      });
      setFormMessage("Ruta creada correctamente");
      setNombreRuta("");
      setSelectedZonas([]);
      setFechaInicio("");
      setFechaFin("");
      const endpoint = user?.role === "COLABORADOR" ? "/rutas/mis-rutas/" : "/rutas/";
      const { data } = await api.get<Ruta[]>(endpoint);
      setRutas(data);
    } catch (err) {
      console.error(err);
      setFormError("No fue posible crear la ruta. Verifica la información");
    } finally {
      setSaving(false);
    }
  };

  const handleZoneSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(event.target.selectedOptions).map((opt) => Number(opt.value));
    setSelectedZonas(options);
  };

  return (
    <div className="pb-5">
      <div className="row mb-3">
        <div className="col-12">
          <h1 className="h4 text-dark font-weight-bold">Planificador de rutas</h1>
          <p className="text-muted">Consulta el avance y gestiona nuevas visitas territoriales.</p>
        </div>
      </div>

      {user?.role === "LIDER" && (
        <div className="row">
          <div className="col-lg-8">
            <div className="card card-primary card-outline">
              <div className="card-header">
                <h3 className="card-title">Crear nueva ruta</h3>
              </div>
              <div className="card-body">
                {formMessage && <div className="alert alert-success py-2">{formMessage}</div>}
                {formError && <div className="alert alert-danger py-2">{formError}</div>}
                <form onSubmit={handleCreateRoute}>
                  <div className="form-group">
                    <label>Nombre de la ruta</label>
                    <input
                      className="form-control"
                      value={nombreRuta}
                      onChange={(e) => setNombreRuta(e.target.value)}
                      placeholder="Recorrido Norte"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <label>Fecha inicio</label>
                      <input type="date" className="form-control" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                    </div>
                    <div className="form-group col-md-6">
                      <label>Fecha fin</label>
                      <input type="date" className="form-control" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Zonas asignadas</label>
                    <select className="form-control" multiple value={selectedZonas.map(String)} onChange={handleZoneSelect} size={Math.min(8, zones.length || 4)}>
                      {zones.map((zona) => (
                        <option key={zona.id} value={zona.id}>
                          {zona.nombre}
                        </option>
                      ))}
                    </select>
                    <small className="form-text text-muted">Mantén presionada la tecla CTRL para seleccionar varias zonas.</small>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <i className="fas fa-save mr-1" /> {saving ? "Guardando..." : "Guardar ruta"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row mt-3">
        <div className="col-12">
          <div className="card card-outline card-secondary">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title mb-0">Rutas activas</h3>
              <button
                className="btn btn-default btn-sm"
                type="button"
                onClick={async () => {
                  setLoading(true);
                  setRoutesError(null);
                  try {
                    const endpoint = user?.role === "COLABORADOR" ? "/rutas/mis-rutas/" : "/rutas/";
                    const { data } = await api.get<Ruta[]>(endpoint);
                    setRutas(data);
                  } catch (err) {
                    console.error(err);
                    setRoutesError("No fue posible actualizar las rutas");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <i className="fas fa-sync-alt mr-1" /> Refrescar
              </button>
            </div>
            <div className="card-body">
              {routesError && <div className="alert alert-danger py-2">{routesError}</div>}
              {loading ? (
                <p className="text-muted mb-0">Cargando rutas...</p>
              ) : rutas.length === 0 ? (
                <p className="text-muted mb-0">No hay rutas registradas.</p>
              ) : (
                <div className="row">
                  {rutas.map((ruta) => (
                    <div className="col-lg-6" key={ruta.id}>
                      <div className="card shadow-sm mb-3">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h5 className="card-title mb-1">{ruta.nombre_ruta}</h5>
                              <span className={`badge ${getEstadoBadge(ruta.estado)}`}>{ruta.estado}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-muted text-sm">Avance</span>
                              <div className="progress progress-sm mt-1" style={{ width: 140 }}>
                                <div className="progress-bar bg-primary" style={{ width: `${Math.min(ruta.avance, 100)}%` }} />
                              </div>
                              <small>{ruta.avance}%</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <h6 className="text-muted">Zonas</h6>
                            <ul className="list-unstyled mb-0">
                              {ruta.ruta_zonas.map((item, idx) => (
                                <li key={`${ruta.id}-${idx}`} className="d-flex justify-content-between border-bottom py-1">
                                  <span>{item.zona.nombre}</span>
                                  <small className="text-muted">
                                    Meta: {item.zona.meta?.meta_encuestas ?? 0}
                                  </small>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case "COMPLETADA":
      return "badge-success";
    case "EN_CURSO":
      return "badge-warning";
    default:
      return "badge-secondary";
  }
};

export default RoutesPage;
