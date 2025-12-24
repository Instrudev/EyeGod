import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Municipio {
  id: number;
  nombre: string;
}

interface Coordinator {
  id: number;
  name: string;
  email: string;
  telefono?: string | null;
  role: string;
  is_active: boolean;
  municipio_operacion_id?: number | null;
  municipio_operacion_nombre?: string | null;
}

const CoordinatorsPage = () => {
  const { user } = useAuth();
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    primer_nombre: "",
    segundo_nombre: "",
    primer_apellido: "",
    segundo_apellido: "",
    telefono: "",
    municipio_operacion_id: "",
    email: "",
    password: "",
    is_active: true,
  });

  const fullName = useMemo(() => {
    return [
      form.primer_nombre,
      form.segundo_nombre,
      form.primer_apellido,
      form.segundo_apellido,
    ]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");
  }, [form.primer_nombre, form.segundo_nombre, form.primer_apellido, form.segundo_apellido]);

  const load = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const [coordinatorRes, municipioRes] = await Promise.all([
        api.get<Coordinator[]>("/usuarios/", { params: { role: "COORDINADOR_ELECTORAL" } }),
        api.get<Municipio[]>("/municipios/"),
      ]);
      setCoordinators(coordinatorRes.data.filter((u) => u.role === "COORDINADOR_ELECTORAL"));
      setMunicipios(municipioRes.data);
    } catch (err) {
      console.error(err);
      setAlert("No fue posible cargar los coordinadores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    if (!form.primer_nombre.trim() || !form.primer_apellido.trim()) {
      setAlert("Primer nombre y primer apellido son obligatorios.");
      return;
    }
    if (!form.telefono.trim()) {
      setAlert("El teléfono es obligatorio.");
      return;
    }
    if (!form.municipio_operacion_id) {
      setAlert("Debes seleccionar un municipio.");
      return;
    }
    if (!form.email.trim()) {
      setAlert("El correo es obligatorio.");
      return;
    }
    if (!editingId && !form.password.trim()) {
      setAlert("La contraseña es obligatoria.");
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        role: "COORDINADOR_ELECTORAL",
        name: fullName,
        telefono: form.telefono,
        email: form.email,
        municipio_operacion_id: Number(form.municipio_operacion_id),
        is_active: form.is_active,
      };
      if (form.password) {
        payload.password = form.password;
      }

      if (editingId) {
        await api.patch(`/usuarios/${editingId}/`, payload);
      } else {
        await api.post("/usuarios/", payload);
      }

      setForm({
        primer_nombre: "",
        segundo_nombre: "",
        primer_apellido: "",
        segundo_apellido: "",
        telefono: "",
        municipio_operacion_id: "",
        email: "",
        password: "",
        is_active: true,
      });
      setEditingId(null);
      await load();
      setAlert("Coordinador guardado correctamente.");
    } catch (err) {
      console.error(err);
      setAlert("No fue posible guardar el coordinador.");
    }
  };

  const handleEdit = (coordinator: Coordinator) => {
    setEditingId(coordinator.id);
    const parts = coordinator.name.split(" ");
    setForm({
      primer_nombre: parts[0] || "",
      segundo_nombre: parts[1] || "",
      primer_apellido: parts[2] || "",
      segundo_apellido: parts.slice(3).join(" "),
      telefono: coordinator.telefono || "",
      municipio_operacion_id: coordinator.municipio_operacion_id ? String(coordinator.municipio_operacion_id) : "",
      email: coordinator.email,
      password: "",
      is_active: coordinator.is_active,
    });
  };

  const handleToggleActive = async (coordinator: Coordinator) => {
    try {
      await api.patch(`/usuarios/${coordinator.id}/`, {
        is_active: !coordinator.is_active,
        role: coordinator.role,
      });
      await load();
    } catch (err) {
      console.error(err);
      setAlert("No fue posible actualizar el estado.");
    }
  };

  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 font-weight-bold mb-0">Coordinadores electorales</h1>
          <p className="text-muted mb-0">Crea coordinadores electorales y asigna su municipio.</p>
        </div>
        {loading && <span className="badge badge-info">Cargando...</span>}
      </div>

      {alert && (
        <div className="alert alert-info" role="alert">
          {alert}
        </div>
      )}

      <div className="row">
        <div className="col-lg-4 col-12">
          <div className="card card-primary card-outline">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">{editingId ? "Editar coordinador" : "Nuevo coordinador"}</h3>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-tool text-danger"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      primer_nombre: "",
                      segundo_nombre: "",
                      primer_apellido: "",
                      segundo_apellido: "",
                      telefono: "",
                      municipio_operacion_id: "",
                      email: "",
                      password: "",
                      is_active: true,
                    });
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
            <form className="card-body" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Primer nombre</label>
                <input
                  className="form-control"
                  value={form.primer_nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, primer_nombre: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Segundo nombre</label>
                <input
                  className="form-control"
                  value={form.segundo_nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, segundo_nombre: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Primer apellido</label>
                <input
                  className="form-control"
                  value={form.primer_apellido}
                  onChange={(e) => setForm((prev) => ({ ...prev, primer_apellido: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Segundo apellido</label>
                <input
                  className="form-control"
                  value={form.segundo_apellido}
                  onChange={(e) => setForm((prev) => ({ ...prev, segundo_apellido: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  className="form-control"
                  value={form.telefono}
                  onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Municipio</label>
                <select
                  className="form-control"
                  value={form.municipio_operacion_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, municipio_operacion_id: e.target.value }))}
                  required
                  disabled={Boolean(editingId)}
                >
                  <option value="">Selecciona un municipio</option>
                  {municipios.map((municipio) => (
                    <option key={municipio.id} value={municipio.id}>
                      {municipio.nombre}
                    </option>
                  ))}
                </select>
                {editingId && (
                  <small className="text-muted">El municipio no se puede modificar una vez creado.</small>
                )}
              </div>
              <div className="form-group">
                <label>Correo</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={editingId ? "Dejar en blanco para mantener" : "••••••"}
                  required={!editingId}
                />
              </div>
              <div className="form-group">
                <div className="custom-control custom-switch">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="coordinator-active"
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <label className="custom-control-label" htmlFor="coordinator-active">
                    Activo
                  </label>
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                <i className="fas fa-save mr-2" /> {editingId ? "Actualizar" : "Crear"}
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-8 col-12">
          <div className="card card-outline card-secondary">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">Coordinadores registrados</h3>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Teléfono</th>
                      <th>Municipio</th>
                      <th>Estado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {coordinators.map((coordinator) => (
                      <tr key={coordinator.id}>
                        <td>{coordinator.name}</td>
                        <td>{coordinator.email}</td>
                        <td>{coordinator.telefono || "-"}</td>
                        <td>{coordinator.municipio_operacion_nombre || "-"}</td>
                        <td>
                          <span className={`badge ${coordinator.is_active ? "badge-success" : "badge-secondary"}`}>
                            {coordinator.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="text-right">
                          <button className="btn btn-sm btn-outline-primary mr-2" onClick={() => handleEdit(coordinator)}>
                            Editar
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleToggleActive(coordinator)}
                          >
                            {coordinator.is_active ? "Desactivar" : "Activar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!coordinators.length && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          Aún no hay coordinadores registrados.
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
    </div>
  );
};

export default CoordinatorsPage;
