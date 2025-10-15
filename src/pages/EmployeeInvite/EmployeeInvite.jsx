import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from '../../api/axiosDefault';
import {
  FaCheckCircle,
  FaTimesCircle,
  FaBuilding,
  FaMapMarkerAlt,
  FaUserTie,
  FaKey,
  FaExclamationTriangle,
  FaSpinner
} from 'react-icons/fa';
import styles from './EmployeeInvite.module.css';

const EmployeeInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Загружаем информацию о приглашении
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`api/invite/${token}/`);
      setInvite(response.data);
      // Получаем информацию о текущем пользователе из ответа API
      setCurrentUser(response.data.current_user || { is_authenticated: false });
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка загрузки приглашения');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!currentUser?.is_authenticated) {
      // Сохраняем токен приглашения и перенаправляем на страницу входа
      sessionStorage.setItem('pending_invite_token', token);
      navigate('/registration-login?redirect=' + encodeURIComponent(`/invite/employee/${token}`));
      return;
    }

    try {
      setAccepting(true);
      await axios.post('api/invite/accept/', { token });
      
      // Перенаправляем на страницу бизнеса или дашборд
      navigate(`/business/${invite.business_slug}/main`, {
        state: { message: 'Вы успешно присоединились к бизнесу!' }
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при принятии приглашения');
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBox}>
          <FaSpinner className={styles.spinner} />
          <p>Загрузка приглашения...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.errorBox}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <FaTimesCircle className={styles.errorIcon} />
          <h2>Ошибка</h2>
          <p>{error}</p>
          <button
            className={styles.backButton}
            onClick={() => navigate('/')}
          >
            Вернуться на главную
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.inviteBox}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.header}>
          <FaBuilding className={styles.headerIcon} />
          <h1>Приглашение в бизнес</h1>
        </div>

        <div className={styles.content}>
          <div className={styles.businessInfo}>
            <h2>{invite.business_name}</h2>
            <p className={styles.invitedBy}>
              Вас пригласил: {invite.invited_by_name}
            </p>
          </div>

          {invite.employee_name && (
            <div className={styles.infoBlock}>
              <FaUserTie />
              <div>
                <strong>Ваша роль:</strong>
                <p>{invite.employee_name}</p>
              </div>
            </div>
          )}

          {invite.position && (
            <div className={styles.infoBlock}>
              <FaUserTie />
              <div>
                <strong>Должность:</strong>
                <p>{invite.position}</p>
              </div>
            </div>
          )}

          {invite.locations_details && invite.locations_details.length > 0 && (
            <div className={styles.infoBlock}>
              <FaMapMarkerAlt />
              <div>
                <strong>Локации:</strong>
                <ul>
                  {invite.locations_details.map((loc) => (
                    <li key={loc.id}>
                      {loc.name}
                      {loc.address && ` - ${loc.address}`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {invite.permissions_details && invite.permissions_details.length > 0 && (
            <div className={styles.infoBlock}>
              <FaKey />
              <div>
                <strong>Права доступа:</strong>
                <ul className={styles.permissionsList}>
                  {invite.permissions_details.map((perm) => (
                    <li key={perm.id}>
                      <span className={styles.permCode}>{perm.code}</span>
                      {perm.description && (
                        <span className={styles.permDesc}>{perm.description}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className={styles.expiryWarning}>
            <FaExclamationTriangle />
            <p>
              Приглашение действительно до:{' '}
              {new Date(invite.expires_at).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          {currentUser?.is_authenticated ? (
            <div className={styles.userInfo}>
              <p>
                Вы войдете как: <strong>{currentUser.full_name || currentUser.username}</strong>
              </p>
            </div>
          ) : (
            <div className={styles.authNotice}>
              <p>
                Для принятия приглашения необходимо войти в систему.
                После входа вы автоматически присоединитесь к бизнесу.
              </p>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.declineButton}
            onClick={() => navigate('/')}
            disabled={accepting}
          >
            Отклонить
          </button>
          <button
            className={styles.acceptButton}
            onClick={handleAcceptInvite}
            disabled={accepting}
          >
            {accepting ? (
              <>
                <FaSpinner className={styles.buttonSpinner} />
                Обработка...
              </>
            ) : (
              <>
                <FaCheckCircle />
                {currentUser?.is_authenticated 
                  ? `Войти как ${currentUser.full_name || currentUser.username}` 
                  : 'Войти и принять'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default EmployeeInvite;

