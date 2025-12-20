import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import { Html5Qrcode } from 'html5-qrcode';
import { FaQrcode, FaGift, FaPercent, FaDollarSign, FaCamera, FaKeyboard } from 'react-icons/fa';
import ModalCloseButton from '../ModalCloseButton/ModalCloseButton';
import { useIsMobile } from '../../hooks/useIsMobile';
import styles from './QRScanner.module.css';

const QRScanner = ({ locationId, onCustomerSelected, onClose }) => {
  const { business_slug } = useParams();
  const isMobile = useIsMobile(768);
  const [qrToken, setQrToken] = useState('');
  const [scanning, setScanning] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [error, setError] = useState(null);
  const [bonusRedemptionPercent, setBonusRedemptionPercent] = useState(0);
  const [bonusRedemptionAmount, setBonusRedemptionAmount] = useState(0);
  const [redemptionType, setRedemptionType] = useState('percent');
  const [useCamera, setUseCamera] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const lastScannedToken = useRef(null);
  const isProcessingScan = useRef(false);
  const isMountedRef = useRef(true);

  // Отслеживание монтирования компонента
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
    lastScannedToken.current = null;
    isProcessingScan.current = false;
  };

  const handleScanWithToken = React.useCallback(async (token) => {
    if (!token || !token.trim()) {
      setError('QR-код не распознан');
      return;
    }

    // Защита от повторного сканирования того же QR-кода
    if (lastScannedToken.current === token && isProcessingScan.current) {
      return;
    }

    // Если уже обрабатываем другой QR-код, не обрабатываем новый
    if (isProcessingScan.current) {
      return;
    }

    try {
      isProcessingScan.current = true;
      lastScannedToken.current = token;
      setScanning(true);
      setError(null);
      
      const response = await axios.post(`api/business/${business_slug}/scan-qr/`, {
        qr_token: token.trim(),
        location_id: locationId,
      });

      setCustomerData(response.data);
      
      // Останавливаем камеру после успешного сканирования
      if (html5QrCodeRef.current && cameraActive) {
        try {
          await html5QrCodeRef.current.stop();
          setCameraActive(false);
        } catch (stopErr) {
          // Игнорируем ошибки остановки камеры
        }
      }
      
      if (onCustomerSelected) {
        onCustomerSelected(response.data);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.detail || 
                          err.response?.data?.message ||
                          err.message || 
                          'Не удалось отсканировать QR-код';
      
      setError(errorMessage);
      setCustomerData(null);
      // Сбрасываем защиту от повторных сканирований при ошибке
      lastScannedToken.current = null;
    } finally {
      setScanning(false);
      isProcessingScan.current = false;
    }
  }, [business_slug, locationId, onCustomerSelected, cameraActive]);

  // Функция для безопасной остановки камеры
  const stopCamera = React.useCallback(async () => {
    if (html5QrCodeRef.current && cameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        setCameraActive(false);
      } catch (err) {
        // Игнорируем ошибки, если камера уже остановлена
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
    if (cameraActive) {
      return;
    }

    // Ждем, пока элемент будет готов (особенно важно для мобильных)
    if (!scannerRef.current) {
      // Небольшая задержка для рендеринга элемента на мобильных
      const timer = setTimeout(() => {
        // Эффект перезапустится автоматически благодаря зависимостям
      }, 200);
      return () => clearTimeout(timer);
    }

    let html5QrCode = null;
    let retryTimeout = null;

    const startCamera = async () => {
      try {
        // Проверка разрешений камеры
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          stream.getTracks().forEach(track => track.stop());
          setCameraPermission('granted');
        } catch (permErr) {
          if (isMountedRef.current) {
            setCameraPermission('denied');
            setError('Нет доступа к камере. Разрешите доступ к камере в настройках браузера.');
            setUseCamera(false);
            return;
          }
        }

        html5QrCode = new Html5Qrcode(scannerRef.current.id);
        html5QrCodeRef.current = html5QrCode;

        // Адаптивные настройки для мобильных устройств
        const qrboxSize = isMobile 
          ? Math.min(window.innerWidth * 0.8, window.innerHeight * 0.4, 300)
          : 250;

        const config = {
          fps: isMobile ? 5 : 10, // Меньше FPS на мобильных для экономии ресурсов
          qrbox: { 
            width: qrboxSize, 
            height: qrboxSize 
          },
          aspectRatio: 1.0,
          disableFlip: false, // Разрешаем переворот для лучшего распознавания
        };

        // Пробуем сначала заднюю камеру, потом любую доступную
        let cameraId = null;
        try {
          const devices = await Html5Qrcode.getCameras();
          const backCamera = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
          );
          cameraId = backCamera ? backCamera.id : devices[0]?.id;
        } catch (err) {
          // Игнорируем ошибки получения списка камер
        }

        const videoConstraints = cameraId 
          ? { deviceId: { exact: cameraId } }
          : { facingMode: 'environment' };

        await html5QrCode.start(
          videoConstraints,
          config,
          (decodedText, decodedResult) => {
            if (!decodedText || !decodedText.trim()) {
              return;
            }
            
            if (!isMountedRef.current) {
              return;
            }
            
            setQrToken(decodedText);
            
            // Небольшая задержка перед обработкой, чтобы избежать множественных вызовов
            setTimeout(() => {
              if (isMountedRef.current) {
                handleScanWithToken(decodedText);
              }
            }, 100);
          },
          (errorMessage) => {
            // Игнорируем обычные ошибки сканирования (они нормальны при поиске QR-кода)
          }
        );

        if (isMountedRef.current) {
          setCameraActive(true);
          setError(null);
        }
      } catch (err) {
        if (isMountedRef.current) {
          let errorMsg = 'Не удалось запустить камеру.';
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMsg = 'Доступ к камере запрещен. Разрешите доступ в настройках браузера.';
            setCameraPermission('denied');
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMsg = 'Камера не найдена. Убедитесь, что устройство имеет камеру.';
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            errorMsg = 'Камера уже используется другим приложением.';
          }
          setError(errorMsg);
          setUseCamera(false);
          setCameraActive(false);
        }
      }
    };

    // Небольшая задержка для мобильных устройств, чтобы элемент точно был готов
    const delay = isMobile ? 300 : 100;
    retryTimeout = setTimeout(() => {
      startCamera();
    }, delay);

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      stopCamera();
    };
  }, [useCamera, customerData, handleScanWithToken, stopCamera, cameraActive, isMobile]);

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
                      <div className={styles.scanningText}>Обработка QR-кода...</div>
                    </div>
                  )}
                  {!cameraActive && !scanning && (
                    <div className={styles.cameraPlaceholder}>
                      <FaCamera />
                      <p>Запуск камеры...</p>
                      {cameraPermission === 'denied' && (
                        <p className={styles.permissionError}>
                          Нет доступа к камере. Разрешите доступ в настройках браузера.
                        </p>
                      )}
                    </div>
                  )}
                  {cameraActive && !scanning && (
                    <div className={styles.scanningHint}>
                      <p>Наведите камеру на QR-код</p>
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

