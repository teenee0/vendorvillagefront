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
  FaUpload,
  FaEye,
} from 'react-icons/fa';
import styles from './ExpensesPage.module.css';
import Loader from '../../components/Loader/Loader';
import PaymentStatusBadge from '../../components/ExpenseComponents/PaymentStatusBadge';
import ExpenseFilters from '../../components/ExpenseComponents/ExpenseFilters';
import ExpenseCategoryModal from '../../components/ExpenseComponents/ExpenseCategoryModal';
import ExpenseCategoriesListModal from '../../components/ExpenseComponents/ExpenseCategoriesListModal';
import ExpenseFormModal from '../../components/ExpenseComponents/ExpenseFormModal';
import ExpensePicker from '../../components/ExpenseComponents/ExpensePicker';
import ExpenseDateRangePresets from '../../components/ExpenseComponents/ExpenseDateRangePresets';
import ExpenseSummaryDashboard from '../../components/ExpenseComponents/ExpenseSummaryDashboard';
import ModalCloseButton from '../../components/ModalCloseButton/ModalCloseButton';

const ExpensesPage = () => {
  const { business_slug } = useParams();
  const [activeTab, setActiveTab] = useState('expenses');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [summary, setSummary] = useState(null);

  // Pagination
  const [expPagination, setExpPagination] = useState({ page: 1, total_pages: 1, has_next: false, has_previous: false });
  const [payPagination, setPayPagination] = useState({ page: 1, total_pages: 1, has_next: false, has_previous: false });

  // Filters
  const [expFilters, setExpFilters] = useState({ is_active: 'true' });
  const [payFilters, setPayFilters] = useState({});
  const [summaryRange, setSummaryRange] = useState({ start_date: '', end_date: '' });

  // Modals
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
    } catch (err) {
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

  // ── Render helpers ────────────────────────────────────────

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

  // ── Tab: Expenses ─────────────────────────────────────────

  const renderExpensesTab = () => (
    <>
      <p className={styles.tabSectionHint}>
        Список <strong>шаблонов</strong> расходов: сумма и периодичность. Конкретные строки оплат и чеки — во вкладке «Платежи».
        {' '}
        Удалённые шаблоны: в блоке фильтров поле <strong>«Показать»</strong> → «Только удалённые».
      </p>
      <ExpenseFilters
        categories={categories}
        locations={locations}
        filters={expFilters}
        onChange={setExpFilters}
        showStatus={false}
        showExpenseArchive
        showRecurrenceFilter
        styles={styles}
      />

      {expenses.length === 0 ? (
        <div className={styles.emptyState}>
          <FaWallet size={48} />
          <p>Расходов пока нет. Добавьте первый расход.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Название</th>
                <th>Категория</th>
                <th>Сумма</th>
                <th>Периодичность</th>
                <th>Локация</th>
                <th>Статус платежа</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id}>
                  <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                    {exp.name}
                    {exp.is_active === false && (
                      <span
                        title="Удалён"
                        style={{
                          marginLeft: 8,
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: 'var(--text-muted, #888)',
                        }}
                      >
                        Удалён
                      </span>
                    )}
                  </td>
                  <td>{exp.category_name}</td>
                  <td className={styles.amount}>{formatAmount(exp.planned_amount)}</td>
                  <td>{exp.recurrence_label}</td>
                  <td>{exp.location_name || '—'}</td>
                  <td>{exp.next_payment_status ? <PaymentStatusBadge status={exp.next_payment_status} /> : '—'}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button className={`${styles.btnSmall} ${styles.btnEdit}`} onClick={() => setExpenseModal({ open: true, expense: exp })}><FaEdit /></button>
                      {exp.is_active !== false && (
                        <button className={`${styles.btnSmall} ${styles.btnDelete}`} onClick={() => handleDeleteExpense(exp.id)}><FaTrashAlt /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {renderPagination(expPagination, (p) => fetchExpenses(p))}
    </>
  );

  // ── Tab: Payments ─────────────────────────────────────────

  const renderPaymentsTab = () => (
    <>
      <p className={styles.tabSectionHint}>
        Колонка <strong>«Период»</strong> — за какой срок этот платёж (например месяц аренды), это не обязательно день списания с карты.
        <strong> План</strong> и <strong>факт</strong> — суммы именно за этот период.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          className={styles.btnPrimary}
          onClick={() => {
            setAddPayPickerKey((k) => k + 1);
            setAddPayModal({ open: true, expense: '', period_start: '', period_end: '', planned_amount: '', status: 'planned' });
          }}
        >
          <FaPlus /> Добавить платёж
        </button>
      </div>
      <ExpenseFilters
        categories={categories}
        locations={[]}
        filters={payFilters}
        onChange={setPayFilters}
        showStatus
        styles={styles}
      />

      {payments.length === 0 ? (
        <div className={styles.emptyState}>
          <FaCalendarCheck size={48} />
          <p>Платежей пока нет.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Расход</th>
                <th>Категория</th>
                <th>Период</th>
                <th>План</th>
                <th>Факт</th>
                <th>Статус</th>
                <th>Документы</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{p.expense_name}</td>
                  <td>{p.category_name}</td>
                  <td>{p.period_start} — {p.period_end}</td>
                  <td className={styles.amount}>{formatAmount(p.planned_amount)}</td>
                  <td className={styles.amount}>{p.actual_amount ? formatAmount(p.actual_amount) : '—'}</td>
                  <td><PaymentStatusBadge status={p.status} /></td>
                  <td>{p.documents?.length || 0}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        type="button"
                        className={`${styles.btnSmall} ${styles.btnEdit}`}
                        onClick={() => setViewPaymentModal({ open: true, payment: p })}
                        title="Подробнее"
                      >
                        <FaEye />
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          Учитываются только <strong>оплаченные</strong> платежи, у которых период (в «Платежах») <strong>пересекается</strong> с выбранным интервалом ниже.
        </p>
        <div className={styles.summaryFilterBlock}>
          <ExpenseDateRangePresets filters={summaryRange} onChange={setSummaryRange} />
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label>Начало отчёта</label>
              <p className={styles.fieldHint}>Левая граница диапазона для сводки.</p>
              <input
                type="date"
                value={summaryRange.start_date}
                onChange={(e) => setSummaryRange((prev) => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div className={styles.filterGroup}>
              <label>Конец отчёта</label>
              <p className={styles.fieldHint}>Правая граница отчётного окна.</p>
              <input
                type="date"
                value={summaryRange.end_date}
                onChange={(e) => setSummaryRange((prev) => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {summary && (
          <>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryTotal}>
                <h2>{formatAmount(summary.total)}</h2>
                <p>Сумма фактических оплат (по оплаченным строкам) за выбранный отчётный интервал</p>
              </div>
            </div>

            <ExpenseSummaryDashboard summary={summary} formatAmount={formatAmount} />

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
                      <div
                        className={styles.progressFill}
                        style={{ width: `${(parseFloat(cat.total) / maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className={styles.emptyState}>
                <FaChartPie size={48} />
                <p>Нет оплаченных расходов за выбранный период.</p>
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
        <h1><FaWallet /> Расходы</h1>
        <div className={styles.headerActions}>
          <button type="button" className={styles.btnSecondary} onClick={openCategoriesList}>
            <FaTags /> Категории
          </button>
          <button className={styles.btnPrimary} onClick={() => setExpenseModal({ open: true, expense: null })}>
            <FaPlus /> Добавить расход
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'expenses' ? styles.tabActive : ''}`} onClick={() => setActiveTab('expenses')}>
          <FaList /> Расходы
        </button>
        <button className={`${styles.tab} ${activeTab === 'payments' ? styles.tabActive : ''}`} onClick={() => setActiveTab('payments')}>
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

      {/* Expense modal */}
      <ExpenseFormModal
        isOpen={expenseModal.open}
        onClose={() => setExpenseModal({ open: false, expense: null })}
        onSave={handleSaveExpense}
        expense={expenseModal.expense}
        categories={categories}
        locations={locations}
        styles={styles}
      />

      {/* Pay modal */}
      {payModal.open && (
        <div className={styles.modalOverlay} onClick={() => setPayModal({ open: false, payment: null, actual_amount: '', file: null })}>
          <div className={styles.payModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Отметить оплату</h3>
              <ModalCloseButton onClick={() => setPayModal({ open: false, payment: null, actual_amount: '', file: null })} />
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
              {payModal.payment?.expense_name} — {payModal.payment?.period_start} — {payModal.payment?.period_end}
            </p>
            <p className={styles.fieldHint} style={{ marginBottom: 14 }}>
              Укажите реально списанную сумму за этот период и при необходимости приложите чек.
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
              <label><FaUpload /> Документ (необязательно)</label>
              <input
                type="file"
                onChange={(e) => setPayModal((prev) => ({ ...prev, file: e.target.files[0] || null }))}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setPayModal({ open: false, payment: null, actual_amount: '', file: null })}>
                Отмена
              </button>
              <button className={styles.btnPrimary} onClick={handlePaySubmit}>
                <FaCheck /> Подтвердить оплату
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
              Одна строка оплаты: за какой срок она и на какую сумму. Обычно период совпадает с договором (месяц, квартал). Плановая сумма подставляется из шаблона после выбора расхода.
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
              <p className={styles.fieldHint}>Первый день срока, за который платите (например 1-е число месяца).</p>
              <input type="date" value={addPayModal.period_start} onChange={(e) => setAddPayModal((p) => ({ ...p, period_start: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Конец периода *</label>
              <p className={styles.fieldHint}>Последний день того же срока (например 30-е или последний день месяца).</p>
              <input type="date" value={addPayModal.period_end} onChange={(e) => setAddPayModal((p) => ({ ...p, period_end: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Сумма (план) *</label>
              <p className={styles.fieldHint}>Берётся из шаблона при выборе расхода; при необходимости измените.</p>
              <input type="number" step="0.01" min="0" value={addPayModal.planned_amount} onChange={(e) => setAddPayModal((p) => ({ ...p, planned_amount: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Статус</label>
              <p className={styles.fieldHint}>«Запланирован» — ещё не оплачено; «Оплачен» — сразу с фактом, если сумма известна.</p>
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

export default ExpensesPage;
