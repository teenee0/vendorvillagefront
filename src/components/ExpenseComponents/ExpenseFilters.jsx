import React from 'react';
import { FaFilter, FaCalendarAlt, FaMapMarkerAlt, FaLayerGroup, FaArchive, FaSyncAlt } from 'react-icons/fa';
import ExpenseDateRangePresets from './ExpenseDateRangePresets';

const RECURRENCE_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'one_time', label: 'Разовый' },
  { value: 'day', label: 'Ежедневно' },
  { value: 'week', label: 'Еженедельно' },
  { value: 'month', label: 'Ежемесячно' },
  { value: 'year', label: 'Ежегодно' },
];

const ExpenseFilters = ({
  categories,
  locations,
  filters,
  onChange,
  showStatus,
  showExpenseArchive,
  showRecurrenceFilter,
  showDatePresets = true,
  styles,
}) => {
  const set = (field) => (e) => onChange({ ...filters, [field]: e.target.value });

  return (
    <div className={styles.filters}>
      {showDatePresets && (
        <div className={styles.filterPresetsSlot}>
          <ExpenseDateRangePresets filters={filters} onChange={onChange} />
        </div>
      )}
      {showExpenseArchive && (
        <div className={styles.filterGroup}>
          <label title="Активные шаблоны или удалённые (мягкое удаление)">
            <FaArchive /> Показать
          </label>
          <select
            value={filters.is_active || 'true'}
            onChange={set('is_active')}
            aria-label="Показать активные или удалённые расходы"
          >
            <option value="true">Только активные</option>
            <option value="false">Только удалённые</option>
            <option value="all">Все</option>
          </select>
        </div>
      )}
      <div className={styles.filterGroup}>
        <label><FaLayerGroup /> Категория</label>
        <select value={filters.category || ''} onChange={set('category')}>
          <option value="">Все</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {locations.length > 0 && (
        <div className={styles.filterGroup}>
          <label><FaMapMarkerAlt /> Локация</label>
          <select value={filters.location || ''} onChange={set('location')}>
            <option value="">Все</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

      {showRecurrenceFilter && (
        <div className={styles.filterGroup}>
          <label><FaSyncAlt /> Периодичность</label>
          <select
            value={filters.recurrence_unit || ''}
            onChange={set('recurrence_unit')}
            aria-label="Фильтр по периодичности расхода"
          >
            {RECURRENCE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {showStatus && (
        <div className={styles.filterGroup}>
          <label><FaFilter /> Статус</label>
          <select value={filters.status || ''} onChange={set('status')}>
            <option value="">Все</option>
            <option value="planned">Запланирован</option>
            <option value="paid">Оплачен</option>
            <option value="overdue">Просрочен</option>
            <option value="cancelled">Отменён</option>
          </select>
        </div>
      )}

      <div className={styles.filterGroup}>
        <label><FaCalendarAlt /> Начало</label>
        <input
          type="date"
          value={filters.start_date || ''}
          onChange={set('start_date')}
        />
      </div>

      <div className={styles.filterGroup}>
        <label><FaCalendarAlt /> Конец</label>
        <input
          type="date"
          value={filters.end_date || ''}
          onChange={set('end_date')}
        />
      </div>
    </div>
  );
};

export default ExpenseFilters;
