import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

type Leader = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
};

const LeadersPage = () => {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", is_active: true });
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Leader[]>("/usuarios/", { params: { role: "LIDER" } });
      setLeaders(data.filter((u) => u.role === "LIDER"));
    } catch (err) {
      console.error(err);
      setAlert("No fue posible cargar los líderes.");
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
      const payload = { ...form, role: "LIDER" } as any;
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
      setAlert("Líder guardado correctamente.");
    } catch (err) {
      console.error(err);
      setAlert("No fue posible guardar el líder.");
    }
  };

  const handleEdit = (leader: Leader) => {
    setEditingId(leader.id);
    setForm({ name: leader.name, email: leader.email, password: "", is_active: leader.is_active });
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/usuarios/${id}/`);
      await load();
    } catch (err) {
      console.error(err);
      setAlert("No fue posible eliminar el líder.");
    }
  };

  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 font-weight-bold mb-0">Gestión de líderes</h1>
          <p className="text-muted mb-0">Crea, edita y elimina líderes asociados a municipios.</p>
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
              <h3 className="card-title">{editingId ? "Editar líder" : "Nuevo líder"}</h3>
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
                  placeholder="lider@correo.com"
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
                    id="leader-active"
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <label className="custom-control-label" htmlFor="leader-active">
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
              <h3 className="card-title">Líderes registrados</h3>
              <span className="badge badge-light">{leaders.length} líderes</span>
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
                  {leaders.map((leader) => (
                    <tr key={leader.id}>
                      <td>{leader.name}</td>
                      <td>{leader.email}</td>
                      <td>
                        {leader.is_active ? (
                          <span className="badge badge-success">Activo</span>
                        ) : (
                          <span className="badge badge-secondary">Inactivo</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button className="btn btn-xs btn-link" onClick={() => handleEdit(leader)}>
                          <i className="fas fa-edit" />
                        </button>
                        <button className="btn btn-xs btn-link text-danger" onClick={() => handleDelete(leader.id)}>
                          <i className="fas fa-trash" />
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

export default LeadersPage;
