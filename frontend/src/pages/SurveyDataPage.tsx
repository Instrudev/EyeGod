import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface SurveyNeed {
  prioridad: number;
  necesidad: { id: number; nombre: string };
}

interface SurveyRow {
  id: number;
  zona: number;
  zona_nombre?: string;
  municipio_nombre?: string;
  colaborador_nombre?: string;
  fecha_hora: string;
  cedula?: string | null;
  primer_nombre?: string | null;
  segundo_nombre?: string | null;
  primer_apellido?: string | null;
  segundo_apellido?: string | null;
  telefono: string;
  correo?: string | null;
  sexo?: string | null;
  pais?: string | null;
  departamento?: string | null;
  municipio?: string | null;
  puesto?: string | null;
  mesa?: string | null;
  tipo_vivienda: string;
  rango_edad: string;
  ocupacion: string;
  caso_critico: boolean;
  necesidades: SurveyNeed[];
  estado_validacion: "PENDIENTE" | "VALIDADO" | "NO_VALIDADO" | "VALIDADO_AJUSTADO";
}

interface ValidationPreviewItem {
  registro_id: number;
  cedula: string;
  match: boolean;
  current: Record<string, string | number | null>;
  proposed: Record<string, string | number | null> | null;
  changes: Record<string, boolean>;
}

interface ValidationSummary {
  total: number;
  validados: number;
  no_encontrados: number;
  cancelados: number;
  errores: number;
}

const SurveyDataPage = () => {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>("");
  const [cedulaFilter, setCedulaFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [sortKey, setSortKey] = useState<
    "fecha" | "colaborador" | "ciudadano" | "departamento" | "municipio" | "puesto" | "mesa" | "telefono" | "correo"
  >("fecha");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingSurvey, setEditingSurvey] = useState<SurveyRow | null>(null);
  const [editForm, setEditForm] = useState({
    cedula: "",
    primer_nombre: "",
    segundo_nombre: "",
    primer_apellido: "",
    segundo_apellido: "",
    telefono: "",
    correo: "",
    pais: "",
    departamento: "",
    municipio: "",
    puesto: "",
    mesa: "",
    sexo: "",
  });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [previewItems, setPreviewItems] = useState<ValidationPreviewItem[]>([]);
  const [previewSummary, setPreviewSummary] = useState<{ total: number; matches: number; no_match: number } | null>(
    null
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "danger" | "warning"; text: string } | null>(
    null
  );
  const [actionSummary, setActionSummary] = useState<ValidationSummary | null>(null);

  useEffect(() => {
    const fetchSurveys = async () => {
      if (user?.role !== "ADMIN") return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<SurveyRow[]>("/encuestas/");
        setSurveys(data);
      } catch (err) {
        console.error(err);
        setError("No fue posible cargar las encuestas");
      } finally {
        setLoading(false);
      }
    };
    fetchSurveys();
  }, [user]);

  const municipiosDisponibles = useMemo(
    () =>
      Array.from(new Set(surveys.map((s) => s.municipio_nombre).filter(Boolean))) as string[],
    [surveys]
  );

  const filteredSurveys = useMemo(() => {
    if (!selectedMunicipio) return surveys;
    return surveys.filter((s) => s.municipio_nombre === selectedMunicipio);
  }, [selectedMunicipio, surveys]);

  const buildCitizenName = (survey: SurveyRow) =>
    [survey.primer_nombre, survey.segundo_nombre, survey.primer_apellido, survey.segundo_apellido]
      .filter(Boolean)
      .join(" ");

  const filteredByCedula = useMemo(() => {
    if (!cedulaFilter.trim()) return filteredSurveys;
    const needle = cedulaFilter.trim();
    return filteredSurveys.filter((survey) => (survey.cedula ?? "").includes(needle));
  }, [cedulaFilter, filteredSurveys]);

  const filteredBySearch = useMemo(() => {
    if (!searchFilter.trim()) return filteredByCedula;
    const needle = searchFilter.trim().toLowerCase();
    return filteredByCedula.filter((survey) => {
      const citizen = buildCitizenName(survey).toLowerCase();
      const colaborador = survey.colaborador_nombre?.toLowerCase() || "";
      const departamento = survey.departamento?.toLowerCase() || "";
      const municipio = survey.municipio?.toLowerCase() || "";
      const puesto = survey.puesto?.toLowerCase() || "";
      const mesa = survey.mesa?.toLowerCase() || "";
      const telefono = survey.telefono?.toLowerCase() || "";
      const correo = survey.correo?.toLowerCase() || "";
      return (
        citizen.includes(needle) ||
        colaborador.includes(needle) ||
        departamento.includes(needle) ||
        municipio.includes(needle) ||
        puesto.includes(needle) ||
        mesa.includes(needle) ||
        telefono.includes(needle) ||
        correo.includes(needle)
      );
    });
  }, [filteredByCedula, searchFilter]);

  const sortedSurveys = useMemo(() => {
    const sorted = [...filteredBySearch];
    const getValue = (survey: SurveyRow) => {
      switch (sortKey) {
        case "fecha":
          return new Date(survey.fecha_hora).getTime();
        case "colaborador":
          return survey.colaborador_nombre ?? "";
        case "ciudadano":
          return buildCitizenName(survey);
        case "departamento":
          return survey.departamento ?? "";
        case "municipio":
          return survey.municipio ?? "";
        case "puesto":
          return survey.puesto ?? "";
        case "mesa":
          return survey.mesa ?? "";
        case "telefono":
          return survey.telefono ?? "";
        case "correo":
          return survey.correo ?? "";
        default:
          return "";
      }
    };
    sorted.sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      return sortDirection === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
    return sorted;
  }, [filteredBySearch, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedSurveys.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSurveys = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedSurveys.slice(start, start + pageSize);
  }, [pageSize, safePage, sortedSurveys]);

  const handleSort = (
    key:
      | "fecha"
      | "colaborador"
      | "ciudadano"
      | "departamento"
      | "municipio"
      | "puesto"
      | "mesa"
      | "telefono"
      | "correo"
  ) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startEdit = (survey: SurveyRow) => {
    setEditingSurvey(survey);
    setEditForm({
      cedula: survey.cedula ?? "",
      primer_nombre: survey.primer_nombre ?? "",
      segundo_nombre: survey.segundo_nombre ?? "",
      primer_apellido: survey.primer_apellido ?? "",
      segundo_apellido: survey.segundo_apellido ?? "",
      telefono: survey.telefono ?? "",
      correo: survey.correo ?? "",
      pais: survey.pais ?? "",
      departamento: survey.departamento ?? "",
      municipio: survey.municipio ?? "",
      puesto: survey.puesto ?? "",
      mesa: survey.mesa ?? "",
      sexo: survey.sexo ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingSurvey(null);
  };

  const handleEditSubmit = async () => {
    if (!editingSurvey) return;
    if (!editForm.cedula.trim()) {
      setActionMessage({ type: "warning", text: "La cédula es obligatoria para guardar cambios." });
      return;
    }
    try {
      await api.patch(`/encuestas/${editingSurvey.id}/`, {
        cedula: editForm.cedula,
        primer_nombre: editForm.primer_nombre || null,
        segundo_nombre: editForm.segundo_nombre || null,
        primer_apellido: editForm.primer_apellido || null,
        segundo_apellido: editForm.segundo_apellido || null,
        telefono: editForm.telefono || null,
        correo: editForm.correo || null,
        pais: editForm.pais || null,
        departamento: editForm.departamento || null,
        municipio: editForm.municipio || null,
        puesto: editForm.puesto || null,
        mesa: editForm.mesa || null,
        sexo: editForm.sexo || null,
      });
      const refreshed = await api.get<SurveyRow[]>("/encuestas/");
      setSurveys(refreshed.data);
      setActionMessage({ type: "success", text: "Registro actualizado correctamente." });
      setEditingSurvey(null);
    } catch (err) {
      console.error(err);
      setActionMessage({ type: "danger", text: "No pudimos actualizar el registro." });
    }
  };

  const handlePreview = async () => {
    if (!selectedIds.size) {
      setActionMessage({ type: "warning", text: "Selecciona al menos un registro para validar." });
      return;
    }
    setPreviewLoading(true);
    setActionMessage(null);
    setActionSummary(null);
    try {
      const { data } = await api.post<{ items: ValidationPreviewItem[]; summary: { total: number; matches: number; no_match: number } }>(
        "/encuestas/validaciones/previsualizar/",
        { ids: Array.from(selectedIds) }
      );
      setPreviewItems(data.items);
      setPreviewSummary(data.summary);
    } catch (err) {
      console.error(err);
      setActionMessage({ type: "danger", text: "No pudimos preparar la previsualización." });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCancelPreview = async () => {
    if (!selectedIds.size) return;
    try {
      const { data } = await api.post<{ summary: ValidationSummary }>("/encuestas/validaciones/cancelar/", {
        ids: Array.from(selectedIds),
        tipo_validacion: "MASIVA",
      });
      setActionSummary(data.summary);
      setActionMessage({ type: "warning", text: "Validación cancelada. Se registró la auditoría." });
    } catch (err) {
      console.error(err);
      setActionMessage({ type: "danger", text: "No pudimos cancelar la validación." });
    } finally {
      setPreviewItems([]);
      setPreviewSummary(null);
    }
  };

  const handleConfirmValidation = async () => {
    if (!selectedIds.size) return;
    try {
      const { data } = await api.post<{ summary: ValidationSummary }>("/encuestas/validaciones/confirmar/", {
        ids: Array.from(selectedIds),
        tipo_validacion: "MASIVA",
      });
      setActionSummary(data.summary);
      setActionMessage({ type: "success", text: "Validación aplicada correctamente." });
      const refreshed = await api.get<SurveyRow[]>("/encuestas/");
      setSurveys(refreshed.data);
    } catch (err) {
      console.error(err);
      setActionMessage({ type: "danger", text: "No pudimos aplicar la validación." });
    } finally {
      setPreviewItems([]);
      setPreviewSummary(null);
      setSelectedIds(new Set());
    }
  };
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (user?.role !== "ADMIN") {
    return (
      <div className="alert alert-warning mt-3">Solo los administradores pueden consultar el consolidado de encuestas.</div>
    );
  }

  return (
    <div className="pb-5">
      <div className="row mb-3">
        <div className="col-12">
          <h1 className="h4 text-dark font-weight-bold">Consolidado de encuestas</h1>
          <p className="text-muted">Consulta y filtra la información capturada en territorio.</p>
        </div>
      </div>
      {actionMessage && <div className={`alert alert-${actionMessage.type}`}>{actionMessage.text}</div>}
      {actionSummary && (
        <div className="alert alert-info">
          <div className="font-weight-bold mb-2">Resumen de validación</div>
          <div>Total seleccionados: {actionSummary.total}</div>
          <div>Total validados: {actionSummary.validados}</div>
          <div>Total no encontrados: {actionSummary.no_encontrados}</div>
          <div>Total cancelados: {actionSummary.cancelados}</div>
          <div>Errores: {actionSummary.errores}</div>
        </div>
      )}
      <div className="card card-primary card-outline">
        <div className="card-header d-flex justify-content-between align-items-center flex-wrap">
          <h3 className="card-title mb-0">Listado de encuestas</h3>
          <div className="form-inline">
            <label className="mr-2 mb-0">Municipio</label>
            <select
              className="form-control"
              value={selectedMunicipio}
              onChange={(e) => setSelectedMunicipio(e.target.value)}
            >
              <option value="">Todos</option>
              {municipiosDisponibles.map((muni) => (
                <option key={muni} value={muni}>
                  {muni}
                </option>
              ))}
            </select>
            <div className="input-group ml-3">
              <div className="input-group-prepend">
                <span className="input-group-text">Cédula</span>
              </div>
              <input
                className="form-control"
                value={cedulaFilter}
                onChange={(e) => setCedulaFilter(e.target.value)}
                placeholder="Filtrar por cédula"
              />
            </div>
            <div className="input-group ml-3">
              <div className="input-group-prepend">
                <span className="input-group-text">Buscar</span>
              </div>
              <input
                className="form-control"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar en tabla"
              />
            </div>
            <button className="btn btn-outline-primary ml-3" onClick={handlePreview} disabled={previewLoading}>
              {previewLoading ? "Preparando..." : "Validar registros"}
            </button>
            <button
              className="btn btn-outline-secondary ml-2"
              onClick={() => {
                if (selectedIds.size !== 1) {
                  setActionMessage({ type: "warning", text: "Selecciona un único registro para editar." });
                  return;
                }
                const target = surveys.find((survey) => selectedIds.has(survey.id));
                if (target) startEdit(target);
              }}
            >
              Editar registro
            </button>
          </div>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger py-2">{error}</div>}
          {loading ? (
            <p className="text-muted mb-0">Cargando encuestas...</p>
          ) : filteredBySearch.length === 0 ? (
            <p className="text-muted mb-0">No hay encuestas registradas para el filtro seleccionado.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("fecha")}>Fecha</th>
                    <th onClick={() => handleSort("colaborador")}>Colaborador</th>
                    <th onClick={() => handleSort("ciudadano")}>Ciudadano</th>
                    <th onClick={() => handleSort("departamento")}>Departamento</th>
                    <th onClick={() => handleSort("municipio")}>Municipio</th>
                    <th onClick={() => handleSort("puesto")}>Puesto</th>
                    <th onClick={() => handleSort("mesa")}>Mesa</th>
                    <th onClick={() => handleSort("telefono")}>Teléfono</th>
                    <th onClick={() => handleSort("correo")}>Correo</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSurveys.map((survey) => (
                    <tr
                      key={survey.id}
                      onClick={() => toggleSelection(survey.id)}
                      className={selectedIds.has(survey.id) ? "table-active" : ""}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{new Date(survey.fecha_hora).toLocaleString()}</td>
                      <td>{survey.colaborador_nombre ?? "-"}</td>
                      <td>{buildCitizenName(survey) || "-"}</td>
                      <td>{survey.departamento ?? "-"}</td>
                      <td>{survey.municipio ?? "-"}</td>
                      <td>{survey.puesto ?? "-"}</td>
                      <td>{survey.mesa ?? "-"}</td>
                      <td>{survey.telefono ?? "-"}</td>
                      <td>{survey.correo ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="text-muted small">
              Página {safePage} de {totalPages} · {sortedSurveys.length} registros
            </div>
            <div className="d-flex align-items-center" style={{ gap: "0.5rem" }}>
              <select
                className="form-control form-control-sm"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} por página
                  </option>
                ))}
              </select>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safePage === 1}
              >
                Anterior
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safePage === totalPages}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

      {previewItems.length > 0 && (
        <div className="card card-warning card-outline mt-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div>
              <h3 className="card-title">Previsualización de cambios</h3>
              {previewSummary && (
                <div className="text-muted small">
                  Total: {previewSummary.total} · Coincidencias: {previewSummary.matches} · Sin coincidencia: {previewSummary.no_match}
                </div>
              )}
            </div>
            <div>
              <button className="btn btn-outline-secondary mr-2" onClick={handleCancelPreview}>
                Cancelar
              </button>
              <button className="btn btn-success" onClick={handleConfirmValidation}>
                Confirmar validación
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Registro</th>
                    <th>Cédula</th>
                    <th>Resultado</th>
                    <th>Actual</th>
                    <th>Propuesto</th>
                  </tr>
                </thead>
                <tbody>
                  {previewItems.map((item) => (
                    <tr key={item.registro_id}>
                      <td>{item.registro_id}</td>
                      <td>{item.cedula || "-"}</td>
                      <td>
                        {item.match ? (
                          <span className="badge badge-success">Coincidencia</span>
                        ) : (
                          <span className="badge badge-secondary">Sin coincidencia</span>
                        )}
                      </td>
                      <td>
                        <ul className="list-unstyled mb-0">
                          {Object.entries(item.current).map(([key, value]) => (
                            <li key={`${item.registro_id}-current-${key}`}>
                              <strong>{key}</strong>: {value ?? "-"}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        {item.proposed ? (
                          <ul className="list-unstyled mb-0">
                            {Object.entries(item.proposed).map(([key, value]) => (
                              <li key={`${item.registro_id}-proposed-${key}`}>
                                <strong>{key}</strong>:{" "}
                                <span className={item.changes[key] ? "text-danger font-weight-bold" : ""}>
                                  {value ?? "-"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted">Sin datos maestros.</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editingSurvey && (
        <div className="card card-info card-outline mt-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h3 className="card-title mb-0">Editar registro #{editingSurvey.id}</h3>
            <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit}>
              Cerrar
            </button>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>Cédula</label>
              <input
                className="form-control"
                value={editForm.cedula}
                onChange={(e) => setEditForm((prev) => ({ ...prev, cedula: e.target.value.trim() }))}
                maxLength={15}
                required
                pattern="\d{1,15}"
              />
            </div>
            <div className="form-row">
              <div className="form-group col-md-6">
                <label>Primer nombre</label>
                <input
                  className="form-control"
                  value={editForm.primer_nombre}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, primer_nombre: e.target.value }))}
                />
              </div>
              <div className="form-group col-md-6">
                <label>Segundo nombre</label>
                <input
                  className="form-control"
                  value={editForm.segundo_nombre}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, segundo_nombre: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group col-md-6">
                <label>Primer apellido</label>
                <input
                  className="form-control"
                  value={editForm.primer_apellido}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, primer_apellido: e.target.value }))}
                />
              </div>
              <div className="form-group col-md-6">
                <label>Segundo apellido</label>
                <input
                  className="form-control"
                  value={editForm.segundo_apellido}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, segundo_apellido: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group col-md-6">
                <label>Teléfono</label>
                <input
                  className="form-control"
                  value={editForm.telefono}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, telefono: e.target.value }))}
                />
              </div>
              <div className="form-group col-md-6">
                <label>Correo</label>
                <input
                  type="email"
                  className="form-control"
                  value={editForm.correo}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, correo: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group col-md-4">
                <label>País</label>
                <input
                  className="form-control"
                  value={editForm.pais}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, pais: e.target.value }))}
                />
              </div>
              <div className="form-group col-md-4">
                <label>Departamento</label>
                <input
                  className="form-control"
                  value={editForm.departamento}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, departamento: e.target.value }))}
                />
              </div>
              <div className="form-group col-md-4">
                <label>Municipio</label>
                <input
                  className="form-control"
                  value={editForm.municipio}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, municipio: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group col-md-4">
                <label>Puesto</label>
                <input
                  className="form-control"
                  value={editForm.puesto}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, puesto: e.target.value }))}
                />
              </div>
              <div className="form-group col-md-4">
                <label>Mesa</label>
                <input
                  className="form-control"
                  value={editForm.mesa}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, mesa: e.target.value }))}
                />
              </div>
              <div className="form-group col-md-4">
                <label>Sexo</label>
                <input
                  className="form-control"
                  value={editForm.sexo}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, sexo: e.target.value }))}
                />
              </div>
            </div>
            <button className="btn btn-success" onClick={handleEditSubmit}>
              Guardar cambios
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyDataPage;
