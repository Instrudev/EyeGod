import api from "./api";

// Interfaces for Investments

export interface Investment {
    id: number;
    tipo: "GASTO" | "APORTE";
    categoria: string;
    descripcion: string;
    valor: string; // Decimal representation
    fecha: string;
    departamento?: number | null;
    departamento_nombre?: string;
    municipio?: number | null;
    municipio_nombre?: string;
    responsable?: number;
    responsable_nombre?: string;
    medio_pago: string;
    proveedor?: string;
    comprobante?: string;
    estado: "ACTIVO" | "ANULADO";
    motivo_anulacion?: string;
    created_at?: string;
    updated_at?: string;
}

export interface BudgetPlan {
    id: number;
    periodo_inicio: string;
    periodo_fin: string;
    categoria: string;
    monto_presupuestado: string;
    departamento?: number | null;
    departamento_nombre?: string;
    municipio?: number | null;
    municipio_nombre?: string;
    created_by?: number;
    created_by_nombre?: string;
}

export interface DashboardMetrics {
    kpis: {
        total_gastos: number;
        total_aportes: number;
        balance_neto: number;
        riesgo_sobre_ejecucion: boolean;
    };
    top_categorias: { categoria: string; total: number }[];
    top_municipios: { municipio: string; total: number }[];
    ejecucion_presupuesto: {
        categoria: string;
        presupuestado: number;
        ejecutado: number;
        porcentaje: number;
    }[];
    charts: {
        dona_categorias: { categoria: string; value: number }[];
        barras_municipios: { name: string; gastos: number }[];
    };
}

// API Calls

export const fetchInvestments = async (params: Record<string, any> = {}) => {
    const response = await api.get<Investment[]>("/investments/", { params });
    return response.data;
};

export const createInvestment = async (data: Partial<Investment>) => {
    const response = await api.post<Investment>("/investments/", data);
    return response.data;
};

export const updateInvestment = async (id: number, data: Partial<Investment> & { motivo?: string }) => {
    const response = await api.patch<Investment>(`/investments/${id}/`, data);
    return response.data;
};

export const fetchBudgets = async () => {
    const response = await api.get<BudgetPlan[]>("/budgets/");
    return response.data;
};

export const createBudget = async (data: Partial<BudgetPlan>) => {
    const response = await api.post<BudgetPlan>("/budgets/", data);
    return response.data;
};

export const fetchDashboardMetrics = async () => {
    const response = await api.get<DashboardMetrics>("/investments/metrics/");
    return response.data;
};
