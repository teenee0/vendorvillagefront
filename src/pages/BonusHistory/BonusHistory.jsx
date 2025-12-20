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
} from 'react-icons/fa';
import styles from './BonusHistory.module.css';
import Loader from '../../components/Loader';

const BonusHistory = () => {
  const { business_slug } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' или 'users'
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
      // Debounce для поиска
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
      
      // API для бизнеса всегда возвращает формат с results
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleUsersPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= usersPagination.total_pages) {
      fetchUsers(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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

  if (loading) {
    return (
      <div className={styles.container}>
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          <FaGift /> История бонусов
        </h1>
        {activeTab === 'transactions' && (
          <button onClick={exportToCSV} className={styles.exportButton}>
            <FaDownload /> Экспорт в CSV
          </button>
        )}
      </div>

      {/* Вкладки */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'transactions' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <FaHistory /> Транзакции
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <FaUsers /> Пользователи
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Контент вкладок */}
      {activeTab === 'transactions' ? (
        <>
          {/* Фильтры */}
          <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>
            <FaMapMarkerAlt /> Локация:
          </label>
          <select
            value={filters.location}
            onChange={(e) => handleFilterChange('location', e.target.value)}
          >
            <option value="">Все локации</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>
            <FaFilter /> Тип транзакции:
          </label>
          <select
            value={filters.transaction_type}
            onChange={(e) => handleFilterChange('transaction_type', e.target.value)}
          >
            <option value="">Все типы</option>
            <option value="accrual">Начисление</option>
            <option value="redemption">Списание</option>
            <option value="expiry">Истечение</option>
            <option value="adjustment">Корректировка</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>
            <FaCalendarAlt /> Начальная дата:
          </label>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>
            <FaCalendarAlt /> Конечная дата:
          </label>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
          />
        </div>
      </div>

      {/* Таблица транзакций */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Пользователь</th>
              <th>Локация</th>
              <th>Тип</th>
              <th>Сумма</th>
              <th>Баланс после</th>
              <th>Описание</th>
              <th>Чек</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.empty}>
                  Нет транзакций
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>
                    {new Date(transaction.created_at).toLocaleString('ru-RU')}
                  </td>
                  <td>
                    <div className={styles.userCell}>
                      <FaUser />
                      {transaction.user.full_name || transaction.user.username}
                    </div>
                  </td>
                  <td>{transaction.location.name}</td>
                  <td>
                    <div
                      className={`${styles.typeCell} ${
                        styles[transaction.transaction_type]
                      }`}
                    >
                      {getTransactionTypeIcon(transaction.transaction_type)}
                      {getTransactionTypeLabel(transaction.transaction_type)}
                    </div>
                  </td>
                  <td
                    className={`${styles.amountCell} ${
                      parseFloat(transaction.amount) >= 0
                        ? styles.positive
                        : styles.negative
                    }`}
                  >
                    {parseFloat(transaction.amount) >= 0 ? '+' : ''}
                    {parseFloat(transaction.amount).toFixed(2)}
                  </td>
                  <td>{parseFloat(transaction.balance_after).toFixed(2)}</td>
                  <td className={styles.descriptionCell}>
                    {transaction.description || '-'}
                  </td>
                  <td>
                    {transaction.receipt ? (
                      <button
                        className={styles.receiptLink}
                        onClick={() =>
                          navigate(
                            `/business/${business_slug}/transactions?receipt=${transaction.receipt.id}`
                          )
                        }
                      >
                        {transaction.receipt.number}
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {pagination.total_pages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationButton}
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.has_previous || loading}
          >
            Назад
          </button>
          <div className={styles.paginationInfo}>
            Страница {pagination.page} из {pagination.total_pages}
            {pagination.count > 0 && (
              <span className={styles.paginationCount}>
                ({pagination.count} транзакций)
              </span>
            )}
          </div>
          <button
            className={styles.paginationButton}
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.has_next || loading}
          >
            Вперед
          </button>
        </div>
      )}
        </>
      ) : (
        <>
          {/* Поиск пользователей */}
          <div className={styles.userSearch}>
            <div className={styles.searchInputWrapper}>
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

          {/* Таблица пользователей */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Email</th>
                  <th>Баланс бонусов</th>
                  <th>Уровень</th>
                  <th>Процент бонусов</th>
                  <th>Количество покупок</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className={styles.empty}>
                      <Loader size="medium" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.empty}>
                      Пользователи не найдены
                    </td>
                  </tr>
                ) : (
                  users.map((userData) => (
                    <tr key={userData.user.id}>
                      <td>
                        <div className={styles.userCell}>
                          <FaUser />
                          {userData.user.full_name || userData.user.username}
                        </div>
                      </td>
                      <td>{userData.user.email || '-'}</td>
                      <td className={styles.balanceCell}>
                        {parseFloat(userData.balance || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} баллов
                      </td>
                      <td>
                        {userData.tier ? (
                          <span className={styles.tierBadge}>
                            {userData.tier.name}
                          </span>
                        ) : (
                          <span className={styles.noTier}>Нет уровня</span>
                        )}
                      </td>
                      <td>
                        {userData.tier ? (
                          <span className={styles.bonusPercent}>
                            {parseFloat(userData.tier.bonus_percent).toFixed(2)}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{userData.total_purchases || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Пагинация для пользователей */}
          {usersPagination.total_pages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.paginationButton}
                onClick={() => handleUsersPageChange(usersPagination.page - 1)}
                disabled={!usersPagination.has_previous || loading}
              >
                Назад
              </button>
              <div className={styles.paginationInfo}>
                Страница {usersPagination.page} из {usersPagination.total_pages}
                {usersPagination.count > 0 && (
                  <span className={styles.paginationCount}>
                    ({usersPagination.count} пользователей)
                  </span>
                )}
              </div>
              <button
                className={styles.paginationButton}
                onClick={() => handleUsersPageChange(usersPagination.page + 1)}
                disabled={!usersPagination.has_next || loading}
              >
                Вперед
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BonusHistory;

