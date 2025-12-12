import httpClient from '@api/httpClient';
import { endpoints } from '@api/endpoints';

export interface DashboardSummary {
  total_encuestas: number;
  zonas_cumplidas: number;
  zonas_sin_cobertura: number;
  top_necesidades: { necesidad__nombre: string; total: number }[];
  casos_activos: number;
}

export const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await httpClient.get<DashboardSummary>(endpoints.dashboard.summary);
  return response.data;
};
