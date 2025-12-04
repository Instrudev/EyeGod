import { useEffect, useState } from "react";
import api from "../services/api";

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
  motivo_reprogramacion?: string;
  lider_nombre: string;
  candidato_nombre: string;
};

const badgeClasses: Record<Agenda["estado"], string> = {
  pendiente: "badge badge-warning",
  aceptada: "badge badge-success",
  rechazada: "badge badge-danger",
  reprogramacion_solicitada: "badge badge-info",
};

const CandidateAgendaPage = () => {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Agenda[]>("/agendas/");
      setAgendas(data);
    } catch (err) {
      console.error(err);
      setAlert("No fue posible cargar tus agendas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const responder = async (agenda: Agenda, accion: "aceptar" | "rechazar" | "reprogramar") => {
    let motivo = "";
    if (accion === "reprogramar") {
      motivo = window.prompt("Describe el motivo de la reprogramación") || "";
      if (!motivo.trim()) {
        return;
      }
    }
    try {
      await api.post(`/agendas/${agenda.id}/responder/`, { accion, motivo_reprogramacion: motivo });
      await load();
      setAlert("Respuesta registrada.");
    } catch (err) {
      console.error(err);
      setAlert("No se pudo registrar tu respuesta.");
    }
  };

  return (
    <div className="pb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 font-weight-bold mb-0">Mis agendas</h1>
          <p className="text-muted mb-0">Aprueba, rechaza o solicita reprogramación de tus citas.</p>
        </div>
        {loading && <span className="badge badge-info">Cargando...</span>}
      </div>

      {alert && (
        <div className="alert alert-info" role="alert">
          {alert}
        </div>
      )}

      <div className="row">
        {agendas.map((agenda) => (
          <div className="col-md-6 col-12" key={agenda.id}>
            <div className="card card-outline card-primary mb-3">
              <div className="card-header d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="card-title mb-0">{agenda.titulo}</h3>
                  <p className="mb-0 text-muted">Líder: {agenda.lider_nombre}</p>
                </div>
                <span className={badgeClasses[agenda.estado]}>{agenda.estado_display}</span>
              </div>
              <div className="card-body">
                <p className="mb-1 font-weight-bold">{new Date(agenda.fecha).toLocaleDateString()}</p>
                <p className="mb-1 text-muted">
                  Horario: {agenda.hora_inicio} - {agenda.hora_fin}
                </p>
                <p className="mb-1 text-muted">Lugar: {agenda.lugar}</p>
                {agenda.descripcion && <p className="mb-2">{agenda.descripcion}</p>}
                {agenda.motivo_reprogramacion && (
                  <p className="mb-2 text-danger">Motivo de reprogramación: {agenda.motivo_reprogramacion}</p>
                )}
                <div className="d-flex flex-wrap gap-2">
                  <button
                    className="btn btn-sm btn-success mr-2 mb-2"
                    disabled={agenda.estado === "aceptada"}
                    onClick={() => responder(agenda, "aceptar")}
                  >
                    <i className="fas fa-check mr-1" /> Aceptar
                  </button>
                  <button
                    className="btn btn-sm btn-danger mr-2 mb-2"
                    disabled={agenda.estado === "rechazada"}
                    onClick={() => responder(agenda, "rechazar")}
                  >
                    <i className="fas fa-times mr-1" /> Rechazar
                  </button>
                  <button
                    className="btn btn-sm btn-outline-primary mb-2"
                    disabled={agenda.estado === "aceptada" || agenda.estado === "rechazada"}
                    onClick={() => responder(agenda, "reprogramar")}
                  >
                    <i className="fas fa-clock mr-1" /> Solicitar reprogramación
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!agendas.length && !loading && (
          <div className="col-12">
            <div className="alert alert-light text-center" role="alert">
              No tienes agendas asignadas.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateAgendaPage;
