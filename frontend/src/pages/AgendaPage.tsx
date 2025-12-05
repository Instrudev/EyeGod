import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

type Candidate = {
  id: number;
  nombre: string;
  cargo: string;
  partido: string;
  usuario_email: string;
};

type Agenda = {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  estado: "pendiente" | "aceptada" | "rechazada" | "reprogramacion_solicitada";
  estado_display: string;
  candidato: number;
  candidato_nombre: string;
  candidato_email: string;
  lider_nombre: string;
  motivo_reprogramacion?: string;
};

const estadoBadge: Record<Agenda["estado"], string> = {
  pendiente: "badge badge-warning",
  aceptada: "badge badge-success",
  rechazada: "badge badge-danger",
  reprogramacion_solicitada: "badge badge-info",
};

const AgendaPage = () => {
  const { user } = useAuth();
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [candidatos, setCandidatos] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    candidato: "",
    titulo: "",
    descripcion: "",
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
    lugar: "",
  });

  const puedeUsarAgenda = user?.role === "ADMIN" || user?.role === "LIDER";

  const load = async () => {
    setLoading(true);
    try {
      const [agendasRes, candidatosRes] = await Promise.all([
        api.get<Agenda[]>("/agendas/"),
        api.get<Candidate[]>("/candidatos/"),
      ]);
      setAgendas(agendasRes.data);
      setCandidatos(candidatosRes.data);
    } catch (err) {
      console.error(err);
      setAlert("No fue posible cargar la agenda.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (puedeUsarAgenda) {
      load();
    }
  }, [puedeUsarAgenda]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.candidato) {
      setAlert("Selecciona un candidato para agendar.");
      return;
    }
    setSaving(true);
    setAlert(null);
    try {
      const payload = { ...form, candidato: Number(form.candidato) };
      if (editingId) {
        await api.patch(`/agendas/${editingId}/`, payload);
      } else {
        await api.post("/agendas/", payload);
      }
      setForm({ candidato: "", titulo: "", descripcion: "", fecha: "", hora_inicio: "", hora_fin: "", lugar: "" });
      setEditingId(null);
      await load();
      setAlert("Agenda guardada correctamente.");
    } catch (err) {
      console.error(err);
      setAlert("No fue posible guardar la agenda.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (agenda: Agenda) => {
    if (agenda.estado === "aceptada") return;
    setEditingId(agenda.id);
    setForm({
      candidato: String(agenda.candidato),
      titulo: agenda.titulo,
      descripcion: agenda.descripcion || "",
      fecha: agenda.fecha,
      hora_inicio: agenda.hora_inicio,
      hora_fin: agenda.hora_fin,
      lugar: agenda.lugar,
    });
  };

  const handleCancel = async (agenda: Agenda) => {
    if (!window.confirm("¿Cancelar esta agenda?")) return;
    try {
      await api.post(`/agendas/${agenda.id}/cancelar/`);
      await load();
      setAlert("Agenda cancelada.");
    } catch (err) {
      console.error(err);
      setAlert("No fue posible cancelar la agenda.");
    }
  };

  const resumen = useMemo(() => {
    const total = agendas.length;
    const pendientes = agendas.filter((a) => a.estado === "pendiente").length;
    const aceptadas = agendas.filter((a) => a.estado === "aceptada").length;
    const rechazadas = agendas.filter((a) => a.estado === "rechazada").length;
    const reprogramaciones = agendas.filter((a) => a.estado === "reprogramacion_solicitada").length;
    return { total, pendientes, aceptadas, rechazadas, reprogramaciones };
  }, [agendas]);

  if (!puedeUsarAgenda) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 font-weight-bold mb-0">Agenda de candidatos</h1>
          <p className="text-muted mb-0">Crea citas con candidatos y gestiona su estado.</p>
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
              <h3 className="card-title mb-0">{editingId ? "Editar agenda" : "Nueva agenda"}</h3>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-tool text-danger"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ candidato: "", titulo: "", descripcion: "", fecha: "", hora_inicio: "", hora_fin: "", lugar: "" });
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
            <form className="card-body" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Candidato</label>
                <select
                  className="form-control"
                  value={form.candidato}
                  onChange={(e) => setForm((prev) => ({ ...prev, candidato: e.target.value }))}
                  required
                >
                  <option value="">Selecciona un candidato</option>
                  {candidatos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.cargo})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Título</label>
                <input
                  className="form-control"
                  value={form.titulo}
                  onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
                  required
                  placeholder="Reunión, recorrido, visita..."
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  className="form-control"
                  value={form.descripcion}
                  onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                  placeholder="Objetivo o notas de la actividad"
                />
              </div>
              <div className="form-row">
                <div className="form-group col-6">
                  <label>Fecha</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.fecha}
                    onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group col-6">
                  <label>Lugar</label>
                  <input
                    className="form-control"
                    value={form.lugar}
                    onChange={(e) => setForm((prev) => ({ ...prev, lugar: e.target.value }))}
                    placeholder="Dirección o punto de encuentro"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group col-6">
                  <label>Hora inicio</label>
                  <input
                    type="time"
                    className="form-control"
                    value={form.hora_inicio}
                    onChange={(e) => setForm((prev) => ({ ...prev, hora_inicio: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group col-6">
                  <label>Hora fin</label>
                  <input
                    type="time"
                    className="form-control"
                    value={form.hora_fin}
                    onChange={(e) => setForm((prev) => ({ ...prev, hora_fin: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="d-flex align-items-center">
                <button className="btn btn-primary mr-2" type="submit" disabled={saving}>
                  <i className="fas fa-save mr-2" /> {editingId ? "Actualizar" : "Crear"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setEditingId(null);
                      setForm({ candidato: "", titulo: "", descripcion: "", fecha: "", hora_inicio: "", hora_fin: "", lugar: "" });
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
          <div className="row mb-3">
            <div className="col-6 col-md-3">
              <div className="info-box">
                <span className="info-box-icon bg-primary"><i className="fas fa-calendar" /></span>
                <div className="info-box-content">
                  <span className="info-box-text">Total</span>
                  <span className="info-box-number">{resumen.total}</span>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="info-box">
                <span className="info-box-icon bg-warning"><i className="fas fa-hourglass-half" /></span>
                <div className="info-box-content">
                  <span className="info-box-text">Pendientes</span>
                  <span className="info-box-number">{resumen.pendientes}</span>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="info-box">
                <span className="info-box-icon bg-success"><i className="fas fa-check" /></span>
                <div className="info-box-content">
                  <span className="info-box-text">Aceptadas</span>
                  <span className="info-box-number">{resumen.aceptadas}</span>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="info-box">
                <span className="info-box-icon bg-danger"><i className="fas fa-times" /></span>
                <div className="info-box-content">
                  <span className="info-box-text">Rechazadas</span>
                  <span className="info-box-number">{resumen.rechazadas}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-outline card-secondary">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title mb-0">Agendas registradas</h3>
              <span className="badge badge-light">{agendas.length} registros</span>
            </div>
            <div className="card-body table-responsive p-0" style={{ maxHeight: 520 }}>
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Candidato</th>
                    <th>Fecha</th>
                    <th>Horario</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {agendas.map((agenda) => (
                    <tr key={agenda.id}>
                      <td>
                        <div className="d-flex flex-column">
                          <strong>{agenda.titulo}</strong>
                          <small className="text-muted">{agenda.descripcion || "Sin descripción"}</small>
                          {agenda.motivo_reprogramacion && (
                            <small className="text-danger">Reprogramar: {agenda.motivo_reprogramacion}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          <span>{agenda.candidato_nombre}</span>
                          <small className="text-muted">{agenda.candidato_email}</small>
                        </div>
                      </td>
                      <td>{new Date(agenda.fecha).toLocaleDateString()}</td>
                      <td>
                        {agenda.hora_inicio} - {agenda.hora_fin}
                        <div className="text-muted small">{agenda.lugar}</div>
                      </td>
                      <td>
                        <span className={estadoBadge[agenda.estado]}>{agenda.estado_display}</span>
                      </td>
                      <td className="text-right" style={{ minWidth: 150 }}>
                        <button
                          className="btn btn-sm btn-outline-primary mr-2"
                          disabled={agenda.estado === "aceptada"}
                          onClick={() => handleEdit(agenda)}
                        >
                          <i className="fas fa-edit mr-1" /> Editar
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleCancel(agenda)}
                        >
                          <i className="fas fa-ban mr-1" /> Cancelar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!agendas.length && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted p-4">
                        Aún no tienes agendas registradas.
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
  );
};

export default AgendaPage;
