import api from "./api";

export interface Corporacion {
  id: number;
  nombre: string;
  descripcion: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export const getCorporaciones = async () => {
  const response = await api.get("/corporaciones/");
  return response.data;
};

export const createCorporacion = async (data: Partial<Corporacion>) => {
  const response = await api.post("/corporaciones/", data);
  return response.data;
};

export const updateCorporacion = async (id: number, data: Partial<Corporacion>) => {
  const response = await api.put(`/corporaciones/${id}/`, data);
  return response.data;
};

export const deleteCorporacion = async (id: number) => {
  const response = await api.delete(`/corporaciones/${id}/`);
  return response.data;
};
