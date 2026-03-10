import React, { useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const CrossReferencePage: React.FC = () => {
    const { user } = useAuth();
    const [downloading, setDownloading] = useState(false);
    const [taskStatus, setTaskStatus] = useState<"idle" | "processing" | "completed" | "error">("idle");
    const [progress, setProgress] = useState(0);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [alert, setAlert] = useState<{ message: string; type: "success" | "danger" } | null>(null);

    const pollProgress = async (id: string) => {
        try {
            const res = await api.get(`/encuestas/estado-cruce/?task_id=${id}`);
            const data = res.data;
            setProgress(data.progress || 0);

            if (data.status === "completed") {
                setTaskStatus("completed");
                downloadFile(id);
            } else if (data.status === "error") {
                setTaskStatus("error");
                setAlert({ message: data.detail || "Error en el procesamiento.", type: "danger" });
                setDownloading(false);
            } else {
                // still processing, poll again in 1.5s
                setTimeout(() => pollProgress(id), 1500);
            }
        } catch (err: any) {
            console.error(err);
            // If task dropped or network error, stop.
            if (err.response?.status === 404) {
                setAlert({ message: "La tarea expiró o no se encontraron coincidencias.", type: "danger" });
            } else {
                setAlert({ message: "Error al consultar estado de la tarea.", type: "danger" });
            }
            setTaskStatus("error");
            setDownloading(false);
        }
    };

    const downloadFile = async (id: string) => {
        try {
            const response = await api.get(`/encuestas/descargar-archivo-cruce/?task_id=${id}`, {
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "cruce_cedulas_master_vs_registros.xlsx");
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            setAlert({ message: "El archivo se ha descargado exitosamente.", type: "success" });
        } catch (err) {
            console.error(err);
            setAlert({ message: "Módulo completado pero falló la descarga del archivo. Intente nuevamente.", type: "danger" });
        } finally {
            setDownloading(false);
            setTaskStatus("idle");
            setProgress(0);
            setTaskId(null);
        }
    };

    const handleDownloadCrossReference = async () => {
        setDownloading(true);
        setAlert(null);
        setTaskStatus("processing");
        setProgress(0);
        try {
            const response = await api.post("/encuestas/iniciar-cruce/");
            setTaskId(response.data.task_id);
            pollProgress(response.data.task_id);
        } catch (err: any) {
            console.error(err);
            setAlert({ message: "No fue posible iniciar el cruce de datos.", type: "danger" });
            setTaskStatus("error");
            setDownloading(false);
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
                    <h1 className="h4 font-weight-bold mb-0">Cruce de Datos</h1>
                    <p className="text-muted mb-0">Comparación de Registros de Encuestas contra Cédulas Master.</p>
                </div>
            </div>

            {alert && (
                <div className={`alert alert-${alert.type} alert-dismissible`} role="alert">
                    {alert.message}
                    <button type="button" className="close" onClick={() => setAlert(null)}>
                        <span>&times;</span>
                    </button>
                </div>
            )}

            <div className="card card-outline card-primary mb-4">
                <div className="card-header">
                    <h3 className="card-title">Descargar Cruce</h3>
                </div>
                <div className="card-body">
                    <p>
                        Al presionar el botón debajo, el sistema tomará todas las cédulas capturadas en los <b>Registros (Encuestas)</b>
                        y buscará coincidencias exactas en la base de datos de <b>Cédulas Master</b>. Se generará un informe en Excel
                        con las cédulas encontradas e información sobre las mismas.
                    </p>
                    {taskStatus === "processing" && (
                        <div className="mb-4 mt-3">
                            <p className="mb-2"><strong>Generando el cruce de datos...</strong> {progress}% completado</p>
                            <div className="progress">
                                <div
                                    className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                                    role="progressbar"
                                    style={{ width: `${progress}%` }}
                                    aria-valuenow={progress}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        className="btn btn-primary btn-lg mt-3"
                        onClick={handleDownloadCrossReference}
                        disabled={downloading}
                    >
                        {downloading ? (
                            <>
                                <i className="fas fa-spinner fa-spin mr-2" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-file-excel mr-2" />
                                Generar y Descargar Cruce
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CrossReferencePage;
