import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export type Candidate = {
  id: number;
  nombre: string;
  cargo: string;
  partido: string;
  foto?: string;
  usuario_email: string;
  usuario_id: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
  generated_password?: string | null;
};

type CandidateForm = {
  nombre: string;
  cargo: string;
  partido: string;
  email: string;
  password: string;
  foto: File | null;
};

const emptyForm: CandidateForm = {
  nombre: "",
  cargo: "",
  partido: "",
  email: "",
  password: "",
  foto: null,
};

const CandidatesPage = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [form, setForm] = useState<CandidateForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [credentialNote, setCredentialNote] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const { data } = await api.get<Candidate[]>("/candidatos/");
      setCandidates(data);
    } catch (err) {
      console.error(err);
      setAlert("No fue posible cargar los candidatos.");
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
    setCredentialNote(null);
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("nombre", form.nombre);
      payload.append("cargo", form.cargo);
      payload.append("partido", form.partido);
      payload.append("email", form.email);
      if (form.password) {
        payload.append("password", form.password);
      }
      if (form.foto) {
        payload.append("foto", form.foto);
      }

      const config = { headers: { "Content-Type": "multipart/form-data" } };
      const { data } = editingId
        ? await api.patch<Candidate>(`/candidatos/${editingId}/`, payload, config)
        : await api.post<Candidate>("/candidatos/", payload, config);

      setForm(emptyForm);
      setEditingId(null);
      await load();
      setAlert("Candidato guardado correctamente.");
      if (data.generated_password) {
        setCredentialNote(`Credenciales: ${data.usuario_email} / ${data.generated_password}`);
      }
    } catch (err) {
      console.error(err);
      setAlert("No fue posible guardar el candidato.");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (candidate: Candidate) => {
    setEditingId(candidate.id);
    setForm({
      nombre: candidate.nombre,
      cargo: candidate.cargo,
      partido: candidate.partido,
      email: candidate.usuario_email,
      password: "",
      foto: null,
    });
    setCredentialNote(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Eliminar candidato y usuario asociado?")) return;
    setLoading(true);
    try {
      await api.delete(`/candidatos/${id}/`);
      await load();
    } catch (err) {
      console.error(err);
      setAlert("No fue posible eliminar el candidato.");
    } finally {
      setLoading(false);
    }
  };

  const previewName = useMemo(() => form.foto?.name || "Sin archivo", [form.foto]);

  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 font-weight-bold mb-0">Gestión de candidatos</h1>
          <p className="text-muted mb-0">Crea usuarios con rol candidato y administra su información.</p>
        </div>
        {loading && <span className="badge badge-info">Procesando...</span>}
      </div>

      {alert && <div className="alert alert-info">{alert}</div>}
      {credentialNote && (
        <div className="alert alert-success">
          {credentialNote}
          <br />
          <small className="text-muted">Guarda estas credenciales y compártelas de forma segura.</small>
        </div>
      )}

      <div className="row">
        <div className="col-lg-4 col-12">
          <div className="card card-primary card-outline">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title mb-0">{editingId ? "Editar candidato" : "Nuevo candidato"}</h3>
              {editingId && (
                <button
                  className="btn btn-tool text-danger"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
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
                  value={form.nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  required
                  placeholder="Nombre completo"
                />
              </div>
              <div className="form-group">
                <label>Cargo</label>
                <input
                  className="form-control"
                  value={form.cargo}
                  onChange={(e) => setForm((prev) => ({ ...prev, cargo: e.target.value }))}
                  required
                  placeholder="Cargo o aspiración"
                />
              </div>
              <div className="form-group">
                <label>Partido</label>
                <input
                  className="form-control"
                  value={form.partido}
                  onChange={(e) => setForm((prev) => ({ ...prev, partido: e.target.value }))}
                  required
                  placeholder="Partido político"
                />
              </div>
              <div className="form-group">
                <label>Correo de usuario</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="candidato@correo.com"
                />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={editingId ? "Vacío para no cambiar" : "Dejar vacío para autogenerar"}
                />
                <small className="text-muted">Si no se ingresa, se generará automáticamente.</small>
              </div>
              <div className="form-group">
                <label>Foto</label>
                <div className="custom-file">
                  <input
                    type="file"
                    className="custom-file-input"
                    id="candidate-photo"
                    accept="image/*"
                    onChange={(e) => setForm((prev) => ({ ...prev, foto: e.target.files?.[0] || null }))}
                  />
                  <label className="custom-file-label" htmlFor="candidate-photo">
                    {previewName}
                  </label>
                </div>
                {editingId && <small className="text-muted">Deja el campo vacío para mantener la foto actual.</small>}
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                <i className="fas fa-save mr-2" /> {editingId ? "Actualizar" : "Crear"}
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-8 col-12">
          <div className="card card-outline card-secondary">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title mb-0">Candidatos registrados</h3>
              <span className="badge badge-light">{candidates.length}</span>
            </div>
            <div className="card-body table-responsive p-0" style={{ maxHeight: 520 }}>
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th></th>
                    <th>Nombre</th>
                    <th>Cargo</th>
                    <th>Partido</th>
                    <th>Usuario</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td style={{ width: 60 }}>
                        {candidate.foto ? (
                          <img src={candidate.foto} alt={candidate.nombre} className="img-size-50" />
                        ) : (
                          <span className="badge badge-light">Sin foto</span>
                        )}
                      </td>
                      <td>{candidate.nombre}</td>
                      <td>{candidate.cargo}</td>
                      <td>{candidate.partido}</td>
                      <td className="text-sm text-muted">{candidate.usuario_email}</td>
                      <td className="text-right">
                        <button className="btn btn-xs btn-link" onClick={() => startEdit(candidate)}>
                          <i className="fas fa-edit" />
                        </button>
                        <button className="btn btn-xs btn-link text-danger" onClick={() => handleDelete(candidate.id)}>
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

export default CandidatesPage;
