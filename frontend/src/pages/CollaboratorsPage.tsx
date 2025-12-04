import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

type Collaborator = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
};

const CollaboratorsPage = () => {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", is_active: true });
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Collaborator[]>("/usuarios/", { params: { role: "COLABORADOR" } });
      setCollaborators(data.filter((u) => u.role === "COLABORADOR"));
    } catch (err) {
      console.error(err);
      setAlert("No fue posible cargar los colaboradores.");
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
    try {
      const payload = { ...form, role: "COLABORADOR" } as any;
      if (editingId) {
        if (!payload.password) {
          delete payload.password;
        }
        await api.patch(`/usuarios/${editingId}/`, payload);
      } else {
        await api.post("/usuarios/", payload);
      }
      setForm({ name: "", email: "", password: "", is_active: true });
      setEditingId(null);
      await load();
      setAlert("Colaborador guardado correctamente.");
    } catch (err) {
      console.error(err);
      setAlert("No fue posible guardar el colaborador.");
    }
  };

  const handleEdit = (collaborator: Collaborator) => {
    setEditingId(collaborator.id);
    setForm({ name: collaborator.name, email: collaborator.email, password: "", is_active: collaborator.is_active });
  };

  const handleToggleActive = async (collaborator: Collaborator) => {
    try {
      await api.patch(`/usuarios/${collaborator.id}/`, { is_active: !collaborator.is_active, role: collaborator.role });
      await load();
    } catch (err) {
      console.error(err);
      setAlert("No fue posible actualizar el estado.");
    }
  };

  if (user?.role !== "ADMIN" && user?.role !== "LIDER") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 font-weight-bold mb-0">Gestión de colaboradores</h1>
          <p className="text-muted mb-0">Crea y habilita colaboradores para diligenciar encuestas.</p>
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
              <h3 className="card-title">{editingId ? "Editar colaborador" : "Nuevo colaborador"}</h3>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-tool text-danger"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ name: "", email: "", password: "", is_active: true });
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
            <form className="card-body" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="Nombre completo"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="colaborador@correo.com"
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
                    id="collaborator-active"
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <label className="custom-control-label" htmlFor="collaborator-active">
                    Activo
                  </label>
                </div>
              </div>
              <div className="d-flex align-items-center">
                <button type="submit" className="btn btn-primary mr-2">
                  <i className="fas fa-save mr-2" /> {editingId ? "Actualizar" : "Crear"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setEditingId(null);
                      setForm({ name: "", email: "", password: "", is_active: true });
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="col-lg-8 col-12">
          <div className="card card-outline card-secondary">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">Colaboradores registrados</h3>
              <span className="badge badge-light">{collaborators.length} colaboradores</span>
            </div>
            <div className="card-body table-responsive p-0" style={{ maxHeight: 520 }}>
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {collaborators.map((collaborator) => (
                    <tr key={collaborator.id}>
                      <td>{collaborator.name}</td>
                      <td>{collaborator.email}</td>
                      <td>
                        <span className={`badge ${collaborator.is_active ? "badge-success" : "badge-secondary"}`}>
                          {collaborator.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="text-right">
                        <button className="btn btn-xs btn-link" onClick={() => handleEdit(collaborator)}>
                          <i className="fas fa-edit" />
                        </button>
                        <button
                          className="btn btn-xs btn-link"
                          onClick={() => handleToggleActive(collaborator)}
                          title={collaborator.is_active ? "Desactivar" : "Activar"}
                        >
                          <i className={`fas ${collaborator.is_active ? "fa-user-slash" : "fa-user-check"}`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaboratorsPage;
