import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../api/axiosDefault';

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Выбор расхода с поиском и подгрузкой страниц (GET .../expenses/?search&page).
 * onSelect(expense) — полный объект из API.
 * key на родителе при открытии модалки сбрасывает поиск.
 */
const ExpensePicker = ({
  isOpen,
  businessSlug,
  selectedId,
  onSelect,
  styles,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total_pages: 1,
    has_next: false,
  });
  const [loading, setLoading] = useState(false);

  const fetchPage = useCallback(
    async (page, search) => {
      if (!businessSlug || !isOpen) return;
      setLoading(true);
      try {
        const params = {
          page,
          per_page: 20,
          is_active: true,
        };
        if (search && search.trim()) params.search = search.trim();
        const { data } = await axios.get(
          `api/business/${businessSlug}/expenses/`,
          { params },
        );
        const rows = data.results || [];
        setPagination(
          data.pagination || { page, total_pages: 1, has_next: false },
        );
        if (page === 1) {
          setResults(rows);
        } else {
          setResults((prev) => [...prev, ...rows]);
        }
      } catch {
        if (page === 1) setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [businessSlug, isOpen],
  );

  useEffect(() => {
    if (!isOpen || !businessSlug) return;
    fetchPage(1, debouncedSearch);
  }, [isOpen, businessSlug, debouncedSearch, fetchPage]);

  const loadMore = () => {
    if (!pagination.has_next || loading) return;
    const nextPage = (pagination.page || 1) + 1;
    fetchPage(nextPage, debouncedSearch);
  };

  const fmtMoney = (v) => {
    const n = parseFloat(v);
    if (Number.isNaN(n)) return '—';
    return `${n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₽`;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.expensePicker}>
      <label className={styles.expensePickerLabel}>Расход *</label>
      <p className={styles.fieldHint}>
        Поиск по названию; плановая сумма подставится ниже после выбора.
      </p>
      <input
        type="search"
        className={styles.expensePickerSearch}
        placeholder="Найти по названию…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        autoComplete="off"
      />
      <div className={styles.expensePickerList} role="listbox">
        {loading && results.length === 0 && (
          <div className={styles.expensePickerMuted}>Загрузка…</div>
        )}
        {!loading && results.length === 0 && (
          <div className={styles.expensePickerMuted}>Ничего не найдено</div>
        )}
        {results.map((ex) => (
          <button
            key={ex.id}
            type="button"
            role="option"
            aria-selected={String(selectedId) === String(ex.id)}
            className={
              String(selectedId) === String(ex.id)
                ? `${styles.expensePickerOption} ${styles.expensePickerOptionActive}`
                : styles.expensePickerOption
            }
            onClick={() => onSelect(ex)}
          >
            <span className={styles.expensePickerOptionTitle}>{ex.name}</span>
            <span className={styles.expensePickerOptionMeta}>
              {fmtMoney(ex.planned_amount)} · {ex.recurrence_label || ex.recurrence_unit}
            </span>
          </button>
        ))}
      </div>
      {pagination.has_next && (
        <button
          type="button"
          className={styles.expensePickerMore}
          onClick={loadMore}
          disabled={loading}
        >
          {loading ? 'Загрузка…' : 'Загрузить ещё'}
        </button>
      )}
    </div>
  );
};

export default ExpensePicker;
