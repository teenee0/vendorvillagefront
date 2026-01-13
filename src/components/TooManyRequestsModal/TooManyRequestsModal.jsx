import React, { useState } from 'react';
import { FaExclamationTriangle, FaClock, FaRedo } from 'react-icons/fa';
import styles from './TooManyRequestsModal.module.css';

const TooManyRequestsModal = ({ isOpen, retryAfter, onRetry }) => {
  const [isRetrying, setIsRetrying] = useState(false);

  if (!isOpen) return null;

  // Форматируем время ожидания
  const formatRetryAfter = (seconds) => {
    if (!seconds || seconds === 'N/A') return 'несколько минут';
    
    const sec = parseInt(seconds);
    if (isNaN(sec)) return 'несколько минут';
    
    if (sec < 60) {
      return `${sec} ${sec === 1 ? 'секунду' : sec < 5 ? 'секунды' : 'секунд'}`;
    } else if (sec < 3600) {
      const minutes = Math.floor(sec / 60);
      return `${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'}`;
    } else {
      const hours = Math.floor(sec / 3600);
      return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
    }
  };

  const handleRetry = async () => {
    if (onRetry && !isRetrying) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        setIsRetrying(false);
      }
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>
            <FaExclamationTriangle className={styles.warningIcon} />
            <span>Слишком много запросов</span>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.message}>
            <FaClock className={styles.clockIcon} />
            <p>
              Вы сделали слишком много запросов к серверу.
              Пожалуйста, повторите попытку позже.
            </p>
          </div>

          {retryAfter && retryAfter !== 'N/A' && (
            <div className={styles.retryInfo}>
              <p className={styles.retryText}>
                Рекомендуется повторить запрос через: <strong>{formatRetryAfter(retryAfter)}</strong>
              </p>
            </div>
          )}

          <div className={styles.footer}>
            <button 
              className={styles.retryButton} 
              onClick={handleRetry}
              disabled={isRetrying}
            >
              <FaRedo className={isRetrying ? styles.spinning : ''} />
              {isRetrying ? 'Повторение...' : 'Обновить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TooManyRequestsModal;

