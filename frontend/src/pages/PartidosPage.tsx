import React, { useEffect, useState } from "react";
import { Partido, getPartidos, createPartido, updatePartido, deletePartido } from "../services/partidos";

const PartidosPage: React.FC = () => {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentPartido, setCurrentPartido] = useState<Partial<Partido>>({});

  const fetchPartidos = async () => {
    setLoading(true);
    try {
      const data = await getPartidos();
      setPartidos(data.results || data);
    } catch (error) {
      console.error("Error fetching partidos", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartidos();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentPartido.id) {
        await updatePartido(currentPartido.id, currentPartido);
      } else {
        await createPartido(currentPartido);
      }
      setShowModal(false);
      fetchPartidos();
    } catch (error) {
      console.error("Error saving partido", error);
    }
  };

  const handleEdit = (partido: Partido) => {
    setCurrentPartido(partido);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("¿Está seguro de eliminar este partido?")) {
      try {
        await deletePartido(id);
        fetchPartidos();
      } catch (error) {
        console.error("Error deleting partido", error);
      }
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Partidos Políticos</h2>
        <button
          className="btn btn-primary"
          onClick={() => {
            setCurrentPartido({});
            setShowModal(true);
          }}
        >
          <i className="fas fa-plus mr-2"></i> Crear Partido
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
                    <th>Sigla</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {partidos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.nombre}</td>
                      <td>{p.sigla}</td>
                      <td className="text-right">
                        <button className="btn btn-sm btn-info mr-2" onClick={() => handleEdit(p)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {partidos.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4">
                        No hay partidos registrados.
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
                <h5 className="modal-title">{currentPartido.id ? "Editar" : "Nuevo"} Partido</h5>
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
                      value={currentPartido.nombre || ""}
                      onChange={(e) => setCurrentPartido({ ...currentPartido, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Sigla</label>
                    <input
                      type="text"
                      className="form-control"
                      value={currentPartido.sigla || ""}
                      onChange={(e) => setCurrentPartido({ ...currentPartido, sigla: e.target.value })}
                      required
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

export default PartidosPage;
