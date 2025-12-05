import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Collaborator {
  id: number;
  name: string;
  email: string;
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

interface Asignacion {
  id: number;
  colaborador_id: number;
  colaborador_nombre: string;
  zona_id: number;
  zona_nombre: string;
  zona_tipo?: string;
  municipio_id: number;
  municipio_nombre: string;
}

const AssignmentsPage = () => {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [zones, setZones] = useState<ZonaOption[]>([]);
  const [assignments, setAssignments] = useState<Asignacion[]>([]);
  const [selectedCollaborator, setSelectedCollaborator] = useState("");
  const [selectedMunicipio, setSelectedMunicipio] = useState("");
  const [alert, setAlert] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [showZonaCreator, setShowZonaCreator] = useState(false);
  const [newZonaNombre, setNewZonaNombre] = useState("");
  const [newZonaTipo, setNewZonaTipo] = useState("VEREDA");
  const [creatingZona, setCreatingZona] = useState(false);

  const isLeaderOrAdmin = user?.role === "ADMIN" || user?.role === "LIDER";
  const isLeader = user?.role === "LIDER";

  useEffect(() => {
    const loadBaseData = async () => {
      setError(null);
      try {
        const { data: collabData } = await api.get<Collaborator[]>("/usuarios/", {
          params: { role: "COLABORADOR" },
        });
        const muniRequest = isLeader
          ? api.get<Municipio[]>(`/usuarios/${user?.id}/municipios/`)
          : api.get<Municipio[]>("/municipios/");
        const [muniRes] = await Promise.all([muniRequest]);

        setCollaborators(
          isLeader
            ? collabData.filter((col) => col.id !== user?.id)
            : collabData
        );
        setMunicipios(muniRes.data);
        if (isLeader && muniRes.data.length === 0) {
          setError("Tu usuario aún no tiene municipios asignados por el administrador.");
        }
        if (!selectedMunicipio && muniRes.data.length > 0) {
          setSelectedMunicipio(String(muniRes.data[0].id));
        }
      } catch (err) {
        console.error(err);
        setError("No fue posible cargar la información base");
      }
    };
    if (isLeaderOrAdmin) {
      loadBaseData();
    }
  }, [isLeader, isLeaderOrAdmin, user?.id]);

  const filteredZones = useMemo(() => {
    if (!selectedMunicipio) return zones;
    return zones.filter((z) => z.municipio?.id === Number(selectedMunicipio));
  }, [zones, selectedMunicipio]);

  useEffect(() => {
    const fetchZones = async () => {
      setError(null);
      try {
        const { data } = await api.get<ZonaOption[]>("/zonas/", {
          params: selectedMunicipio ? { municipio: selectedMunicipio } : undefined,
        });
        setZones(data);
      } catch (err) {
        console.error(err);
        setError("No fue posible cargar las zonas para el municipio seleccionado");
      }
    };

    if (isLeaderOrAdmin) {
      fetchZones();
    }
  }, [isLeaderOrAdmin, selectedMunicipio]);

  const loadAssignments = async (colabId: string) => {
    if (!colabId) {
      setAssignments([]);
      return;
    }
    setLoadingAssignments(true);
    setAlert(null);
    setError(null);
    try {
      const { data } = await api.get<Asignacion[]>("/asignaciones/", {
        params: {
          colaborador: colabId,
          municipio: selectedMunicipio || undefined,
        },
      });
      setAssignments(data);
    } catch (err) {
      console.error(err);
      setError("No fue posible obtener las asignaciones");
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    loadAssignments(selectedCollaborator);
  }, [selectedCollaborator, selectedMunicipio]);

  const handleToggleAssignment = async (zonaId: number) => {
    if (!selectedCollaborator) {
      setError("Selecciona un colaborador para asignar zonas");
      return;
    }
    const existing = assignments.find((a) => a.zona_id === zonaId);
    setError(null);
    setAlert(null);
    try {
      if (existing) {
        await api.delete(`/asignaciones/${existing.id}/`);
        setAssignments((prev) => prev.filter((a) => a.id !== existing.id));
        setAlert("Asignación eliminada");
      } else {
        const { data } = await api.post<Asignacion>("/asignaciones/", {
          colaborador_id: Number(selectedCollaborator),
          zona_id: zonaId,
        });
        setAssignments((prev) => [...prev, data]);
        setAlert("Zona asignada correctamente");
      }
    } catch (err) {
      console.error(err);
      setError("No fue posible actualizar la asignación");
    }
  };

  const handleCreateZona = async () => {
    if (!selectedMunicipio) {
      setError("Selecciona un municipio antes de crear la zona");
      return;
    }
    if (!newZonaNombre.trim()) {
      setError("El nombre de la zona es obligatorio");
      return;
    }
    setCreatingZona(true);
    setError(null);
    setAlert(null);
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
      setNewZonaNombre("");
      setNewZonaTipo("VEREDA");
      setShowZonaCreator(false);
      setAlert("Zona creada correctamente");
      if (selectedCollaborator) {
        const assignRes = await api.post<Asignacion>("/asignaciones/", {
          colaborador_id: Number(selectedCollaborator),
          zona_id: data.id,
        });
        setAssignments((prev) => [...prev, assignRes.data]);
        setAlert("Zona creada y asignada");
      }
    } catch (err) {
      console.error(err);
      setError("No fue posible crear la zona");
    } finally {
      setCreatingZona(false);
    }
  };

  if (!isLeaderOrAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 font-weight-bold mb-0">Asignar zonas a colaboradores</h1>
          <p className="text-muted mb-0">
            Define en qué municipios y zonas pueden diligenciar encuestas los colaboradores.
          </p>
        </div>
        {loadingAssignments && <span className="badge badge-info">Actualizando...</span>}
      </div>

      {alert && <div className="alert alert-success py-2">{alert}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card card-primary card-outline mb-3">
        <div className="card-body">
          <div className="form-row">
            <div className="form-group col-md-6">
              <label>Colaborador</label>
              <select
                className="form-control"
                value={selectedCollaborator}
                onChange={(e) => {
                  setSelectedCollaborator(e.target.value);
                  setAssignments([]);
                  setAlert(null);
                }}
              >
                <option value="">Selecciona un colaborador</option>
                {collaborators.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} ({col.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-6">
              <label>Filtrar zonas por municipio</label>
              <div className="d-flex align-items-center" style={{ gap: "0.5rem" }}>
                <select
                  className="form-control"
                  value={selectedMunicipio}
                  onChange={(e) => {
                    setSelectedMunicipio(e.target.value);
                    setShowZonaCreator(false);
                  }}
                >
                  <option value="">Todos los municipios</option>
                  {municipios.map((muni) => (
                    <option key={muni.id} value={muni.id}>
                      {muni.nombre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-link p-0"
                  onClick={() => setShowZonaCreator((prev) => !prev)}
                  disabled={!selectedMunicipio}
                >
                  <i className="fas fa-plus mr-1" /> {showZonaCreator ? "Cerrar" : "Crear zona"}
                </button>
              </div>
            </div>
          </div>

          {showZonaCreator && (
            <div className="alert alert-info">
              <div className="d-flex flex-wrap align-items-center" style={{ gap: "0.5rem" }}>
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
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreateZona}
                  disabled={creatingZona}
                >
                  <i className="fas fa-save mr-1" /> {creatingZona ? "Guardando..." : "Crear zona"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card card-outline card-secondary">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title mb-0">Zonas disponibles</h3>
          <span className="badge badge-light">{filteredZones.length} zonas</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive" style={{ maxHeight: 420 }}>
            <table className="table table-hover text-nowrap mb-0">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Asignar</th>
                  <th>Zona</th>
                  <th>Municipio</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {filteredZones.map((zona) => {
                  const isAssigned = assignments.some((a) => a.zona_id === zona.id);
                  return (
                    <tr key={zona.id}>
                      <td>
                        <div className="custom-control custom-switch">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id={`assign-${zona.id}`}
                            checked={isAssigned}
                            onChange={() => handleToggleAssignment(zona.id)}
                            disabled={!selectedCollaborator}
                          />
                          <label className="custom-control-label" htmlFor={`assign-${zona.id}`}>
                            {isAssigned ? "Sí" : "No"}
                          </label>
                        </div>
                      </td>
                      <td>{zona.nombre}</td>
                      <td>{zona.municipio?.nombre ?? "Sin municipio"}</td>
                      <td>{zona.tipo ?? "Zona"}</td>
                    </tr>
                  );
                })}
                {filteredZones.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-3">
                      No hay zonas para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card card-outline card-primary mt-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title mb-0">Zonas asignadas</h3>
          <span className="badge badge-light">{assignments.length}</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive" style={{ maxHeight: 320 }}>
            <table className="table table-striped table-hover mb-0">
              <thead>
                <tr>
                  <th>Zona</th>
                  <th>Municipio</th>
                  <th>Asignado a</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{assignment.zona_nombre}</td>
                    <td>{assignment.municipio_nombre}</td>
                    <td>{assignment.colaborador_nombre}</td>
                    <td className="text-right">
                      <button
                        className="btn btn-xs btn-link text-danger"
                        onClick={() => handleToggleAssignment(assignment.zona_id)}
                        disabled={!selectedCollaborator}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-3">
                      No hay asignaciones para este colaborador.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentsPage;
