import { useEffect, useState } from "react";
import api from "../services/api";

interface Zona {
  id: number;
  nombre: string;
  municipio?: {
    id: number;
    nombre: string;
  };
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

const SurveyPage = () => {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [necesidades, setNecesidades] = useState<Necesidad[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    zona: "",
    nombre_ciudadano: "",
    telefono: "",
    tipo_vivienda: viviendaOptions[0].value,
    rango_edad: edadOptions[0].value,
    ocupacion: ocupacionOptions[0].value,
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
        const [zonaRes, necesidadRes] = await Promise.all([api.get<Zona[]>("/zonas/"), api.get<Necesidad[]>("/necesidades/")]);
        setZonas(zonaRes.data);
        setNecesidades(necesidadRes.data);
      } catch (err) {
        console.error(err);
        setError("No fue posible cargar la información base");
      }
    };
    load();
  }, []);

  const updateNeed = (index: number, field: keyof SurveyNeedForm, value: string | number) => {
    setForm((prev) => {
      const copy = [...prev.necesidades];
      copy[index] = { ...copy[index], [field]: value } as SurveyNeedForm;
      return { ...prev, necesidades: copy };
    });
  };

  const selectedZona = zonas.find((zona) => String(zona.id) === form.zona);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.zona) {
      setError("Debes seleccionar una zona");
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
        lat: form.lat ? Number(form.lat) : null,
        lon: form.lon ? Number(form.lon) : null,
        necesidades: validNeeds.map((item) => ({ prioridad: item.prioridad, necesidad_id: Number(item.necesidad_id) })),
      });
      setMessage("Encuesta registrada con éxito");
      setForm({
        zona: "",
        nombre_ciudadano: "",
        telefono: "",
        tipo_vivienda: viviendaOptions[0].value,
        rango_edad: edadOptions[0].value,
        ocupacion: ocupacionOptions[0].value,
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
                <div className="form-group">
                  <label>Zona</label>
                  <select className="form-control" value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })}>
                    <option value="">Selecciona una zona</option>
                    {zonas.map((zona) => (
                      <option key={zona.id} value={zona.id}>
                        {zona.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Municipio (solo lectura)</label>
                  <input
                    className="form-control"
                    value={selectedZona?.municipio?.nombre || "Selecciona una zona para ver el municipio"}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label>Nombre del ciudadano (opcional)</label>
                  <input className="form-control" value={form.nombre_ciudadano} onChange={(e) => setForm({ ...form, nombre_ciudadano: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" className="form-control" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} required />
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
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label>Latitud (opcional)</label>
                    <input type="text" className="form-control" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
                  </div>
                  <div className="form-group col-md-6">
                    <label>Longitud (opcional)</label>
                    <input type="text" className="form-control" value={form.lon} onChange={(e) => setForm({ ...form, lon: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Necesidades priorizadas (máx. 3)</label>
                  {form.necesidades.map((item, idx) => (
                    <div className="form-row" key={`need-${idx}`}>
                      <div className="form-group col-md-8">
                        <select className="form-control" value={item.necesidad_id} onChange={(e) => updateNeed(idx, "necesidad_id", e.target.value)}>
                          <option value="">Selecciona necesidad</option>
                          {necesidades.map((n) => (
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
                  {form.necesidades.length < 3 && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          necesidades: [...prev.necesidades, { prioridad: prev.necesidades.length + 1, necesidad_id: "" }],
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
