import React, { useEffect, useState } from 'react';
import axios from '../../api/axiosDefault';
import styles from './UserPurchaseHistory.module.css';
import { 
  FaGift, 
  FaStore, 
  FaMapMarkerAlt, 
  FaCoins, 
  FaClock, 
  FaWallet,
  FaStar
} from 'react-icons/fa';
import UserQRCode from '../UserQRCode/UserQRCode';

const UserPurchaseHistory = () => {
  const [bonusBalances, setBonusBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBonusBalances();
  }, []);

  const fetchBonusBalances = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('api/user/bonus-balances/');
      setBonusBalances(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки балансов бонусов:', err);
      setError('Не удалось загрузить балансы бонусов');
    } finally {
      setLoading(false);
    }
  };

  // Вычисляем общую статистику
  const calculateTotalBalance = () => {
    return bonusBalances.reduce((total, business) => {
      return total + business.locations.reduce((sum, location) => {
        return sum + parseFloat(location.balance || 0);
      }, 0);
    }, 0);
  };

  const totalBalance = calculateTotalBalance();

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка балансов бонусов...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button onClick={fetchBonusBalances} className={styles.retryButton}>
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className={styles.purchaseHistory}>
      <h2 className={styles.title}>
        <FaGift /> Мои бонусы
      </h2>

      {/* Статистика бонусов */}
      <div className={styles.bonusSummary}>
        <div className={styles.bonusCard}>
          <div className={styles.bonusCardContent}>
            <div className={styles.bonusCardTitle}>Общее количество бонусов</div>
            <div className={styles.bonusCardValue}>{totalBalance.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}</div>
            <div className={styles.bonusCardSubtitle}>Доступно для использования</div>
          </div>
          <div className={styles.bonusCardIcon}>
            <FaCoins />
          </div>
        </div>

        <div className={`${styles.bonusCard} ${styles.secondary}`}>
          <div className={styles.bonusCardContent}>
            <div className={styles.bonusCardTitle}>Магазинов с бонусами</div>
            <div className={styles.bonusCardValue}>{bonusBalances.length}</div>
            <div className={styles.bonusCardSubtitle}>Активных программ лояльности</div>
          </div>
          <div className={styles.bonusCardIcon}>
            <FaStore />
          </div>
        </div>

        <div className={`${styles.bonusCard} ${styles.warning}`}>
          <div className={styles.bonusCardContent}>
            <div className={styles.bonusCardTitle}>Эквивалент в валюте</div>
            <div className={styles.bonusCardValue}>{totalBalance.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₸</div>
            <div className={styles.bonusCardSubtitle}>1 балл = 1 ₸</div>
          </div>
          <div className={styles.bonusCardIcon}>
            <FaWallet />
          </div>
        </div>
      </div>

      {/* QR-код секция */}
      <div className={styles.qrSection}>
        <UserQRCode />
      </div>

      {/* Список магазинов с балансами */}
      {bonusBalances.length === 0 ? (
        <div className={styles.empty}>
          <FaGift />
          <h3>У вас пока нет бонусов</h3>
          <p>Бонусы появятся после покупок в магазинах с программой лояльности</p>
        </div>
      ) : (
        <div className={styles.shopsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <FaStore /> Бонусы по магазинам
            </h2>
          </div>

          <div className={styles.shopsGrid}>
            {bonusBalances.map((business) => (
              business.locations.map((location) => (
                <div key={`${business.slug}-${location.id}`} className={styles.shopCard}>
                  <div className={styles.shopHeader}>
                    <div className={styles.shopLogo}>
                      <FaStore />
                    </div>
                    <div className={styles.shopInfo}>
                      <h3>{business.name}</h3>
                      <p>{location.name}</p>
                    </div>
                  </div>
                  
                  <div className={styles.shopBody}>
                    <div className={styles.bonusDetails}>
                      <div className={styles.bonusAmount}>
                        {parseFloat(location.balance || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                      </div>
                      <div className={styles.bonusStatus}>
                        {location.tier ? location.tier.name : 'Активны'}
                      </div>
                    </div>

                    {location.tier && (
                      <div className={styles.tierInfo}>
                        <span className={styles.tierLabel}>Уровень:</span>
                        <span className={styles.tierValue}>
                          {location.tier.name} ({location.tier.bonus_percent}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPurchaseHistory;

