import React, { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Departamento { id: number; nombre: string; }
interface Municipio {
    id: number;
    nombre: string;
    departamento?: Departamento;
    departamento_detalle?: Departamento;
}
interface PollingStation {
    id: number;
    departamento: string;
    municipio: string;
    puesto: string;
}

interface CedulaMaster {
    id: number;
    cedula: string;
    pais?: string | null;
    departamento?: string | null;
    municipio?: string | null;
    puesto?: string | null;
    mesa?: string | null;
    primer_nombre?: string | null;
    segundo_nombre?: string | null;
    primer_apellido?: string | null;
    segundo_apellido?: string | null;
    telefono?: string | null;
    correo?: string | null;
    sexo?: string | null;
}

const normalizeStr = (str?: string | null) => {
    return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

const CedulaValidationPage: React.FC = () => {
    const { user } = useAuth();
    const [cedulas, setCedulas] = useState<CedulaMaster[]>([]);

    // Datatable state
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [municipios, setMunicipios] = useState<Municipio[]>([]);
    const [puestos, setPuestos] = useState<PollingStation[]>([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ message: string; type: "success" | "danger" } | null>(null);

    const [form, setForm] = useState<Partial<CedulaMaster>>({});
    const [isEditing, setIsEditing] = useState(false);

    // File Upload State
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cedulasRes, depsRes, munRes, puestosRes] = await Promise.all([
                api.get<CedulaMaster[]>("/cedulas-master/"),
                api.get<Departamento[]>("/departamentos/"),
                api.get<Municipio[]>("/municipios/"),
                api.get<PollingStation[]>("/puestos-votacion/"),
            ]);
            setCedulas(cedulasRes.data);
            setDepartamentos(depsRes.data);
            setMunicipios(munRes.data);
            setPuestos(puestosRes.data);
        } catch (err) {
            console.error(err);
            setAlert({ message: "No fue posible cargar las cédulas", type: "danger" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === "departamento") {
            setForm({ ...form, departamento: value, municipio: "", puesto: "" });
        } else if (name === "municipio") {
            setForm({ ...form, municipio: value, puesto: "" });
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.cedula) {
            setAlert({ message: "La cédula es obligatoria", type: "danger" });
            return;
        }

        setAlert(null);
        try {
            if (isEditing && form.id) {
                await api.put(`/cedulas-master/${form.id}/`, form);
                setAlert({ message: "Cédula actualizada correctamente", type: "success" });
            } else {
                await api.post("/cedulas-master/", form);
                setAlert({ message: "Cédula creada correctamente", type: "success" });
            }
            setForm({});
            setIsEditing(false);
            loadData();
        } catch (err) {
            console.error(err);
            setAlert({ message: "Error al guardar la información", type: "danger" });
        }
    };

    const handleEdit = (cedula: CedulaMaster) => {
        setForm(cedula);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("¿Está seguro de eliminar este registro?")) return;
        try {
            await api.delete(`/cedulas-master/${id}/`);
            setAlert({ message: "Cédula eliminada correctamente", type: "success" });
            loadData();
        } catch (err) {
            console.error(err);
            setAlert({ message: "Error al eliminar la cédula", type: "danger" });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    // Pagination and Filtering Logic
    const filteredCedulas = cedulas.filter((c) => {
        const search = searchTerm.toLowerCase();
        return (
            (c.cedula && c.cedula.toLowerCase().includes(search)) ||
            (c.primer_nombre && c.primer_nombre.toLowerCase().includes(search)) ||
            (c.primer_apellido && c.primer_apellido.toLowerCase().includes(search)) ||
            (c.telefono && c.telefono.toLowerCase().includes(search))
        );
    });

    const totalPages = Math.ceil(filteredCedulas.length / itemsPerPage) || 1;
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [filteredCedulas.length, currentPage, totalPages]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCedulas = filteredCedulas.slice(indexOfFirstItem, indexOfLastItem);

    const handleUploadExcel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setAlert({ message: "Debe seleccionar un archivo Excel (.xlsx, .xls)", type: "danger" });
            return;
        }

        const formData = new FormData();
        formData.append("excel_file", file);

        setUploading(true);
        setAlert(null);
        try {
            const response = await api.post("/cedulas-master/import-excel/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setAlert({ message: response.data.detail || "Archivo procesado exitosamente", type: "success" });
            setFile(null);
            // Reset input type file visually
            const fileInput = document.getElementById("excel-upload") as HTMLInputElement;
            if (fileInput) fileInput.value = "";

            loadData();
        } catch (err: any) {
            console.error(err);
            setAlert({
                message: err.response?.data?.detail || "Ha ocurrido un error al procesar el archivo Excel",
                type: "danger"
            });
        } finally {
            setUploading(false);
        }
    };

    if (user?.role !== "ADMIN") {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger">No cuenta con los permisos necesarios para acceder a este módulo.</div>
            </div>
        );
    }

    return (
        <div className="pb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h1 className="h4 font-weight-bold mb-0">Cédulas Master</h1>
                    <p className="text-muted mb-0">Gestión y carga masiva de cédulas para validación.</p>
                </div>
                {loading && <span className="badge badge-info">Cargando datos...</span>}
            </div>

            {alert && (
                <div className={`alert alert-${alert.type} alert-dismissible`} role="alert">
                    {alert.message}
                    <button type="button" className="close" onClick={() => setAlert(null)}>
                        <span>&times;</span>
                    </button>
                </div>
            )}

            {/* Excel Upload Section */}
            <div className="card card-outline card-success mb-4">
                <div className="card-header">
                    <h3 className="card-title">Carga Masiva (Excel)</h3>
                </div>
                <div className="card-body">
                    <form className="form-inline" onSubmit={handleUploadExcel}>
                        <div className="form-group mb-2 mr-sm-2">
                            <input
                                type="file"
                                className="form-control-file"
                                id="excel-upload"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                            />
                        </div>
                        <button type="submit" className="btn btn-success mb-2" disabled={uploading}>
                            {uploading ? "Procesando..." : (
                                <><i className="fas fa-file-excel mr-2" /> Importar Cédulas</>
                            )}
                        </button>
                    </form>
                    <small className="form-text text-muted">
                        El archivo debe contener exactamente las siguientes cabeceras: cedula, pais, departamento, municipio, puesto, mesa, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono, correo, sexo.
                    </small>
                </div>
            </div>

            <div className="row">
                {/* Form Section */}
                <div className="col-lg-4 col-12 mb-4">
                    <div className="card card-primary card-outline">
                        <div className="card-header">
                            <h3 className="card-title">{isEditing ? "Editar Registro" : "Nuevo Registro"}</h3>
                        </div>
                        <form className="card-body" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Cédula *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="cedula"
                                    autoComplete="off"
                                    value={form.cedula || ""}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group col-md-6">
                                    <label>Primer Nombre</label>
                                    <input type="text" className="form-control" name="primer_nombre" value={form.primer_nombre || ""} onChange={handleChange} />
                                </div>
                                <div className="form-group col-md-6">
                                    <label>Segundo Nombre</label>
                                    <input type="text" className="form-control" name="segundo_nombre" value={form.segundo_nombre || ""} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group col-md-6">
                                    <label>Primer Apellido</label>
                                    <input type="text" className="form-control" name="primer_apellido" value={form.primer_apellido || ""} onChange={handleChange} />
                                </div>
                                <div className="form-group col-md-6">
                                    <label>Segundo Apellido</label>
                                    <input type="text" className="form-control" name="segundo_apellido" value={form.segundo_apellido || ""} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Teléfono</label>
                                <input type="text" className="form-control" name="telefono" value={form.telefono || ""} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Departamento</label>
                                <select className="form-control" name="departamento" value={form.departamento || ""} onChange={handleChange}>
                                    <option value="">Seleccione</option>
                                    {departamentos.map(d => <option key={d.id} value={d.nombre}>{d.nombre}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Municipio</label>
                                <select className="form-control" name="municipio" value={form.municipio || ""} onChange={handleChange} disabled={!form.departamento}>
                                    <option value="">Seleccione</option>
                                    {municipios
                                        .filter(m => !form.departamento || (m.departamento_detalle?.nombre || m.departamento?.nombre) === form.departamento)
                                        .map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Puesto</label>
                                <select className="form-control" name="puesto" value={form.puesto || ""} onChange={handleChange} disabled={!form.municipio}>
                                    <option value="">Seleccione</option>
                                    {Array.from(new Set(puestos
                                        .filter(p => normalizeStr(p.departamento) === normalizeStr(form.departamento) && normalizeStr(p.municipio) === normalizeStr(form.municipio))
                                        .map(p => p.puesto)))
                                        .sort()
                                        .map(puestoName => <option key={puestoName} value={puestoName}>{puestoName}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Mesa</label>
                                <input type="text" className="form-control" name="mesa" value={form.mesa || ""} onChange={handleChange} />
                            </div>

                            <div className="d-flex justify-content-between">
                                <button type="submit" className="btn btn-primary">
                                    <i className="fas fa-save mr-2" /> Guardar
                                </button>
                                {isEditing && (
                                    <button type="button" className="btn btn-secondary" onClick={() => { setIsEditing(false); setForm({}); }}>
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Datatable Section */}
                <div className="col-lg-8 col-12">
                    <div className="card card-outline card-secondary">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h3 className="card-title mb-0">Listado de Cédulas</h3>
                            <div className="card-tools">
                                <div className="input-group input-group-sm" style={{ width: 250 }}>
                                    <input
                                        type="text"
                                        className="form-control float-right"
                                        placeholder="Buscar cédula, nombre, apellido..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    />
                                    <div className="input-group-append">
                                        <div className="input-group-text">
                                            <i className="fas fa-search" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-striped table-hover mb-0 text-nowrap">
                                    <thead style={{ backgroundColor: "#f8f9fa" }}>
                                        <tr>
                                            <th>Cédula</th>
                                            <th>Nombres</th>
                                            <th>Apellidos</th>
                                            <th>Teléfono</th>
                                            <th>Ubicación</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentCedulas.map((c) => (
                                            <tr key={c.id}>
                                                <td>{c.cedula}</td>
                                                <td>{c.primer_nombre} {c.segundo_nombre}</td>
                                                <td>{c.primer_apellido} {c.segundo_apellido}</td>
                                                <td>{c.telefono || "-"}</td>
                                                <td>
                                                    {c.departamento || "-"} / {c.municipio || "-"}
                                                    <br />
                                                    <small className="text-muted">
                                                        Puesto: {c.puesto || "-"} - Mesa {c.mesa || "-"}
                                                    </small>
                                                </td>
                                                <td>
                                                    <button className="btn btn-sm btn-info mr-2" onClick={() => handleEdit(c)} title="Editar">
                                                        <i className="fas fa-edit" />
                                                    </button>
                                                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)} title="Eliminar">
                                                        <i className="fas fa-trash" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {!currentCedulas.length && !loading && (
                                            <tr>
                                                <td colSpan={6} className="text-center text-muted py-4">
                                                    No se encontraron registros.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="card-footer clearfix flex-column flex-sm-row d-flex justify-content-between align-items-center pr-3 pl-3">
                            <span className="text-muted mb-2 mb-sm-0">
                                Mostrando {filteredCedulas.length === 0 ? 0 : indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredCedulas.length)} de {filteredCedulas.length} registros
                            </span>
                            <ul className="pagination pagination-sm m-0 sm-mt-2">
                                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                                    <button className="page-link" onClick={() => setCurrentPage(1)}>&laquo;</button>
                                </li>
                                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                                    <button className="page-link" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Anterior</button>
                                </li>
                                <li className="page-item active">
                                    <span className="page-link">{currentPage} de {totalPages}</span>
                                </li>
                                <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                                    <button className="page-link" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Siguiente</button>
                                </li>
                                <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                                    <button className="page-link" onClick={() => setCurrentPage(totalPages)}>&raquo;</button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CedulaValidationPage;
