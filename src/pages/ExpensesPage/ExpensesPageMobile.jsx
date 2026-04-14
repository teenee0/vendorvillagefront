import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import {
  FaWallet,
  FaPlus,
  FaTags,
  FaList,
  FaCalendarCheck,
  FaChartPie,
  FaChevronLeft,
  FaChevronRight,
  FaEdit,
  FaTrashAlt,
  FaCheck,
  FaFilter,
  FaUpload,
  FaEye,
} from 'react-icons/fa';
import styles from './ExpensesPageMobile.module.css';
import Loader from '../../components/Loader/Loader';
import PaymentStatusBadge from '../../components/ExpenseComponents/PaymentStatusBadge';
import ExpenseCategoryModal from '../../components/ExpenseComponents/ExpenseCategoryModal';
import ExpenseCategoriesListModal from '../../components/ExpenseComponents/ExpenseCategoriesListModal';
import ExpenseFormModal from '../../components/ExpenseComponents/ExpenseFormModal';
import ExpensePicker from '../../components/ExpenseComponents/ExpensePicker';
import ExpenseDateRangePresets from '../../components/ExpenseComponents/ExpenseDateRangePresets';
import ExpenseSummaryDashboard from '../../components/ExpenseComponents/ExpenseSummaryDashboard';
import ModalCloseButton from '../../components/ModalCloseButton/ModalCloseButton';

const ExpensesPageMobile = () => {
  const { business_slug } = useParams();
  const [activeTab, setActiveTab] = useState('expenses');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [summary, setSummary] = useState(null);

  const [expPagination, setExpPagination] = useState({ page: 1, total_pages: 1, has_next: false, has_previous: false });
  const [payPagination, setPayPagination] = useState({ page: 1, total_pages: 1, has_next: false, has_previous: false });

  const [expFilters, setExpFilters] = useState({ is_active: 'true' });
  const [payFilters, setPayFilters] = useState({});
  const [summaryRange, setSummaryRange] = useState({ start_date: '', end_date: '' });

  const [categoryModal, setCategoryModal] = useState({ open: false, category: null });
  const [categoriesListOpen, setCategoriesListOpen] = useState(false);
  const [expenseModal, setExpenseModal] = useState({ open: false, expense: null });
  const [payModal, setPayModal] = useState({ open: false, payment: null, actual_amount: '', file: null });
  const [addPayModal, setAddPayModal] = useState({ open: false, expense: '', period_start: '', period_end: '', planned_amount: '', status: 'planned' });
  const [addPayPickerKey, setAddPayPickerKey] = useState(0);
  const [viewPaymentModal, setViewPaymentModal] = useState({ open: false, payment: null });

  // ── Fetch ─────────────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await axios.get(`api/business/${business_slug}/expense-categories/`);
      setCategories(data);
    } catch { /* ignore */ }
  }, [business_slug]);

  const fetchLocations = useCallback(async () => {
    try {
      const { data } = await axios.get(`api/business/${business_slug}/locations/`);
      setLocations(Array.isArray(data) ? data : data.results || []);
    } catch { /* ignore */ }
  }, [business_slug]);

  const fetchExpenses = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, ...expFilters };
      const { data } = await axios.get(`api/business/${business_slug}/expenses/`, { params });
      setExpenses(data.results || []);
      setExpPagination({ ...data.pagination, page });
    } catch {
      setError('Не удалось загрузить расходы.');
    } finally {
      setLoading(false);
    }
  }, [business_slug, expFilters]);

  const fetchPayments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, ...payFilters };
      const { data } = await axios.get(`api/business/${business_slug}/expense-payments/`, { params });
      setPayments(data.results || []);
      setPayPagination({ ...data.pagination, page });
    } catch {
      setError('Не удалось загрузить платежи.');
    } finally {
      setLoading(false);
    }
  }, [business_slug, payFilters]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`api/business/${business_slug}/expenses/summary/`, { params: summaryRange });
      setSummary(data);
    } catch {
      setError('Не удалось загрузить сводку.');
    } finally {
      setLoading(false);
    }
  }, [business_slug, summaryRange]);

  useEffect(() => { fetchCategories(); fetchLocations(); }, [fetchCategories, fetchLocations]);
  useEffect(() => { if (activeTab === 'expenses') fetchExpenses(1); }, [activeTab, fetchExpenses]);
  useEffect(() => { if (activeTab === 'payments') fetchPayments(1); }, [activeTab, fetchPayments]);
  useEffect(() => { if (activeTab === 'summary') fetchSummary(); }, [activeTab, fetchSummary]);

  // ── Handlers ──────────────────────────────────────────────

  const handleSaveCategory = async (payload) => {
    try {
      if (categoryModal.category) {
        await axios.patch(`api/business/${business_slug}/expense-categories/${categoryModal.category.id}/`, payload);
      } else {
        await axios.post(`api/business/${business_slug}/expense-categories/`, payload);
      }
      fetchCategories();
      setCategoryModal({ open: false, category: null });
    } catch {
      setError('Ошибка сохранения категории.');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Деактивировать категорию? Она пропадёт из списков при создании расходов.')) return;
    try {
      await axios.delete(`api/business/${business_slug}/expense-categories/${id}/`);
      fetchCategories();
    } catch {
      setError('Ошибка удаления категории.');
    }
  };

  const openCategoriesList = useCallback(() => {
    fetchCategories();
    setCategoriesListOpen(true);
  }, [fetchCategories]);

  const handleSaveExpense = async (payload) => {
    try {
      if (expenseModal.expense) {
        await axios.patch(`api/business/${business_slug}/expenses/${expenseModal.expense.id}/`, payload);
      } else {
        await axios.post(`api/business/${business_slug}/expenses/`, payload);
      }
      fetchExpenses(expPagination.page);
      setExpenseModal({ open: false, expense: null });
    } catch {
      setError('Ошибка сохранения расхода.');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Деактивировать расход?')) return;
    try {
      await axios.delete(`api/business/${business_slug}/expenses/${id}/`);
      fetchExpenses(expPagination.page);
    } catch {
      setError('Ошибка удаления расхода.');
    }
  };

  const handlePaySubmit = async () => {
    if (!payModal.payment) return;
    try {
      await axios.patch(`api/business/${business_slug}/expense-payments/${payModal.payment.id}/`, {
        status: 'paid',
        actual_amount: payModal.actual_amount || payModal.payment.planned_amount,
      });
      if (payModal.file) {
        const fd = new FormData();
        fd.append('file', payModal.file);
        await axios.post(`api/business/${business_slug}/expense-payments/${payModal.payment.id}/documents/`, fd);
      }
      fetchPayments(payPagination.page);
      setPayModal({ open: false, payment: null, actual_amount: '', file: null });
    } catch {
      setError('Ошибка оплаты.');
    }
  };

  const handleAddPayment = async () => {
    const { expense, period_start, period_end, planned_amount, status: st } = addPayModal;
    if (!expense || !period_start || !period_end || !planned_amount) return;
    try {
      await axios.post(`api/business/${business_slug}/expense-payments/`, {
        expense, period_start, period_end, planned_amount, status: st || 'planned',
      });
      fetchPayments(payPagination.page);
      setAddPayModal({ open: false, expense: '', period_start: '', period_end: '', planned_amount: '', status: 'planned' });
    } catch {
      setError('Ошибка создания платежа.');
    }
  };

  const handlePickExpenseForPayment = (ex) => {
    setAddPayModal((prev) => {
      const next = {
        ...prev,
        expense: String(ex.id),
        planned_amount: ex.planned_amount != null ? String(ex.planned_amount) : prev.planned_amount,
      };
      if (ex.recurrence_unit === 'one_time' && ex.start_date) {
        next.period_start = ex.start_date;
        next.period_end = ex.start_date;
      }
      return next;
    });
  };

  const fileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const base = (axios.defaults.baseURL || '').replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  };

  const formatAmount = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return '—';
    return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₽';
  };

  const renderPagination = (pag, onPage) => (
    <div className={styles.pagination}>
      <button disabled={!pag.has_previous} onClick={() => onPage(pag.page - 1)}><FaChevronLeft /></button>
      <span>{pag.page} / {pag.total_pages}</span>
      <button disabled={!pag.has_next} onClick={() => onPage(pag.page + 1)}><FaChevronRight /></button>
    </div>
  );

  const renderFilters = () => {
    const filters = activeTab === 'payments' ? payFilters : expFilters;
    const setFilters = activeTab === 'payments' ? setPayFilters : setExpFilters;
    const set = (field) => (e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }));

    return (
      <div className={styles.filters}>
        <div className={styles.filterPresetsSlot}>
          <ExpenseDateRangePresets filters={filters} onChange={setFilters} />
        </div>
        {activeTab === 'expenses' && (
          <div className={styles.filterGroup}>
            <label>Показать</label>
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
        {activeTab === 'expenses' && (
          <div className={styles.filterGroup}>
            <label>Периодичность</label>
            <select
              value={filters.recurrence_unit || ''}
              onChange={set('recurrence_unit')}
              aria-label="Фильтр по периодичности"
            >
              <option value="">Все</option>
              <option value="one_time">Разовый</option>
              <option value="day">Ежедневно</option>
              <option value="week">Еженедельно</option>
              <option value="month">Ежемесячно</option>
              <option value="year">Ежегодно</option>
            </select>
          </div>
        )}
        <div className={styles.filterGroup}>
          <label>Категория</label>
          <select value={filters.category || ''} onChange={set('category')}>
            <option value="">Все</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {activeTab === 'payments' && (
          <div className={styles.filterGroup}>
            <label>Статус</label>
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
          <label>Начало</label>
          <input type="date" value={filters.start_date || ''} onChange={set('start_date')} />
        </div>
        <div className={styles.filterGroup}>
          <label>Конец</label>
          <input type="date" value={filters.end_date || ''} onChange={set('end_date')} />
        </div>
      </div>
    );
  };

  // ── Tab: Expenses ─────────────────────────────────────────

  const renderExpensesTab = () => (
    <>
      <p className={styles.tabSectionHint}>
        <strong>Шаблоны</strong> расходов: сумма и периодичность. Оплаты и чеки — вкладка «Платежи».
        {' '}
        Удалённые: откройте «Фильтры» и выберите <strong>«Показать»</strong> → «Только удалённые».
      </p>
      <button className={styles.filterToggle} onClick={() => setShowFilters((v) => !v)}>
        <FaFilter /> {showFilters ? 'Скрыть фильтры' : 'Фильтры'}
      </button>
      {showFilters && renderFilters()}

      {expenses.length === 0 ? (
        <div className={styles.emptyState}>
          <FaWallet size={40} />
          <p>Расходов пока нет</p>
        </div>
      ) : (
        <div className={styles.cardList}>
          {expenses.map((exp) => (
            <div key={exp.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>
                  {exp.name}
                  {exp.is_active === false && (
                    <span style={{ marginLeft: 8, fontSize: '0.8rem', opacity: 0.75 }}>Удалён</span>
                  )}
                </span>
                {exp.next_payment_status && <PaymentStatusBadge status={exp.next_payment_status} />}
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Категория</span>
                <span className={styles.cardValue}>{exp.category_name}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Сумма</span>
                <span className={styles.cardAmount}>{formatAmount(exp.planned_amount)}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Периодичность</span>
                <span className={styles.cardValue}>{exp.recurrence_label}</span>
              </div>
              {exp.location_name && (
                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Локация</span>
                  <span className={styles.cardValue}>{exp.location_name}</span>
                </div>
              )}
              <div className={styles.cardActions}>
                <button className={`${styles.btnSmall} ${styles.btnEdit}`} onClick={() => setExpenseModal({ open: true, expense: exp })}><FaEdit /> Изменить</button>
                {exp.is_active !== false && (
                  <button className={`${styles.btnSmall} ${styles.btnDelete}`} onClick={() => handleDeleteExpense(exp.id)}><FaTrashAlt /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {renderPagination(expPagination, (p) => fetchExpenses(p))}
    </>
  );

  // ── Tab: Payments ─────────────────────────────────────────

  const renderPaymentsTab = () => (
    <>
      <p className={styles.tabSectionHint}>
        <strong>Период</strong> в карточке — за какой срок платёж (не обязательно день списания). <strong>План</strong> и <strong>факт</strong> — за этот срок.
      </p>
      <div style={{ padding: '8px 16px' }}>
        <button
          className={styles.btnPrimary}
          style={{ width: '100%' }}
          onClick={() => {
            setAddPayPickerKey((k) => k + 1);
            setAddPayModal({ open: true, expense: '', period_start: '', period_end: '', planned_amount: '', status: 'planned' });
          }}
        >
          <FaPlus /> Добавить платёж
        </button>
      </div>
      <button className={styles.filterToggle} onClick={() => setShowFilters((v) => !v)}>
        <FaFilter /> {showFilters ? 'Скрыть фильтры' : 'Фильтры'}
      </button>
      {showFilters && renderFilters()}

      {payments.length === 0 ? (
        <div className={styles.emptyState}>
          <FaCalendarCheck size={40} />
          <p>Платежей пока нет</p>
        </div>
      ) : (
        <div className={styles.cardList}>
          {payments.map((p) => (
            <div key={p.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>{p.expense_name}</span>
                <PaymentStatusBadge status={p.status} />
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Категория</span>
                <span className={styles.cardValue}>{p.category_name}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Период</span>
                <span className={styles.cardValue}>{p.period_start} — {p.period_end}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>План</span>
                <span className={styles.cardAmount}>{formatAmount(p.planned_amount)}</span>
              </div>
              {p.actual_amount && (
                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Факт</span>
                  <span className={styles.cardValue}>{formatAmount(p.actual_amount)}</span>
                </div>
              )}
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={`${styles.btnSmall} ${styles.btnEdit}`}
                  onClick={() => setViewPaymentModal({ open: true, payment: p })}
                >
                  <FaEye /> Подробнее
                </button>
                {p.status !== 'paid' && p.status !== 'cancelled' && (
                  <button
                    className={`${styles.btnSmall} ${styles.btnPay}`}
                    onClick={() => setPayModal({ open: true, payment: p, actual_amount: p.planned_amount, file: null })}
                  >
                    <FaCheck /> Оплатить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {renderPagination(payPagination, (p) => fetchPayments(p))}
    </>
  );

  // ── Tab: Summary ──────────────────────────────────────────

  const renderSummaryTab = () => {
    const maxTotal = summary?.categories?.length
      ? Math.max(...summary.categories.map((c) => parseFloat(c.total)))
      : 1;

    return (
      <>
        <p className={styles.tabSectionHint}>
          Учитываются <strong>оплаченные</strong> строки, период которых <strong>пересекается</strong> с интервалом ниже.
        </p>
        <div className={styles.summaryFilterBlock}>
          <ExpenseDateRangePresets filters={summaryRange} onChange={setSummaryRange} />
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label>Начало отчёта</label>
              <p className={styles.fieldHint}>Левая граница сводки.</p>
              <input type="date" value={summaryRange.start_date} onChange={(e) => setSummaryRange((prev) => ({ ...prev, start_date: e.target.value }))} />
            </div>
            <div className={styles.filterGroup}>
              <label>Конец отчёта</label>
              <p className={styles.fieldHint}>Правая граница отчётного окна.</p>
              <input type="date" value={summaryRange.end_date} onChange={(e) => setSummaryRange((prev) => ({ ...prev, end_date: e.target.value }))} />
            </div>
          </div>
        </div>

        {summary && (
          <>
            <div className={styles.summaryTotal}>
              <h2>{formatAmount(summary.total)}</h2>
              <p>Сумма фактических оплат за интервал</p>
            </div>

            <ExpenseSummaryDashboard summary={summary} formatAmount={formatAmount} theme="dark" />

            {summary.categories?.length > 0 ? (
              <>
                <h3 className={styles.summarySectionTitle}>Детализация по категориям</h3>
                {summary.categories.map((cat) => (
                  <div key={cat.category_id} className={styles.categoryBar}>
                    <div className={styles.categoryBarHeader}>
                      <span>{cat.category_name}</span>
                      <span className={styles.categoryBarAmount}>{formatAmount(cat.total)}</span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${(parseFloat(cat.total) / maxTotal) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className={styles.emptyState}>
                <FaChartPie size={40} />
                <p>Нет данных за период</p>
              </div>
            )}
          </>
        )}
      </>
    );
  };

  // ── Main render ───────────────────────────────────────────

  if (loading && !expenses.length && !payments.length && !summary) {
    return <Loader />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}><FaWallet /> Расходы</h1>
        <div className={styles.headerActions}>
          <button type="button" className={styles.iconBtnSecondary} onClick={openCategoriesList} title="Категории расходов" aria-label="Категории расходов">
            <FaTags />
          </button>
          <button className={styles.iconBtn} onClick={() => setExpenseModal({ open: true, expense: null })}>
            <FaPlus />
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'expenses' ? styles.tabActive : ''}`} onClick={() => { setActiveTab('expenses'); setShowFilters(false); }}>
          <FaList /> Расходы
        </button>
        <button className={`${styles.tab} ${activeTab === 'payments' ? styles.tabActive : ''}`} onClick={() => { setActiveTab('payments'); setShowFilters(false); }}>
          <FaCalendarCheck /> Платежи
        </button>
        <button className={`${styles.tab} ${activeTab === 'summary' ? styles.tabActive : ''}`} onClick={() => setActiveTab('summary')}>
          <FaChartPie /> Сводка
        </button>
      </div>

      {activeTab === 'expenses' && renderExpensesTab()}
      {activeTab === 'payments' && renderPaymentsTab()}
      {activeTab === 'summary' && renderSummaryTab()}

      <ExpenseCategoriesListModal
        isOpen={categoriesListOpen}
        onClose={() => setCategoriesListOpen(false)}
        categories={categories}
        onAdd={() => setCategoryModal({ open: true, category: null })}
        onEdit={(cat) => setCategoryModal({ open: true, category: cat })}
        onDelete={handleDeleteCategory}
        styles={styles}
      />

      <ExpenseCategoryModal
        isOpen={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, category: null })}
        onSave={handleSaveCategory}
        category={categoryModal.category}
        stacked={categoriesListOpen && categoryModal.open}
        styles={styles}
      />

      <ExpenseFormModal
        isOpen={expenseModal.open}
        onClose={() => setExpenseModal({ open: false, expense: null })}
        onSave={handleSaveExpense}
        expense={expenseModal.expense}
        categories={categories}
        locations={locations}
        styles={styles}
      />

      {payModal.open && (
        <div className={styles.modalOverlay} onClick={() => setPayModal({ open: false, payment: null, actual_amount: '', file: null })}>
          <div className={styles.payModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Оплата</h3>
              <ModalCloseButton onClick={() => setPayModal({ open: false, payment: null, actual_amount: '', file: null })} />
            </div>
            <p style={{ color: 'var(--silver-whisper)', marginBottom: 8, fontSize: 14 }}>
              {payModal.payment?.expense_name}<br />{payModal.payment?.period_start} — {payModal.payment?.period_end}
            </p>
            <p className={styles.fieldHint} style={{ marginBottom: 12 }}>
              Реально списанная сумма за этот период; можно приложить чек.
            </p>
            <div className={styles.formGroup}>
              <label>Фактическая сумма</label>
              <input
                type="number"
                step="0.01"
                value={payModal.actual_amount}
                onChange={(e) => setPayModal((prev) => ({ ...prev, actual_amount: e.target.value }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label><FaUpload /> Документ</label>
              <input type="file" onChange={(e) => setPayModal((prev) => ({ ...prev, file: e.target.files[0] || null }))} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setPayModal({ open: false, payment: null, actual_amount: '', file: null })}>
                Отмена
              </button>
              <button className={styles.btnPrimary} onClick={handlePaySubmit}>
                <FaCheck /> Оплатить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add payment modal */}
      {addPayModal.open && (
        <div className={styles.modalOverlay} onClick={() => setAddPayModal((p) => ({ ...p, open: false }))}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Новый платёж</h3>
              <ModalCloseButton onClick={() => setAddPayModal((p) => ({ ...p, open: false }))} />
            </div>
            <p className={styles.formIntro}>
              Одна оплата: срок и сумма. После выбора расхода подставится плановая сумма из шаблона.
            </p>
            <ExpensePicker
              key={addPayPickerKey}
              isOpen={addPayModal.open}
              businessSlug={business_slug}
              selectedId={addPayModal.expense}
              onSelect={handlePickExpenseForPayment}
              styles={styles}
            />
            <div className={styles.formGroup}>
              <label>Начало периода *</label>
              <p className={styles.fieldHint}>Первый день срока оплаты.</p>
              <input type="date" value={addPayModal.period_start} onChange={(e) => setAddPayModal((p) => ({ ...p, period_start: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Конец периода *</label>
              <p className={styles.fieldHint}>Последний день того же срока.</p>
              <input type="date" value={addPayModal.period_end} onChange={(e) => setAddPayModal((p) => ({ ...p, period_end: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Сумма (план) *</label>
              <p className={styles.fieldHint}>Из шаблона при выборе; можно изменить.</p>
              <input type="number" step="0.01" min="0" value={addPayModal.planned_amount} onChange={(e) => setAddPayModal((p) => ({ ...p, planned_amount: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Статус</label>
              <p className={styles.fieldHint}>Запланирован / уже оплачен.</p>
              <select value={addPayModal.status} onChange={(e) => setAddPayModal((p) => ({ ...p, status: e.target.value }))}>
                <option value="planned">Запланирован</option>
                <option value="paid">Оплачен</option>
              </select>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setAddPayModal((p) => ({ ...p, open: false }))}>Отмена</button>
              <button className={styles.btnPrimary} onClick={handleAddPayment} disabled={!addPayModal.expense || !addPayModal.period_start || !addPayModal.period_end || !addPayModal.planned_amount}>
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {viewPaymentModal.open && viewPaymentModal.payment && (
        <div className={styles.modalOverlay} onClick={() => setViewPaymentModal({ open: false, payment: null })}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Платёж</h3>
              <ModalCloseButton onClick={() => setViewPaymentModal({ open: false, payment: null })} />
            </div>
            <div className={styles.viewPaymentGrid}>
              <div><span className={styles.viewPaymentLabel}>Расход</span><p>{viewPaymentModal.payment.expense_name}</p></div>
              <div><span className={styles.viewPaymentLabel}>Категория</span><p>{viewPaymentModal.payment.category_name}</p></div>
              <div><span className={styles.viewPaymentLabel}>Период</span><p>{viewPaymentModal.payment.period_start} — {viewPaymentModal.payment.period_end}</p></div>
              <div><span className={styles.viewPaymentLabel}>План</span><p>{formatAmount(viewPaymentModal.payment.planned_amount)}</p></div>
              <div><span className={styles.viewPaymentLabel}>Факт</span><p>{viewPaymentModal.payment.actual_amount != null ? formatAmount(viewPaymentModal.payment.actual_amount) : '—'}</p></div>
              <div><span className={styles.viewPaymentLabel}>Статус</span><p><PaymentStatusBadge status={viewPaymentModal.payment.status} /></p></div>
              {viewPaymentModal.payment.paid_at && (
                <div><span className={styles.viewPaymentLabel}>Оплачен</span><p>{viewPaymentModal.payment.paid_at}</p></div>
              )}
              {viewPaymentModal.payment.note ? (
                <div className={styles.viewPaymentFullRow}>
                  <span className={styles.viewPaymentLabel}>Примечание</span>
                  <p>{viewPaymentModal.payment.note}</p>
                </div>
              ) : null}
            </div>
            {viewPaymentModal.payment.documents?.length > 0 && (
              <div className={styles.formGroup}>
                <label>Документы</label>
                <ul className={styles.docList}>
                  {viewPaymentModal.payment.documents.map((d) => (
                    <li key={d.id}>
                      <a href={fileUrl(d.file)} target="_blank" rel="noopener noreferrer">{d.original_name || 'Файл'}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setViewPaymentModal({ open: false, payment: null })}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPageMobile;
