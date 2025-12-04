import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Ruta {
  id: number;
  nombre_ruta: string;
  estado: string;
  avance: number;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  ruta_zonas: { zona: { id: number; nombre: string; meta?: { meta_encuestas: number } } }[];
}

interface Municipio {
  id: number;
  nombre: string;
}

interface ZonaOption {
  id: number;
  nombre: string;
  tipo?: string;
  municipio?: Municipio;
}

const RoutesPage = () => {
  const { user } = useAuth();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<ZonaOption[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [selectedMunicipio, setSelectedMunicipio] = useState("");
  const [nombreRuta, setNombreRuta] = useState("");
  const [selectedZonas, setSelectedZonas] = useState<number[]>([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [showZonaCreator, setShowZonaCreator] = useState(false);
  const [newZonaNombre, setNewZonaNombre] = useState("");
  const [newZonaTipo, setNewZonaTipo] = useState("VEREDA");
  const [creatingZona, setCreatingZona] = useState(false);
  const [zonesMessage, setZonesMessage] = useState<string | null>(null);
  const [zonesError, setZonesError] = useState<string | null>(null);

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

  const filteredZones = useMemo(() => {
    if (!selectedMunicipio) return zones;
    return zones.filter((z) => z.municipio?.id === Number(selectedMunicipio));
  }, [selectedMunicipio, zones]);

  useEffect(() => {
    const loadTerritory = async () => {
      if (user?.role === "LIDER" || user?.role === "ADMIN") {
        try {
          const [zonesRes, muniRes] = await Promise.all([
            api.get<ZonaOption[]>("/zonas/"),
            api.get<Municipio[]>("/municipios/"),
          ]);
          setZones(zonesRes.data);
          setMunicipios(muniRes.data);
        } catch (err) {
          console.error(err);
        }
      }
    };
    loadTerritory();
  }, [user]);

  useEffect(() => {
    if (!selectedMunicipio) {
      setShowZonaCreator(false);
      return;
    }
    if (filteredZones.length === 0) {
      setShowZonaCreator(true);
    }
  }, [filteredZones, selectedMunicipio]);

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
      const payload = {
        nombre_ruta: nombreRuta,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        ruta_zonas: selectedZonas.map((zonaId) => ({ zona_id: zonaId })),
      };

      if (editingRouteId) {
        await api.patch(`/rutas/${editingRouteId}/`, payload);
        setFormMessage("Ruta actualizada correctamente");
      } else {
        await api.post("/rutas/", payload);
        setFormMessage("Ruta creada correctamente");
      }

      setNombreRuta("");
      setSelectedZonas([]);
      setSelectedMunicipio("");
      setFechaInicio("");
      setFechaFin("");
      setEditingRouteId(null);
      const endpoint = user?.role === "COLABORADOR" ? "/rutas/mis-rutas/" : "/rutas/";
      const { data } = await api.get<Ruta[]>(endpoint);
      setRutas(data);
    } catch (err) {
      console.error(err);
      setFormError("No fue posible guardar la ruta. Verifica la información");
    } finally {
      setSaving(false);
    }
  };

  const toggleZonaSelection = (zonaId: number) => {
    setSelectedZonas((prev) =>
      prev.includes(zonaId) ? prev.filter((id) => id !== zonaId) : [...prev, zonaId]
    );
  };

  const handleCreateZona = async () => {
    if (!selectedMunicipio) {
      setZonesError("Selecciona un municipio para crear la zona");
      return;
    }
    if (!newZonaNombre.trim()) {
      setZonesError("El nombre de la zona es obligatorio");
      return;
    }
    setCreatingZona(true);
    setZonesError(null);
    setZonesMessage(null);
    try {
      const payload = {
        nombre: newZonaNombre,
        tipo: newZonaTipo,
        municipio_id: Number(selectedMunicipio),
        lat: null,
        lon: null,
      };
      const { data } = await api.post<ZonaOption>("/zonas/", payload);
      setZones((prev) => [...prev, data]);
      setZonesMessage("Zona creada correctamente");
      setNewZonaNombre("");
      setNewZonaTipo("VEREDA");
      setShowZonaCreator(false);
      setSelectedZonas((prev) => [...prev, data.id]);
    } catch (err) {
      console.error(err);
      setZonesError("No fue posible crear la zona");
    } finally {
      setCreatingZona(false);
    }
  };

  const startEditing = (ruta: Ruta) => {
    setEditingRouteId(ruta.id);
    setNombreRuta(ruta.nombre_ruta);
    setFechaInicio(ruta.fecha_inicio ?? "");
    setFechaFin(ruta.fecha_fin ?? "");
    setSelectedZonas(ruta.ruta_zonas.map((rz) => rz.zona.id));
    setSelectedMunicipio("");
    setFormMessage(null);
    setFormError(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Eliminar esta ruta?")) return;
    try {
      await api.delete(`/rutas/${id}/`);
      setRutas((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
      setRoutesError("No fue posible eliminar la ruta");
    }
  };

  return (
    <div className="pb-5">
      <div className="row mb-3">
        <div className="col-12">
          <h1 className="h4 text-dark font-weight-bold">Planificador de rutas</h1>
          <p className="text-muted">Consulta el avance y gestiona nuevas visitas territoriales.</p>
        </div>
      </div>

      {(user?.role === "LIDER" || user?.role === "ADMIN") && (
        <div className="row">
          <div className="col-lg-8">
            <div className="card card-primary card-outline">
              <div className="card-header">
                <h3 className="card-title">{editingRouteId ? "Editar ruta" : "Crear nueva ruta"}</h3>
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
                  <div className="form-row align-items-end">
                    <div className="form-group col-md-6">
                      <label>Filtrar zonas por municipio</label>
                      <select
                        className="form-control"
                        value={selectedMunicipio}
                        onChange={(e) => {
                          setSelectedMunicipio(e.target.value);
                          setZonesError(null);
                          setZonesMessage(null);
                        }}
                      >
                        <option value="">Todos los municipios</option>
                        {municipios.map((muni) => (
                          <option key={muni.id} value={muni.id}>
                            {muni.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group col-md-6 d-flex justify-content-end">
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() => setShowZonaCreator((prev) => !prev)}
                        disabled={!selectedMunicipio}
                      >
                        <i className="fas fa-plus mr-1" />
                        {showZonaCreator ? "Cerrar creador de zona" : "Crear zona en este municipio"}
                      </button>
                    </div>
                  </div>
                  {showZonaCreator && (
                    <div className="alert alert-info">
                      <div className="d-flex flex-wrap align-items-center" style={{ gap: "0.5rem" }}>
                        <span className="mr-2">Nueva zona para el municipio seleccionado:</span>
                        <input
                          className="form-control"
                          placeholder="Nombre de la zona"
                          value={newZonaNombre}
                          onChange={(e) => setNewZonaNombre(e.target.value)}
                          style={{ minWidth: 180 }}
                        />
                        <select
                          className="form-control"
                          value={newZonaTipo}
                          onChange={(e) => setNewZonaTipo(e.target.value)}
                        >
                          <option value="VEREDA">Vereda</option>
                          <option value="BARRIO">Barrio</option>
                          <option value="COMUNA">Comuna</option>
                          <option value="CORREGIMIENTO">Corregimiento</option>
                        </select>
                        <button type="button" className="btn btn-primary" onClick={handleCreateZona} disabled={creatingZona}>
                          <i className="fas fa-save mr-1" /> {creatingZona ? "Guardando..." : "Agregar zona"}
                        </button>
                      </div>
                      {!selectedMunicipio && (
                        <small className="text-muted d-block mt-2">Debes elegir un municipio para guardar la zona.</small>
                      )}
                    </div>
                  )}
                  {zonesMessage && <div className="alert alert-success py-2">{zonesMessage}</div>}
                  {zonesError && <div className="alert alert-danger py-2">{zonesError}</div>}
                  <div className="form-group">
                    <label className="d-block">Zonas disponibles</label>
                    {filteredZones.length === 0 ? (
                      <div className="alert alert-light border">No hay zonas para este municipio. Usa el botón “Crear zona en este municipio”.</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm table-hover">
                          <thead>
                            <tr>
                              <th style={{ width: 50 }}>Asignar</th>
                              <th>Zona</th>
                              <th>Municipio</th>
                              <th>Tipo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredZones.map((zona) => (
                              <tr key={zona.id}>
                                <td>
                                  <input
                                    type="checkbox"
                                    className="form-control"
                                    checked={selectedZonas.includes(zona.id)}
                                    onChange={() => toggleZonaSelection(zona.id)}
                                  />
                                </td>
                                <td>{zona.nombre}</td>
                                <td>{zona.municipio?.nombre ?? "Sin municipio"}</td>
                                <td>{zona.tipo ?? "Zona"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <small className="form-text text-muted">Selecciona al menos una zona para guardar la ruta.</small>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <i className="fas fa-save mr-1" /> {saving ? "Guardando..." : editingRouteId ? "Actualizar" : "Guardar ruta"}
                  </button>
                  {editingRouteId && (
                    <button
                      type="button"
                      className="btn btn-default ml-2"
                      onClick={() => {
                        setEditingRouteId(null);
                        setNombreRuta("");
                        setSelectedZonas([]);
                        setFechaInicio("");
                        setFechaFin("");
                        setFormMessage(null);
                        setFormError(null);
                      }}
                    >
                      Cancelar
                    </button>
                  )}
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
                          {(user?.role === "LIDER" || user?.role === "ADMIN") && (
                            <div className="mt-2 d-flex justify-content-end">
                              <button className="btn btn-sm btn-outline-primary mr-2" onClick={() => startEditing(ruta)}>
                                <i className="fas fa-edit mr-1" /> Editar
                              </button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(ruta.id)}>
                                <i className="fas fa-trash mr-1" /> Eliminar
                              </button>
                            </div>
                          )}
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
