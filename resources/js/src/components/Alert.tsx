// components/Alert.tsx

import React from 'react';
import clsx from 'clsx';

type AlertType = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

interface AlertProps {
  type?: AlertType;
  title: string;
  message: string;
  onClose?: () => void;
}

const typeClassMap: Record<AlertType, { text: string; bg: string }> = {
  primary: {
    text: 'text-primary',
    bg: 'bg-primary-light dark:bg-primary-dark-light',
  },
  secondary: {
    text: 'text-secondary',
    bg: 'bg-secondary-light dark:bg-secondary-dark-light',
  },
  success: {
    text: 'text-success',
    bg: 'bg-success-light dark:bg-success-dark-light',
  },
  warning: {
    text: 'text-warning',
    bg: 'bg-warning-light dark:bg-warning-dark-light',
  },
  danger: {
    text: 'text-danger',
    bg: 'bg-danger-light dark:bg-danger-dark-light',
  },
  info: {
    text: 'text-info',
    bg: 'bg-info-light dark:bg-info-dark-light',
  },
};

const Alert: React.FC<AlertProps> = ({ type = 'primary', title, message, onClose }) => {
  return (
    <div className={clsx(
      'flex items-center p-3.5 rounded',
      typeClassMap[type].text,
      typeClassMap[type].bg
    )}>
      <span className="ltr:pr-2 rtl:pl-2">
        <strong className="ltr:mr-1 rtl:ml-1">{title}</strong>{message}
      </span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ltr:ml-auto rtl:mr-auto hover:opacity-80"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 8.586L15.95 2.636a1 1 0 111.414 1.414L11.414 10l5.95 5.95a1 1 0 11-1.414 1.414L10 11.414l-5.95 5.95a1 1 0 11-1.414-1.414L8.586 10 2.636 4.05a1 1 0 011.414-1.414L10 8.586z"/>
          </svg>
        </button>
      )}
    </div>
  );
};

export default Alert;
