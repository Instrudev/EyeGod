import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Ruta {
  id: number;
  nombre_ruta: string;
  estado: string;
  avance: number;
  ruta_zonas: { zona: { nombre: string; meta?: { meta_encuestas: number } } }[];
}

const RoutesPage = () => {
  const { user } = useAuth();
  const [rutas, setRutas] = useState<Ruta[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await api.get<Ruta[]>(user?.role === "COLABORADOR" ? "/rutas/mis-rutas" : "/rutas");
      setRutas(data);
    };
    fetchData();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Rutas de visita</h1>
      <div className="grid gap-4">
        {rutas.map((ruta) => (
          <div key={ruta.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-slate-900">{ruta.nombre_ruta}</p>
                <p className="text-sm text-slate-500">Estado: {ruta.estado}</p>
              </div>
              <div className="w-full md:w-1/3">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Avance</span>
                  <span>{ruta.avance}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full mt-2">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${ruta.avance}%` }} />
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {ruta.ruta_zonas.map((zona, idx) => (
                <div key={idx} className="border rounded-xl p-3">
                  <p className="font-semibold text-slate-800">{zona.zona.nombre}</p>
                  <p className="text-sm text-slate-500">Meta: {zona.zona.meta?.meta_encuestas ?? 0}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoutesPage;
