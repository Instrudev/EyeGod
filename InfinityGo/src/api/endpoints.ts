export const endpoints = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
  },
  dashboard: {
    summary: '/dashboard/resumen/',
    surveysByDay: '/dashboard/encuestas_por_dia/',
    collaboratorProgress: '/dashboard/avance_colaboradores/',
  },
  coverage: {
    zones: '/cobertura/zonas',
  },
  routes: {
    base: '/rutas/',
    mine: '/rutas/mis-rutas/',
  },
  surveys: {
    base: '/encuestas/',
  },
  territory: {
    departamentos: '/departamentos/',
    municipios: '/municipios/',
    zonas: '/zonas/',
  },
  users: {
    base: '/usuarios/',
  },
  report: {
    base: '/reportes/',
  },
  agenda: {
    base: '/agendas/',
  },
  candidates: {
    base: '/candidatos/',
    me: '/candidatos/me/',
  },
  needs: {
    base: '/necesidades/',
  },
};

export type EndpointGroup = typeof endpoints;
