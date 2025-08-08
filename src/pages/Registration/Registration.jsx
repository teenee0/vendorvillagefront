import React, { useState, useEffect, useCallback } from 'react';
import { FaGoogle, FaTelegram, FaEnvelope, FaLock, FaUser } from 'react-icons/fa';
import axios from "../../api/axiosDefault.js";
import { useNavigate, Link } from 'react-router-dom';
import styles from './Registration.module.css';

const AuthPage = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    password1: '',
    password2: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
      navigate('/account');
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
      navigate('/account');
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      if (isLoginView) {
        await axios.post('accounts/api/auth/login/', {
          email: formData.email,
          password: formData.password
        }, { withCredentials: true });
      } else {
        await axios.post('accounts/api/auth/register/', {
          first_name: formData.first_name,
          email: formData.email,
          password1: formData.password1,
          password2: formData.password2
        }, { withCredentials: true });
      }
      navigate('/account');
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData) {
        const serverErrors = {};
        for (const key in errorData) {
          serverErrors[key] = Array.isArray(errorData[key]) ? errorData[key][0] : errorData[key];
        }
        setErrors(serverErrors);
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
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${isLoginView ? styles.activeTab : ''}`}
            onClick={() => setIsLoginView(true)}
          >
            Вход
          </button>
          <button
            className={`${styles.tab} ${!isLoginView ? styles.activeTab : ''}`}
            onClick={() => setIsLoginView(false)}
          >
            Регистрация
          </button>
        </div>

        <div className={styles.content}>
          <h2 className={styles.title}>{isLoginView ? 'Вход в аккаунт' : 'Создание аккаунта'}</h2>

          {errors.auth && <div className={styles.authError}>{errors.auth}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            {!isLoginView && (
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
            )}
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
                name={isLoginView ? "password" : "password1"}
                placeholder="Пароль"
                value={isLoginView ? formData.password : formData.password1}
                onChange={handleChange}
                className={`${styles.input} ${errors.password || errors.password1 ? styles.errorInput : ''}`}
              />
              
            </div>
            {(errors.password || errors.password1) && (
                <span className={styles.error}>{errors.password || errors.password1}</span>
              )}

            {!isLoginView && (
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
              
            )}
            {errors.password2 && <span className={styles.error}>{errors.password2}</span>}
            

            {isLoginView && (
              <div className={styles.forgotPassword}>
                <Link to="/reset-password">Забыли пароль?</Link>
              </div>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className={styles.spinner}></span>
              ) : isLoginView ? (
                'Войти'
              ) : (
                'Зарегистрироваться'
              )}
            </button>
          </form>

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
                <button type="button" onClick={() => setIsLoginView(false)}>
                  Зарегистрироваться
                </button>
              </>
            ) : (
              <>
                Уже есть аккаунт?{' '}
                <button type="button" onClick={() => setIsLoginView(true)}>
                  Войти
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;