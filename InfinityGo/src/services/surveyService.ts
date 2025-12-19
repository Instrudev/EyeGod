import api from '@api/httpClient';
import { endpoints } from '@api/endpoints';

export interface SurveyPayload {
  zona: number;
  nombre_ciudadano?: string | null;
  cedula: string;
  telefono?: string | null;
  tipo_vivienda: string;
  rango_edad: string;
  ocupacion: string;
  tiene_ninos: boolean;
  tiene_adultos_mayores: boolean;
  tiene_personas_con_discapacidad: boolean;
  comentario_problema?: string | null;
  consentimiento: boolean;
  caso_critico: boolean;
  nivel_afinidad: number;
  disposicion_voto: number;
  capacidad_influencia: number;
  lat?: number | null;
  lon?: number | null;
  necesidades: Array<{ prioridad: number; necesidad_id: number }>;
}

export interface SurveyRow {
  id: number;
  fecha_creacion: string;
  zona_nombre?: string;
  municipio_nombre?: string;
  colaborador_nombre?: string;
  estado?: string;
  votante_valido?: boolean;
}

export interface SurveyDetail extends SurveyPayload {
  id: number;
}

export interface Need {
  id: number;
  nombre: string;
}

export const createSurvey = async (payload: SurveyPayload) => {
  await api.post(endpoints.surveys.base, payload);
};

export const fetchSurveys = async () => {
  const { data } = await api.get<SurveyRow[]>(endpoints.surveys.base);
  return data;
};

export const fetchSurveyDetail = async (id: number) => {
  const { data } = await api.get<SurveyDetail>(`${endpoints.surveys.base}${id}/`);
  return data;
};

export const updateSurvey = async (id: number, payload: Partial<SurveyPayload>) => {
  await api.patch(`${endpoints.surveys.base}${id}/`, payload);
};

export const fetchNeeds = async () => {
  const { data } = await api.get<Need[]>(endpoints.needs.base);
  return data;
};
