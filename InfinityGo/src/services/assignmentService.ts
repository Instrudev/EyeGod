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

export const fetchAssignments = async (params?: { colaborador?: string | number; municipio?: string | number }) => {
  const { data } = await api.get<ZoneAssignment[]>(endpoints.assignments.base, { params });
  return data;
};

export const createAssignment = async (payload: { colaborador_id: number; zona_id: number }) => {
  const { data } = await api.post<ZoneAssignment>(endpoints.assignments.base, payload);
  return data;
};

export const deleteAssignment = async (assignmentId: number) => {
  await api.delete(`${endpoints.assignments.base}${assignmentId}/`);
};
