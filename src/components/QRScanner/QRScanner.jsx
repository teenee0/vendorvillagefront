import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import { Html5Qrcode } from 'html5-qrcode';
import { FaQrcode, FaGift, FaPercent, FaDollarSign, FaCamera, FaKeyboard } from 'react-icons/fa';
import ModalCloseButton from '../ModalCloseButton/ModalCloseButton';
import styles from './QRScanner.module.css';

const QRScanner = ({ locationId, onCustomerSelected, onClose }) => {
  const { business_slug } = useParams();
  const [qrToken, setQrToken] = useState('');
  const [scanning, setScanning] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [error, setError] = useState(null);
  const [bonusRedemptionPercent, setBonusRedemptionPercent] = useState(0);
  const [bonusRedemptionAmount, setBonusRedemptionAmount] = useState(0);
  const [redemptionType, setRedemptionType] = useState('percent');
  const [useCamera, setUseCamera] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const handleScan = async () => {
    if (!qrToken.trim()) {
      setError('Введите QR-токен');
      return;
    }
    await handleScanWithToken(qrToken);
  };

  const handleClear = () => {
    setQrToken('');
    setCustomerData(null);
    setError(null);
    setBonusRedemptionPercent(0);
    setBonusRedemptionAmount(0);
  };

  const handleScanWithToken = React.useCallback(async (token) => {
    if (!token || !token.trim()) {
      setError('QR-код не распознан');
      return;
    }

    try {
      setScanning(true);
      setError(null);
      const response = await axios.post(`api/business/${business_slug}/scan-qr/`, {
        qr_token: token,
        location_id: locationId,
      });

      setCustomerData(response.data);
      if (onCustomerSelected) {
        onCustomerSelected(response.data);
      }
    } catch (err) {
      console.error('Ошибка сканирования QR:', err);
      setError(err.response?.data?.error || 'Не удалось отсканировать QR-код');
      setCustomerData(null);
    } finally {
      setScanning(false);
    }
  }, [business_slug, locationId, onCustomerSelected]);

  // Функция для безопасной остановки камеры
  const stopCamera = React.useCallback(async () => {
    if (html5QrCodeRef.current && cameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        setCameraActive(false);
      } catch (err) {
        // Игнорируем ошибки, если камера уже остановлена
        if (!err.message?.includes('not running') && !err.message?.includes('not paused')) {
          console.error('Ошибка остановки камеры:', err);
        }
        setCameraActive(false);
      }
    }
  }, [cameraActive]);

  // Инициализация и управление камерой
  useEffect(() => {
    // Если режим камеры выключен или есть данные клиента, останавливаем камеру
    if (!useCamera || customerData) {
      stopCamera();
      return;
    }

    // Если камера уже активна, не запускаем повторно
    if (cameraActive || !scannerRef.current) {
      return;
    }

    let html5QrCode = null;
    let isMounted = true;

    const startCamera = async () => {
      try {
        html5QrCode = new Html5Qrcode(scannerRef.current.id);
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (isMounted) {
              setQrToken(decodedText);
              handleScanWithToken(decodedText);
            }
          },
          (errorMessage) => {
            // Игнорируем ошибки сканирования
          }
        );

        if (isMounted) {
          setCameraActive(true);
          setError(null);
        }
      } catch (err) {
        console.error('Ошибка запуска камеры:', err);
        if (isMounted) {
          setError('Не удалось запустить камеру. Проверьте разрешения.');
          setUseCamera(false);
          setCameraActive(false);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [useCamera, customerData, handleScanWithToken, stopCamera, cameraActive]);

  // Обработка закрытия модального окна
  const handleClose = React.useCallback(async () => {
    await stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>
            <FaQrcode /> Сканирование QR-кода
          </h3>
          <ModalCloseButton onClick={handleClose} />
        </div>

        <div className={styles.content}>
          {!customerData ? (
            <>
              {/* Переключатель режима */}
              <div className={styles.modeToggle}>
                <button
                  className={`${styles.modeButton} ${useCamera ? styles.active : ''}`}
                  onClick={() => setUseCamera(true)}
                  disabled={scanning}
                >
                  <FaCamera /> Камера
                </button>
                <button
                  className={`${styles.modeButton} ${!useCamera ? styles.active : ''}`}
                  onClick={() => setUseCamera(false)}
                  disabled={scanning}
                >
                  <FaKeyboard /> Ручной ввод
                </button>
              </div>

              {useCamera ? (
                <div className={styles.cameraSection}>
                  <div id="qr-reader" ref={scannerRef} className={styles.qrReader}></div>
                  {scanning && (
                    <div className={styles.scanningOverlay}>
                      <div className={styles.scanningText}>Обработка...</div>
                    </div>
                  )}
                  {!cameraActive && !scanning && (
                    <div className={styles.cameraPlaceholder}>
                      <FaCamera />
                      <p>Запуск камеры...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.inputSection}>
                  <label>QR-токен:</label>
                  <input
                    type="text"
                    value={qrToken}
                    onChange={(e) => setQrToken(e.target.value)}
                    placeholder="Введите QR-токен"
                    onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                    autoFocus
                  />
                  <button
                    onClick={handleScan}
                    disabled={scanning || !qrToken.trim()}
                    className={styles.scanButton}
                  >
                    {scanning ? 'Сканирование...' : 'Сканировать'}
                  </button>
                </div>
              )}

              {error && <div className={styles.error}>{error}</div>}
            </>
          ) : (
            <div className={styles.customerInfo}>
              <div className={styles.customerHeader}>
                <h4>Клиент: {customerData.user.full_name || customerData.user.username}</h4>
                <button onClick={handleClear} className={styles.clearButton}>
                  Очистить
                </button>
              </div>

              <div className={styles.balanceSection}>
                <div className={styles.balanceCard}>
                  <FaGift />
                  <div>
                    <div className={styles.balanceLabel}>Баланс бонусов</div>
                    <div className={styles.balanceValue}>
                      {parseFloat(customerData.balance).toFixed(2)} баллов
                    </div>
                  </div>
                </div>

                {customerData.tier && (
                  <div className={styles.tierCard}>
                    <div className={styles.tierLabel}>Уровень:</div>
                    <div className={styles.tierValue}>{customerData.tier.name}</div>
                    <div className={styles.tierPercent}>
                      Бонус: {customerData.tier.bonus_percent}%
                    </div>
                  </div>
                )}
              </div>

              {/* Списание бонусов */}
              {parseFloat(customerData.balance) > 0 && (
                <div className={styles.redemptionSection}>
                  <h5>Списать бонусы:</h5>
                  <div className={styles.redemptionType}>
                    <label>
                      <input
                        type="radio"
                        value="percent"
                        checked={redemptionType === 'percent'}
                        onChange={(e) => setRedemptionType(e.target.value)}
                      />
                      Процент от баланса
                    </label>
                    <label>
                      <input
                        type="radio"
                        value="amount"
                        checked={redemptionType === 'amount'}
                        onChange={(e) => setRedemptionType(e.target.value)}
                      />
                      Фиксированная сумма
                    </label>
                  </div>

                  {redemptionType === 'percent' ? (
                    <div className={styles.redemptionInput}>
                      <FaPercent />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={bonusRedemptionPercent}
                        onChange={(e) => setBonusRedemptionPercent(e.target.value)}
                        placeholder="Процент"
                      />
                      <span>%</span>
                    </div>
                  ) : (
                    <div className={styles.redemptionInput}>
                      <FaDollarSign />
                      <input
                        type="number"
                        min="0"
                        max={customerData.balance}
                        step="0.01"
                        value={bonusRedemptionAmount}
                        onChange={(e) => setBonusRedemptionAmount(e.target.value)}
                        placeholder="Сумма"
                      />
                      <span>баллов</span>
                    </div>
                  )}
                </div>
              )}

              {/* История транзакций */}
              {customerData.recent_transactions && customerData.recent_transactions.length > 0 && (
                <div className={styles.transactions}>
                  <h5>Последние транзакции:</h5>
                  <div className={styles.transactionsList}>
                    {customerData.recent_transactions.slice(0, 5).map((t) => (
                      <div key={t.id} className={styles.transactionItem}>
                        <div className={styles.transactionType}>
                          {t.type === 'accrual' ? 'Начисление' : 'Списание'}
                        </div>
                        <div
                          className={`${styles.transactionAmount} ${
                            t.amount >= 0 ? styles.positive : styles.negative
                          }`}
                        >
                          {t.amount >= 0 ? '+' : ''}
                          {parseFloat(t.amount).toFixed(2)}
                        </div>
                        <div className={styles.transactionDate}>
                          {new Date(t.created_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {customerData && (
          <div className={styles.footer}>
            <button
              onClick={() => {
                if (onCustomerSelected) {
                  onCustomerSelected({
                    ...customerData,
                    bonus_redemption_percent:
                      redemptionType === 'percent' ? bonusRedemptionPercent : null,
                    bonus_redemption_amount:
                      redemptionType === 'amount' ? bonusRedemptionAmount : null,
                  });
                }
                handleClose();
              }}
              className={styles.applyButton}
            >
              Применить
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;

