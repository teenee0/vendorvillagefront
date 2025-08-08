import React, { useEffect, useState } from 'react';
import axios from "../../api/axiosDefault.js";
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './AccountPage.css';

const AccountPage = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAccountInfo = async () => {
      try {
        const response = await axios.get('accounts/api/account/', {
          withCredentials: true,
        });
        setUserData(response.data);
      } catch (err) {
        setError('Не удалось загрузить данные аккаунта');
        if (err.response?.status === 401) {
          navigate('/registration-login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAccountInfo();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await axios.post('accounts/api/auth/logout/', {}, { withCredentials: true });
      window.location.href = '/registration-login';
    } catch (error) {
      console.error('Ошибка при выходе');
    }
  };

  if (loading) {
    return (
      <div className="account-loading">
        <div className="spinner"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="account-error">
        <div className="error-icon">!</div>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Попробовать снова</button>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <div className="account-container">
        {/* Боковая панель */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="account-sidebar"
        >
          <div className="profile-card">
            <div className="avatar">
              {userData.avatar ? (
                <img src={userData.avatar} alt="Аватар" />
              ) : (
                <div className="avatar-placeholder">
                  {userData.first_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <h2>{userData.first_name}</h2>
            <p className="user-email">{userData.email}</p>
            <div className={`account-badge ${userData.is_business ? 'business' : 'personal'}`}>
              {userData.is_business ? 'Бизнес-аккаунт' : 'Личный аккаунт'}
            </div>
          </div>

          <nav className="account-menu">
            <button 
              className={activeTab === 'profile' ? 'active' : ''}
              onClick={() => setActiveTab('profile')}
            >
              <i className="fas fa-user"></i> Профиль
            </button>
            <button 
              className={activeTab === 'security' ? 'active' : ''}
              onClick={() => setActiveTab('security')}
            >
              <i className="fas fa-shield-alt"></i> Безопасность
            </button>
            {userData.is_business && (
              <button 
                className={activeTab === 'business' ? 'active' : ''}
                onClick={() => setActiveTab('business')}
              >
                <i className="fas fa-briefcase"></i> Бизнес-панель
              </button>
            )}
            <button 
              className={activeTab === 'settings' ? 'active' : ''}
              onClick={() => setActiveTab('settings')}
            >
              <i className="fas fa-cog"></i> Настройки
            </button>
          </nav>

          <button className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Выйти
          </button>
        </motion.div>

        {/* Основное содержимое */}
        <div className="account-content">
          {activeTab === 'profile' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="profile-tab"
            >
              <h1>Мой профиль</h1>
              <div className="profile-section">
                <h2>Основная информация</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Имя</label>
                    <p>{userData.first_name}</p>
                  </div>
                  <div className="info-item">
                    <label>Email</label>
                    <p>{userData.email}</p>
                  </div>
                  <div className="info-item">
                    <label>Телефон</label>
                    <p>{userData.phone || 'Не указан'}</p>
                  </div>
                  <div className="info-item">
                    <label>Дата регистрации</label>
                    <p>{new Date(userData.date_joined).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h2>Дополнительная информация</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Роли</label>
                    <div className="roles-list">
                      {userData.roles.map(role => (
                        <span key={role} className="role-badge">{role}</span>
                      ))}
                    </div>
                  </div>
                  <div className="info-item">
                    <label>Статус аккаунта</label>
                    <p>{userData.is_active ? 'Активен' : 'Неактивен'}</p>
                  </div>
                </div>
              </div>

              <button className="edit-profile-btn" disabled >
                <i className="fas fa-edit"></i> Редактировать профиль
              </button>
            </motion.div>
          )}

          {activeTab === 'business' && userData.is_business && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="business-tab"
            >
              <div className="business-header">
                <h1>Бизнес-панель</h1>
                <Link to="/business/new" className="new-business-btn">
                  <i className="fas fa-plus"></i> Добавить бизнес
                </Link>
              </div>

              {userData.businesses?.length > 0 ? (
                <div className="businesses-grid">
                  {userData.businesses.map(business => (
                    <motion.div
                      key={business.id}
                      whileHover={{ y: -5 }}
                      className="business-card-profile"
                    >
                      <div className="business-card-header">
                        {business.business_logo && (
                          <img 
                            src={business.business_logo} 
                            alt={`${business.name} logo`} 
                            className="business-logo" 
                          />
                        )}
                        <h3>{business.name}</h3>
                        <span className="business-type">{business.business_type}</span>
                      </div>
                      <div className="business-card-body">
                        <p className="business-description">
                          {business.description || 'Описание отсутствует'}
                        </p>
                        <div className="business-info">
                          <div>
                            <i className="fas fa-map-marker-alt"></i>
                            <span>{business.address || 'Адрес не указан'}</span>
                          </div>
                          <div>
                            <i className="fas fa-phone"></i>
                            <span>{business.phone || 'Телефон не указан'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="business-card-footer">
                        <Link 
                          to={`/business/${business.slug}/main`} 
                          className="dashboard-btn"
                        >
                          <i className="fas fa-tachometer-alt"></i> Панель управления
                        </Link>
                        {/* <div className="business-actions">
                          <Link 
                            to={`/business/${business.slug}/edit`} 
                            className="edit-btn"
                            title="Редактировать бизнес"
                          >
                            <i className="fas fa-edit"></i>
                            <span className="btn-tooltip">Редактировать</span>
                          </Link>
                          <Link 
                            to={`/business/${business.slug}/products`} 
                            className="products-btn"
                            title="Управление товарами"
                          >
                            <i className="fas fa-boxes"></i>
                            <span className="btn-tooltip">Товары</span>
                          </Link>
                        </div> */}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="no-businesses">
                  <i className="fas fa-briefcase"></i>
                  <h3>У вас пока нет бизнесов</h3>
                  <p>Создайте свой первый бизнес, чтобы начать продавать товары</p>
                  <Link to="/business/new" className="create-business-btn">
                    Создать бизнес
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="security-tab"
            >
              <h1>Безопасность</h1>
              <div className="security-section">
                <h2>Настройки безопасности</h2>
                <div className="security-grid">
                  <div className="security-item">
                    <i className="fas fa-lock"></i>
                    <div>
                      <h3>Пароль</h3>
                      <p>Последнее изменение: 3 месяца назад</p>
                    </div>
                    <button className="change-btn" disabled>Изменить</button>
                  </div>
                  <div className="security-item">
                    <i className="fas fa-mobile-alt"></i>
                    <div>
                      <h3>Двухфакторная аутентификация</h3>
                      <p>Не активирована</p>
                    </div>
                    <button className="enable-btn" disabled>Включить</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="settings-tab"
            >
              <h1>Настройки</h1>
              <div className="settings-section">
                <h2>Персональные настройки</h2>
                <div className="settings-grid">
                  <div className="settings-item">
                    <i className="fas fa-bell"></i>
                    <div>
                      <h3>Уведомления</h3>
                      <p>Настройте получение уведомлений</p>
                    </div>
                    <button className="settings-btn">Настроить</button>
                  </div>
                  <div className="settings-item">
                    <i className="fas fa-palette"></i>
                    <div>
                      <h3>Тема оформления</h3>
                      <p>Темная</p>
                    </div>
                    <button className="settings-btn">Изменить</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountPage;