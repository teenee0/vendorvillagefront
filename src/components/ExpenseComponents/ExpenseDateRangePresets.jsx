import React from 'react';
import { FaBolt } from 'react-icons/fa';
import {
  presetToday,
  presetThisWeek,
  presetThisMonth,
  presetLastMonth,
  presetLast7Days,
  presetLast30Days,
} from '../../utils/expenseDateRangePresets';
import styles from './ExpenseDateRangePresets.module.css';

const PRESETS = [
  { id: 'today', label: 'Сегодня', fn: presetToday },
  { id: 'week', label: 'Эта неделя', fn: presetThisWeek },
  { id: 'month', label: 'Этот месяц', fn: presetThisMonth },
  { id: 'lastMonth', label: 'Прошлый месяц', fn: presetLastMonth },
  { id: 'd7', label: '7 дней', fn: presetLast7Days },
  { id: 'd30', label: '30 дней', fn: presetLast30Days },
];

/**
 * Быстрый выбор периода для start_date / end_date в фильтрах.
 * onChange получает полный объект фильтров (как в ExpenseFilters).
 */
const ExpenseDateRangePresets = ({ filters, onChange }) => {
  const apply = (fn) => () => {
    const range = fn();
    onChange({ ...filters, ...range });
  };

  const clearDates = () => {
    onChange({ ...filters, start_date: '', end_date: '' });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>
        <FaBolt aria-hidden /> Быстрый период
      </div>
      <div className={styles.row} role="group" aria-label="Быстрый выбор периода дат">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.btn}
            onClick={apply(p.fn)}
          >
            {p.label}
          </button>
        ))}
        <button type="button" className={styles.btnMuted} onClick={clearDates}>
          Сбросить даты
        </button>
      </div>
    </div>
  );
};

export default ExpenseDateRangePresets;
