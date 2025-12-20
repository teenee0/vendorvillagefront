import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './CookieConsent.module.css';
import { FaTimes } from 'react-icons/fa';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Проверяем, было ли уже дано согласие или отклонено
    const cookieConsent = localStorage.getItem('cookieConsent');
    const dismissedDate = localStorage.getItem('cookieConsentDismissed');
    
    // Если есть явное согласие или отклонение, не показываем баннер
    if (cookieConsent === 'accepted' || cookieConsent === 'declined') {
      return;
    }
    
    // Если баннер был закрыт временно, проверяем, прошло ли 24 часа
    if (dismissedDate) {
      const dismissed = new Date(dismissedDate);
      const now = new Date();
      const hoursDiff = (now - dismissed) / (1000 * 60 * 60);
      
      // Если прошло менее 24 часов, не показываем
      if (hoursDiff < 24) {
        return;
      }
    }
    
    // Показываем баннер с небольшой задержкой для лучшего UX
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    // Удаляем временное закрытие при явном согласии
    localStorage.removeItem('cookieConsentDismissed');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    // Удаляем временное закрытие при явном отклонении
    localStorage.removeItem('cookieConsentDismissed');
    setIsVisible(false);
  };

  const handleClose = () => {
    setIsVisible(false);
    // Сохраняем временное закрытие на 24 часа
    localStorage.setItem('cookieConsentDismissed', new Date().toISOString());
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.cookieBanner}>
      <div className={styles.cookieContent}>
        <div className={styles.cookieIcon}>
          🍪
        </div>
        <div className={styles.cookieText}>
          <h3 className={styles.cookieTitle}>Мы используем файлы cookie</h3>
          <p className={styles.cookieDescription}>
            Мы используем файлы cookie для улучшения работы сайта, персонализации контента и анализа трафика. 
            Продолжая использовать наш сайт, вы соглашаетесь с использованием cookie. 
            Подробнее в нашей{' '}
            <Link to="/privacy" className={styles.cookieLink}>
              Политике конфиденциальности
            </Link>.
          </p>
        </div>
        <div className={styles.cookieActions}>
          <button 
            onClick={handleAccept} 
            className={`${styles.cookieButton} ${styles.acceptButton}`}
          >
            Принять
          </button>
          <button 
            onClick={handleDecline} 
            className={`${styles.cookieButton} ${styles.declineButton}`}
          >
            Отклонить
          </button>
          <button 
            onClick={handleClose} 
            className={styles.closeButton}
            aria-label="Закрыть"
          >
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

