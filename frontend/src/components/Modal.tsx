import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  return isOpen ? ( // Conditionally render the entire modal structure
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="absolute top-4 right-4">X</button>
        </div>
        <div className="p-4">{children}</div>
        <div className="p-4 border-t flex justify-end gap-2">
          {footer}
        </div>
      </div>
    </div>
  ) : null; // Render null if not open
};

export default Modal;