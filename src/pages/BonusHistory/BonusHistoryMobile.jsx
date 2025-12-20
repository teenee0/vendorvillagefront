import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import {
  FaGift,
  FaFilter,
  FaDownload,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaUser,
  FaArrowUp,
  FaArrowDown,
  FaUsers,
  FaHistory,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaReceipt
} from 'react-icons/fa';
import styles from './BonusHistoryMobile.module.css';
import Loader from '../../components/Loader';
import { DatePicker, ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/ru';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('ru');

const BonusHistoryMobile = () => {
  const { business_slug } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);
  const [filters, setFilters] = useState({
    location: '',
    transaction_type: '',
    start_date: '',
    end_date: '',
    user_id: '',
  });
  const [userSearch, setUserSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total_pages: 1,
    count: 0,
    has_next: false,
    has_previous: false,
  });
  const [usersPagination, setUsersPagination] = useState({
    page: 1,
    page_size: 20,
    total_pages: 1,
    count: 0,
    has_next: false,
    has_previous: false,
  });
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    fetchLocations();
  }, [business_slug]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchTransactions(1);
    } else if (activeTab === 'users') {
      setUsersPagination(prev => ({ ...prev, page: 1 }));
      fetchUsers(1);
    }
  }, [business_slug, filters, activeTab]);

  useEffect(() => {
    if (activeTab === 'users') {
      const timer = setTimeout(() => {
        setUsersPagination(prev => ({ ...prev, page: 1 }));
        fetchUsers(1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [userSearch]);

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`api/business/${business_slug}/locations/`);
      setLocations(response.data);
    } catch (err) {
      console.error('Ошибка загрузки локаций:', err);
    }
  };

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page: page,
        page_size: pagination.page_size,
      };
      if (filters.location) params.location = filters.location;
      if (filters.transaction_type) params.transaction_type = filters.transaction_type;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.user_id) params.user_id = filters.user_id;

      const response = await axios.get(
        `api/business/${business_slug}/bonus-history/`,
        { params }
      );
      
      setTransactions(response.data.results || []);
      setPagination({
        page: response.data.page || page,
        page_size: response.data.page_size || pagination.page_size,
        total_pages: response.data.total_pages || 1,
        count: response.data.count || 0,
        has_next: response.data.has_next || false,
        has_previous: response.data.has_previous || false,
      });
      setError(null);
    } catch (err) {
      console.error('Ошибка загрузки истории:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки истории бонусов');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page: page,
        page_size: usersPagination.page_size,
      };
      if (userSearch) params.search = userSearch;

      const response = await axios.get(
        `api/business/${business_slug}/bonus-users/`,
        { params }
      );
      
      setUsers(response.data.results || []);
      setUsersPagination({
        page: response.data.page || page,
        page_size: response.data.page_size || usersPagination.page_size,
        total_pages: response.data.total_pages || 1,
        count: response.data.count || 0,
        has_next: response.data.has_next || false,
        has_previous: response.data.has_previous || false,
      });
      setError(null);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchTransactions(newPage);
    }
  };

  const handleUsersPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= usersPagination.total_pages) {
      fetchUsers(newPage);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleDateChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateRange([dates[0]?.toDate() || null, dates[1]?.toDate() || null]);
      handleFilterChange('start_date', dates[0] ? dayjs(dates[0]).tz(tz).startOf('day').utc().format() : '');
      handleFilterChange('end_date', dates[1] ? dayjs(dates[1]).tz(tz).endOf('day').utc().format() : '');
    } else {
      setDateRange([null, null]);
      handleFilterChange('start_date', '');
      handleFilterChange('end_date', '');
    }
  };

  const getTransactionTypeLabel = (type) => {
    const labels = {
      accrual: 'Начисление',
      redemption: 'Списание',
      expiry: 'Истечение',
      adjustment: 'Корректировка',
    };
    return labels[type] || type;
  };

  const getTransactionTypeIcon = (type) => {
    return type === 'accrual' ? <FaArrowUp /> : <FaArrowDown />;
  };

  const exportToCSV = () => {
    const headers = [
      'Дата',
      'Пользователь',
      'Локация',
      'Тип',
      'Сумма',
      'Баланс после',
      'Описание',
    ];
    const rows = transactions.map((t) => [
      new Date(t.created_at).toLocaleString('ru-RU'),
      t.user.full_name || t.user.username,
      t.location.name,
      getTransactionTypeLabel(t.transaction_type),
      parseFloat(t.amount).toFixed(2),
      parseFloat(t.balance_after).toFixed(2),
      t.description || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bonus_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading && transactions.length === 0 && users.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Sticky Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          <FaGift /> История бонусов
        </h1>
        {activeTab === 'transactions' && (
          <button onClick={exportToCSV} className={styles.exportButton}>
            <FaDownload />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'transactions' ? styles.active : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <FaHistory /> Транзакции
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <FaUsers /> Пользователи
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}

        {activeTab === 'transactions' ? (
          <>
            {/* Filters */}
            <div className={styles.filtersSection}>
              <button
                className={styles.filterToggle}
                onClick={() => setShowFilters(!showFilters)}
              >
                <FaFilter /> {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
                {showFilters ? <FaChevronUp /> : <FaChevronDown />}
              </button>

              {showFilters && (
                <div className={styles.filtersPanel}>
                  <div className={styles.filterRow}>
                    <label className={styles.filterLabel}>Локация</label>
                    <select
                      value={filters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                      className={styles.filterSelect}
                    >
                      <option value="">Все локации</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.filterRow}>
                    <label className={styles.filterLabel}>Тип транзакции</label>
                    <select
                      value={filters.transaction_type}
                      onChange={(e) => handleFilterChange('transaction_type', e.target.value)}
                      className={styles.filterSelect}
                    >
                      <option value="">Все типы</option>
                      <option value="accrual">Начисление</option>
                      <option value="redemption">Списание</option>
                      <option value="expiry">Истечение</option>
                      <option value="adjustment">Корректировка</option>
                    </select>
                  </div>

                  <div className={styles.filterRow}>
                    <label className={styles.filterLabel}>Период</label>
                    <ConfigProvider locale={ruRU}>
                      <DatePicker.RangePicker
                        value={startDate && endDate ? [dayjs(startDate), dayjs(endDate)] : null}
                        onChange={handleDateChange}
                        format="DD.MM.YYYY"
                        className={styles.dateRangePicker}
                        disabledDate={(current) => current && current > dayjs().endOf('day')}
                        placeholder={['Начало', 'Конец']}
                        getPopupContainer={(trigger) => trigger.parentElement}
                        popupClassName={styles.datePickerPopper}
                        suffixIcon={<FaCalendarAlt />}
                      />
                    </ConfigProvider>
                  </div>
                </div>
              )}
            </div>

            {/* Transactions List */}
            <div className={styles.transactionsList}>
              {transactions.length === 0 ? (
                <div className={styles.emptyState}>
                  <FaHistory className={styles.emptyIcon} />
                  <p>Нет транзакций</p>
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id} className={styles.transactionCard}>
                    <div className={styles.transactionHeader}>
                      <div className={styles.transactionType}>
                        <span className={`${styles.typeIcon} ${styles[transaction.transaction_type]}`}>
                          {getTransactionTypeIcon(transaction.transaction_type)}
                        </span>
                        <span className={styles.typeLabel}>
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </span>
                      </div>
                      <div className={`${styles.transactionAmount} ${
                        parseFloat(transaction.amount) >= 0 ? styles.positive : styles.negative
                      }`}>
                        {parseFloat(transaction.amount) >= 0 ? '+' : ''}
                        {parseFloat(transaction.amount).toFixed(2)}
                      </div>
                    </div>

                    <div className={styles.transactionBody}>
                      <div className={styles.transactionRow}>
                        <span className={styles.transactionLabel}>Пользователь:</span>
                        <span className={styles.transactionValue}>
                          <FaUser /> {transaction.user.full_name || transaction.user.username}
                        </span>
                      </div>
                      <div className={styles.transactionRow}>
                        <span className={styles.transactionLabel}>Локация:</span>
                        <span className={styles.transactionValue}>
                          <FaMapMarkerAlt /> {transaction.location.name}
                        </span>
                      </div>
                      <div className={styles.transactionRow}>
                        <span className={styles.transactionLabel}>Дата:</span>
                        <span className={styles.transactionValue}>
                          <FaCalendarAlt /> {new Date(transaction.created_at).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      <div className={styles.transactionRow}>
                        <span className={styles.transactionLabel}>Баланс после:</span>
                        <span className={styles.transactionValue}>
                          {parseFloat(transaction.balance_after).toFixed(2)} баллов
                        </span>
                      </div>
                      {transaction.description && (
                        <div className={styles.transactionRow}>
                          <span className={styles.transactionLabel}>Описание:</span>
                          <span className={styles.transactionValue}>{transaction.description}</span>
                        </div>
                      )}
                      {transaction.receipt && (
                        <div className={styles.transactionRow}>
                          <button
                            className={styles.receiptLink}
                            onClick={() =>
                              navigate(
                                `/business/${business_slug}/transactions?receipt=${transaction.receipt.id}`
                              )
                            }
                          >
                            <FaReceipt /> Чек №{transaction.receipt.number}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.paginationButton}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.has_previous || loading}
                >
                  <FaChevronLeft />
                </button>
                <span className={styles.paginationInfo}>
                  {pagination.page} / {pagination.total_pages}
                </span>
                <button
                  className={styles.paginationButton}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.has_next || loading}
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* User Search */}
            <div className={styles.searchSection}>
              <div className={styles.searchInputGroup}>
                <FaSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Поиск по имени или email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>

            {/* Users List */}
            <div className={styles.usersList}>
              {loading ? (
                <div className={styles.loadingContainer}>
                  <Loader size="medium" />
                </div>
              ) : users.length === 0 ? (
                <div className={styles.emptyState}>
                  <FaUsers className={styles.emptyIcon} />
                  <p>Пользователи не найдены</p>
                </div>
              ) : (
                users.map((userData) => (
                  <div key={userData.user.id} className={styles.userCard}>
                    <div className={styles.userHeader}>
                      <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                          <FaUser />
                        </div>
                        <div className={styles.userDetails}>
                          <h3 className={styles.userName}>
                            {userData.user.full_name || userData.user.username}
                          </h3>
                          {userData.user.email && (
                            <p className={styles.userEmail}>{userData.user.email}</p>
                          )}
                        </div>
                      </div>
                      <div className={styles.userBalance}>
                        {parseFloat(userData.balance || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} баллов
                      </div>
                    </div>

                    <div className={styles.userBody}>
                      <div className={styles.userRow}>
                        <span className={styles.userLabel}>Уровень:</span>
                        {userData.tier ? (
                          <span className={styles.tierBadge}>
                            {userData.tier.name}
                          </span>
                        ) : (
                          <span className={styles.noTier}>Нет уровня</span>
                        )}
                      </div>
                      <div className={styles.userRow}>
                        <span className={styles.userLabel}>Процент бонусов:</span>
                        {userData.tier ? (
                          <span className={styles.bonusPercent}>
                            {parseFloat(userData.tier.bonus_percent).toFixed(2)}%
                          </span>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                      <div className={styles.userRow}>
                        <span className={styles.userLabel}>Покупок:</span>
                        <span>{userData.total_purchases || 0}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {usersPagination.total_pages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.paginationButton}
                  onClick={() => handleUsersPageChange(usersPagination.page - 1)}
                  disabled={!usersPagination.has_previous || loading}
                >
                  <FaChevronLeft />
                </button>
                <span className={styles.paginationInfo}>
                  {usersPagination.page} / {usersPagination.total_pages}
                </span>
                <button
                  className={styles.paginationButton}
                  onClick={() => handleUsersPageChange(usersPagination.page + 1)}
                  disabled={!usersPagination.has_next || loading}
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BonusHistoryMobile;

