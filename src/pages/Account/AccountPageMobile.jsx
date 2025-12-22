import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from "../../api/axiosDefault.js";
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import styles from './AccountPageMobile.module.css';
import Loader from '../../components/Loader';
import { QRCodeSVG } from 'qrcode.react';
import { 
  FiUser, FiBriefcase, FiShield, 
  FiGift, FiSettings, FiLogOut, FiChevronRight,
  FiMail, FiPhone, FiCalendar, FiLock,
  FiBell, FiMoon, FiGlobe, FiCreditCard,
  FiMapPin, FiUsers, FiStar, FiTrendingUp
} from 'react-icons/fi';
import { 
  RiShieldUserLine, 
  RiDashboardLine,
  RiWallet3Line,
  RiNotificationLine
} from 'react-icons/ri';
import { FaBuilding, FaStore, FaMapMarkerAlt, FaCoins, FaGift, FaChevronLeft, FaChevronRight, FaCopy, FaCheck, FaExpandAlt, FaSync, FaArrowUp, FaArrowDown, FaTimes } from 'react-icons/fa';
import ModalCloseButton from '../../components/ModalCloseButton/ModalCloseButton';

const AccountPageMobile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(null);
  const [employments, setEmployments] = useState([]);
  const [employmentsLoading, setEmploymentsLoading] = useState(false);
  const [bonusBalances, setBonusBalances] = useState([]);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrRefreshing, setQrRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsHasMore, setTransactionsHasMore] = useState(false);
  const [transactionsOffset, setTransactionsOffset] = useState(0);
  const transactionsScrollRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

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

  useEffect(() => {
    const fetchEmployments = async () => {
      try {
        setEmploymentsLoading(true);
        const response = await axios.get('api/my-employments/');
        setEmployments(response.data);
      } catch (err) {
        console.error('Ошибка загрузки мест работы:', err);
      } finally {
        setEmploymentsLoading(false);
      }
    };

    fetchEmployments();
  }, []);

  useEffect(() => {
    const fetchBonusBalances = async () => {
      try {
        setBonusLoading(true);
        const response = await axios.get('api/user/bonus-balances/');
        setBonusBalances(response.data || []);
      } catch (err) {
        console.error('Ошибка загрузки балансов бонусов:', err);
      } finally {
        setBonusLoading(false);
      }
    };

    const fetchQRCode = async () => {
      try {
        setQrLoading(true);
        const response = await axios.get('api/user/qr-code/');
        setQrData(response.data);
      } catch (err) {
        console.error('Ошибка загрузки QR-кода:', err);
      } finally {
        setQrLoading(false);
      }
    };

    fetchBonusBalances();
    fetchQRCode();
  }, []);

  // Обновление QR-кода
  const refreshQRCode = React.useCallback(async () => {
    try {
      setQrRefreshing(true);
      const response = await axios.get('api/user/qr-code/');
      setQrData(response.data);
    } catch (err) {
      console.error('Ошибка обновления QR-кода:', err);
    } finally {
      setQrRefreshing(false);
    }
  }, []);

  // Таймер для отображения оставшегося времени
  useEffect(() => {
    if (!qrData?.expires_at) {
      setTimeRemaining(null);
      return;
    }

    const updateTimeRemaining = () => {
      const expiresAt = new Date(qrData.expires_at);
      const now = new Date();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeRemaining('Истек');
        refreshQRCode();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      if (minutes > 0) {
        setTimeRemaining(`${minutes} мин ${seconds} сек`);
      } else {
        setTimeRemaining(`${seconds} сек`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [qrData?.expires_at, refreshQRCode]);

  const handleLogout = async () => {
    await logout();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateTotalBalance = () => {
    return bonusBalances.reduce((total, business) => {
      return total + parseFloat(business.balance || 0);
    }, 0);
  };

  const handleCopyToken = () => {
    if (qrData?.qr_token) {
      navigator.clipboard.writeText(qrData.qr_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStoreClick = async (business, primaryLocation) => {
    setSelectedStore({ business, location: primaryLocation });
    setShowHistoryModal(true);
    setTransactionsLoading(true);
    setTransactionsOffset(0);
    setTransactionsHasMore(false);
    
    try {
      const response = await axios.get(
        `api/user/bonus-history/${business.slug}/`,
        { params: { offset: 0, page_size: 20 } }
      );
      setTransactions(Array.isArray(response.data.transactions) ? response.data.transactions : []);
      setTransactionsHasMore(response.data.has_more || false);
      setTransactionsOffset(response.data.transactions?.length || 0);
    } catch (err) {
      console.error('Ошибка загрузки истории транзакций:', err);
      setTransactions([]);
      setTransactionsHasMore(false);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const loadMoreTransactions = useCallback(async () => {
    if (!selectedStore || transactionsLoading || !transactionsHasMore) return;
    
    setTransactionsLoading(true);
    try {
      const response = await axios.get(
        `api/user/bonus-history/${selectedStore.business.slug}/`,
        { params: { offset: transactionsOffset, page_size: 20 } }
      );
      setTransactions(prev => [...prev, ...(response.data.transactions || [])]);
      setTransactionsHasMore(response.data.has_more || false);
      setTransactionsOffset(prev => prev + (response.data.transactions?.length || 0));
    } catch (err) {
      console.error('Ошибка загрузки дополнительных транзакций:', err);
    } finally {
      setTransactionsLoading(false);
    }
  }, [selectedStore, transactionsLoading, transactionsHasMore, transactionsOffset]);

  // Infinite scroll для модального окна
  useEffect(() => {
    if (!showHistoryModal || !transactionsScrollRef.current) return;

    const handleScroll = () => {
      const element = transactionsScrollRef.current;
      if (!element) return;

      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight * 0.8 && transactionsHasMore && !transactionsLoading) {
        loadMoreTransactions();
      }
    };

    const element = transactionsScrollRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => {
        if (element) {
          element.removeEventListener('scroll', handleScroll);
        }
      };
    }
  }, [showHistoryModal, transactionsHasMore, transactionsLoading, selectedStore, transactionsOffset, loadMoreTransactions]);

  const formatTransactionType = (type) => {
    const types = {
      'accrual': 'Начисление',
      'redemption': 'Списание',
      'expiry': 'Истечение',
      'adjustment': 'Корректировка'
    };
    return types[type] || type;
  };

  const tabs = [
    { id: 'profile', label: 'Профиль', icon: <FiUser /> },
    { id: 'security', label: 'Безопасность', icon: <FiShield /> },
    { id: 'wallet', label: 'Кошелек', icon: <RiWallet3Line /> },
    { id: 'settings', label: 'Настройки', icon: <FiSettings /> },
  ];

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <Loader size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorWrapper}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3>Ошибка загрузки</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className={styles.retryBtn}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const totalBalance = calculateTotalBalance();

  return (
    <div className={styles.accountPage}>
      {/* User Avatar Section */}
      <section className={styles.userAvatarSection}>
        <div className={styles.avatarWrapper}>
          {userData.avatar ? (
            <img src={userData.avatar} alt="Аватар" className={styles.userAvatar} />
          ) : (
            <div className={styles.userAvatarFallback}>
              {userData.first_name.charAt(0).toUpperCase()}
            </div>
          )}
          <h2 className={styles.userName}>{userData.first_name}</h2>
        </div>
      </section>

      {/* Statistics Section */}
      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <div className={`${styles.statIcon} ${styles.blue}`}>
              <FaCoins />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{totalBalance.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</div>
              <div className={styles.statLabel}>Всего бонусов</div>
            </div>
          </div>
          <div className={styles.statBox}>
            <div className={`${styles.statIcon} ${styles.green}`}>
              <FaStore />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{bonusBalances.length}</div>
              <div className={styles.statLabel}>Магазинов</div>
            </div>
          </div>
          <div className={styles.statBox}>
            <div className={`${styles.statIcon} ${styles.purple}`}>
              <FaGift />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{totalBalance.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₸</div>
              <div className={styles.statLabel}>Эквивалент</div>
            </div>
          </div>
        </div>
      </section>

      {/* QR Code Section */}
      <section className={styles.qrSection}>
        <div className={styles.qrCard}>
          <div className={styles.qrHeader}>
            <h3>Ваш QR-код</h3>
            <p>Покажите на кассе для начисления бонусов</p>
          </div>
          {qrLoading ? (
            <div className={styles.loadingState}>
              <Loader size="small" />
            </div>
          ) : qrData ? (
            <>
              <div className={styles.qrContainer} onClick={() => setShowQrModal(true)}>
                <div className={styles.qrCode}>
                  <QRCodeSVG
                    value={qrData.qr_token}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                  <div className={styles.qrOverlay}>
                    <FaExpandAlt />
                    <p>Нажмите для<br />увеличения</p>
                  </div>
                </div>
              </div>
              <div className={styles.qrFooter}>
                {timeRemaining && (
                  <div className={styles.qrExpiry}>
                    <span className={styles.expiryLabel}>Действителен:</span>
                    <span className={styles.expiryTime}>{timeRemaining}</span>
                  </div>
                )}
                <button
                  className={styles.refreshQrButton}
                  onClick={refreshQRCode}
                  disabled={qrRefreshing}
                >
                  <FaSync className={qrRefreshing ? styles.spinning : ''} />
                  {qrRefreshing ? 'Обновление...' : 'Обновить'}
                </button>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>Не удалось загрузить QR-код</div>
          )}
        </div>
      </section>

      {/* Stores Section */}
      <section className={styles.storesSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Мои магазины</h3>
        </div>
        {bonusLoading ? (
          <div className={styles.loadingState}>
            <Loader size="medium" />
          </div>
        ) : bonusBalances.length === 0 ? (
          <div className={styles.emptyState}>
            <FaGift />
            <h4>У вас пока нет бонусов</h4>
            <p>Бонусы появятся после покупок в магазинах с программой лояльности</p>
          </div>
        ) : (
          <div className={styles.storesList}>
            {bonusBalances.map((business) => (
              <div 
                key={business.slug} 
                className={styles.storeCard}
                onClick={() => handleStoreClick(business, business.primary_location)}
              >
                <div className={styles.storeHeader}>
                  <div className={styles.storeLogo}>
                    {business.business_logo ? (
                      <img 
                        src={business.business_logo} 
                        alt={business.name}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.nextSibling;
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }}
                      />
                    ) : (
                      <div><FaStore /></div>
                    )}
                  </div>
                  <div className={styles.storeInfo}>
                    <div className={styles.storeName}>{business.name}</div>
                  </div>
                </div>
                <div className={styles.bonusDisplay}>
                  <div className={styles.bonusAmount}>
                    {parseFloat(business.balance || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                  </div>
                  <div className={styles.bonusLabel}>бонусов</div>
                </div>
                {business.tier && (
                  <div className={styles.progressSection}>
                    <div className={styles.progressLabel}>
                      <span>Уровень</span>
                      <span>{business.tier.name}</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill}
                        style={{ width: `${Math.min(parseFloat(business.tier.bonus_percent) * 10, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Businesses Section */}
      {userData.is_business && userData.businesses?.length > 0 && (
        <section className={styles.businessesSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <FaBuilding /> Мои бизнесы
            </h3>
          </div>
          <div className={styles.businessesList}>
            {userData.businesses.map(business => (
              <div key={business.id} className={styles.businessCard}>
                <div className={styles.businessHeader}>
                  <div className={styles.businessLogo}>
                    {business.business_logo ? (
                      <img 
                        src={business.business_logo} 
                        alt={business.name}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.nextSibling;
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }}
                      />
                    ) : (
                      <div><FaBuilding /></div>
                    )}
                  </div>
                  <div className={styles.businessInfo}>
                    <h4>{business.name}</h4>
                    <span className={styles.businessType}>{business.business_type}</span>
                  </div>
                </div>
                <div className={styles.businessBody}>
                  <p>{business.description || 'Описание отсутствует'}</p>
                </div>
                <div className={styles.businessActions}>
                  <Link 
                    to={`/business/${business.slug}/main`}
                    className={styles.businessLink}
                  >
                    <RiDashboardLine />
                    Панель управления
                    <FiChevronRight />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Work Section */}
      {employments.length > 0 && (
        <section className={styles.workSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <FiBriefcase /> Мои места работы
            </h3>
          </div>
          {employmentsLoading ? (
            <div className={styles.loadingState}>
              <Loader size="medium" />
            </div>
          ) : (
            <div className={styles.employmentsList}>
              {employments.map(employment => (
                <div key={employment.id} className={styles.employmentCard}>
                  <div className={styles.employmentHeader}>
                    <div className={styles.companyLogo}>
                      {employment.business.business_logo ? (
                        <img src={employment.business.business_logo} alt={employment.business.name} />
                      ) : (
                        <FaBuilding />
                      )}
                    </div>
                    <div className={styles.employmentInfo}>
                      <h4>{employment.business.name}</h4>
                      {employment.employee_name && (
                        <span className={styles.employeeBadge}>
                          {employment.employee_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.employmentDetails}>
                    {employment.hired_date && (
                      <div className={styles.detailItem}>
                        <FiCalendar />
                        <span>Работает с: {formatDate(employment.hired_date)}</span>
                      </div>
                    )}
                    {employment.locations.length > 0 && (
                      <div className={styles.locationsSection}>
                        <h5>Локации:</h5>
                        <div className={styles.locationsList}>
                          {employment.locations.map(loc => (
                            <div key={loc.id} className={styles.locationItem}>
                              <FiMapPin />
                              <div>
                                <strong>{loc.location_name}</strong>
                                {loc.position && (
                                  <span className={styles.positionTag}>{loc.position}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles.employmentActions}>
                    <Link 
                      to={`/business/${employment.business.slug}/main`}
                      className={styles.workLink}
                    >
                      Перейти к работе
                      <FiChevronRight />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tabs Section */}
      <section className={styles.tabsSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Настройки и управление</h3>
        </div>
        <div className={styles.tabsGrid}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={styles.tabCard}
              onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
            >
              <div className={styles.tabIcon}>{tab.icon}</div>
              <h4>{tab.label}</h4>
            </div>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={styles.tabContent}
            >
              {activeTab === 'profile' && (
                <div className={styles.profileTab}>
                  <div className={styles.profileCard}>
                    <div className={styles.cardHeader}>
                      <h4>Основная информация</h4>
                      <button className={styles.editBtn}>Редактировать</button>
                    </div>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <FiUser className={styles.infoIcon} />
                        <div>
                          <label>Имя</label>
                          <p>{userData.first_name}</p>
                        </div>
                      </div>
                      <div className={styles.infoItem}>
                        <FiMail className={styles.infoIcon} />
                        <div>
                          <label>Email</label>
                          <p>{userData.email}</p>
                        </div>
                      </div>
                      <div className={styles.infoItem}>
                        <FiPhone className={styles.infoIcon} />
                        <div>
                          <label>Телефон</label>
                          <p>{userData.phone || 'Не указан'}</p>
                        </div>
                      </div>
                      <div className={styles.infoItem}>
                        <FiCalendar className={styles.infoIcon} />
                        <div>
                          <label>Дата регистрации</label>
                          <p>{formatDate(userData.date_joined)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className={styles.securityTab}>
                  <div className={styles.securityGrid}>
                    <div className={styles.securityCard}>
                      <div className={styles.securityHeader}>
                        <FiLock />
                        <h4>Пароль</h4>
                      </div>
                      <p>Измените ваш пароль для повышения безопасности</p>
                      <button className={styles.securityBtn}>Изменить пароль</button>
                    </div>
                    <div className={styles.securityCard}>
                      <div className={styles.securityHeader}>
                        <RiShieldUserLine />
                        <h4>2FA</h4>
                      </div>
                      <p>Включите двухфакторную аутентификацию</p>
                      <button className={styles.securityBtn}>Настроить 2FA</button>
                    </div>
                    <div className={styles.securityCard}>
                      <div className={styles.securityHeader}>
                        <FiGlobe />
                        <h4>Сессии</h4>
                      </div>
                      <p>Управление активными сессиями</p>
                      <button className={styles.securityBtn}>Просмотреть сессии</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'wallet' && (
                <div className={styles.walletTab}>
                  <div className={styles.balanceCard}>
                    <h4>Текущий баланс</h4>
                    <p className={styles.balanceAmount}>12,450 ₽</p>
                    <div className={styles.balanceActions}>
                      <button className={styles.balanceBtn}>Пополнить</button>
                      <button className={styles.balanceBtn}>Вывести</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className={styles.settingsTab}>
                  <div className={styles.settingsGrid}>
                    <div className={styles.settingCard}>
                      <div className={styles.settingHeader}>
                        <FiBell />
                        <h4>Уведомления</h4>
                      </div>
                      <p>Настройте получение уведомлений</p>
                      <button className={styles.settingBtn}>Настроить</button>
                    </div>
                    <div className={styles.settingCard}>
                      <div className={styles.settingHeader}>
                        <FiMoon />
                        <h4>Тема</h4>
                      </div>
                      <p>Темная тема активна</p>
                      <button className={styles.settingBtn}>Изменить</button>
                    </div>
                    <div className={styles.settingCard}>
                      <div className={styles.settingHeader}>
                        <RiNotificationLine />
                        <h4>Конфиденциальность</h4>
                      </div>
                      <p>Настройки приватности</p>
                      <button className={styles.settingBtn}>Управлять</button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Logout Button */}
      <section className={styles.footerSection}>
        <button 
          className={styles.logoutButton}
          onClick={handleLogout}
        >
          <FiLogOut />
          Выйти из аккаунта
        </button>
      </section>

      {/* Bonus History Modal */}
      {showHistoryModal && selectedStore && (
        <div className={styles.modalOverlay} onClick={() => setShowHistoryModal(false)}>
          <motion.div 
            className={styles.historyModalContent} 
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className={styles.modalHeader}>
              <h2>История бонусов</h2>
              <button 
                className={styles.modalClose}
                onClick={() => setShowHistoryModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className={styles.historyStoreInfo}>
              <div className={styles.historyStoreName}>{selectedStore.business.name}</div>
              <div className={styles.historyStoreBalance}>
                Баланс: <span>{parseFloat(selectedStore.business.balance || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} бонусов</span>
              </div>
            </div>
            
            {transactionsLoading && transactions.length === 0 ? (
              <div className={styles.loadingState}>
                <Loader size="medium" />
              </div>
            ) : !Array.isArray(transactions) || transactions.length === 0 ? (
              <div className={styles.emptyState}>
                <FaGift />
                <p>История транзакций пуста</p>
              </div>
            ) : (
              <div 
                className={styles.transactionsList}
                ref={transactionsScrollRef}
              >
                {Array.isArray(transactions) && transactions.map((transaction) => (
                  <div key={transaction.id} className={styles.transactionItem}>
                    <div className={styles.transactionHeader}>
                      <div className={styles.transactionType}>
                        {transaction.transaction_type === 'accrual' ? (
                          <FaArrowUp className={styles.transactionIconAccrual} />
                        ) : (
                          <FaArrowDown className={styles.transactionIconRedemption} />
                        )}
                        <span>{formatTransactionType(transaction.transaction_type)}</span>
                      </div>
                      <div className={`${styles.transactionAmount} ${
                        transaction.transaction_type === 'accrual' 
                          ? styles.positive 
                          : styles.negative
                      }`}>
                        {transaction.transaction_type === 'accrual' ? '+' : '-'}
                        {parseFloat(transaction.amount).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    {transaction.description && (
                      <div className={styles.transactionDescription}>
                        {transaction.description}
                      </div>
                    )}
                    <div className={styles.transactionFooter}>
                      <div className={styles.transactionDate}>
                        {new Date(transaction.created_at).toLocaleString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className={styles.transactionBalance}>
                        Баланс после: {parseFloat(transaction.balance_after).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    {transaction.receipt && (
                      <div className={styles.transactionReceipt}>
                        Чек №{transaction.receipt.number}
                      </div>
                    )}
                  </div>
                ))}
                {transactionsLoading && Array.isArray(transactions) && transactions.length > 0 && (
                  <div className={styles.loadingMore}>
                    <Loader size="small" />
                    <span>Загрузка...</span>
                  </div>
                )}
                {!transactionsHasMore && Array.isArray(transactions) && transactions.length > 0 && (
                  <div className={styles.noMoreTransactions}>
                    Все транзакции загружены
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && qrData && (
        <div className={styles.modalOverlay} onClick={() => setShowQrModal(false)}>
          <motion.div 
            className={styles.qrModalContent} 
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className={styles.modalHeader}>
              <h2>Ваш QR-код</h2>
              <button 
                className={styles.modalClose}
                onClick={() => setShowQrModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalQr}>
              <QRCodeSVG
                value={qrData.qr_token}
                size={280}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className={styles.modalQrText}>Покажите этот код на кассе для начисления бонусов</p>
            {timeRemaining && (
              <div className={styles.modalExpiry}>
                <span>Действителен:</span>
                <span className={styles.modalExpiryTime}>{timeRemaining}</span>
              </div>
            )}
            <div className={styles.tokenValue}>{qrData.qr_token}</div>
            <div className={styles.modalActions}>
              <button 
                className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
                onClick={handleCopyToken}
              >
                {copied ? <><FaCheck /> Скопировано!</> : <><FaCopy /> Копировать токен</>}
              </button>
              <button 
                className={styles.refreshQrButton}
                onClick={refreshQRCode}
                disabled={qrRefreshing}
              >
                <FaSync className={qrRefreshing ? styles.spinning : ''} />
                {qrRefreshing ? 'Обновление...' : 'Обновить QR-код'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AccountPageMobile;
