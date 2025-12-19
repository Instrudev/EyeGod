import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Zona {
  id: number;
  nombre: string;
  municipio?: {
    id: number;
    nombre: string;
  };
}

interface ZonaAsignada {
  id: number;
  zona_id: number;
  zona_nombre: string;
  municipio_id: number;
  municipio_nombre: string;
}

interface Municipio {
  id: number;
  nombre: string;
}

interface Necesidad {
  id: number;
  nombre: string;
}

interface SurveyNeedForm {
  prioridad: number;
  necesidad_id: string;
}

const viviendaOptions = [
  { value: "PROPIA", label: "Propia" },
  { value: "ARRIENDO", label: "Arriendo" },
  { value: "FAMILIAR", label: "Familiar" },
  { value: "OTRO", label: "Otro" },
];

const edadOptions = [
  { value: "14-25", label: "14-25" },
  { value: "26-40", label: "26-40" },
  { value: "41-60", label: "41-60" },
  { value: "60+", label: "60+" },
];

const ocupacionOptions = [
  { value: "ESTUDIANTE", label: "Estudiante" },
  { value: "EMPLEADO", label: "Empleado" },
  { value: "INDEPENDIENTE", label: "Independiente" },
  { value: "DESEMPLEADO", label: "Desempleado" },
  { value: "AGRICULTOR", label: "Agricultor" },
  { value: "OTRO", label: "Otro" },
];

const afinidadOptions = [
  { value: "1", label: "Totalmente de acuerdo" },
  { value: "2", label: "De acuerdo" },
  { value: "3", label: "Indeciso" },
  { value: "4", label: "En desacuerdo" },
  { value: "5", label: "Totalmente en desacuerdo" },
];

const disposicionOptions = [
  { value: "1", label: "Seguro vota" },
  { value: "2", label: "Tal vez vota" },
  { value: "3", label: "No vota" },
];

const influenciaOptions = [
  { value: "0", label: "Ninguna" },
  { value: "1", label: "1-2 personas" },
  { value: "2", label: "3-5 personas" },
  { value: "3", label: "Más de 5 personas" },
];

const SurveyPage = () => {
  const { user } = useAuth();
  const isCollaborator = user?.role === "COLABORADOR";
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [selectedMunicipio, setSelectedMunicipio] = useState("");
  const [newZonaNombre, setNewZonaNombre] = useState("");
  const [newZonaTipo, setNewZonaTipo] = useState("VEREDA");
  const [creatingZona, setCreatingZona] = useState(false);
  const [showZonaCreator, setShowZonaCreator] = useState(false);
  const [necesidades, setNecesidades] = useState<Necesidad[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({
    zona: "",
    nombre_ciudadano: "",
    cedula: "",
    telefono: "",
    tipo_vivienda: viviendaOptions[0].value,
    rango_edad: edadOptions[0].value,
    ocupacion: ocupacionOptions[0].value,
    nivel_afinidad: "",
    disposicion_voto: "",
    capacidad_influencia: "",
    tiene_ninos: false,
    tiene_adultos_mayores: false,
    tiene_personas_con_discapacidad: false,
    comentario_problema: "",
    consentimiento: false,
    caso_critico: false,
    lat: "",
    lon: "",
    necesidades: [{ prioridad: 1, necesidad_id: "" }] as SurveyNeedForm[],
  });

  useEffect(() => {
    const load = async () => {
      try {
        if (isCollaborator) {
          const [asignacionesRes, necesidadRes] = await Promise.all([
            api.get<ZonaAsignada[]>("/asignaciones/"),
            api.get<Necesidad[]>("/necesidades/"),
          ]);
          const zonasUnicasMap = new Map<number, Zona>();
          asignacionesRes.data.forEach((asig) => {
            zonasUnicasMap.set(asig.zona_id, {
              id: asig.zona_id,
              nombre: asig.zona_nombre,
              municipio: { id: asig.municipio_id, nombre: asig.municipio_nombre },
            });
          });
          const zonasAsignadas = Array.from(zonasUnicasMap.values());
          const municipiosAsignadosMap = new Map<number, Municipio>();
          zonasAsignadas.forEach((zona) => {
            if (zona.municipio) {
              municipiosAsignadosMap.set(zona.municipio.id, zona.municipio);
            }
          });
          setZonas(zonasAsignadas);
          setMunicipios(Array.from(municipiosAsignadosMap.values()));
          setNecesidades(necesidadRes.data);
          if (zonasAsignadas.length === 0) {
            setError(
              "No tienes zonas asignadas. Solicita a tu líder o administrador que te asigne una zona."
            );
          }
        } else {
          const [municipioRes, zonaRes, necesidadRes] = await Promise.all([
            api.get<Municipio[]>("/municipios/"),
            api.get<Zona[]>("/zonas/"),
            api.get<Necesidad[]>("/necesidades/"),
          ]);
          setMunicipios(municipioRes.data);
          setZonas(zonaRes.data);
          setNecesidades(necesidadRes.data);
        }
      } catch (err) {
        console.error(err);
        setError("No fue posible cargar la información base");
      }
    };
    if (user) {
      load();
    }
  }, [isCollaborator, user]);

  const updateNeed = (index: number, field: keyof SurveyNeedForm, value: string | number) => {
    setForm((prev) => {
      const copy = [...prev.necesidades];
      copy[index] = { ...copy[index], [field]: value } as SurveyNeedForm;
      return { ...prev, necesidades: copy };
    });
  };

  const selectedZona = zonas.find((zona) => String(zona.id) === form.zona);

  const filteredZonas = useMemo(() => {
    if (!selectedMunicipio) return zonas;
    return zonas.filter((z) => z.municipio?.id === Number(selectedMunicipio));
  }, [selectedMunicipio, zonas]);

  useEffect(() => {
    if (isCollaborator || !selectedMunicipio) {
      setShowZonaCreator(false);
      return;
    }
    if (selectedMunicipio && filteredZonas.length === 0) {
      setShowZonaCreator(true);
    }
  }, [filteredZonas, isCollaborator, selectedMunicipio]);

  const selectedMunicipioObj = useMemo(
    () => municipios.find((m) => String(m.id) === selectedMunicipio),
    [municipios, selectedMunicipio]
  );

  const selectedNeedIds = useMemo(
    () =>
      form.necesidades
        .map((item) => item.necesidad_id)
        .filter(Boolean)
        .map(Number),
    [form.necesidades]
  );

  const canAddNeed =
    form.necesidades.length < 3 &&
    necesidades.some((n) => !selectedNeedIds.includes(n.id));

  const municipioNombre =
    selectedZona?.municipio?.nombre || selectedMunicipioObj?.nombre || "Selecciona una zona para ver el municipio";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.zona) {
      setError("Debes seleccionar una zona");
      return;
    }
    if (!/^\d{1,15}$/.test(form.cedula)) {
      setError("La cédula es obligatoria y solo admite números (máx. 15).");
      return;
    }
    if (!form.nivel_afinidad || !form.disposicion_voto || form.capacidad_influencia === "") {
      setError("Selecciona afinidad, disposición de voto y capacidad de influencia.");
      return;
    }
    const validNeeds = form.necesidades.filter((item) => item.necesidad_id);
    if (!validNeeds.length) {
      setError("Selecciona al menos una necesidad");
      return;
    }
    if (!form.consentimiento) {
      setError("Debes contar con consentimiento informado");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post("/encuestas/", {
        zona: Number(form.zona),
        nombre_ciudadano: form.nombre_ciudadano || null,
        cedula: form.cedula,
        telefono: form.telefono,
        tipo_vivienda: form.tipo_vivienda,
        rango_edad: form.rango_edad,
        ocupacion: form.ocupacion,
        tiene_ninos: form.tiene_ninos,
        tiene_adultos_mayores: form.tiene_adultos_mayores,
        tiene_personas_con_discapacidad: form.tiene_personas_con_discapacidad,
        comentario_problema: form.comentario_problema || null,
        consentimiento: form.consentimiento,
        caso_critico: form.caso_critico,
        nivel_afinidad: Number(form.nivel_afinidad),
        disposicion_voto: Number(form.disposicion_voto),
        capacidad_influencia: Number(form.capacidad_influencia),
        lat: form.lat ? Number(form.lat) : null,
        lon: form.lon ? Number(form.lon) : null,
        necesidades: validNeeds.map((item) => ({ prioridad: item.prioridad, necesidad_id: Number(item.necesidad_id) })),
      });
      setMessage("Encuesta registrada con éxito");
      setSelectedMunicipio("");
      setForm({
        zona: "",
        nombre_ciudadano: "",
        cedula: "",
        telefono: "",
        tipo_vivienda: viviendaOptions[0].value,
        rango_edad: edadOptions[0].value,
        ocupacion: ocupacionOptions[0].value,
        nivel_afinidad: "",
        disposicion_voto: "",
        capacidad_influencia: "",
        tiene_ninos: false,
        tiene_adultos_mayores: false,
        tiene_personas_con_discapacidad: false,
        comentario_problema: "",
        consentimiento: false,
        caso_critico: false,
        lat: "",
        lon: "",
        necesidades: [{ prioridad: 1, necesidad_id: "" }],
      });
    } catch (err) {
      console.error(err);
      setError("No fue posible guardar la encuesta. Revisa los datos");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateZona = async () => {
    if (isCollaborator) {
      setError("No puedes crear zonas. Solicita el apoyo de un líder o administrador.");
      return;
    }
    if (!selectedMunicipio) {
      setError("Selecciona un municipio antes de agregar zonas");
      return;
    }
    if (!newZonaNombre.trim()) {
      setError("El nombre de la zona es obligatorio");
      return;
    }
    setCreatingZona(true);
    setError(null);
    try {
      const payload = {
        nombre: newZonaNombre,
        tipo: newZonaTipo,
        municipio_id: selectedMunicipio,
        lat: null,
        lon: null,
      };
      const { data } = await api.post<Zona>("/zonas/", payload);
      setZonas((prev) => [...prev, data]);
      setForm((prev) => ({ ...prev, zona: String(data.id) }));
      setMessage("Zona creada correctamente");
      setNewZonaNombre("");
      setNewZonaTipo("VEREDA");
      setShowZonaCreator(false);
    } catch (err) {
      console.error(err);
      setError("No fue posible crear la nueva zona");
    } finally {
      setCreatingZona(false);
    }
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError("La geolocalización no es compatible con tu dispositivo");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toString(),
          lon: pos.coords.longitude.toString(),
        }));
        setLocating(false);
      },
      (err) => {
        console.error(err);
        setError("No fue posible obtener la ubicación");
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="pb-5">
      <div className="row mb-3">
        <div className="col-12">
          <h1 className="h4 text-dark font-weight-bold">Nueva encuesta</h1>
          <p className="text-muted">Formulario optimizado para diligenciamiento en campo.</p>
        </div>
      </div>
      <div className="row">
        <div className="col-lg-8">
          <div className="card card-primary card-outline">
            <div className="card-body">
              {message && <div className="alert alert-success py-2">{message}</div>}
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label>Municipio</label>
                    <select
                      className="form-control"
                      value={selectedMunicipio}
                      onChange={(e) => {
                        setSelectedMunicipio(e.target.value);
                        setNewZonaNombre("");
                        setNewZonaTipo("VEREDA");
                        setForm((prev) => ({ ...prev, zona: "" }));
                      }}
                    >
                      <option value="">Selecciona un municipio</option>
                      {municipios.map((muni) => (
                        <option key={muni.id} value={muni.id}>
                          {muni.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group col-md-6">
                    <label>Zona</label>
                    <select
                      className="form-control"
                      value={form.zona}
                      onChange={(e) => setForm({ ...form, zona: e.target.value })}
                      disabled={!selectedMunicipio || !filteredZonas.length}
                    >
                      <option value="">{selectedMunicipio ? "Selecciona una zona" : "Selecciona un municipio"}</option>
                      {filteredZonas.map((zona) => (
                        <option key={zona.id} value={zona.id}>
                          {zona.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {isCollaborator && (
                  <p className="text-muted small">Solo se listan los municipios y zonas asignadas a tu usuario.</p>
                )}
                {selectedMunicipio && !isCollaborator && (
                  <div className="mb-3">
                    <button
                      type="button"
                      className="btn btn-link p-0"
                      onClick={() => setShowZonaCreator((prev) => !prev)}
                    >
                      <i className="fas fa-plus mr-1" />
                      {showZonaCreator ? "Ocultar creación de zona" : "Crear una nueva zona"}
                    </button>
                  </div>
                )}
                {selectedMunicipio && showZonaCreator && !isCollaborator && (
                  <div className="alert alert-info">
                    <div className="d-flex justify-content-between align-items-center flex-wrap">
                      <span className="mb-2 mb-md-0">¿No encuentras la zona? Regístrala para este municipio.</span>
                      <div className="d-flex flex-wrap align-items-center" style={{ gap: "0.5rem" }}>
                        <input
                          className="form-control"
                          placeholder="Nombre de la zona"
                          value={newZonaNombre}
                          onChange={(e) => setNewZonaNombre(e.target.value)}
                          style={{ minWidth: 180 }}
                        />
                        <select
                          className="form-control"
                          value={newZonaTipo}
                          onChange={(e) => setNewZonaTipo(e.target.value)}
                        >
                          <option value="VEREDA">Vereda</option>
                          <option value="BARRIO">Barrio</option>
                          <option value="COMUNA">Comuna</option>
                          <option value="CORREGIMIENTO">Corregimiento</option>
                        </select>
                        <button type="button" className="btn btn-primary" onClick={handleCreateZona} disabled={creatingZona}>
                          <i className="fas fa-save mr-1" /> {creatingZona ? "Guardando..." : "Agregar zona"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label>Municipio (solo lectura)</label>
                  <input
                    className="form-control"
                    value={municipioNombre}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label>Nombre del ciudadano (opcional)</label>
                  <input className="form-control" value={form.nombre_ciudadano} onChange={(e) => setForm({ ...form, nombre_ciudadano: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Cédula</label>
                  <input
                    className="form-control"
                    value={form.cedula}
                    onChange={(e) => setForm({ ...form, cedula: e.target.value.trim() })}
                    maxLength={15}
                    required
                    pattern="\d{1,15}"
                    placeholder="Cédula del ciudadano"
                  />
                  <small className="text-muted">Solo números, sin puntos ni espacios.</small>
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" className="form-control" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Nivel de afinidad</label>
                  <div className="btn-group btn-group-toggle d-flex flex-wrap" data-toggle="buttons">
                    {afinidadOptions.map((option) => (
                      <label key={option.value} className={`btn btn-outline-primary mb-2 ${form.nivel_afinidad === option.value ? "active" : ""}`}>
                        <input
                          type="radio"
                          name="nivel_afinidad"
                          value={option.value}
                          checked={form.nivel_afinidad === option.value}
                          onChange={(e) => setForm({ ...form, nivel_afinidad: e.target.value })}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Disposición al voto</label>
                  <div className="btn-group btn-group-toggle d-flex flex-wrap" data-toggle="buttons">
                    {disposicionOptions.map((option) => (
                      <label key={option.value} className={`btn btn-outline-primary mb-2 ${form.disposicion_voto === option.value ? "active" : ""}`}>
                        <input
                          type="radio"
                          name="disposicion_voto"
                          value={option.value}
                          checked={form.disposicion_voto === option.value}
                          onChange={(e) => setForm({ ...form, disposicion_voto: e.target.value })}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Capacidad de influencia</label>
                  <div className="btn-group btn-group-toggle d-flex flex-wrap" data-toggle="buttons">
                    {influenciaOptions.map((option) => (
                      <label key={option.value} className={`btn btn-outline-primary mb-2 ${form.capacidad_influencia === option.value ? "active" : ""}`}>
                        <input
                          type="radio"
                          name="capacidad_influencia"
                          value={option.value}
                          checked={form.capacidad_influencia === option.value}
                          onChange={(e) => setForm({ ...form, capacidad_influencia: e.target.value })}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group col-md-4">
                    <label>Tipo de vivienda</label>
                    <select className="form-control" value={form.tipo_vivienda} onChange={(e) => setForm({ ...form, tipo_vivienda: e.target.value })}>
                      {viviendaOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group col-md-4">
                    <label>Rango de edad</label>
                    <select className="form-control" value={form.rango_edad} onChange={(e) => setForm({ ...form, rango_edad: e.target.value })}>
                      {edadOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group col-md-4">
                    <label>Ocupación</label>
                    <select className="form-control" value={form.ocupacion} onChange={(e) => setForm({ ...form, ocupacion: e.target.value })}>
                      {ocupacionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group col-md-4">
                    <div className="custom-control custom-checkbox">
                      <input type="checkbox" className="custom-control-input" id="ninos" checked={form.tiene_ninos} onChange={(e) => setForm({ ...form, tiene_ninos: e.target.checked })} />
                      <label className="custom-control-label" htmlFor="ninos">
                        Hogar con niños
                      </label>
                    </div>
                  </div>
                  <div className="form-group col-md-4">
                    <div className="custom-control custom-checkbox">
                      <input type="checkbox" className="custom-control-input" id="mayores" checked={form.tiene_adultos_mayores} onChange={(e) => setForm({ ...form, tiene_adultos_mayores: e.target.checked })} />
                      <label className="custom-control-label" htmlFor="mayores">
                        Adultos mayores
                      </label>
                    </div>
                  </div>
                  <div className="form-group col-md-4">
                    <div className="custom-control custom-checkbox">
                      <input type="checkbox" className="custom-control-input" id="discapacidad" checked={form.tiene_personas_con_discapacidad} onChange={(e) => setForm({ ...form, tiene_personas_con_discapacidad: e.target.checked })} />
                      <label className="custom-control-label" htmlFor="discapacidad">
                        Personas con discapacidad
                      </label>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Comentario adicional</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={form.comentario_problema}
                    onChange={(e) => setForm({ ...form, comentario_problema: e.target.value })}
                  ></textarea>
                </div>
                <div className="form-row align-items-end">
                  <div className="form-group col-md-5">
                    <label>Latitud (solo lectura)</label>
                    <input type="text" className="form-control" value={form.lat} readOnly />
                  </div>
                  <div className="form-group col-md-5">
                    <label>Longitud (solo lectura)</label>
                    <input type="text" className="form-control" value={form.lon} readOnly />
                  </div>
                  <div className="form-group col-md-2 d-flex align-items-end">
                    <button type="button" className="btn btn-outline-primary btn-block" onClick={handleLocate} disabled={locating}>
                      <i className="fas fa-location-arrow mr-1" /> {locating ? "Ubicando..." : "Usar GPS"}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Necesidades priorizadas (máx. 3)</label>
                  {form.necesidades.map((item, idx) => (
                    <div className="form-row" key={`need-${idx}`}>
                      <div className="form-group col-md-8">
                        <select
                          className="form-control"
                          value={item.necesidad_id}
                          onChange={(e) => updateNeed(idx, "necesidad_id", e.target.value)}
                        >
                          <option value="">Selecciona necesidad</option>
                          {necesidades
                            .filter((n) => {
                              const currentSelection = Number(item.necesidad_id);
                              if (currentSelection === n.id) return true;
                              const otherSelected = form.necesidades
                                .filter((_, i) => i !== idx)
                                .map((need) => Number(need.necesidad_id))
                                .filter(Boolean);
                              return !otherSelected.includes(n.id);
                            })
                            .map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.nombre}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="form-group col-md-4">
                        <select className="form-control" value={item.prioridad} onChange={(e) => updateNeed(idx, "prioridad", Number(e.target.value))}>
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  {canAddNeed && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          necesidades: [
                            ...prev.necesidades,
                            {
                              prioridad: prev.necesidades.length + 1,
                              necesidad_id:
                                necesidades.find((n) => !prev.necesidades.map((need) => Number(need.necesidad_id)).includes(n.id))
                                  ?.id.toString() || "",
                            },
                          ],
                        }))
                      }
                    >
                      <i className="fas fa-plus mr-1" /> Agregar necesidad
                    </button>
                  )}
                </div>
                <div className="form-group">
                  <div className="custom-control custom-checkbox">
                    <input type="checkbox" className="custom-control-input" id="consentimiento" checked={form.consentimiento} onChange={(e) => setForm({ ...form, consentimiento: e.target.checked })} />
                    <label className="custom-control-label" htmlFor="consentimiento">
                      Cuento con consentimiento informado
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <div className="custom-control custom-checkbox">
                    <input type="checkbox" className="custom-control-input" id="critico" checked={form.caso_critico} onChange={(e) => setForm({ ...form, caso_critico: e.target.checked })} />
                    <label className="custom-control-label" htmlFor="critico">
                      ¿Caso crítico que requiere seguimiento?
                    </label>
                  </div>
                </div>
                <button className="btn btn-success btn-lg btn-block" disabled={saving}>
                  <i className="fas fa-save mr-1" /> {saving ? "Guardando..." : "Guardar encuesta"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyPage;
