import api from '@api/httpClient';
import { endpoints } from '@api/endpoints';

export interface UserPayload {
  name: string;
  email: string;
  password: string;
  telefono?: string;
  cedula?: string;
  is_active?: boolean;
  role: 'ADMIN' | 'LIDER' | 'COLABORADOR' | 'CANDIDATO';
}

export interface UserResponse extends UserPayload {
  id: number;
}

export const fetchUsersByRole = async (role: UserPayload['role']) => {
  const { data } = await api.get<UserResponse[]>(endpoints.users.base, { params: { role } });
  return data;
};

export const createUser = async (payload: UserPayload) => {
  const { data } = await api.post<UserResponse>(endpoints.users.base, payload);
  return data;
};

export const updateUser = async (id: number, payload: Partial<UserPayload>) => {
  const { data } = await api.patch<UserResponse>(`${endpoints.users.base}${id}/`, payload);
  return data;
};

export const assignMunicipiosToUser = async (userId: number, municipioIds: number[]) => {
  await api.post(`${endpoints.users.base}${userId}/municipios/`, { municipio_ids: municipioIds });
};
