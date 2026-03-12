import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import styles from "./Login.module.css";
import InteractiveBackground from "../components/InteractiveBackground";

const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@pitpc.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 25;
    const y = -(e.clientY - top - height / 2) / 25;
    cardRef.current.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${y}deg)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg)`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError("Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.leftPane}>
        <div className={styles.leftPaneOverlay}></div>
        <InteractiveBackground />
      </div>
      <div className={styles.rightPane} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <div className={styles.glassCard} ref={cardRef}>
          <h2 className={styles.title}>Login</h2>
          
          {error && <div className={styles.errorMessage}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Usuario / Documento</label>
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label className={styles.label}>Contraseña</label>
              <input
                type={showPassword ? "text" : "password"}
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className={styles.actionsContainer}>
              <div>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={showPassword} 
                    onChange={(e) => setShowPassword(e.target.value === "true" ? false : !showPassword)} 
                  />
                  Mostrar contraseña
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" />
                  Mantener sesión iniciada
                </label>
              </div>
              <a href="#" className={styles.forgotPassword}>Recuperar contraseña</a>
            </div>

            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? "Ingresando..." : '"Ingresar a la plataforma"'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
