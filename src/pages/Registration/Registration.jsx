import React, { useState, useEffect, useCallback } from 'react';
import { FaGoogle, FaTelegram, FaEnvelope, FaLock, FaUser, FaExclamationCircle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import axios from "../../api/axiosDefault.js";
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import styles from './Registration.module.css';
import Loader from '../../components/Loader';

const AuthPage = () => {
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
    newPassword2: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Получаем URL для редиректа из query параметров
  const redirectUrl = searchParams.get('redirect') || '/account';

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    // Google Auth Script
    const googleScript = document.createElement('script');
    googleScript.src = "https://accounts.google.com/gsi/client";
    googleScript.async = true;
    googleScript.defer = true;
    googleScript.onload = () => {
      window.google.accounts.id.disableAutoSelect();
      window.google.accounts.id.initialize({
        client_id: "412031149331-89sgaqeamohaq76dnn5n97663frnfskg.apps.googleusercontent.com",
        callback: handleGoogleLogin,
        auto_select: false,
        itp_support: true,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("googleSignIn"),
        {
          
        }
      );
    };
    document.body.appendChild(googleScript);

    // Telegram Auth
    window.onTelegramAuth = handleTelegramAuth;
    const telegramScript = document.createElement('script');
    telegramScript.src = "https://telegram.org/js/telegram-widget.js?22";
    telegramScript.setAttribute("data-telegram-login", "VendorVillageAuthBot");
    telegramScript.setAttribute("data-size", "large");
    telegramScript.setAttribute("data-userpic", "false");
    telegramScript.setAttribute("data-request-access", "write");
    telegramScript.setAttribute("data-onauth", "onTelegramAuth(user)");
    telegramScript.async = true;
    telegramScript.id = "telegram-login-script";

    const tgContainer = document.getElementById("telegramSignIn");
    if (tgContainer) {
      tgContainer.appendChild(telegramScript);
    }

    return () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
      document.getElementById("telegram-login-script")?.remove();
    };
  }, []);

  const handleGoogleLogin = async (response) => {
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
  };

  const handleTelegramAuth = async (user) => {
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
  };

  

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
        } else if (value && value.length < 8) {
          newErrors.password1 = 'Пароль должен быть не менее 8 символов';
        } else {
          delete newErrors.password1;
          // Проверяем совпадение паролей, если изменено поле password1
          if (formData.password2 && value !== formData.password2) {
            newErrors.password2 = 'Пароли не совпадают';
          } else {
            delete newErrors.password2;
          }
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
        } else if (value && value.length < 8) {
          newErrors.newPassword1 = 'Пароль должен быть не менее 8 символов';
        } else {
          delete newErrors.newPassword1;
          // Проверяем совпадение паролей
          if (formData.newPassword2 && value !== formData.newPassword2) {
            newErrors.newPassword2 = 'Пароли не совпадают';
          } else {
            delete newErrors.newPassword2;
          }
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
      } else if (formData.newPassword1.length < 8) {
        newErrors.newPassword1 = 'Пароль должен быть не менее 8 символов';
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
            password2: formData.password2
          }, { withCredentials: true });
          
          setPendingUser({
            email: response.data.email,
            id: response.data.pending_user_id
          });
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
        await axios.post('accounts/api/auth/password-reset/', {
          email: formData.email
        });
        
        setPasswordResetStep(2);
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
        setErrors({ success: 'Пароль успешно изменен. Теперь вы можете войти с новым паролем.' });
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
    
    setIsLoading(true);
    setErrors({});
    
    try {
      await axios.post('accounts/api/auth/resend-code/', {
        email: pendingUser.email
      }, { withCredentials: true });
      
      setErrors({ success: 'Код подтверждения отправлен повторно' });
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData) {
        setErrors({ auth: errorData.detail || 'Ошибка отправки кода' });
      } else {
        setErrors({ auth: 'Произошла ошибка. Пожалуйста, попробуйте позже.' });
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
    setIsLoading(true);
    setErrors({});
    
    try {
      await axios.post('accounts/api/auth/password-reset/', {
        email: formData.email
      });
      
      setErrors({ success: 'Код подтверждения отправлен повторно' });
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData) {
        setErrors({ auth: errorData.detail || 'Ошибка отправки кода' });
      } else {
        setErrors({ auth: 'Произошла ошибка. Пожалуйста, попробуйте позже.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          
          {errors.auth && <div className={styles.authError}>{errors.auth}</div>}
          {errors.success && <div className={styles.successMessage}>{errors.success}</div>}

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
                    type="password"
                    name="password1"
                    placeholder="Пароль"
                    value={formData.password1}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.password1 ? styles.errorInput : ''}`}
                  />
                </div>
                {errors.password1 && <span className={styles.error}>{errors.password1}</span>}

                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaLock />
                  </div>
                  <input
                    type="password"
                    name="password2"
                    placeholder="Подтвердите пароль"
                    value={formData.password2}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.password2 ? styles.errorInput : ''}`}
                  />
                </div>
                {errors.password2 && <span className={styles.error}>{errors.password2}</span>}
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
                    type="password"
                    name="password"
                    placeholder="Пароль"
                    value={formData.password}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.password ? styles.errorInput : ''}`}
                  />
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
                    type="password"
                    name="newPassword1"
                    placeholder="Новый пароль"
                    value={formData.newPassword1}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.newPassword1 ? styles.errorInput : ''}`}
                  />
                </div>
                {errors.newPassword1 && <span className={styles.error}>{errors.newPassword1}</span>}

                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaLock />
                  </div>
                  <input
                    type="password"
                    name="newPassword2"
                    placeholder="Подтвердите новый пароль"
                    value={formData.newPassword2}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.newPassword2 ? styles.errorInput : ''}`}
                  />
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
              disabled={isLoading}
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
                  onClick={handleResendCode}
                  className={styles.resendButton}
                  disabled={isLoading}
                >
                  Отправить код повторно
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
                  onClick={handleResendResetCode}
                  className={styles.resendButton}
                  disabled={isLoading}
                >
                  Отправить код повторно
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
                  <div id="googleSignIn">
                  </div>

                  <div id="telegramSignIn">
                  </div>
                </div>
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