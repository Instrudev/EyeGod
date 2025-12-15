import api from '@api/httpClient';
import { endpoints } from '@api/endpoints';

export interface Candidate {
  id: number;
  nombre: string;
  cargo: string;
  partido: string;
  usuario_email: string;
  usuario_id: number;
  generated_password?: string | null;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  foto?: string;
}

export interface CandidatePayload {
  nombre: string;
  cargo: string;
  partido: string;
  email: string;
  password?: string;
}

export const fetchCandidates = async () => {
  const { data } = await api.get<Candidate[]>(endpoints.candidates.base);
  return data;
};

export const fetchCurrentCandidate = async () => {
  const { data } = await api.get<Candidate>(endpoints.candidates.me);
  return data;
};

export const createCandidate = async (payload: CandidatePayload) => {
  const { data } = await api.post<Candidate>(endpoints.candidates.base, {
    nombre: payload.nombre,
    cargo: payload.cargo,
    partido: payload.partido,
    email: payload.email,
    password: payload.password,
  });
  return data;
};

export const updateCandidate = async (id: number, payload: Partial<CandidatePayload>) => {
  const { data } = await api.patch<Candidate>(`${endpoints.candidates.base}${id}/`, payload);
  return data;
};
