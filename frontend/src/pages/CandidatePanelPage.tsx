import { useEffect, useState } from "react";
import api from "../services/api";

const CandidatePanelPage = () => {
  const [candidato, setCandidato] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/candidatos/me/");
      setCandidato(data);
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar tu perfil de candidato.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="pb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h1 className="h4 font-weight-bold mb-0">Panel del candidato</h1>
          <p className="text-muted mb-0">Consulta tus datos registrados dentro de la plataforma.</p>
        </div>
        {loading && <span className="badge badge-info">Cargando...</span>}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {candidato && (
        <div className="row">
          <div className="col-lg-4 col-12 mb-3">
            <div className="card h-100">
              {candidato.foto && (
                <img src={candidato.foto} alt={candidato.nombre} className="card-img-top" />
              )}
              <div className="card-body">
                <h5 className="card-title mb-1">{candidato.nombre}</h5>
                <p className="text-muted mb-2">{candidato.cargo}</p>
                <p className="mb-0">
                  <span className="badge badge-primary">{candidato.partido}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="col-lg-8 col-12">
            <div className="card card-outline card-primary mb-3">
              <div className="card-header">
                <h3 className="card-title mb-0">Información de la cuenta</h3>
              </div>
              <div className="card-body">
                <dl className="row mb-0">
                  <dt className="col-sm-4">Correo de inicio de sesión</dt>
                  <dd className="col-sm-8">{candidato.usuario_email}</dd>
                  <dt className="col-sm-4">Creado</dt>
                  <dd className="col-sm-8">
                    {new Date(candidato.fecha_creacion).toLocaleString()}
                  </dd>
                  <dt className="col-sm-4">Última actualización</dt>
                  <dd className="col-sm-8">
                    {new Date(candidato.fecha_actualizacion).toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="alert alert-info mb-0">
              Recuerda mantener tus credenciales en un lugar seguro. Si necesitas actualizar tus datos o contraseña
              comunícate con el administrador.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidatePanelPage;
