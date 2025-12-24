import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { usePollingStations } from "../context/PollingStationsContext";

interface ParsedStation {
  departamento: string;
  municipio: string;
  puesto: string;
  mesas: string;
  direccion: string;
  latitud: number;
  longitud: number;
  rowNumber: number;
}

const REQUIRED_HEADERS = ["departamento", "municipio", "puesto", "mesas", "direccion", "latitud", "longitud"];

const normalizeHeader = (value: unknown) => String(value || "").trim().toLowerCase();

const PuestosVotacionPage = () => {
  const { stations, loading, error, fetchStations, createStations, deleteStation } = usePollingStations();
  const [pendingStations, setPendingStations] = useState<ParsedStation[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "danger" | "warning"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  useEffect(() => {
    if (!stations.length) {
      fetchStations();
    }
  }, [fetchStations, stations.length]);

  const handleFile = async (file: File) => {
    setMessage(null);
    setUploadErrors([]);
    setPendingStations([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setUploadErrors(["El archivo no contiene hojas válidas."]);
        return;
      }
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: "" });
      if (rows.length < 2) {
        setUploadErrors(["El archivo debe contener al menos una fila de datos."]);
        return;
      }

      const headers = rows[0].map(normalizeHeader);
      const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
      if (missing.length) {
        setUploadErrors([`Faltan columnas requeridas: ${missing.join(", ")}.`]);
        return;
      }

      const indices = {
        departamento: headers.indexOf("departamento"),
        municipio: headers.indexOf("municipio"),
        puesto: headers.indexOf("puesto"),
        mesas: headers.indexOf("mesas"),
        direccion: headers.indexOf("direccion"),
        latitud: headers.indexOf("latitud"),
        longitud: headers.indexOf("longitud"),
      };

      const errors: string[] = [];
      const parsed: ParsedStation[] = [];
      const seen = new Set<string>();

      rows.slice(1).forEach((row, idx) => {
        const rowNumber = idx + 2;
        const departamento = String(row[indices.departamento] ?? "").trim();
        const municipio = String(row[indices.municipio] ?? "").trim();
        const puesto = String(row[indices.puesto] ?? "").trim();
        const mesasValue = row[indices.mesas];
        const mesas = String(mesasValue ?? "").trim();
        const direccion = String(row[indices.direccion] ?? "").trim();
        const latValue = row[indices.latitud];
        const lonValue = row[indices.longitud];
        const latitud = Number(latValue);
        const longitud = Number(lonValue);

        if (!departamento) {
          errors.push(`Fila ${rowNumber}: El departamento es obligatorio.`);
          return;
        }
        if (!municipio) {
          errors.push(`Fila ${rowNumber}: El municipio es obligatorio.`);
          return;
        }
        if (!puesto) {
          errors.push(`Fila ${rowNumber}: El puesto es obligatorio.`);
          return;
        }
        if (!mesas) {
          errors.push(`Fila ${rowNumber}: Las mesas son obligatorias.`);
          return;
        }
        if (!direccion) {
          errors.push(`Fila ${rowNumber}: La dirección es obligatoria.`);
          return;
        }
        if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
          errors.push(`Fila ${rowNumber}: Latitud y longitud deben ser numéricas.`);
          return;
        }
        if (latitud < -90 || latitud > 90) {
          errors.push(`Fila ${rowNumber}: La latitud debe estar entre -90 y 90.`);
          return;
        }
        if (longitud < -180 || longitud > 180) {
          errors.push(`Fila ${rowNumber}: La longitud debe estar entre -180 y 180.`);
          return;
        }

        const key = `${departamento.toLowerCase()}-${municipio.toLowerCase()}-${puesto.toLowerCase()}-${mesas}-${direccion.toLowerCase()}-${latitud}-${longitud}`;
        if (seen.has(key)) {
          errors.push(`Fila ${rowNumber}: Registro duplicado en el archivo.`);
          return;
        }
        seen.add(key);
        parsed.push({
          departamento,
          municipio,
          puesto,
          mesas,
          direccion,
          latitud,
          longitud,
          rowNumber,
        });
      });

      setUploadErrors(errors);
      setPendingStations(parsed);
    } catch (err) {
      console.error(err);
      setUploadErrors(["No pudimos leer el archivo. Verifica que sea .xlsx válido."]);
    }
  };

  const handleUpload = async () => {
    if (!pendingStations.length) {
      setMessage({ type: "warning", text: "No hay filas válidas para cargar." });
      return;
    }
    setSubmitting(true);
    setMessage(null);

    const { created, errors } = await createStations(
      pendingStations.map((station) => ({
        nombre: station.puesto,
        departamento: station.departamento,
        municipio: station.municipio,
        puesto: station.puesto,
        mesas: station.mesas,
        direccion: station.direccion,
        latitud: station.latitud,
        longitud: station.longitud,
      }))
    );

    const backendErrors = errors.map((err) => {
      const rowNumber = pendingStations[err.index]?.rowNumber ?? err.index + 2;
      return `Fila ${rowNumber}: ${err.mensaje}`;
    });

    if (created) {
      setMessage({ type: "success", text: `${created} puestos registrados correctamente.` });
    } else if (backendErrors.length) {
      setMessage({ type: "danger", text: "No se registraron puestos. Revisa los errores." });
    }

    setUploadErrors((prev) => [...prev, ...backendErrors]);
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    setMessage(null);
    try {
      await deleteStation(id);
      setMessage({ type: "success", text: "Puesto eliminado correctamente." });
    } catch (err) {
      console.error(err);
      setMessage({ type: "danger", text: "No pudimos eliminar el puesto." });
    }
  };

  const parsedSummary = useMemo(() => {
    if (!pendingStations.length) return "";
    return `${pendingStations.length} filas válidas listas para cargar.`;
  }, [pendingStations.length]);

  return (
    <div className="pb-4">
      <div className="row mb-3">
        <div className="col-12">
          <h1 className="h4 text-dark font-weight-bold">Puestos de votación</h1>
          <p className="text-muted">Carga y gestiona puestos desde archivos Excel.</p>
        </div>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row">
        <div className="col-lg-4 col-12 mb-3">
          <div className="card card-primary card-outline h-100">
            <div className="card-header">
              <h3 className="card-title">Carga desde Excel</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>Archivo (.xlsx)</label>
                <input
                  type="file"
                  accept=".xlsx"
                  className="form-control"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setSelectedFileName(file?.name || "");
                    if (file) {
                      void handleFile(file);
                    }
                  }}
                />
                {selectedFileName && <small className="text-muted">{selectedFileName}</small>}
              </div>
              {parsedSummary && <div className="alert alert-info py-2">{parsedSummary}</div>}
              <button
                className="btn btn-primary btn-block"
                type="button"
                onClick={handleUpload}
                disabled={submitting || !pendingStations.length}
              >
                {submitting ? "Cargando..." : "Registrar puestos"}
              </button>
              <div className="text-muted small mt-3">
                Columnas requeridas: <strong>departamento</strong>, <strong>municipio</strong>, <strong>puesto</strong>,{" "}
                <strong>mesas</strong>, <strong>direccion</strong>, <strong>latitud</strong>,{" "}
                <strong>longitud</strong>.
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-8 col-12 mb-3">
          <div className="card card-secondary card-outline h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">Listado de puestos</h3>
              <span className="badge badge-secondary">{stations.length} registros</span>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="p-3">Cargando puestos...</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Departamento</th>
                        <th>Municipio</th>
                        <th>Puesto</th>
                        <th>Mesas</th>
                        <th>Dirección</th>
                        <th>Latitud</th>
                        <th>Longitud</th>
                        <th>Creado por</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {stations.map((station) => (
                        <tr key={station.id}>
                          <td>{station.departamento}</td>
                          <td>{station.municipio}</td>
                          <td>{station.puesto}</td>
                          <td>{station.mesas}</td>
                          <td>{station.direccion}</td>
                          <td>{Number(station.latitud).toFixed(6)}</td>
                          <td>{Number(station.longitud).toFixed(6)}</td>
                          <td>{station.creado_por_nombre}</td>
                          <td className="text-right">
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => void handleDelete(station.id)}
                            >
                              <i className="fas fa-trash" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!stations.length && (
                        <tr>
                          <td colSpan={9} className="text-center text-muted py-4">
                            Aún no hay puestos registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {uploadErrors.length > 0 && (
        <div className="card card-warning card-outline">
          <div className="card-header">
            <h3 className="card-title">Errores encontrados</h3>
          </div>
          <div className="card-body">
            <ul className="mb-0">
              {uploadErrors.map((err, index) => (
                <li key={`${err}-${index}`}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuestosVotacionPage;
