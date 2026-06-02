import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog">
        <div className="confirm-icon">
          <AlertTriangle />
        </div>
        <h4>{title}</h4>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting…" : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
