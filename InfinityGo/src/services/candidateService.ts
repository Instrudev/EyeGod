import api from '@api/httpClient';
import { endpoints } from '@api/endpoints';

export interface Candidate {
  id: number;
  nombre: string;
  telefono?: string;
  correo?: string;
  foto?: string;
}

export const fetchCandidates = async () => {
  const { data } = await api.get<Candidate[]>(endpoints.candidates.base);
  return data;
};

export const fetchCurrentCandidate = async () => {
  const { data } = await api.get<Candidate>(endpoints.candidates.me);
  return data;
};

export const createCandidate = async (payload: { nombre: string; telefono?: string; correo?: string }) => {
  await api.post(endpoints.candidates.base, payload);
};
