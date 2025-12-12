import httpClient from '@api/httpClient';
import { endpoints } from '@api/endpoints';

export interface DashboardSummary {
  total_encuestas: number;
  zonas_cumplidas: number;
  zonas_sin_cobertura: number;
  top_necesidades: { necesidad__nombre: string; total: number }[];
  casos_activos: number;
}

export interface CoverageZone {
  zona: number;
  zona_nombre: string;
  municipio_nombre: string;
  lat?: number | null;
  lon?: number | null;
  municipio_lat?: number | null;
  municipio_lon?: number | null;
  necesidades?: { nombre: string; total: number }[];
  meta_encuestas: number;
  total_encuestas: number;
  cobertura_porcentaje: number;
  estado_cobertura: string;
}

export interface DailySurvey {
  fecha_creacion: string;
  total: number;
}

export interface CollaboratorProgress {
  id: number;
  nombre: string;
  encuestas_realizadas: number;
  meta_encuestas: number;
}

export const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await httpClient.get<DashboardSummary>(endpoints.dashboard.summary);
  return response.data;
};

export const fetchCoverageZones = async () => {
  const { data } = await httpClient.get<CoverageZone[]>(endpoints.coverage.zones);
  return data;
};

export const fetchDailySurveys = async (startDate?: string, endDate?: string) => {
  const { data } = await httpClient.get<DailySurvey[]>(endpoints.dashboard.surveysByDay, {
    params: { start_date: startDate, end_date: endDate },
  });
  return data;
};

export const fetchCollaboratorProgress = async (startDate?: string, endDate?: string) => {
  const { data } = await httpClient.get<CollaboratorProgress[]>(endpoints.dashboard.collaboratorProgress, {
    params: { start_date: startDate, end_date: endDate },
  });
  return data;
};
