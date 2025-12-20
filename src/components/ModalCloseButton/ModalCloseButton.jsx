import React from 'react';
import { FaTimes } from 'react-icons/fa';
import styles from './ModalCloseButton.module.css';

const ModalCloseButton = ({ onClick, className = '', ...props }) => {
  return (
    <button
      className={`${styles.closeButton} ${className}`}
      onClick={onClick}
      aria-label="Закрыть"
      {...props}
    >
      <FaTimes />
    </button>
  );
};

export default ModalCloseButton;

