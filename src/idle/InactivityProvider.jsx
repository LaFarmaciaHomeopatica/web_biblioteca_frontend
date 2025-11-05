// src/idle/InactivityProvider.jsx
import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Modal, Button } from "react-bootstrap";
import api from "../api/api"; // cliente axios con Bearer y baseURL

const TIMEOUT_HOURS = 7;
const TIMEOUT_MS = TIMEOUT_HOURS * 60 * 60 * 1000;
const CHECK_MS = 1000;
const WARNING_MS = 5 * 60 * 1000; // Mostrar advertencia 5 minutos antes

export default function InactivityProvider({ children, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const intervalRef = useRef(null);
  const [showWarning, setShowWarning] = useState(false);
  const [remaining, setRemaining] = useState(WARNING_MS / 1000);

  const touch = useCallback(() => {
    localStorage.setItem("lastActivity", String(Date.now()));
    setShowWarning(false);
    setRemaining(WARNING_MS / 1000);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout'); // ✅ aquí se revoca el token en backend
    } catch (error) {
      console.warn('[Inactivity] logout error:', error?.response?.status, error?.message);
    } finally {
      setShowWarning(false);
      localStorage.removeItem("lastActivity");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      if (onLogout) onLogout();
      if (location.pathname !== "/") {
        navigate("/", { replace: true });
      }
    }
  }, [navigate, onLogout, location.pathname]);

  useEffect(() => {
    if (location.pathname === "/") return;

    if (!localStorage.getItem("lastActivity")) {
      touch();
    }

    const events = ["mousedown","keydown","scroll","touchstart","visibilitychange","focus"];
    const onActivity = () => touch();
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    intervalRef.current = setInterval(() => {
      const last = Number(localStorage.getItem("lastActivity")) || Date.now();
      const idle = Date.now() - last;
      const remainingTime = TIMEOUT_MS - idle;

      if (remainingTime <= WARNING_MS && remainingTime > 0 && !showWarning) {
        setShowWarning(true);
        setRemaining(Math.ceil(remainingTime / 1000));
      }
      if (showWarning && remainingTime > 0) {
        setRemaining(Math.ceil(remainingTime / 1000));
      }
      if (idle >= TIMEOUT_MS) {
        clearInterval(intervalRef.current);
        logout();
      }
    }, CHECK_MS);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [logout, touch, showWarning, location.pathname]);

  return (
    <>
      {children}
      <Modal
        show={showWarning}
        onHide={() => setShowWarning(false)}
        centered
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header style={{ backgroundColor: "#51c3f8ff", color: "#fff" }}>
          <Modal.Title>⚠️ Sesión por expirar</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <p>
            Tu sesión se cerrará por inactividad en{" "}
            <strong>{remaining}</strong> segundos.
          </p>
          <p>¿Deseas continuar conectado?</p>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-center">
          <Button variant="secondary" onClick={logout}>
            Cerrar sesión
          </Button>
          <Button variant="primary" onClick={touch}>
            Continuar sesión
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
