import React, { useState, useCallback } from 'react';
import { FaEnvelope, FaLock, FaArrowLeft } from 'react-icons/fa';
import axios from "../../api/axiosDefault.js";
import { Link } from 'react-router-dom';
import styles from './PasswordReset.module.css';

const PasswordReset = () => {
  const [step, setStep] = useState(1); // 1 - ввод email, 2 - ввод кода и нового пароля
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    new_password1: '',
    new_password2: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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
        
      case 'code':
        if (!value && step === 2) {
          newErrors.code = 'Код подтверждения обязателен';
        } else if (value && value.length !== 6) {
          newErrors.code = 'Код должен содержать 6 цифр';
        } else {
          delete newErrors.code;
        }
        break;
        
      case 'new_password1':
        if (!value && step === 2) {
          newErrors.new_password1 = 'Новый пароль обязателен';
        } else if (value && value.length < 8) {
          newErrors.new_password1 = 'Пароль должен быть не менее 8 символов';
        } else {
          delete newErrors.new_password1;
          // Проверяем совпадение паролей
          if (formData.new_password2 && value !== formData.new_password2) {
            newErrors.new_password2 = 'Пароли не совпадают';
          } else {
            delete newErrors.new_password2;
          }
        }
        break;
        
      case 'new_password2':
        if (!value && step === 2) {
          newErrors.new_password2 = 'Подтвердите новый пароль';
        } else if (value && value !== formData.new_password1) {
          newErrors.new_password2 = 'Пароли не совпадают';
        } else {
          delete newErrors.new_password2;
        }
        break;
        
      default:
        break;
    }
    
    setErrors(newErrors);
  }, [errors, formData, step]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const validateForm = () => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.email) {
        newErrors.email = 'Email обязателен';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email некорректен';
      }
    } else if (step === 2) {
      if (!formData.code) {
        newErrors.code = 'Код подтверждения обязателен';
      } else if (formData.code.length !== 6) {
        newErrors.code = 'Код должен содержать 6 цифр';
      }

      if (!formData.new_password1) {
        newErrors.new_password1 = 'Новый пароль обязателен';
      } else if (formData.new_password1.length < 8) {
        newErrors.new_password1 = 'Пароль должен быть не менее 8 символов';
      }

      if (!formData.new_password2) {
        newErrors.new_password2 = 'Подтвердите новый пароль';
      } else if (formData.new_password1 !== formData.new_password2) {
        newErrors.new_password2 = 'Пароли не совпадают';
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
      if (step === 1) {
        // Запрос сброса пароля
        await axios.post('accounts/api/auth/password-reset/', {
          email: formData.email
        });
        
        setStep(2);
      } else if (step === 2) {
        // Подтверждение сброса пароля
        await axios.post('accounts/api/auth/password-reset-confirm/', {
          email: formData.email,
          code: formData.code,
          new_password1: formData.new_password1,
          new_password2: formData.new_password2
        });
        
        // Перенаправляем на страницу входа
        window.location.href = '/login?message=password_reset_success';
      }
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData) {
        const serverErrors = {};
        for (const key in errorData) {
          serverErrors[key] = Array.isArray(errorData[key]) ? errorData[key][0] : errorData[key];
        }
        setErrors(serverErrors);
      } else {
        setErrors({ general: 'Произошла ошибка. Пожалуйста, попробуйте позже.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
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
        setErrors({ general: errorData.detail || 'Ошибка отправки кода' });
      } else {
        setErrors({ general: 'Произошла ошибка. Пожалуйста, попробуйте позже.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep(1);
    setFormData(prev => ({ ...prev, code: '', new_password1: '', new_password2: '' }));
    setErrors({});
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link to="/login" className={styles.backButton}>
            <FaArrowLeft />
            Назад к входу
          </Link>
          <h2 className={styles.title}>
            {step === 1 ? 'Сброс пароля' : 'Новый пароль'}
          </h2>
        </div>

        <div className={styles.content}>
          {errors.general && <div className={styles.errorMessage}>{errors.general}</div>}
          {errors.success && <div className={styles.successMessage}>{errors.success}</div>}

          {step === 2 && (
            <div className={styles.verificationInfo}>
              <p>Мы отправили код подтверждения на <strong>{formData.email}</strong></p>
              <p>Введите код и новый пароль:</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            {step === 1 && (
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
            {errors.email && <span className={styles.error}>{errors.email}</span>}

            {step === 2 && (
              <>
                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaEnvelope />
                  </div>
                  <input
                    type="text"
                    name="code"
                    placeholder="Введите код из письма"
                    value={formData.code}
                    onChange={handleChange}
                    maxLength="6"
                    className={`${styles.input} ${styles.verificationCodeInput} ${errors.code ? styles.errorInput : ''}`}
                  />
                </div>
                {errors.code && <span className={styles.error}>{errors.code}</span>}

                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaLock />
                  </div>
                  <input
                    type="password"
                    name="new_password1"
                    placeholder="Новый пароль"
                    value={formData.new_password1}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.new_password1 ? styles.errorInput : ''}`}
                  />
                </div>
                {errors.new_password1 && <span className={styles.error}>{errors.new_password1}</span>}

                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaLock />
                  </div>
                  <input
                    type="password"
                    name="new_password2"
                    placeholder="Подтвердите новый пароль"
                    value={formData.new_password2}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.new_password2 ? styles.errorInput : ''}`}
                  />
                </div>
                {errors.new_password2 && <span className={styles.error}>{errors.new_password2}</span>}
              </>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className={styles.spinner}></span>
              ) : step === 1 ? (
                'Отправить код'
              ) : (
                'Изменить пароль'
              )}
            </button>

            {step === 2 && (
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
                  onClick={handleBackToEmail}
                  className={styles.backButton}
                >
                  Изменить email
                </button>
              </div>
            )}
          </form>

          <div className={styles.footer}>
            <p>
              Вспомнили пароль?{' '}
              <Link to="/login" className={styles.link}>
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;
