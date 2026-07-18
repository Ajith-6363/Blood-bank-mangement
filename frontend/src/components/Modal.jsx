import React, { useEffect } from "react";
import { X } from "lucide-react";

const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    // Disable background scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        className="glass-card fade-in"
        style={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <h3>{title}</h3>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>
        <div style={styles.body}>{children}</div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(5, 7, 12, 0.75)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 1000,
  },
  modalContent: {
    width: "100%",
    maxWidth: "520px",
    maxHeight: "90vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    padding: "2rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1.5rem",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "0.75rem",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    padding: "0.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color var(--transition-fast)",
    ":hover": {
      color: "var(--accent-red)",
    },
  },
  body: {
    flex: 1,
  },
};

export default Modal;
