import React, { useState, useEffect } from 'react';
import axios from '../../api/axiosDefault';
import { QRCodeSVG } from 'qrcode.react';
import { FaQrcode, FaSyncAlt, FaCopy, FaCheck } from 'react-icons/fa';
import styles from './UserQRCode.module.css';

const UserQRCode = () => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQRCode();
    // Обновляем QR-код каждые 5 минут
    const interval = setInterval(fetchQRCode, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchQRCode = async () => {
    try {
      setLoading(true);
      const response = await axios.get('api/user/qr-code/');
      setQrData(response.data);
      setError(null);
    } catch (err) {
      console.error('Ошибка загрузки QR-кода:', err);
      setError('Не удалось загрузить QR-код');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (qrData?.qr_token) {
      navigator.clipboard.writeText(qrData.qr_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка QR-кода...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <button onClick={fetchQRCode} className={styles.retryButton}>
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!qrData) {
    return null;
  }

  const expiresAt = new Date(qrData.expires_at);
  const timeUntilExpiry = Math.max(0, Math.floor((expiresAt - new Date()) / 1000 / 60));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>
          <FaQrcode /> Мой QR-код
        </h2>
        <button onClick={fetchQRCode} className={styles.refreshButton} title="Обновить QR-код">
          <FaSyncAlt />
        </button>
      </div>

      <div className={styles.qrSection}>
        <div className={styles.qrCodeWrapper}>
          <QRCodeSVG
            value={qrData.qr_token}
            size={256}
            level="H"
            includeMargin={true}
            className={styles.qrCode}
          />
        </div>

        <div className={styles.info}>
          <p className={styles.description}>
            Покажите этот QR-код на кассе для начисления бонусов
          </p>
          <p className={styles.expiry}>
            Действителен еще: {timeUntilExpiry} мин.
          </p>
        </div>

        <div className={styles.actions}>
          <button onClick={handleCopy} className={styles.copyButton}>
            {copied ? (
              <>
                <FaCheck /> Скопировано!
              </>
            ) : (
              <>
                <FaCopy /> Копировать токен
              </>
            )}
          </button>
        </div>
      </div>

      <div className={styles.bonusInfo}>
        <h3>Как это работает:</h3>
        <ul>
          <li>QR-код обновляется каждые 5-10 минут для безопасности</li>
          <li>Покажите QR-код продавцу при покупке</li>
          <li>Бонусы начисляются автоматически после покупки</li>
          <li>Проверяйте баланс бонусов в истории</li>
        </ul>
      </div>
    </div>
  );
};

export default UserQRCode;

