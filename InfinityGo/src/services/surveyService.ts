import api from '@api/httpClient';
import { endpoints } from '@api/endpoints';

export interface SurveyPayload {
  municipio: number;
  zona?: number;
  necesidad: number;
  nombre: string;
  telefono?: string;
  email?: string;
  descripcion?: string;
}

export interface SurveyRow extends SurveyPayload {
  id: number;
  fecha_creacion: string;
}

export const createSurvey = async (payload: SurveyPayload) => {
  await api.post(endpoints.surveys.base, payload);
};

export const fetchSurveys = async () => {
  const { data } = await api.get<SurveyRow[]>(endpoints.surveys.base);
  return data;
};
