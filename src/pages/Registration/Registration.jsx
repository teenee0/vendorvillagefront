import React, { useState, useEffect, useCallback } from 'react';
import { FaTelegram, FaEnvelope, FaLock, FaUser, FaExclamationCircle, FaCheckCircle, FaInfoCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from "../../api/axiosDefault.js";
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import styles from './Registration.module.css';
import Loader from '../../components/Loader';
import { useAuth } from '../../hooks/useAuth';
import { validatePassword } from '../../utils/passwordValidator.js';

const AuthPage = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  const [registrationStep, setRegistrationStep] = useState(1); // 1 - форма регистрации, 2 - верификация email
  const [passwordResetStep, setPasswordResetStep] = useState(0); // 0 - нет сброса, 1 - ввод email, 2 - ввод кода и пароля
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    password1: '',
    password2: '',
    verificationCode: '',
    resetCode: '',
    newPassword1: '',
    newPassword2: '',
    personalDataConsent: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [notification, setNotification] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0); // Оставшееся время в секундах
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [showNewPassword1, setShowNewPassword1] = useState(false);
  const [showNewPassword2, setShowNewPassword2] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Получаем URL для редиректа из query параметров
  const redirectUrl = searchParams.get('redirect') || '/account';
  
  // Извлечь сообщение об ошибке из формата Django REST Framework ErrorDetail
  const extractErrorMessage = (detail) => {
    if (!detail) return null;
    
    // Если это строка, попробуем извлечь сообщение из формата ErrorDetail
    if (typeof detail === 'string') {
      // Формат: "[ErrorDetail(string='текст сообщения', code='invalid')]"
      const match = detail.match(/string='([^']+)'/);
      if (match && match[1]) {
        return match[1];
      }
      // Если не нашли, возвращаем как есть
      return detail;
    }
    
    // Если это массив, берем первый элемент
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (typeof first === 'string') {
        const match = first.match(/string='([^']+)'/);
        if (match && match[1]) {
          return match[1];
        }
        return first;
      }
      return String(first);
    }
    
    return String(detail);
  };
  
  // Форматировать время для отображения таймера
  const formatCooldownTime = (seconds) => {
    if (seconds <= 0) return '';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes} мин ${secs} сек`;
    }
    return `${secs} сек`;
  };
  
  // Получить ключ для localStorage по email
  const getStorageKey = (email) => `verification_code_${email}`;
  const getPasswordResetStorageKey = (email) => `password_reset_code_${email}`;
  
  // Получить данные о отправках из localStorage
  const getSendHistory = (email) => {
    const key = getStorageKey(email);
    const data = localStorage.getItem(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return { sends: [], lastSend: null };
      }
    }
    return { sends: [], lastSend: null };
  };
  
  // Получить данные о отправках password reset из localStorage
  const getPasswordResetHistory = (email) => {
    const key = getPasswordResetStorageKey(email);
    const data = localStorage.getItem(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return { sends: [], lastSend: null };
      }
    }
    return { sends: [], lastSend: null };
  };
  
  // Сохранить данные о отправке
  const saveSendHistory = (email) => {
    const key = getStorageKey(email);
    const history = getSendHistory(email);
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    
    // Удаляем отправки старше 24 часов
    history.sends = history.sends.filter(time => time > last24h);
    history.sends.push(now);
    history.lastSend = now;
    
    localStorage.setItem(key, JSON.stringify(history));
  };
  
  // Сохранить данные о отправке password reset
  const savePasswordResetHistory = (email) => {
    const key = getPasswordResetStorageKey(email);
    const history = getPasswordResetHistory(email);
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    
    // Удаляем отправки старше 24 часов
    history.sends = history.sends.filter(time => time > last24h);
    history.sends.push(now);
    history.lastSend = now;
    
    localStorage.setItem(key, JSON.stringify(history));
  };
  
  // Проверить, можно ли отправить код
  const canResendCode = (email) => {
    const history = getSendHistory(email);
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    
    // Удаляем отправки старше 24 часов
    const recentSends = history.sends.filter(time => time > last24h);
    
    // Количество отправок (включая первую при регистрации)
    const sendCount = recentSends.length;
    
    // Определяем минимальный интервал
    // Первые 2 отправки (1-я и 2-я) - раз в минуту
    // После 2 отправок (3-я и далее) - раз в 5 минут
    const minInterval = sendCount < 2 ? 60 * 1000 : 5 * 60 * 1000; // 1 минута или 5 минут
    
    if (history.lastSend) {
      const timeSinceLastSend = now - history.lastSend;
      if (timeSinceLastSend < minInterval) {
        return {
          canSend: false,
          remainingSeconds: Math.ceil((minInterval - timeSinceLastSend) / 1000)
        };
      }
    }
    
    return { canSend: true, remainingSeconds: 0 };
  };
  
  // Проверить, можно ли отправить код password reset
  const canResendPasswordResetCode = (email) => {
    const history = getPasswordResetHistory(email);
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    
    // Удаляем отправки старше 24 часов
    const recentSends = history.sends.filter(time => time > last24h);
    
    // Количество отправок
    const sendCount = recentSends.length;
    
    // Определяем минимальный интервал
    // Первые 2 отправки (1-я и 2-я) - раз в минуту
    // После 2 отправок (3-я и далее) - раз в 5 минут
    const minInterval = sendCount < 2 ? 60 * 1000 : 5 * 60 * 1000; // 1 минута или 5 минут
    
    if (history.lastSend) {
      const timeSinceLastSend = now - history.lastSend;
      if (timeSinceLastSend < minInterval) {
        return {
          canSend: false,
          remainingSeconds: Math.ceil((minInterval - timeSinceLastSend) / 1000)
        };
      }
    }
    
    return { canSend: true, remainingSeconds: 0 };
  };
  
  // Сброс таймера при выходе со шага верификации или password reset
  useEffect(() => {
    if (registrationStep !== 2 && passwordResetStep !== 2) {
      setResendCooldown(0);
    }
  }, [registrationStep, passwordResetStep]);
  
  // Обновление таймера обратного отсчета (просто уменьшает значение каждую секунду)
  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleGoogleLoginClick = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (!window.google?.accounts?.id) {
        setErrors({ auth: "Google Sign-In не загружен. Пожалуйста, обновите страницу." });
        setIsLoading(false);
        return;
      }

      // Используем Google One Tap для быстрого входа
      window.google.accounts.id.prompt((notification) => {
        // One Tap автоматически вызовет handleGoogleLogin через callback при выборе аккаунта
        // Если One Tap не отображается, используем альтернативный метод
        if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
          // Создаем временный контейнер и рендерим кнопку программно
          const tempDiv = document.createElement('div');
          tempDiv.style.position = 'fixed';
          tempDiv.style.left = '-9999px';
          document.body.appendChild(tempDiv);
          
          window.google.accounts.id.renderButton(tempDiv, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
          });
          
          // Кликаем на кнопку программно
          setTimeout(() => {
            const button = tempDiv.querySelector('div[role="button"]');
            if (button) {
              button.click();
            } else {
              setErrors({ auth: "Не удалось инициализировать вход через Google. Попробуйте обновить страницу." });
              setIsLoading(false);
            }
            document.body.removeChild(tempDiv);
          }, 100);
        }
      });
    } catch (error) {
      setErrors({ auth: "Ошибка входа через Google" });
      setIsLoading(false);
    }
  }, [navigate, redirectUrl]);

  const handleGoogleLogin = useCallback(async (response) => {
    try {
      setIsLoading(true);
      const res = await axios.post('/accounts/api/auth/google/', {
        token: response.credential
      }, { withCredentials: true });
      navigate(redirectUrl);
    } catch (error) {
      setErrors({ auth: "Ошибка входа через Google" });
    } finally {
      setIsLoading(false);
    }
  }, [navigate, redirectUrl]);

  const handleTelegramAuth = useCallback(async (user) => {
    try {
      setIsLoading(true);
      const res = await axios.post('/accounts/api/auth/telegram/', user, {
        withCredentials: true,
      });
      navigate(redirectUrl);
    } catch (error) {
      setErrors({ auth: "Ошибка входа через Telegram" });
    } finally {
      setIsLoading(false);
    }
  }, [navigate, redirectUrl]);


  // Редирект, если пользователь уже залогинен
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirectUrl, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, redirectUrl]);

  // Инициализация Google Sign-In API
  useEffect(() => {
    if (registrationStep === 2 || passwordResetStep !== 0) {
      return;
    }

    // Загружаем Google Sign-In скрипт только один раз
    if (!window.google?.accounts?.id) {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (!existingScript) {
        const googleScript = document.createElement('script');
        googleScript.src = "https://accounts.google.com/gsi/client";
        googleScript.async = true;
        googleScript.defer = true;
        googleScript.onload = () => {
          if (window.google?.accounts?.id) {
            window.google.accounts.id.initialize({
              client_id: "412031149331-89sgaqeamohaq76dnn5n97663frnfskg.apps.googleusercontent.com",
              callback: handleGoogleLogin,
              auto_select: false,
              itp_support: true,
            });
          }
        };
        document.body.appendChild(googleScript);
      }
    } else {
      // Если уже загружен, просто обновляем callback
      window.google.accounts.id.initialize({
        client_id: "412031149331-89sgaqeamohaq76dnn5n97663frnfskg.apps.googleusercontent.com",
        callback: handleGoogleLogin,
        auto_select: false,
        itp_support: true,
      });
    }
  }, [registrationStep, passwordResetStep, handleGoogleLogin]);

  // Инициализация Telegram виджета
  useEffect(() => {
    // Показываем виджет только на шаге входа/регистрации (не на верификации и не на сбросе пароля)
    if (registrationStep === 2 || passwordResetStep !== 0) {
      return;
    }

    const initTelegramAuth = () => {
      const tgContainer = document.getElementById("telegramSignIn");
      if (!tgContainer) {
        // Если контейнер еще не готов, попробуем еще раз через небольшую задержку
        setTimeout(() => {
          initTelegramAuth();
        }, 200);
        return;
      }

      // Удаляем старый скрипт, если он существует
      const oldScript = document.getElementById("telegram-login-script");
      if (oldScript) {
        oldScript.remove();
      }

      // Очищаем контейнер
      tgContainer.innerHTML = '';

      // Устанавливаем глобальную функцию для Telegram виджета
      window.onTelegramAuth = handleTelegramAuth;

      const botName = "AxioneAuthBot";
      const requestAccess = "write";

      // Создаем новый скрипт для Telegram виджета
      const telegramScript = document.createElement('script');
      telegramScript.src = "https://telegram.org/js/telegram-widget.js?22";
      telegramScript.setAttribute("data-telegram-login", botName);
      telegramScript.setAttribute("data-size", "large");
      telegramScript.setAttribute("data-userpic", "false");
      telegramScript.setAttribute("data-request-access", requestAccess);
      telegramScript.setAttribute("data-onauth", "onTelegramAuth(user)");
      telegramScript.async = true;
      telegramScript.id = "telegram-login-script";

      // Добавляем обработчик ошибок
      telegramScript.onerror = () => {
        console.error('Ошибка загрузки Telegram виджета');
      };

      // Добавляем скрипт в контейнер
      tgContainer.appendChild(telegramScript);
    };

    // Инициализируем Telegram с небольшой задержкой для гарантии готовности DOM
    setTimeout(() => {
      initTelegramAuth();
    }, 100);

    return () => {
      // Очистка при размонтировании или изменении состояния
      const tgScript = document.getElementById("telegram-login-script");
      if (tgScript) {
        tgScript.remove();
      }
    };
  }, [registrationStep, passwordResetStep, handleTelegramAuth]);

  

  const validateField = useCallback((name, value) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'email':
        if (!value) {
          newErrors.email = 'Email обязателен';
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          newErrors.email = 'Email некорректен';
        } else {
          delete newErrors.email;
        }
        break;
        
      case 'password':
        if (!value && isLoginView) {
          newErrors.password = 'Пароль обязателен';
        } else {
          delete newErrors.password;
        }
        break;
        
      case 'first_name':
        if (!value && !isLoginView) {
          newErrors.first_name = 'Имя пользователя обязательно';
        } else {
          delete newErrors.first_name;
        }
        break;
        
      case 'password1':
        if (!value && !isLoginView) {
          newErrors.password1 = 'Пароль обязателен';
        } else if (value) {
          // Проверка пароля с помощью валидатора
          const passwordError = validatePassword(value);
          if (passwordError) {
            newErrors.password1 = passwordError;
          } else {
            delete newErrors.password1;
            // Проверяем совпадение паролей, если изменено поле password1
            if (formData.password2 && value !== formData.password2) {
              newErrors.password2 = 'Пароли не совпадают';
            } else {
              delete newErrors.password2;
            }
          }
        } else {
          delete newErrors.password1;
        }
        break;
        
      case 'password2':
        if (!value && !isLoginView) {
          newErrors.password2 = 'Подтвердите пароль';
        } else if (value && value !== formData.password1) {
          newErrors.password2 = 'Пароли не совпадают';
        } else {
          delete newErrors.password2;
        }
        break;
        
      case 'verificationCode':
        if (!value && registrationStep === 2) {
          newErrors.verificationCode = 'Код подтверждения обязателен';
        } else if (value && value.length !== 6) {
          newErrors.verificationCode = 'Код должен содержать 6 цифр';
        } else {
          delete newErrors.verificationCode;
        }
        break;
        
      case 'resetCode':
        if (!value && passwordResetStep === 2) {
          newErrors.resetCode = 'Код подтверждения обязателен';
        } else if (value && value.length !== 6) {
          newErrors.resetCode = 'Код должен содержать 6 цифр';
        } else {
          delete newErrors.resetCode;
        }
        break;
        
      case 'newPassword1':
        if (!value && passwordResetStep === 2) {
          newErrors.newPassword1 = 'Новый пароль обязателен';
        } else if (value) {
          // Проверка пароля с помощью валидатора
          const passwordError = validatePassword(value);
          if (passwordError) {
            newErrors.newPassword1 = passwordError;
          } else {
            delete newErrors.newPassword1;
            // Проверяем совпадение паролей
            if (formData.newPassword2 && value !== formData.newPassword2) {
              newErrors.newPassword2 = 'Пароли не совпадают';
            } else {
              delete newErrors.newPassword2;
            }
          }
        } else {
          delete newErrors.newPassword1;
        }
        break;
        
      case 'newPassword2':
        if (!value && passwordResetStep === 2) {
          newErrors.newPassword2 = 'Подтвердите новый пароль';
        } else if (value && value !== formData.newPassword1) {
          newErrors.newPassword2 = 'Пароли не совпадают';
        } else {
          delete newErrors.newPassword2;
        }
        break;
        
      default:
        break;
    }
    
    setErrors(newErrors);
  }, [errors, formData, isLoginView]);

  // Измененный обработчик
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const validateForm = () => {
    const newErrors = {};

    if (passwordResetStep === 0) {
      // Обычная валидация для входа/регистрации
      if (!formData.email) {
        newErrors.email = 'Email обязателен';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email некорректен';
      }

      if (!formData.password && isLoginView) {
        newErrors.password = 'Пароль обязателен';
      }

      if (!isLoginView) {
        if (!formData.first_name) {
          newErrors.first_name = 'Имя пользователя обязательно';
        }

        if (!formData.password1) {
          newErrors.password1 = 'Пароль обязателен';
        } else if (formData.password1.length < 8) {
          newErrors.password1 = 'Пароль должен быть не менее 8 символов';
        }

        if (formData.password1 !== formData.password2) {
          newErrors.password2 = 'Пароли не совпадают';
        }

        if (!formData.personalDataConsent) {
          newErrors.personalDataConsent = 'Необходимо согласие на обработку персональных данных';
        }
      }
    } else if (passwordResetStep === 1) {
      // Валидация для запроса сброса пароля
      if (!formData.email) {
        newErrors.email = 'Email обязателен';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email некорректен';
      }
    } else if (passwordResetStep === 2) {
      // Валидация для подтверждения сброса пароля
      if (!formData.resetCode) {
        newErrors.resetCode = 'Код подтверждения обязателен';
      } else if (formData.resetCode.length !== 6) {
        newErrors.resetCode = 'Код должен содержать 6 цифр';
      }

      if (!formData.newPassword1) {
        newErrors.newPassword1 = 'Новый пароль обязателен';
      } else {
        // Используем валидатор пароля
        const passwordError = validatePassword(formData.newPassword1);
        if (passwordError) {
          newErrors.newPassword1 = passwordError;
        }
      }

      if (!formData.newPassword2) {
        newErrors.newPassword2 = 'Подтвердите новый пароль';
      } else if (formData.newPassword1 !== formData.newPassword2) {
        newErrors.newPassword2 = 'Пароли не совпадают';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      if (passwordResetStep === 0) {
        // Обычный процесс входа/регистрации
        if (isLoginView) {
          await axios.post('accounts/api/auth/login/', {
            email: formData.email,
            password: formData.password
          }, { withCredentials: true });
          navigate(redirectUrl);
        } else if (registrationStep === 1) {
          // Первый этап - отправка данных регистрации
          const response = await axios.post('accounts/api/auth/register/', {
            first_name: formData.first_name,
            email: formData.email,
            password1: formData.password1,
            password2: formData.password2,
            personal_data_consent: formData.personalDataConsent
          }, { withCredentials: true });
          
          setPendingUser({
            email: response.data.email,
            id: response.data.pending_user_id
          });
          // Сохраняем время первой отправки при регистрации
          saveSendHistory(response.data.email);
          // Устанавливаем таймер на 60 секунд (первая отправка - раз в минуту)
          setResendCooldown(60);
          setRegistrationStep(2);
        } else if (registrationStep === 2) {
          // Второй этап - проверка кода верификации
          await axios.post('accounts/api/auth/verify-email/', {
            email: pendingUser.email,
            code: formData.verificationCode
          }, { withCredentials: true });
          
          navigate(redirectUrl);
        }
      } else if (passwordResetStep === 1) {
        // Запрос сброса пароля
        try {
          await axios.post('accounts/api/auth/password-reset/', {
            email: formData.email
          });
          
          // Сохраняем время первой отправки password reset
          savePasswordResetHistory(formData.email);
          // Устанавливаем таймер на 60 секунд (первая отправка - раз в минуту)
          setResendCooldown(60);
          // Переходим на шаг 2 только при успешной отправке
          setPasswordResetStep(2);
        } catch (resetError) {
          // Обрабатываем ошибку
          const resetErrorData = resetError.response?.data;
          
          if (resetError.response?.status === 404) {
            // Пользователь не найден - остаемся на шаге 1 и показываем ошибку
            const message = extractErrorMessage(resetErrorData?.detail) || 'Пользователь с таким email не найден';
            showNotification('error', message);
            setErrors({ email: message });
            // Не переходим на шаг 2
            return;
          } else if (resetError.response?.status === 429) {
            // Лимит превышен - переходим на шаг 2 с таймером
            const message = extractErrorMessage(resetErrorData?.detail) || 'Превышен лимит отправки кодов';
            showNotification('error', message);
            let totalSeconds = 0;
            
            // Проверяем формат с минутами и секундами: "через X мин Y сек"
            const minSecMatch = message.match(/через\s+(\d+)\s*мин\s+(\d+)\s*сек/);
            if (minSecMatch) {
              const minutes = parseInt(minSecMatch[1]) || 0;
              const seconds = parseInt(minSecMatch[2]) || 0;
              totalSeconds = minutes * 60 + seconds;
            } else {
              // Проверяем формат только с секундами: "через X секунд"
              const secMatch = message.match(/через\s+(\d+)\s*секунд/);
              if (secMatch) {
                totalSeconds = parseInt(secMatch[1]) || 0;
              } else {
                // Проверяем формат только с минутами: "через X мин"
                const minMatch = message.match(/через\s+(\d+)\s*мин/);
                if (minMatch) {
                  totalSeconds = parseInt(minMatch[1]) * 60 || 0;
                }
              }
            }
            
            if (totalSeconds > 0) {
              setResendCooldown(totalSeconds);
            }
            // Переходим на шаг 2 даже при ошибке лимита
            setPasswordResetStep(2);
            return;
          } else {
            // Для других ошибок остаемся на шаге 1
            const errorMsg = extractErrorMessage(resetErrorData?.detail) || 'Ошибка отправки кода';
            showNotification('error', errorMsg);
            setErrors({ email: errorMsg });
            // Не переходим на шаг 2
            return;
          }
        }
        
        // Если дошли сюда, значит запрос был успешным - выходим, чтобы не попасть в общий catch
        return;
      } else if (passwordResetStep === 2) {
        // Подтверждение сброса пароля
        await axios.post('accounts/api/auth/password-reset-confirm/', {
          email: formData.email,
          code: formData.resetCode,
          new_password1: formData.newPassword1,
          new_password2: formData.newPassword2
        });
        
        // Перенаправляем на страницу входа с сообщением об успехе
        setPasswordResetStep(0);
        setFormData(prev => ({ ...prev, resetCode: '', newPassword1: '', newPassword2: '' }));
        showNotification('success', 'Пароль успешно изменен. Теперь вы можете войти с новым паролем.');
      }
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData) {
        const serverErrors = {};
        let hasGeneralError = false;
        
        // Обрабатываем non_field_errors отдельно
        if (errorData.non_field_errors) {
          const generalError = Array.isArray(errorData.non_field_errors) 
            ? errorData.non_field_errors[0] 
            : errorData.non_field_errors;
          showNotification('error', generalError);
          setErrors({ auth: generalError });
          hasGeneralError = true;
        }
        
        // Обрабатываем ошибки полей
        for (const key in errorData) {
          if (key === 'non_field_errors') continue;
          
          const errorMessage = Array.isArray(errorData[key]) ? errorData[key][0] : errorData[key];
          const errorMessageStr = String(errorMessage).toLowerCase();
          serverErrors[key] = errorMessage;
          
          // Показываем красивые уведомления для специфических ошибок
          if (key === 'email' && errorMessageStr.includes('уже используется')) {
            showNotification('error', 'Этот email уже зарегистрирован');
            setErrors({ auth: 'Этот email уже зарегистрирован' });
            hasGeneralError = true;
          } else if (key === 'email' && errorMessageStr.includes('не найден')) {
            showNotification('error', 'Пользователь с таким email не найден');
            setErrors({ auth: 'Пользователь с таким email не найден' });
            hasGeneralError = true;
          } else if (key === 'error') {
            // Обрабатываем все ошибки с ключом 'error'
            if (errorMessageStr.includes('не существует') || errorMessageStr.includes('аккаунт')) {
              const message = String(errorMessage);
              showNotification('error', message);
              setErrors({ auth: message });
            hasGeneralError = true;
            } else if (errorMessageStr.includes('неверный пароль') || errorMessageStr.includes('пароль')) {
              const message = String(errorMessage);
              showNotification('error', message);
              setErrors({ auth: message });
            hasGeneralError = true;
            } else {
              // Для любых других ошибок с ключом 'error'
              const message = String(errorMessage);
              showNotification('error', message);
              setErrors({ auth: message });
              hasGeneralError = true;
            }
          } else if (key === 'detail' && errorMessageStr.includes('неверный код')) {
            showNotification('error', 'Неверный код подтверждения');
            setErrors({ auth: 'Неверный код подтверждения' });
            hasGeneralError = true;
          } else if (key === 'detail' && errorMessageStr.includes('истекла')) {
            showNotification('error', 'Ссылка для подтверждения истекла');
            setErrors({ auth: 'Ссылка для подтверждения истекла' });
            hasGeneralError = true;
          } else if (key === 'detail' && (errorMessageStr.includes('пароль') || errorMessageStr.includes('требованиям'))) {
            // Ошибка валидации пароля - показываем в поле пароля
            const message = String(errorMessage);
            if (passwordResetStep === 2) {
              serverErrors.newPassword1 = message;
              showNotification('error', message);
            } else {
              showNotification('error', message);
              setErrors({ auth: message });
            }
            hasGeneralError = true;
          } else if (key === 'detail' && errorMessageStr.includes('успешно изменен')) {
            showNotification('success', 'Пароль успешно изменен!');
            hasGeneralError = true;
          }
        }
        
        // Если есть ошибки полей, но нет общих уведомлений, показываем их
        if (!hasGeneralError && Object.keys(serverErrors).length > 0) {
          setErrors(serverErrors);
        }
      } else {
        const errorMessage = error.message || 'Произошла ошибка. Пожалуйста, попробуйте позже.';
        showNotification('error', errorMessage);
        setErrors({ auth: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingUser) return;
    
    // Проверяем локальный лимит (дополнительная проверка на фронтенде)
    const { canSend, remainingSeconds } = canResendCode(pendingUser.email);
    if (!canSend) {
      setResendCooldown(remainingSeconds);
      showNotification('error', `Повторную отправку кода можно сделать через ${remainingSeconds} сек`);
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      await axios.post('accounts/api/auth/resend-code/', {
        email: pendingUser.email
      }, { withCredentials: true });
      
      // Сохраняем время отправки
      saveSendHistory(pendingUser.email);
      
      showNotification('success', 'Код подтверждения отправлен повторно');
    } catch (error) {
      const errorData = error.response?.data;
      if (error.response?.status === 429) {
        // Лимит превышен на сервере
        const message = extractErrorMessage(errorData?.detail) || 'Превышен лимит отправки кодов';
        showNotification('error', message);
        setErrors({ auth: message });
        
        // Извлекаем время из сообщения для установки таймера
        // Форматы: "через 3 мин 36 сек", "через 216 секунд", "через 5 мин"
        let totalSeconds = 0;
        
        // Проверяем формат с минутами и секундами: "через X мин Y сек"
        const minSecMatch = message.match(/через\s+(\d+)\s*мин\s+(\d+)\s*сек/);
        if (minSecMatch) {
          const minutes = parseInt(minSecMatch[1]) || 0;
          const seconds = parseInt(minSecMatch[2]) || 0;
          totalSeconds = minutes * 60 + seconds;
        } else {
          // Проверяем формат только с секундами: "через X секунд" или "через X сек"
          const secMatch = message.match(/через\s+(\d+)\s*секунд/);
          if (secMatch) {
            totalSeconds = parseInt(secMatch[1]) || 0;
          } else {
            // Проверяем формат только с минутами: "через X мин"
            const minMatch = message.match(/через\s+(\d+)\s*мин/);
            if (minMatch) {
              totalSeconds = parseInt(minMatch[1]) * 60 || 0;
            }
          }
        }
        
        if (totalSeconds > 0) {
          setResendCooldown(totalSeconds);
        }
      } else if (errorData) {
        const message = extractErrorMessage(errorData.detail) || 'Ошибка отправки кода';
        setErrors({ auth: message });
        showNotification('error', message);
      } else {
        const message = 'Произошла ошибка. Пожалуйста, попробуйте позже.';
        setErrors({ auth: message });
        showNotification('error', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToRegistration = () => {
    setRegistrationStep(1);
    setPendingUser(null);
    setFormData(prev => ({ ...prev, verificationCode: '' }));
    setErrors({});
  };

  const handlePasswordReset = () => {
    setPasswordResetStep(1);
    setFormData(prev => ({ ...prev, resetCode: '', newPassword1: '', newPassword2: '' }));
    setErrors({});
  };

  const handleBackToLogin = () => {
    setPasswordResetStep(0);
    setFormData(prev => ({ ...prev, resetCode: '', newPassword1: '', newPassword2: '' }));
    setErrors({});
  };

  const handleResendResetCode = async () => {
    if (!formData.email) return;
    
    // Проверяем локальный лимит (дополнительная проверка на фронтенде)
    const { canSend, remainingSeconds } = canResendPasswordResetCode(formData.email);
    if (!canSend) {
      setResendCooldown(remainingSeconds);
      showNotification('error', `Повторную отправку кода можно сделать через ${remainingSeconds} сек`);
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      await axios.post('accounts/api/auth/password-reset/', {
        email: formData.email
      });
      
      // Сохраняем время отправки
      savePasswordResetHistory(formData.email);
      
      showNotification('success', 'Код подтверждения отправлен повторно');
    } catch (error) {
      const errorData = error.response?.data;
      if (error.response?.status === 429) {
        // Лимит превышен на сервере
        const message = extractErrorMessage(errorData?.detail) || 'Превышен лимит отправки кодов';
        showNotification('error', message);
        setErrors({ auth: message });
        
        // Извлекаем время из сообщения для установки таймера
        let totalSeconds = 0;
        
        // Проверяем формат с минутами и секундами: "через X мин Y сек"
        const minSecMatch = message.match(/через\s+(\d+)\s*мин\s+(\d+)\s*сек/);
        if (minSecMatch) {
          const minutes = parseInt(minSecMatch[1]) || 0;
          const seconds = parseInt(minSecMatch[2]) || 0;
          totalSeconds = minutes * 60 + seconds;
        } else {
          // Проверяем формат только с секундами: "через X секунд" или "через X сек"
          const secMatch = message.match(/через\s+(\d+)\s*секунд/);
          if (secMatch) {
            totalSeconds = parseInt(secMatch[1]) || 0;
          } else {
            // Проверяем формат только с минутами: "через X мин"
            const minMatch = message.match(/через\s+(\d+)\s*мин/);
            if (minMatch) {
              totalSeconds = parseInt(minMatch[1]) * 60 || 0;
            }
          }
        }
        
        if (totalSeconds > 0) {
          setResendCooldown(totalSeconds);
        }
      } else if (errorData) {
        const message = extractErrorMessage(errorData.detail) || 'Ошибка отправки кода';
        setErrors({ auth: message });
        showNotification('error', message);
      } else {
        const message = 'Произошла ошибка. Пожалуйста, попробуйте позже.';
        setErrors({ auth: message });
        showNotification('error', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Показываем загрузчик, пока проверяется аутентификация
  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Loader size="large" />
      </div>
    );
  }

  // Если пользователь уже залогинен, ничего не рендерим (редирект произойдет в useEffect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className={`${styles.container} ${isLoginView ? styles.loginBg : styles.registerBg}`}>
      <div className={styles.card}>
        {passwordResetStep === 0 && (
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${isLoginView ? styles.activeTab : ''}`}
              onClick={() => {
                setIsLoginView(true);
                setRegistrationStep(1);
                setPendingUser(null);
                setFormData(prev => ({ ...prev, verificationCode: '' }));
                setErrors({});
              }}
            >
              Вход
            </button>
            <button
              className={`${styles.tab} ${!isLoginView ? styles.activeTab : ''}`}
              onClick={() => {
                setIsLoginView(false);
                setRegistrationStep(1);
                setPendingUser(null);
                setFormData(prev => ({ ...prev, verificationCode: '' }));
                setErrors({});
              }}
            >
              Регистрация
            </button>
          </div>
        )}

        <div className={styles.content}>
          <h2 className={styles.title}>
            {passwordResetStep === 0 ? (
              isLoginView ? 'Вход в аккаунт' : 
              registrationStep === 1 ? 'Создание аккаунта' : 'Подтверждение email'
            ) : passwordResetStep === 1 ? (
              'Сброс пароля'
            ) : (
              'Новый пароль'
            )}
          </h2>

          {notification && (
            <div className={`${styles.notification} ${styles[notification.type]}`}>
              {notification.type === 'error' && <FaExclamationCircle />}
              {notification.type === 'success' && <FaCheckCircle />}
              {notification.type === 'info' && <FaInfoCircle />}
              {notification.message}
            </div>
          )}

          {registrationStep === 2 && (
            <div className={styles.verificationInfo}>
              <p>Мы отправили код подтверждения на <strong>{pendingUser?.email}</strong></p>
              <p>Введите 6-значный код из письма:</p>
            </div>
          )}

          {passwordResetStep === 2 && (
            <div className={styles.verificationInfo}>
              <p>Мы отправили код подтверждения на <strong>{formData.email}</strong></p>
              <p>Введите код и новый пароль:</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            {!isLoginView && registrationStep === 1 && passwordResetStep === 0 && (
              <>
                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaUser />
                  </div>
                  <input
                    type="text"
                    name="first_name"
                    placeholder="Имя пользователя"
                    value={formData.first_name}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.first_name ? styles.errorInput : ''}`}
                  />
                </div>
                {errors.first_name && <span className={styles.error}>{errors.first_name}</span>}

                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaEnvelope />
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.email ? styles.errorInput : ''}`}
                  />
                </div>
                {errors.email && <span className={styles.error}>{errors.email}</span>}

                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaLock />
                  </div>
                  <input
                    type={showPassword1 ? "text" : "password"}
                    name="password1"
                    placeholder="Пароль"
                    value={formData.password1}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.password1 ? styles.errorInput : ''}`}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword1(!showPassword1)}
                    aria-label={showPassword1 ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword1 ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password1 && <span className={styles.error}>{errors.password1}</span>}

                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaLock />
                  </div>
                  <input
                    type={showPassword2 ? "text" : "password"}
                    name="password2"
                    placeholder="Подтвердите пароль"
                    value={formData.password2}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.password2 ? styles.errorInput : ''}`}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword2(!showPassword2)}
                    aria-label={showPassword2 ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword2 ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password2 && <span className={styles.error}>{errors.password2}</span>}

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="personalDataConsent"
                      checked={formData.personalDataConsent}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, personalDataConsent: e.target.checked }));
                        if (e.target.checked) {
                          const newErrors = { ...errors };
                          delete newErrors.personalDataConsent;
                          setErrors(newErrors);
                        }
                      }}
                      className={styles.checkbox}
                    />
                    <span className={styles.checkboxText}>
                      Я согласен на обработку персональных данных в соответствии с{' '}
                      <Link to="/privacy" target="_blank" className={styles.privacyLink}>
                        Политикой конфиденциальности
                      </Link>
                    </span>
                  </label>
                  {errors.personalDataConsent && <span className={styles.error}>{errors.personalDataConsent}</span>}
                </div>
              </>
            )}

            {isLoginView && passwordResetStep === 0 && (
              <>
                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaEnvelope />
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.email ? styles.errorInput : ''}`}
                  />
                </div>
                {errors.email && <span className={styles.error}>{errors.email}</span>}

                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaLock />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Пароль"
                    value={formData.password}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.password ? styles.errorInput : ''}`}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password && <span className={styles.error}>{errors.password}</span>}
              </>
            )}

            {registrationStep === 2 && (
              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <FaEnvelope />
                </div>
                <input
                  type="text"
                  name="verificationCode"
                  placeholder="Введите код из письма"
                  value={formData.verificationCode}
                  onChange={handleChange}
                  maxLength="6"
                  className={`${styles.input} ${styles.verificationCodeInput} ${errors.verificationCode ? styles.errorInput : ''}`}
                />
              </div>
            )}
            {errors.verificationCode && <span className={styles.error}>{errors.verificationCode}</span>}

            {passwordResetStep === 1 && (
              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <FaEnvelope />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="Введите ваш email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.email ? styles.errorInput : ''}`}
                />
              </div>
            )}
            {passwordResetStep === 1 && errors.email && <span className={styles.error}>{errors.email}</span>}

            {passwordResetStep === 2 && (
              <>
                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaEnvelope />
                  </div>
                  <input
                    type="text"
                    name="resetCode"
                    placeholder="Введите код из письма"
                    value={formData.resetCode}
                    onChange={handleChange}
                    maxLength="6"
                    className={`${styles.input} ${styles.verificationCodeInput} ${errors.resetCode ? styles.errorInput : ''}`}
                  />
                </div>
                {errors.resetCode && <span className={styles.error}>{errors.resetCode}</span>}

                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaLock />
                  </div>
                  <input
                    type={showNewPassword1 ? "text" : "password"}
                    name="newPassword1"
                    placeholder="Новый пароль"
                    value={formData.newPassword1}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.newPassword1 ? styles.errorInput : ''}`}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowNewPassword1(!showNewPassword1)}
                    aria-label={showNewPassword1 ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showNewPassword1 ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.newPassword1 && <span className={styles.error}>{errors.newPassword1}</span>}

                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaLock />
                  </div>
                  <input
                    type={showNewPassword2 ? "text" : "password"}
                    name="newPassword2"
                    placeholder="Подтвердите новый пароль"
                    value={formData.newPassword2}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.newPassword2 ? styles.errorInput : ''}`}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowNewPassword2(!showNewPassword2)}
                    aria-label={showNewPassword2 ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showNewPassword2 ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.newPassword2 && <span className={styles.error}>{errors.newPassword2}</span>}
              </>
            )}
            

            {isLoginView && passwordResetStep === 0 && (
              <div className={styles.forgotPassword}>
                <button type="button" onClick={handlePasswordReset} className={styles.forgotPasswordLink}>
                  Забыли пароль?
                </button>
              </div>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading || (passwordResetStep === 2 && (errors.newPassword1 || errors.newPassword2 || errors.resetCode))}
            >
              {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Loader size="small" />
                </div>
              ) : passwordResetStep === 0 ? (
                isLoginView ? 'Войти' : 
                registrationStep === 1 ? 'Зарегистрироваться' : 'Подтвердить email'
              ) : passwordResetStep === 1 ? (
                'Отправить код'
              ) : (
                'Изменить пароль'
              )}
            </button>

            {registrationStep === 2 && (
              <div className={styles.verificationActions}>
                <button
                  type="button"
                  onClick={(e) => {
                    if (isLoading || resendCooldown > 0) {
                      e.preventDefault();
                      return;
                    }
                    handleResendCode();
                  }}
                  className={styles.resendButton}
                  disabled={isLoading || resendCooldown > 0}
                >
                  {resendCooldown > 0 
                    ? `Повторная отправка через ${formatCooldownTime(resendCooldown)}`
                    : 'Отправить код повторно'
                  }
                </button>
                <button
                  type="button"
                  onClick={handleBackToRegistration}
                  className={styles.backButton}
                >
                  Изменить email
                </button>
              </div>
            )}

            {passwordResetStep === 2 && (
              <div className={styles.verificationActions}>
                <button
                  type="button"
                  onClick={(e) => {
                    if (isLoading || resendCooldown > 0) {
                      e.preventDefault();
                      return;
                    }
                    handleResendResetCode();
                  }}
                  className={styles.resendButton}
                  disabled={isLoading || resendCooldown > 0}
                >
                  {resendCooldown > 0 
                    ? `Повторная отправка через ${formatCooldownTime(resendCooldown)}`
                    : 'Отправить код повторно'
                  }
                </button>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className={styles.backButton}
                >
                  Назад к входу
                </button>
              </div>
            )}

            {passwordResetStep === 1 && (
              <div className={styles.verificationActions}>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className={styles.backButton}
                >
                  Назад к входу
                </button>
              </div>
            )}
          </form>

          {registrationStep !== 2 && passwordResetStep === 0 && (
            <>
              <div className={styles.socialAuth}>
                <p className={styles.socialDivider}>Или войдите с помощью</p>

                <div className={styles.socialButtons}>
                  <button
                    type="button"
                    onClick={handleGoogleLoginClick}
                    className={styles.socialButton}
                    disabled={isLoading}
                  >
                    <img 
                      src="/google_icon.svg" 
                      alt="Google" 
                      className={styles.socialIcon}
                    />
                    <span>Google</span>
                  </button>
                </div>
                
                {/* Контейнер для Telegram виджета */}
                <div id="telegramSignIn" style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}></div>
              </div>

              <div className={styles.switchAuth}>
                {isLoginView ? (
                  <>
                    Нет аккаунта?{' '}
                    <button type="button" onClick={() => {
                      setIsLoginView(false);
                      setRegistrationStep(1);
                      setPendingUser(null);
                      setFormData(prev => ({ ...prev, verificationCode: '' }));
                      setErrors({});
                    }}>
                      Зарегистрироваться
                    </button>
                  </>
                ) : (
                  <>
                    Уже есть аккаунт?{' '}
                    <button type="button" onClick={() => {
                      setIsLoginView(true);
                      setRegistrationStep(1);
                      setPendingUser(null);
                      setFormData(prev => ({ ...prev, verificationCode: '' }));
                      setErrors({});
                    }}>
                      Войти
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;