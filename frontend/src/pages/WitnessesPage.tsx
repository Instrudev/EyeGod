import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface PollingStation {
  id: number;
  departamento: string;
  municipio: string;
  puesto: string;
  mesas: string;
  direccion: string;
}

interface Witness {
  id: number;
  name: string;
  email: string;
  telefono?: string | null;
  municipio_nombre?: string | null;
  puesto_nombre?: string | null;
  mesas: number[];
}

const WitnessesPage = () => {
  const { user } = useAuth();
  const [stations, setStations] = useState<PollingStation[]>([]);
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [alert, setAlert] = useState<string | null>(null);
  const [mesasAlert, setMesasAlert] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [selectedMesas, setSelectedMesas] = useState<number[]>([]);
  const [availableMesas, setAvailableMesas] = useState<number[]>([]);
  const [form, setForm] = useState({
    primer_nombre: "",
    segundo_nombre: "",
    primer_apellido: "",
    segundo_apellido: "",
    telefono: "",
    correo: "",
    password: "",
  });

  const load = async () => {
    setLoading(true);
    setAlert(null);
    try {
      const [stationsRes, witnessRes] = await Promise.all([
        api.get<PollingStation[]>("/puestos-votacion/"),
        api.get<Witness[]>("/testigos/"),
      ]);
      setStations(stationsRes.data);
      setWitnesses(witnessRes.data);
    } catch (err) {
      console.error(err);
      setAlert("No fue posible cargar la información.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const loadAvailableMesas = async () => {
      if (!selectedStationId) {
        setAvailableMesas([]);
        setMesasAlert("Selecciona un puesto válido para listar las mesas.");
        return;
      }
      setMesasAlert(null);
      try {
        const response = await api.get<{
          mesas_disponibles: number[];
        }>(`/puestos-votacion/${selectedStationId}/mesas-disponibles/`);
        const mesas = response.data.mesas_disponibles || [];
        setAvailableMesas(mesas);
        if (!mesas.length) {
          setMesasAlert("Este puesto ya no tiene mesas disponibles para asignación");
        }
      } catch (err) {
        console.error(err);
        setAvailableMesas([]);
        setMesasAlert("No fue posible cargar las mesas disponibles.");
      }
    };
    loadAvailableMesas();
  }, [selectedStationId]);

  useEffect(() => {
    if (!availableMesas.length) {
      setSelectedMesas([]);
      return;
    }
    setSelectedMesas((prev) => prev.filter((mesa) => availableMesas.includes(mesa)));
  }, [availableMesas]);

  const toggleMesa = (mesa: number) => {
    setSelectedMesas((prev) =>
      prev.includes(mesa) ? prev.filter((item) => item !== mesa) : [...prev, mesa]
    );
  };

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
    if (!form.correo.trim()) {
      setAlert("El correo es obligatorio.");
      return;
    }
    if (!form.password.trim()) {
      setAlert("La contraseña es obligatoria.");
      return;
    }
    if (!selectedStationId) {
      setAlert("Selecciona un puesto de votación.");
      return;
    }
    if (!selectedMesas.length) {
      setAlert("Selecciona al menos una mesa.");
      return;
    }

    try {
      await api.post("/testigos/", {
        primer_nombre: form.primer_nombre,
        segundo_nombre: form.segundo_nombre,
        primer_apellido: form.primer_apellido,
        segundo_apellido: form.segundo_apellido,
        telefono: form.telefono,
        correo: form.correo,
        password: form.password,
        puesto_id: Number(selectedStationId),
        mesas: selectedMesas,
      });
      setForm({
        primer_nombre: "",
        segundo_nombre: "",
        primer_apellido: "",
        segundo_apellido: "",
        telefono: "",
        correo: "",
        password: "",
      });
      setSelectedStationId("");
      setSelectedMesas([]);
      await load();
      setAlert("Testigo creado correctamente.");
    } catch (err) {
      console.error(err);
      setAlert("No fue posible crear el testigo.");
    }
  };

  if (user?.role !== "COORDINADOR_ELECTORAL") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 font-weight-bold mb-0">Testigos electorales</h1>
          <p className="text-muted mb-0">Gestiona testigos en tu municipio asignado.</p>
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
            <div className="card-header">
              <h3 className="card-title">Nuevo testigo electoral</h3>
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
                <label>Correo</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.correo}
                  onChange={(e) => setForm((prev) => ({ ...prev, correo: e.target.value }))}
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
                  required
                />
              </div>
              <div className="form-group">
                <label>Puesto de votación</label>
                <select
                  className="form-control"
                  value={selectedStationId}
                  onChange={(e) => {
                    setSelectedStationId(e.target.value);
                    setSelectedMesas([]);
                  }}
                  required
                >
                  <option value="">Selecciona un puesto</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.puesto} - {station.direccion}
                    </option>
                  ))}
                </select>
                <small className="text-muted">Municipio asignado: {user?.municipio_operacion_nombre || "-"}</small>
              </div>
              <div className="form-group">
                <label>Mesas asignadas</label>
                {availableMesas.length ? (
                  <div className="d-flex flex-wrap" style={{ gap: "0.5rem" }}>
                    {availableMesas.map((mesa) => (
                      <div key={mesa} className="custom-control custom-checkbox">
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          id={`mesa-${mesa}`}
                          checked={selectedMesas.includes(mesa)}
                          onChange={() => toggleMesa(mesa)}
                        />
                        <label className="custom-control-label" htmlFor={`mesa-${mesa}`}>
                          Mesa {mesa}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted mb-0">
                    {mesasAlert || "Selecciona un puesto válido para listar las mesas."}
                  </p>
                )}
              </div>
              <button type="submit" className="btn btn-primary">
                <i className="fas fa-save mr-2" /> Crear testigo
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-8 col-12">
          <div className="card card-outline card-secondary">
            <div className="card-header">
              <h3 className="card-title">Testigos registrados</h3>
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
                      <th>Puesto</th>
                      <th>Mesas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {witnesses.map((witness) => (
                      <tr key={witness.id}>
                        <td>{witness.name}</td>
                        <td>{witness.email}</td>
                        <td>{witness.telefono || "-"}</td>
                        <td>{witness.municipio_nombre || "-"}</td>
                        <td>{witness.puesto_nombre || "-"}</td>
                        <td>{witness.mesas?.length ? witness.mesas.join(", ") : "-"}</td>
                      </tr>
                    ))}
                    {!witnesses.length && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          Aún no hay testigos registrados.
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

export default WitnessesPage;
