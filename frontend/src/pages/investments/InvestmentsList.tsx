import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchInvestments, updateInvestment, Investment } from "../../services/investments";
import { useAuth } from "../../context/AuthContext";

const InvestmentsList: React.FC = () => {
    const { user } = useAuth();
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(false);

    // Filtros
    const [filters, setFilters] = useState({ tipo: "", categoria: "" });
    const [anularMotivo, setAnularMotivo] = useState("");
    const [anularId, setAnularId] = useState<number | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchInvestments(filters);
            setInvestments(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleAnular = async () => {
        if (!anularId || !anularMotivo) return;
        try {
            await updateInvestment(anularId, { estado: "ANULADO", motivo: anularMotivo });
            setAnularId(null);
            setAnularMotivo("");
            loadData();
        } catch (err) {
            console.error(err);
            alert("Error al anular. Asegúrese de ingresar un motivo.");
        }
    };

    const canEdit = ["ADMIN", "COORDINADOR_ELECTORAL"].includes(user?.role || "");

    return (
        <div className="container-fluid">
            <h1 className="h3 mb-4 text-gray-800">Listado de Inversiones</h1>

            <div className="card shadow mb-4">
                <div className="card-header py-3 d-flex justify-content-between align-items-center">
                    <h6 className="m-0 font-weight-bold text-primary">Inversiones (Gastos y Aportes)</h6>
                    {canEdit && (
                        <Link to="/inversiones/nuevo" className="btn btn-sm btn-primary">
                            <i className="fas fa-plus fa-sm text-white-50 mr-1"></i> Nuevo Registro
                        </Link>
                    )}
                </div>
                <div className="card-body">
                    <div className="row mb-3">
                        <div className="col-md-3">
                            <select className="form-control" name="tipo" value={filters.tipo} onChange={handleFilterChange}>
                                <option value="">Todos los Tipos</option>
                                <option value="GASTO">Gasto</option>
                                <option value="APORTE">Aporte</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select className="form-control" name="categoria" value={filters.categoria} onChange={handleFilterChange}>
                                <option value="">Todas las Categorías</option>
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

                    <div className="table-responsive">
                        <table className="table table-bordered" width="100%" cellSpacing="0">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Tipo</th>
                                    <th>Categoría</th>
                                    <th>Municipio</th>
                                    <th>Valor</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={7} className="text-center">Cargando...</td></tr>}
                                {!loading && investments.length === 0 && (
                                    <tr><td colSpan={7} className="text-center">No hay registros</td></tr>
                                )}
                                {!loading && investments.map(inv => (
                                    <tr key={inv.id}>
                                        <td>{inv.fecha}</td>
                                        <td>
                                            <span className={`badge ${inv.tipo === 'GASTO' ? 'bg-danger' : 'bg-success'}`}>
                                                {inv.tipo}
                                            </span>
                                        </td>
                                        <td>{inv.categoria}</td>
                                        <td>{inv.municipio_nombre || "Global"}</td>
                                        <td>${parseFloat(inv.valor).toLocaleString()}</td>
                                        <td>
                                            <span className={`badge ${inv.estado === 'ACTIVO' ? 'bg-primary' : 'bg-secondary'}`}>
                                                {inv.estado}
                                            </span>
                                        </td>
                                        <td>
                                            {canEdit && inv.estado === 'ACTIVO' && (
                                                <>
                                                    <Link to={`/inversiones/editar/${inv.id}`} className="btn btn-warning btn-sm mr-2" style={{ marginRight: '5px' }}>
                                                        <i className="fas fa-edit"></i>
                                                    </Link>
                                                    {user?.role === "ADMIN" && (
                                                        <button className="btn btn-danger btn-sm" onClick={() => setAnularId(inv.id)}>
                                                            <i className="fas fa-ban"></i>
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Anular */}
            {anularId && (
                <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Anular Inversión</h5>
                                <button type="button" className="btn-close" onClick={() => setAnularId(null)}></button>
                            </div>
                            <div className="modal-body">
                                <p>Por favor, ingrese el motivo de la anulación:</p>
                                <textarea className="form-control" value={anularMotivo} onChange={(e) => setAnularMotivo(e.target.value)} rows={3} />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setAnularId(null)}>Cancelar</button>
                                <button type="button" className="btn btn-danger" onClick={handleAnular} disabled={!anularMotivo}>Confirmar Anulación</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvestmentsList;
