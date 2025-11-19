import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

type Departamento = { id: number; nombre: string };
type Municipio = {
  id: number;
  nombre: string;
  departamento: number;
  departamento_detalle?: Departamento;
  lat?: number;
  lon?: number;
};
type Zona = {
  id: number;
  nombre: string;
  tipo: string;
  municipio: Municipio;
  lat?: number;
  lon?: number;
  meta?: { meta_encuestas: number } | null;
};

const zoneTypes = [
  { value: "COMUNA", label: "Comuna" },
  { value: "CORREGIMIENTO", label: "Corregimiento" },
  { value: "BARRIO", label: "Barrio" },
  { value: "VEREDA", label: "Vereda" },
];

const TerritoryPage = () => {
  const { user } = useAuth();
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [munForm, setMunForm] = useState({ nombre: "", departamento_id: "", lat: "", lon: "" });
  const [zonaForm, setZonaForm] = useState({ nombre: "", tipo: "VEREDA", municipio_id: "", lat: "", lon: "", meta: "" });
  const [alert, setAlert] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setAlert(null);
      try {
        const [depsRes, munRes, zonasRes] = await Promise.all([
          api.get<Departamento[]>("/departamentos/"),
          api.get<Municipio[]>("/municipios/"),
          api.get<Zona[]>("/zonas/"),
        ]);
        setDepartamentos(depsRes.data);
        setMunicipios(munRes.data);
        setZonas(zonasRes.data);
      } catch (err) {
        console.error(err);
        setAlert("No fue posible cargar los catálogos de territorio.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const refreshMunicipios = async () => {
    const { data } = await api.get<Municipio[]>("/municipios/");
    setMunicipios(data);
  };

  const refreshZonas = async () => {
    const { data } = await api.get<Zona[]>("/zonas/");
    setZonas(data);
  };

  const handleMunicipioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    try {
      await api.post("/municipios/", {
        nombre: munForm.nombre,
        departamento_id: munForm.departamento_id || null,
        lat: munForm.lat || null,
        lon: munForm.lon || null,
      });
      setMunForm({ nombre: "", departamento_id: "", lat: "", lon: "" });
      setAlert("Municipio creado correctamente.");
      await refreshMunicipios();
    } catch (err) {
      console.error(err);
      setAlert("No fue posible crear el municipio.");
    }
  };

  const handleZonaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    try {
      const { data } = await api.post<Zona>("/zonas/", {
        nombre: zonaForm.nombre,
        tipo: zonaForm.tipo,
        municipio_id: zonaForm.municipio_id,
        lat: zonaForm.lat || null,
        lon: zonaForm.lon || null,
      });
      if (zonaForm.meta) {
        await api.patch(`/zonas/${data.id}/meta/`, { meta_encuestas: Number(zonaForm.meta) });
      }
      setZonaForm({ nombre: "", tipo: "VEREDA", municipio_id: "", lat: "", lon: "", meta: "" });
      setAlert("Zona guardada correctamente.");
      await refreshZonas();
    } catch (err) {
      console.error(err);
      setAlert("No fue posible crear la zona.");
    }
  };

  const municipiosPorDepartamento = useMemo(() => {
    const grouped: Record<number, Municipio[]> = {};
    municipios.forEach((m) => {
      const depId = m.departamento || m.departamento_detalle?.id || 0;
      if (!grouped[depId]) grouped[depId] = [];
      grouped[depId].push(m);
    });
    return grouped;
  }, [municipios]);

  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 font-weight-bold mb-0">Gestión de territorio</h1>
          <p className="text-muted mb-0">Administra municipios y zonas (veredas, barrios, comunas).</p>
        </div>
        {loading && <span className="badge badge-info">Cargando...</span>}
      </div>

      {alert && (
        <div className="alert alert-info" role="alert">
          {alert}
        </div>
      )}

      <div className="row">
        <div className="col-lg-5 col-12">
          <div className="card card-primary card-outline mb-3">
            <div className="card-header">
              <h3 className="card-title">Nuevo municipio</h3>
            </div>
            <form className="card-body" onSubmit={handleMunicipioSubmit}>
              <div className="form-group">
                <label>Departamento</label>
                <select
                  className="form-control"
                  value={munForm.departamento_id}
                  onChange={(e) => setMunForm((prev) => ({ ...prev, departamento_id: e.target.value }))}
                  required
                >
                  <option value="">Seleccione</option>
                  {departamentos.map((dep) => (
                    <option key={dep.id} value={dep.id}>
                      {dep.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nombre</label>
                <input
                  className="form-control"
                  value={munForm.nombre}
                  onChange={(e) => setMunForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  required
                  placeholder="Municipio"
                />
              </div>
              <div className="form-row">
                <div className="form-group col-md-6">
                  <label>Latitud</label>
                  <input
                    className="form-control"
                    value={munForm.lat}
                    onChange={(e) => setMunForm((prev) => ({ ...prev, lat: e.target.value }))}
                    placeholder="Ej: 6.2476"
                  />
                </div>
                <div className="form-group col-md-6">
                  <label>Longitud</label>
                  <input
                    className="form-control"
                    value={munForm.lon}
                    onChange={(e) => setMunForm((prev) => ({ ...prev, lon: e.target.value }))}
                    placeholder="Ej: -75.5658"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                <i className="fas fa-save mr-2" /> Guardar municipio
              </button>
            </form>
          </div>

          <div className="card card-success card-outline">
            <div className="card-header">
              <h3 className="card-title">Nueva zona / vereda</h3>
            </div>
            <form className="card-body" onSubmit={handleZonaSubmit}>
              <div className="form-group">
                <label>Municipio</label>
                <select
                  className="form-control"
                  value={zonaForm.municipio_id}
                  onChange={(e) => setZonaForm((prev) => ({ ...prev, municipio_id: e.target.value }))}
                  required
                >
                  <option value="">Seleccione</option>
                  {municipios.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select
                  className="form-control"
                  value={zonaForm.tipo}
                  onChange={(e) => setZonaForm((prev) => ({ ...prev, tipo: e.target.value }))}
                >
                  {zoneTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nombre</label>
                <input
                  className="form-control"
                  value={zonaForm.nombre}
                  onChange={(e) => setZonaForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  required
                  placeholder="Nombre de la zona"
                />
              </div>
              <div className="form-row">
                <div className="form-group col-md-6">
                  <label>Latitud</label>
                  <input
                    className="form-control"
                    value={zonaForm.lat}
                    onChange={(e) => setZonaForm((prev) => ({ ...prev, lat: e.target.value }))}
                  />
                </div>
                <div className="form-group col-md-6">
                  <label>Longitud</label>
                  <input
                    className="form-control"
                    value={zonaForm.lon}
                    onChange={(e) => setZonaForm((prev) => ({ ...prev, lon: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Meta de encuestas (opcional)</label>
                <input
                  className="form-control"
                  type="number"
                  min={1}
                  value={zonaForm.meta}
                  onChange={(e) => setZonaForm((prev) => ({ ...prev, meta: e.target.value }))}
                  placeholder="10"
                />
              </div>
              <button type="submit" className="btn btn-success">
                <i className="fas fa-check mr-2" /> Guardar zona
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-7 col-12">
          <div className="card card-outline card-secondary">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">Zonas registradas</h3>
              <span className="badge badge-light">{zonas.length} zonas</span>
            </div>
            <div className="card-body table-responsive p-0" style={{ maxHeight: 600 }}>
              <table className="table table-hover text-nowrap">
                <thead>
                  <tr>
                    <th>Zona</th>
                    <th>Tipo</th>
                    <th>Municipio</th>
                    <th>Departamento</th>
                    <th>Meta</th>
                    <th>Ubicación</th>
                  </tr>
                </thead>
                <tbody>
                  {zonas.map((z) => (
                    <tr key={z.id}>
                      <td>{z.nombre}</td>
                      <td>
                        <span className="badge badge-info">{z.tipo}</span>
                      </td>
                      <td>{z.municipio?.nombre}</td>
                      <td>{z.municipio?.departamento_detalle?.nombre}</td>
                      <td>{z.meta?.meta_encuestas ?? "-"}</td>
                      <td className="text-muted text-sm">
                        {z.lat && z.lon ? (
                          <span>
                            {z.lat}, {z.lon}
                          </span>
                        ) : (
                          <em>Sin coordenadas</em>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card card-outline card-info">
            <div className="card-header">
              <h3 className="card-title">Municipios registrados</h3>
            </div>
            <div className="card-body table-responsive p-0" style={{ maxHeight: 280 }}>
              <table className="table table-striped text-nowrap">
                <thead>
                  <tr>
                    <th>Municipio</th>
                    <th>Departamento</th>
                    <th>Coordenadas</th>
                    <th>Veredas/Zonas</th>
                  </tr>
                </thead>
                <tbody>
                  {departamentos.flatMap((dep) => (municipiosPorDepartamento[dep.id] || []).map((m) => (
                    <tr key={`${dep.id}-${m.id}`}>
                      <td>{m.nombre}</td>
                      <td>{dep.nombre}</td>
                      <td className="text-muted text-sm">
                        {m.lat && m.lon ? (
                          <span>
                            {m.lat}, {m.lon}
                          </span>
                        ) : (
                          <em>Sin coordenadas</em>
                        )}
                      </td>
                      <td>{(zonas.filter((z) => z.municipio?.id === m.id) || []).length}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerritoryPage;
