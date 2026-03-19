import type { ReactNode } from "react";

type FormModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
};

export function FormModal({
  isOpen,
  title,
  onClose,
  children,
  maxWidthClassName = "max-w-2xl",
}: FormModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className={`modal-box w-11/12 ${maxWidthClassName}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>

        {children}
      </div>

      <button type="button" className="modal-backdrop" aria-label="Fechar modal" onClick={onClose}>
        Fechar
      </button>
    </div>
  );
}
