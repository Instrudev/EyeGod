import api from "./api";

export interface Partido {
  id: number;
  nombre: string;
  sigla: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export const getPartidos = async () => {
  const response = await api.get("/partidos/");
  return response.data;
};

export const createPartido = async (data: Partial<Partido>) => {
  const response = await api.post("/partidos/", data);
  return response.data;
};

export const updatePartido = async (id: number, data: Partial<Partido>) => {
  const response = await api.put(`/partidos/${id}/`, data);
  return response.data;
};

export const deletePartido = async (id: number) => {
  const response = await api.delete(`/partidos/${id}/`);
  return response.data;
};
