import httpClient from '@api/httpClient';
import { endpoints } from '@api/endpoints';

export interface LoginPayload {
  email: string;
  password: string;
  role?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  telefono?: string;
  cedula?: string;
  is_active?: boolean;
  meta_votantes?: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  const response = await httpClient.post<LoginResponse>(endpoints.auth.login, payload);
  return response.data;
};
