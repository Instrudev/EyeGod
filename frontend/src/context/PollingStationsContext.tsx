import { createContext, useCallback, useContext, useMemo, useState } from "react";
import api from "../services/api";
import { AxiosError } from "axios";

export interface PollingStation {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  creado_por_id: number;
  creado_por_nombre: string;
  creado_en: string;
}

interface PollingStationInput {
  nombre: string;
  latitud: number;
  longitud: number;
}

interface PollingStationError {
  index: number;
  nombre: string;
  mensaje: string;
}

interface PollingStationsContextValue {
  stations: PollingStation[];
  loading: boolean;
  error: string | null;
  fetchStations: () => Promise<void>;
  createStations: (items: PollingStationInput[]) => Promise<{ created: number; errors: PollingStationError[] }>;
  deleteStation: (id: number) => Promise<void>;
}

const PollingStationsContext = createContext<PollingStationsContextValue | undefined>(undefined);

export const usePollingStations = () => {
  const context = useContext(PollingStationsContext);
  if (!context) {
    throw new Error("usePollingStations must be used within a PollingStationsProvider");
  }
  return context;
};

export const PollingStationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stations, setStations] = useState<PollingStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<PollingStation[]>("/puestos-votacion/");
      setStations(data);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar los puestos de votación.");
    } finally {
      setLoading(false);
    }
  }, []);

  const createStations = useCallback(async (items: PollingStationInput[]) => {
    const results = await Promise.allSettled(
      items.map((item) =>
        api.post<PollingStation>("/puestos-votacion/", {
          nombre: item.nombre,
          latitud: item.latitud,
          longitud: item.longitud,
        })
      )
    );

    const created: PollingStation[] = [];
    const errors: PollingStationError[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        created.push(result.value.data);
      } else {
        const error = result.reason as AxiosError<Record<string, string[] | string> | string>;
        const data = error.response?.data;
        let message = "No fue posible registrar el puesto.";
        if (typeof data === "string") {
          message = data;
        } else if (data) {
          const firstKey = Object.keys(data)[0];
          const firstValue = firstKey ? data[firstKey] : undefined;
          if (Array.isArray(firstValue)) {
            message = firstValue[0] || message;
          } else if (typeof firstValue === "string") {
            message = firstValue;
          }
        }
        errors.push({ index, nombre: items[index].nombre, mensaje: message });
      }
    });

    if (created.length) {
      setStations((prev) => [...created, ...prev]);
    }

    return { created: created.length, errors };
  }, []);

  const deleteStation = useCallback(async (id: number) => {
    await api.delete(`/puestos-votacion/${id}/`);
    setStations((prev) => prev.filter((station) => station.id !== id));
  }, []);

  const value = useMemo(
    () => ({ stations, loading, error, fetchStations, createStations, deleteStation }),
    [stations, loading, error, fetchStations, createStations, deleteStation]
  );

  return <PollingStationsContext.Provider value={value}>{children}</PollingStationsContext.Provider>;
};
