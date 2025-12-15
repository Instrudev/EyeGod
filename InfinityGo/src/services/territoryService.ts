import api from '@api/httpClient';
import { endpoints } from '@api/endpoints';

export interface Departamento {
  id: number;
  nombre: string;
}

export interface Municipio {
  id: number;
  nombre: string;
  departamento: number;
}

export interface Zona {
  id: number;
  nombre: string;
  tipo: string;
  municipio?: Municipio;
}

export const fetchDepartamentos = async () => {
  const { data } = await api.get<Departamento[]>(endpoints.territory.departamentos);
  return data;
};

export const fetchMunicipios = async (userId?: number) => {
  const { data } = await api.get<Municipio[]>(
    userId ? `${endpoints.users.base}${userId}/municipios/` : endpoints.territory.municipios,
  );
  return data;
};

export const fetchZonas = async () => {
  const { data } = await api.get<Zona[]>(endpoints.territory.zonas);
  return data;
};

export const createDepartamento = async (payload: { nombre: string; codigo?: string }) => {
  await api.post(endpoints.territory.departamentos, payload);
};

export const createMunicipio = async (payload: { nombre: string; departamento: number }) => {
  await api.post(endpoints.territory.municipios, payload);
};

export const createZona = async (payload: { nombre: string; tipo: string; municipio?: number }) => {
  const { data } = await api.post<Zona>(endpoints.territory.zonas, payload);
  return data;
};
