import api from '@api/httpClient';
import { endpoints } from '@api/endpoints';

export interface ZoneAssignment {
  id: number;
  colaborador_id?: number;
  colaborador_nombre?: string;
  zona_id: number;
  zona_nombre: string;
  zona_tipo?: string;
  municipio_id: number;
  municipio_nombre: string;
  created_at?: string;
}

export const fetchAssignments = async () => {
  const { data } = await api.get<ZoneAssignment[]>(endpoints.assignments.base);
  return data;
};
