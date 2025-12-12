export const endpoints = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
  },
  dashboard: {
    summary: '/dashboard/resumen',
  },
  coverage: {
    zones: '/cobertura/zonas',
  },
};

export type EndpointGroup = typeof endpoints;
