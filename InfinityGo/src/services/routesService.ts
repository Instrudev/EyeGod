import api from '@api/httpClient';
import { endpoints } from '@api/endpoints';

export interface RutaZona {
  id?: number;
  zona_id: number;
  zona_nombre?: string;
}

export interface Ruta {
  id: number;
  nombre_ruta: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  ruta_zonas: RutaZona[];
}

export const fetchRutas = async (isCollaborator: boolean) => {
  const endpoint = isCollaborator ? endpoints.routes.mine : endpoints.routes.base;
  const { data } = await api.get<Ruta[]>(endpoint);
  return data;
};

export const createRuta = async (payload: { nombre_ruta: string; fecha_inicio?: string | null; fecha_fin?: string | null; ruta_zonas: RutaZona[] }) => {
  await api.post(endpoints.routes.base, payload);
};
