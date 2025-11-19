import { useEffect, useState } from "react";
import api from "../services/api";

interface Zona {
  id: number;
  nombre: string;
}

interface Necesidad {
  id: number;
  nombre: string;
}

const SurveyPage = () => {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [necesidades, setNecesidades] = useState<Necesidad[]>([]);
  const [form, setForm] = useState({
    zona: "",
    telefono: "",
    tipo_vivienda: "PROPIA",
    rango_edad: "14-25",
    ocupacion: "ESTUDIANTE",
    consentimiento: false,
    tiene_ninos: false,
    tiene_adultos_mayores: false,
    tiene_personas_con_discapacidad: false,
    comentario_problema: "",
    necesidades: [{ prioridad: 1, necesidad_id: "" }],
  });

  useEffect(() => {
    const load = async () => {
      const [zonaRes, necesidadRes] = await Promise.all([api.get<Zona[]>("/zonas"), api.get<Necesidad[]>("/necesidades")]);
      setZonas(zonaRes.data);
      setNecesidades(necesidadRes.data);
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/encuestas", form);
    alert("Encuesta registrada");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Nueva encuesta</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div>
            <label className="block text-sm font-semibold">Zona</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={form.zona}
              onChange={(e) => setForm({ ...form, zona: e.target.value })}
            >
              <option value="">Seleccione</option>
              {zonas.map((zona) => (
                <option key={zona.id} value={zona.id}>
                  {zona.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold">Teléfono</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.consentimiento}
              onChange={(e) => setForm({ ...form, consentimiento: e.target.checked })}
            />
            <span className="text-sm text-slate-600">Cuenta con consentimiento informado</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3">Necesidades (max 3)</h2>
          <div className="space-y-3">
            {form.necesidades.map((item, idx) => (
              <div key={idx} className="flex gap-3">
                <select
                  className="flex-1 border rounded-lg px-3 py-2"
                  value={item.necesidad_id}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((prev) => {
                      const copy = [...prev.necesidades];
                      copy[idx].necesidad_id = value;
                      return { ...prev, necesidades: copy };
                    });
                  }}
                >
                  <option value="">Seleccione necesidad</option>
                  {necesidades.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.nombre}
                    </option>
                  ))}
                </select>
                <select
                  className="w-32 border rounded-lg px-3 py-2"
                  value={item.prioridad}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setForm((prev) => {
                      const copy = [...prev.necesidades];
                      copy[idx].prioridad = value;
                      return { ...prev, necesidades: copy };
                    });
                  }}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
            ))}
            {form.necesidades.length < 3 && (
              <button
                type="button"
                className="px-3 py-2 bg-slate-100 rounded-lg"
                onClick={() => setForm({ ...form, necesidades: [...form.necesidades, { prioridad: form.necesidades.length + 1, necesidad_id: "" }] })}
              >
                Agregar necesidad
              </button>
            )}
          </div>
        </div>
        <button type="submit" className="w-full md:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold">
          Guardar encuesta
        </button>
      </form>
    </div>
  );
};

export default SurveyPage;
