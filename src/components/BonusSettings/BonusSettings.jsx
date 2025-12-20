import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import {
  FaSave,
  FaEdit,
  FaTrashAlt,
  FaPlus,
  FaGift,
  FaPercent,
  FaDollarSign,
  FaCalendarAlt,
  FaInfoCircle,
  FaToggleOn,
  FaToggleOff,
} from 'react-icons/fa';
import styles from './BonusSettings.module.css';

const BonusSettings = () => {
  const { business_slug } = useParams();
  const [settings, setSettings] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState(null);

  useEffect(() => {
    fetchData();
  }, [business_slug, selectedLocation]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [locationsRes, tiersRes] = await Promise.all([
        axios.get(`api/business/${business_slug}/locations/`),
        axios.get(`api/business/${business_slug}/user-tiers/`),
      ]);

      setLocations(locationsRes.data);
      setTiers(tiersRes.data);

      // Загружаем настройки
      const locationParam = selectedLocation === 'all' ? '' : `?location=${selectedLocation}`;
      const settingsRes = await axios.get(
        `api/business/${business_slug}/bonus-settings/${locationParam}`
      );
      // Исключаем bonus_scope из настроек (больше не используется)
      const { bonus_scope, ...settingsData } = settingsRes.data;
      setSettings(settingsData);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Проверяем, сохраняются ли глобальные настройки
    if (selectedLocation === 'all') {
      const confirmed = window.confirm(
        'Вы уверены, что хотите установить глобальные настройки?\n\n' +
        'Глобальные настройки будут применены ко ВСЕМ локациям и ПЕРЕЗАПИШУТ существующие настройки локаций.\n\n' +
        'Это может повлиять на работу системы бонусов во всех локациях вашего бизнеса.'
      );
      
      if (!confirmed) {
        return; // Пользователь отменил сохранение
      }
    }
    
    try {
      setSaving(true);
      setError(null);

      // Исключаем bonus_scope из данных (больше не используется)
      const { bonus_scope, ...settingsWithoutScope } = settings;
      const data = {
        ...settingsWithoutScope,
        location: selectedLocation === 'all' ? null : parseInt(selectedLocation),
      };

      let response;
      if (settings?.id) {
        response = await axios.patch(
          `api/business/${business_slug}/bonus-settings/`,
          data
        );
      } else {
        response = await axios.post(
          `api/business/${business_slug}/bonus-settings/`,
          data
        );
      }

      setSettings(response.data);
      alert('Настройки сохранены!');
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleTierSave = async (tierData) => {
    try {
      if (editingTier) {
        await axios.patch(
          `api/business/${business_slug}/user-tiers/`,
          { ...tierData, id: editingTier.id }
        );
      } else {
        await axios.post(`api/business/${business_slug}/user-tiers/`, tierData);
      }
      await fetchData();
      setShowTierModal(false);
      setEditingTier(null);
    } catch (err) {
      console.error('Ошибка сохранения уровня:', err);
      alert('Ошибка сохранения уровня');
    }
  };

  const handleTierDelete = async (tierId) => {
    if (!window.confirm('Удалить этот уровень?')) return;

    try {
      await axios.delete(`api/business/${business_slug}/user-tiers/`, {
        data: { id: tierId },
      });
      await fetchData();
    } catch (err) {
      console.error('Ошибка удаления уровня:', err);
      alert('Ошибка удаления уровня');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!settings) {
    return <div className={styles.error}>Не удалось загрузить настройки</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>
          <FaGift /> Настройки системы бонусов
        </h2>
        <div className={styles.locationSelector}>
          <label>Локация:</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="all">Все локации (глобально)</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.settingsForm}>
        <div className={styles.section}>
          <div className={styles.settingRow}>
            <label>
              <FaToggleOn /> Включить систему бонусов
            </label>
            <button
              className={`${styles.toggle} ${settings.is_enabled ? styles.active : ''}`}
              onClick={() => setSettings({ ...settings, is_enabled: !settings.is_enabled })}
            >
              {settings.is_enabled ? <FaToggleOn /> : <FaToggleOff />}
              {settings.is_enabled ? 'Включено' : 'Выключено'}
            </button>
          </div>

          <div className={styles.settingRow}>
            <label>
              <FaPercent /> Процент начисления бонусов (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={settings.bonus_percent || ''}
              onChange={(e) =>
                setSettings({ ...settings, bonus_percent: e.target.value })
              }
            />
          </div>

          <div className={styles.settingRow}>
            <label>
              <FaToggleOn /> Фиксированный процент
            </label>
            <button
              className={`${styles.toggle} ${settings.is_fixed_percent ? styles.active : ''}`}
              onClick={() =>
                setSettings({ ...settings, is_fixed_percent: !settings.is_fixed_percent })
              }
            >
              {settings.is_fixed_percent ? <FaToggleOn /> : <FaToggleOff />}
              {settings.is_fixed_percent ? 'Фиксированный' : 'Гибкий'}
            </button>
            <span className={styles.hint}>
              <FaInfoCircle /> Если включено, продавец не сможет изменить процент при продаже
            </span>
          </div>

          <div className={styles.settingRow}>
            <label>
              <FaDollarSign /> Минимальная сумма покупки для начисления
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.min_purchase_amount || ''}
              onChange={(e) =>
                setSettings({ ...settings, min_purchase_amount: e.target.value })
              }
            />
          </div>

          <div className={styles.settingRow}>
            <label>
              <FaPercent /> Максимальный процент бонусов за покупку (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={settings.max_bonus_percent || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  max_bonus_percent: e.target.value || null,
                })
              }
              placeholder="Не ограничено"
            />
          </div>

          <div className={styles.settingRow}>
            <label>
              <FaDollarSign /> Максимальная сумма бонусов за покупку
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.max_bonus_amount || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  max_bonus_amount: e.target.value || null,
                })
              }
              placeholder="Не ограничено"
            />
          </div>

          <div className={styles.settingRow}>
            <label>
              <FaCalendarAlt /> Срок действия бонусов (дней)
            </label>
            <input
              type="number"
              min="1"
              value={settings.bonus_expiry_days || ''}
              onChange={(e) =>
                setSettings({ ...settings, bonus_expiry_days: parseInt(e.target.value) })
              }
            />
          </div>

          <div className={styles.settingRow}>
            <label>
              <FaToggleOn /> Автоматический апгрейд уровня
            </label>
            <button
              className={`${styles.toggle} ${settings.auto_upgrade_enabled ? styles.active : ''}`}
              onClick={() =>
                setSettings({
                  ...settings,
                  auto_upgrade_enabled: !settings.auto_upgrade_enabled,
                })
              }
            >
              {settings.auto_upgrade_enabled ? <FaToggleOn /> : <FaToggleOff />}
              {settings.auto_upgrade_enabled ? 'Включено' : 'Выключено'}
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.saveButton} onClick={handleSave} disabled={saving}>
            <FaSave /> {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </div>
      </div>

      {/* Уровни пользователей */}
      <div className={styles.tiersSection}>
        <div className={styles.sectionHeader}>
          <h3>Уровни пользователей</h3>
          <button
            className={styles.addButton}
            onClick={() => {
              setEditingTier(null);
              setShowTierModal(true);
            }}
          >
            <FaPlus /> Добавить уровень
          </button>
        </div>

        <div className={styles.tiersList}>
          {tiers.map((tier) => (
            <div key={tier.id} className={styles.tierCard}>
              <div className={styles.tierInfo}>
                <h4>{tier.name}</h4>
                <div className={styles.tierDetails}>
                  <span>Бонус: {tier.bonus_percent}%</span>
                  <span>Апгрейд после: {tier.min_purchases_for_upgrade} покупок</span>
                  {tier.is_default && <span className={styles.badge}>По умолчанию</span>}
                </div>
              </div>
              <div className={styles.tierActions}>
                <button
                  className={styles.editButton}
                  onClick={() => {
                    setEditingTier(tier);
                    setShowTierModal(true);
                  }}
                >
                  <FaEdit />
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleTierDelete(tier.id)}
                >
                  <FaTrashAlt />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Модальное окно для редактирования уровня */}
      {showTierModal && (
        <TierModal
          tier={editingTier}
          onSave={handleTierSave}
          onClose={() => {
            setShowTierModal(false);
            setEditingTier(null);
          }}
        />
      )}
    </div>
  );
};

const TierModal = ({ tier, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    tier_code: tier?.tier_code || 'novice',
    name: tier?.name || '',
    bonus_percent: tier?.bonus_percent || '5.00',
    min_purchases_for_upgrade: tier?.min_purchases_for_upgrade || 0,
    is_default: tier?.is_default || false,
    order: tier?.order || 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>{tier ? 'Редактировать уровень' : 'Добавить уровень'}</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Код уровня:</label>
            <select
              value={formData.tier_code}
              onChange={(e) => setFormData({ ...formData, tier_code: e.target.value })}
            >
              <option value="novice">Новичок</option>
              <option value="regular">Постоянный</option>
              <option value="vip">VIP</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Название:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Процент бонусов:</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.bonus_percent}
              onChange={(e) => setFormData({ ...formData, bonus_percent: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Минимум покупок для апгрейда:</label>
            <input
              type="number"
              min="0"
              value={formData.min_purchases_for_upgrade}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  min_purchases_for_upgrade: parseInt(e.target.value),
                })
              }
            />
          </div>

          <div className={styles.formGroup}>
            <label>
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) =>
                  setFormData({ ...formData, is_default: e.target.checked })
                }
              />
              Уровень по умолчанию
            </label>
          </div>

          <div className={styles.formGroup}>
            <label>Порядок сортировки:</label>
            <input
              type="number"
              min="0"
              value={formData.order}
              onChange={(e) =>
                setFormData({ ...formData, order: parseInt(e.target.value) })
              }
            />
          </div>

          <div className={styles.modalActions}>
            <button type="submit" className={styles.saveButton}>
              <FaSave /> Сохранить
            </button>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BonusSettings;

