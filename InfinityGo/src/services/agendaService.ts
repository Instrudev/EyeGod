import api from '@api/httpClient';
import { endpoints } from '@api/endpoints';

export interface Agenda {
  id: number;
  titulo: string;
  descripcion?: string;
  fecha: string;
  hora?: string;
  estado: string;
  candidato?: number | null;
}

export const fetchAgendas = async () => {
  const { data } = await api.get<Agenda[]>(endpoints.agenda.base);
  return data;
};

export const createAgenda = async (payload: {
  titulo: string;
  descripcion?: string;
  fecha: string;
  hora?: string;
  candidato?: number | null;
}) => {
  await api.post(endpoints.agenda.base, payload);
};

export const cancelAgenda = async (agendaId: number) => {
  await api.post(`${endpoints.agenda.base}${agendaId}/cancelar/`);
};

export const respondAgenda = async (agendaId: number, accion: string, motivo_reprogramacion?: string) => {
  await api.post(`${endpoints.agenda.base}${agendaId}/responder/`, { accion, motivo_reprogramacion });
};
