import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createInvestment, updateInvestment, fetchInvestments, Investment } from "../../services/investments";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const InvestmentForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    interface Departamento { id: number; nombre: string; }
    interface Municipio { id: number; nombre: string; departamento?: number | { id: number, nombre: string }; }

    const [deps, setDeps] = useState<Departamento[]>([]);
    const [muns, setMuns] = useState<Municipio[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState<Partial<Investment>>({
        tipo: "GASTO",
        categoria: "PUBLICIDAD",
        descripcion: "",
        valor: "",
        fecha: new Date().toISOString().split("T")[0],
        departamento: null,
        municipio: null,
        medio_pago: "TRANSFERENCIA",
        proveedor: "",
    });

    const [motivoEdicion, setMotivoEdicion] = useState("");

    const isCoordinator = user?.role === "COORDINADOR_ELECTORAL";

    // Load initial data
    useEffect(() => {
        const load = async () => {
            try {
                const [dRes, mRes] = await Promise.all([
                    api.get<Departamento[]>("/departamentos/"),
                    api.get<Municipio[]>("/municipios/"),
                ]);
                setDeps(dRes.data);
                setMuns(mRes.data);

                if (id) {
                    const data = await fetchInvestments({ id }); // Hack or implement fetchById
                    // In a real scenario you implement a fetchById in views, fetching a single list here for brevity
                    const invs = await api.get<Investment>(`/investments/${id}/`);
                    setForm(invs.data);
                } else if (isCoordinator) {
                    // For Coordinator default their mun
                    // Need user.municipio_operacion mapped, but it might not be in the context type easily
                    // Assuming backend handles it via validation, we can leave it null, but UI should reflect.
                }
            } catch (err) {
                console.error(err);
                setError("Error cargando catálogos o registro.");
            }
        };
        load();
    }, [id, isCoordinator]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            if (id) {
                await updateInvestment(Number(id), { ...form, motivo: motivoEdicion });
            } else {
                await createInvestment(form);
            }
            navigate("/inversiones");
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.motivo ? err.response.data.motivo : JSON.stringify(err.response?.data) || "Ocurrió un error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid">
            <h1 className="h3 mb-4 text-gray-800">{id ? "Editar Registro" : "Nuevo Registro"}</h1>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="card shadow mb-4">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-md-6 form-group">
                                <label>Tipo</label>
                                <select className="form-control" name="tipo" value={form.tipo} onChange={handleChange} required disabled={!!id}>
                                    <option value="GASTO">Gasto</option>
                                    <option value="APORTE">Aporte</option>
                                </select>
                            </div>
                            <div className="col-md-6 form-group">
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
                        </div>

                        <div className="form-group">
                            <label>Descripción</label>
                            <textarea className="form-control" name="descripcion" value={form.descripcion} onChange={handleChange} required />
                        </div>

                        <div className="row">
                            <div className="col-md-6 form-group">
                                <label>Valor ($)</label>
                                <input type="number" step="0.01" className="form-control" name="valor" value={form.valor} onChange={handleChange} required />
                            </div>
                            <div className="col-md-6 form-group">
                                <label>Fecha</label>
                                <input type="date" className="form-control" name="fecha" value={form.fecha} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 form-group">
                                <label>Departamento {isCoordinator && "(Anclado)"}</label>
                                <select className="form-control" name="departamento" value={form.departamento || ""} onChange={handleChange} disabled={isCoordinator}>
                                    <option value="">Seleccionar...</option>
                                    {deps.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                </select>
                            </div>
                            <div className="col-md-6 form-group">
                                <label>Municipio {isCoordinator && "(Anclado a tu asignación)"}</label>
                                <select className="form-control" name="municipio" value={form.municipio || ""} onChange={handleChange} disabled={isCoordinator || !form.departamento}>
                                    <option value="">Seleccionar...</option>
                                    {muns.map(m => {
                                        // Handle nested object from API or simple number
                                        const depId = typeof m.departamento === 'object' ? m.departamento?.id : m.departamento;
                                        if (depId && String(depId) === String(form.departamento)) {
                                            return <option key={m.id} value={m.id}>{m.nombre}</option>;
                                        }
                                        return null;
                                    })}
                                </select>
                                {isCoordinator && <small className="text-muted">Como coordinador, al guardar se asignará automáticamente tu municipio de operación.</small>}
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 form-group">
                                <label>Medio de Pago</label>
                                <select className="form-control" name="medio_pago" value={form.medio_pago} onChange={handleChange} required>
                                    <option value="EFECTIVO">Efectivo</option>
                                    <option value="TRANSFERENCIA">Transferencia</option>
                                    <option value="TARJETA">Tarjeta</option>
                                    <option value="OTRO">Otro</option>
                                </select>
                            </div>
                            <div className="col-md-6 form-group">
                                <label>Proveedor (Opcional)</label>
                                <input type="text" className="form-control" name="proveedor" value={form.proveedor || ""} onChange={handleChange} />
                            </div>
                        </div>

                        {id && (
                            <div className="form-group alert alert-warning">
                                <label><strong>Motivo de Edición (Obligatorio)</strong></label>
                                <textarea className="form-control" value={motivoEdicion} onChange={e => setMotivoEdicion(e.target.value)} required placeholder="Indique el motivo por el cual edita los valores." />
                            </div>
                        )}

                        <button className="btn btn-primary" type="submit" disabled={loading || (!!id && !motivoEdicion)}>
                            {loading ? "Guardando..." : "Guardar"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default InvestmentForm;
