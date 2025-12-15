import api from '@api/httpClient';
import { endpoints } from '@api/endpoints';

export interface ReporteUnico {
  casos_activos: number;
  top_necesidades: { necesidad__nombre: string; total: number }[];
  zonas_sin_cobertura: number;
  zonas_cumplidas: number;
  total_encuestas: number;
}

export const fetchReporteUnico = async () => {
  const { data } = await api.get<ReporteUnico>(endpoints.report.base);
  return data;
};
