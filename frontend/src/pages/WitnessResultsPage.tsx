import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface MesaCard {
  puesto_id: number;
  puesto_nombre: string;
  municipio: string;
  mesa: number;
  estado: "PENDIENTE" | "ENVIADA";
}

interface Candidate {
  id: number;
  nombre: string;
}

interface MesaDetail {
  puesto_id: number;
  puesto_nombre: string;
  municipio: string;
  mesa: number;
  estado: "PENDIENTE" | "ENVIADA";
  editable: boolean;
  candidatos: Candidate[];
  votos?: { id: number; votos: number }[] | null;
  voto_blanco?: number | null;
  voto_nulo?: number | null;
}

const WitnessResultsPage = () => {
  const { user } = useAuth();
  const [mesas, setMesas] = useState<MesaCard[]>([]);
  const [selectedMesa, setSelectedMesa] = useState<MesaDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const loadMesas = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const { data } = await api.get<MesaCard[]>("/resultados-mesas/");
      setMesas(data);
    } catch (err) {
      console.error(err);
      setAlert("No fue posible cargar las mesas asignadas.");
    } finally {
      setLoading(false);
    }
  };

  const loadMesaDetail = async (mesa: MesaCard) => {
    setDetailLoading(true);
    setAlert(null);
    try {
      const { data } = await api.get<MesaDetail>(
        `/resultados-mesas/mesa/${mesa.puesto_id}/${mesa.mesa}/`
      );
      setSelectedMesa(data);
      const nextValues: Record<string, string> = {};
      data.candidatos.forEach((candidate) => {
        const existing = data.votos?.find((item) => item.id === candidate.id);
        nextValues[`candidato-${candidate.id}`] =
          existing?.votos !== undefined ? String(existing.votos) : "";
      });
      nextValues["voto_blanco"] =
        data.voto_blanco !== null && data.voto_blanco !== undefined ? String(data.voto_blanco) : "";
      nextValues["voto_nulo"] =
        data.voto_nulo !== null && data.voto_nulo !== undefined ? String(data.voto_nulo) : "";
      setFormValues(nextValues);
    } catch (err) {
      console.error(err);
      setAlert("No fue posible cargar los detalles de la mesa.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMesa) return;
    const candidatesPayload = selectedMesa.candidatos.map((candidate) => {
      const value = formValues[`candidato-${candidate.id}`];
      return { id: candidate.id, votos: value === "" ? null : Number(value) };
    });
    const votoBlanco = formValues["voto_blanco"];
    const votoNulo = formValues["voto_nulo"];

    if (
      candidatesPayload.some((item) => item.votos === null || Number.isNaN(item.votos)) ||
      votoBlanco === "" ||
      votoNulo === ""
    ) {
      setAlert("Debes completar todos los campos antes de enviar.");
      return;
    }

    const payload = {
      candidatos: candidatesPayload.map((item) => ({ id: item.id, votos: Number(item.votos) })),
      voto_blanco: Number(votoBlanco),
      voto_nulo: Number(votoNulo),
    };

    const confirmMessage = `Confirmar envío de resultados:\n\nPuesto: ${selectedMesa.puesto_nombre}\nMesa: ${selectedMesa.mesa}\n\n¿Deseas continuar?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setDetailLoading(true);
    setAlert(null);
    try {
      await api.post(
        `/resultados-mesas/mesa/${selectedMesa.puesto_id}/${selectedMesa.mesa}/`,
        payload
      );
      await loadMesas();
      await loadMesaDetail({
        puesto_id: selectedMesa.puesto_id,
        puesto_nombre: selectedMesa.puesto_nombre,
        municipio: selectedMesa.municipio,
        mesa: selectedMesa.mesa,
        estado: "ENVIADA",
      });
      setAlert("Resultados enviados correctamente.");
    } catch (err) {
      console.error(err);
      setAlert("No fue posible enviar los resultados.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadMesas();
  }, []);

  if (user?.role !== "TESTIGO_ELECTORAL") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 font-weight-bold mb-0">Registro de resultados</h1>
          <p className="text-muted mb-0">Selecciona tu mesa asignada para registrar votos.</p>
        </div>
        {loading && <span className="badge badge-info">Cargando...</span>}
      </div>

      {alert && (
        <div className="alert alert-info" role="alert">
          {alert}
        </div>
      )}

      <div className="row">
        <div className="col-lg-4 col-12 mb-3 mb-lg-0">
          <div className="card card-outline card-primary">
            <div className="card-header">
              <h3 className="card-title mb-0">Mesas asignadas</h3>
            </div>
            <div className="card-body">
              {mesas.length ? (
                <div className="d-flex flex-column" style={{ gap: "0.75rem" }}>
                  {mesas.map((mesa) => (
                    <button
                      key={`${mesa.puesto_id}-${mesa.mesa}`}
                      type="button"
                      className={`btn btn-block text-left ${
                        selectedMesa?.mesa === mesa.mesa && selectedMesa?.puesto_id === mesa.puesto_id
                          ? "btn-primary"
                          : "btn-outline-primary"
                      }`}
                      onClick={() => loadMesaDetail(mesa)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="font-weight-bold">Mesa {mesa.mesa}</div>
                          <div className="text-muted small">{mesa.puesto_nombre}</div>
                        </div>
                        <span
                          className={`badge ${mesa.estado === "ENVIADA" ? "badge-success" : "badge-warning"}`}
                        >
                          {mesa.estado === "ENVIADA" ? "Enviada" : "Pendiente"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">No tienes mesas asignadas.</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-8 col-12">
          {selectedMesa ? (
            <div className="card card-outline card-secondary">
              <div className="card-header position-sticky bg-white" style={{ top: 0, zIndex: 1 }}>
                <div className="d-flex flex-wrap justify-content-between align-items-center">
                  <div>
                    <h3 className="card-title mb-1">
                      {selectedMesa.municipio} · {selectedMesa.puesto_nombre}
                    </h3>
                    <div className="text-muted small">Mesa {selectedMesa.mesa}</div>
                  </div>
                  <span className="badge badge-secondary">
                    {selectedMesa.estado === "ENVIADA" ? "Enviada" : "Pendiente"}
                  </span>
                </div>
              </div>
              <div className="card-body">
                {detailLoading && <div className="alert alert-info">Cargando detalle...</div>}
                {!detailLoading && (
                  <>
                    <div className="table-responsive">
                      <table className="table table-striped mb-0">
                        <thead>
                          <tr>
                            <th>Candidato</th>
                            <th style={{ width: "180px" }}>Votos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedMesa.candidatos.map((candidate) => (
                            <tr key={candidate.id}>
                              <td>{candidate.nombre}</td>
                              <td>
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  className="form-control"
                                  value={formValues[`candidato-${candidate.id}`] ?? ""}
                                  onChange={(e) =>
                                    setFormValues((prev) => ({
                                      ...prev,
                                      [`candidato-${candidate.id}`]: e.target.value,
                                    }))
                                  }
                                  disabled={!selectedMesa.editable}
                                  required
                                />
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td>Voto en blanco</td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                className="form-control"
                                value={formValues["voto_blanco"] ?? ""}
                                onChange={(e) =>
                                  setFormValues((prev) => ({ ...prev, voto_blanco: e.target.value }))
                                }
                                disabled={!selectedMesa.editable}
                                required
                              />
                            </td>
                          </tr>
                          <tr>
                            <td>Voto nulo</td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                className="form-control"
                                value={formValues["voto_nulo"] ?? ""}
                                onChange={(e) =>
                                  setFormValues((prev) => ({ ...prev, voto_nulo: e.target.value }))
                                }
                                disabled={!selectedMesa.editable}
                                required
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {!selectedMesa.editable && (
                      <div className="alert alert-success mt-3 mb-0">
                        Esta mesa ya fue enviada y no puede editarse.
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="card-footer d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={!selectedMesa.editable || detailLoading}
                >
                  <i className="fas fa-paper-plane mr-2" /> Confirmar y enviar
                </button>
              </div>
            </div>
          ) : (
            <div className="card card-outline card-secondary">
              <div className="card-body">
                <p className="text-muted mb-0">Selecciona una mesa para registrar los resultados.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WitnessResultsPage;
