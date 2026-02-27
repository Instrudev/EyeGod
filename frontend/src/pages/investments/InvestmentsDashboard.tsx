import React, { useEffect, useState } from "react";
import { fetchDashboardMetrics, DashboardMetrics } from "../../services/investments";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#E63946', '#F4A261', '#2A9D8F'];

const InvestmentsDashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchDashboardMetrics();
                setMetrics(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="p-4">Cargando Dashboard Estadístico...</div>;
    if (!metrics) return <div className="p-4">Falla al cargar datos métricos.</div>;

    const { kpis, ejecucion_presupuesto, charts, top_categorias, top_municipios } = metrics;

    return (
        <div className="container-fluid">
            <h1 className="h3 mb-4 text-gray-800">Dashboard Estratégico de Campaña</h1>

            {kpis.riesgo_sobre_ejecucion && (
                <div className="alert alert-danger mb-4 shadow-sm" role="alert">
                    <i className="fas fa-exclamation-triangle mr-2"></i> <strong>¡Alerta Estratégica!</strong> Al menos una de sus categorías ha superado el 80% del presupuesto asignado. Revise el avance de ejecución inmediatamente.
                </div>
            )}

            <div className="row">
                {/* Total Invertido */}
                <div className="col-xl-4 col-md-6 mb-4">
                    <div className="card shadow h-100 py-2 border-left-danger">
                        <div className="card-body">
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                                        Total Gastos Ejecutados</div>
                                    <div className="h5 mb-0 font-weight-bold text-gray-800">${kpis.total_gastos.toLocaleString()}</div>
                                </div>
                                <div className="col-auto">
                                    <i className="fas fa-chart-line fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Total Aportes */}
                <div className="col-xl-4 col-md-6 mb-4">
                    <div className="card shadow h-100 py-2 border-left-success">
                        <div className="card-body">
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                                        Total Aportes Recibidos</div>
                                    <div className="h5 mb-0 font-weight-bold text-gray-800">${kpis.total_aportes.toLocaleString()}</div>
                                </div>
                                <div className="col-auto">
                                    <i className="fas fa-hand-holding-usd fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Balance */}
                <div className="col-xl-4 col-md-6 mb-4">
                    <div className={`card shadow h-100 py-2 ${kpis.balance_neto < 0 ? 'border-left-warning' : 'border-left-info'}`}>
                        <div className="card-body">
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-uppercase mb-1" style={{ color: kpis.balance_neto < 0 ? '#f6c23e' : '#36b9cc' }}>
                                        Balance Neto</div>
                                    <div className="h5 mb-0 font-weight-bold text-gray-800">${kpis.balance_neto.toLocaleString()}</div>
                                </div>
                                <div className="col-auto">
                                    <i className="fas fa-balance-scale fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-6 mb-4">
                    {/* Ejecucion Config Presupuestal */}
                    <div className="card shadow mb-4">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">Avance de Ejecución vs. Presupuesto (%)</h6>
                        </div>
                        <div className="card-body">
                            {ejecucion_presupuesto.map((ep, i) => (
                                <div key={i} className="mb-3">
                                    <h4 className="small font-weight-bold">{ep.categoria} <span
                                        className="float-right">{ep.porcentaje}% (${ep.ejecutado.toLocaleString()} / ${ep.presupuestado.toLocaleString()})</span></h4>
                                    <div className="progress mb-4">
                                        <div className={`progress-bar ${ep.porcentaje > 100 ? 'bg-danger' : (ep.porcentaje > 80 ? 'bg-warning' : 'bg-success')}`} role="progressbar" style={{ width: `${Math.min(ep.porcentaje, 100)}%` }}
                                            aria-valuenow={ep.porcentaje} aria-valuemin={0} aria-valuemax={100}></div>
                                    </div>
                                </div>
                            ))}
                            {ejecucion_presupuesto.length === 0 && <p className="text-muted">Aún no hay planificaciones de presupuesto mapeadas.</p>}
                        </div>
                    </div>
                </div>

                <div className="col-lg-6 mb-4">
                    <div className="card shadow mb-4">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">Distribución de Gastos por Categoría</h6>
                        </div>
                        <div className="card-body" style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={charts.dona_categorias} dataKey="value" nameKey="categoria" cx="50%" cy="50%" outerRadius={100} label>
                                        {charts.dona_categorias.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-12 mb-4">
                    <div className="card shadow mb-4">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">Impacto de Gastos en Municipios</h6>
                        </div>
                        <div className="card-body" style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.barras_municipios} margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={(value) => `$${value}`} />
                                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                                    <Legend />
                                    <Bar dataKey="gastos" name="Total Gastos" fill="#4e73df" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default InvestmentsDashboard;
