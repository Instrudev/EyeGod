import React, { useState, useEffect } from "react";
import { fetchBudgets, createBudget, BudgetPlan } from "../../services/investments";
import api from "../../services/api";

const BudgetsConfig: React.FC = () => {
    const [budgets, setBudgets] = useState<BudgetPlan[]>([]);
    const [loading, setLoading] = useState(false);

    interface Departamento { id: number; nombre: string; }
    interface Municipio { id: number; nombre: string; departamento?: number | { id: number, nombre: string }; }

    const [deps, setDeps] = useState<Departamento[]>([]);
    const [muns, setMuns] = useState<Municipio[]>([]);

    const [form, setForm] = useState<Partial<BudgetPlan>>({
        periodo_inicio: new Date().toISOString().split("T")[0],
        periodo_fin: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split("T")[0],
        categoria: "PUBLICIDAD",
        monto_presupuestado: "",
        departamento: null,
        municipio: null,
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchBudgets();
            setBudgets(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const loadCatalogs = async () => {
            const [dRes, mRes] = await Promise.all([
                api.get<Departamento[]>("/departamentos/"),
                api.get<Municipio[]>("/municipios/"),
            ]);
            setDeps(dRes.data);
            setMuns(mRes.data);
        };
        loadCatalogs();
        loadData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createBudget(form);
            loadData();
            setForm({ ...form, monto_presupuestado: "" }); // Reset sum to allow continuous entry
            alert("Presupuesto configurado exitosamente.");
        } catch (err) {
            alert("Error al guardar presupuesto");
            console.error(err);
        }
    }

    return (
        <div className="container-fluid">
            <h1 className="h3 mb-4 text-gray-800">Planificación Presupuestal Estratégica</h1>

            <div className="row">
                <div className="col-md-4">
                    <div className="card shadow mb-4">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">Configurar Nuevo Presupuesto</h6>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>Categoría</label>
                                    <select className="form-control" name="categoria" value={form.categoria} onChange={handleChange} required>
                                        <option value="PUBLICIDAD">Publicidad</option>
                                        <option value="LOGISTICA">Logística</option>
                                        <option value="TRANSPORTE">Transporte</option>
                                        <option value="EVENTOS">Eventos</option>
                                        <option value="OPERATIVO">Operativo</option>
                                        <option value="JURIDICO">Jurídico</option>
                                        <option value="DIGITAL">Digital</option>
                                        <option value="OTRO">Otro</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Monto a Presupuestar ($)</label>
                                    <input type="number" step="0.01" className="form-control" name="monto_presupuestado" value={form.monto_presupuestado} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Periodo Desde</label>
                                    <input type="date" className="form-control" name="periodo_inicio" value={form.periodo_inicio} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Periodo Hasta</label>
                                    <input type="date" className="form-control" name="periodo_fin" value={form.periodo_fin} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Departamento (Opcional - Global si está vacío)</label>
                                    <select className="form-control" name="departamento" value={form.departamento || ""} onChange={handleChange}>
                                        <option value="">Global</option>
                                        {deps.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Municipio (Opcional)</label>
                                    <select className="form-control" name="municipio" value={form.municipio || ""} onChange={handleChange}>
                                        <option value="">Todos los municipios</option>
                                        {muns.map(m => {
                                            const depId = typeof m.departamento === 'object' ? m.departamento?.id : m.departamento;
                                            if (depId && String(depId) === String(form.departamento)) {
                                                return <option key={m.id} value={m.id}>{m.nombre}</option>;
                                            }
                                            return null;
                                        })}
                                    </select>
                                </div>
                                <button className="btn btn-primary w-100" type="submit">Guardar Presupuesto</button>
                            </form>
                        </div>
                    </div>
                </div>
                <div className="col-md-8">
                    <div className="card shadow mb-4">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">Histórico de Presupuestos Configurados</h6>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Periodo</th>
                                            <th>Categoría</th>
                                            <th>Territorio</th>
                                            <th>Monto</th>
                                            <th>Creado Por</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && <tr><td colSpan={5} className="text-center">Cargando...</td></tr>}
                                        {budgets.map(b => (
                                            <tr key={b.id}>
                                                <td>{b.periodo_inicio} a {b.periodo_fin}</td>
                                                <td>{b.categoria}</td>
                                                <td>{b.municipio_nombre || b.departamento_nombre || "Global"}</td>
                                                <td>${parseFloat(b.monto_presupuestado).toLocaleString()}</td>
                                                <td>{b.created_by_nombre}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BudgetsConfig;
