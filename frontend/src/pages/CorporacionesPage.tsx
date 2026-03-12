import React, { useEffect, useState } from "react";
import { Corporacion, getCorporaciones, createCorporacion, updateCorporacion, deleteCorporacion } from "../services/corporaciones";

const CorporacionesPage: React.FC = () => {
  const [corporaciones, setCorporaciones] = useState<Corporacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentCorporacion, setCurrentCorporacion] = useState<Partial<Corporacion>>({});

  const fetchCorporaciones = async () => {
    setLoading(true);
    try {
      const data = await getCorporaciones();
      setCorporaciones(data.results || data);
    } catch (error) {
      console.error("Error fetching corporaciones", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorporaciones();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentCorporacion.id) {
        await updateCorporacion(currentCorporacion.id, currentCorporacion);
      } else {
        await createCorporacion(currentCorporacion);
      }
      setShowModal(false);
      fetchCorporaciones();
    } catch (error) {
      console.error("Error saving corporacion", error);
    }
  };

  const handleEdit = (corporacion: Corporacion) => {
    setCurrentCorporacion(corporacion);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("¿Está seguro de eliminar esta corporación?")) {
      try {
        await deleteCorporacion(id);
        fetchCorporaciones();
      } catch (error) {
        console.error("Error deleting corporacion", error);
      }
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Corporaciones (Cargos)</h2>
        <button
          className="btn btn-primary"
          onClick={() => {
            setCurrentCorporacion({});
            setShowModal(true);
          }}
        >
          <i className="fas fa-plus mr-2"></i> Crear Corporación
        </button>
      </div>

      {loading ? (
        <div className="text-center">Cargando...</div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {corporaciones.map((c) => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.nombre}</td>
                      <td>{c.descripcion}</td>
                      <td className="text-right">
                        <button className="btn btn-sm btn-info mr-2" onClick={() => handleEdit(c)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {corporaciones.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4">
                        No hay corporaciones registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{currentCorporacion.id ? "Editar" : "Nueva"} Corporación</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Nombre</label>
                    <input
                      type="text"
                      className="form-control"
                      value={currentCorporacion.nombre || ""}
                      onChange={(e) => setCurrentCorporacion({ ...currentCorporacion, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                      className="form-control"
                      value={currentCorporacion.descripcion || ""}
                      onChange={(e) => setCurrentCorporacion({ ...currentCorporacion, descripcion: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorporacionesPage;
