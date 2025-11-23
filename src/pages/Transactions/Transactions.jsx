import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import {
  FaSearch,
  FaPrint,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaFilePdf,
  FaReceipt,
  FaTimes,
  FaCalendarAlt,
  FaExchangeAlt
} from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { openReceiptPdf, printReceiptPdf } from '../../utils/printUtils';
import styles from './TransactionsPage.module.css';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Loader from '../../components/Loader';

dayjs.extend(utc);
dayjs.extend(timezone);

const TransactionsPage = () => {
  const { business_slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('receipts');
  const [receipts, setReceipts] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    has_next: false,
    has_previous: false
  });
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [returnModal, setReturnModal] = useState({
    open: false,
    sale: null,
    maxQty: 1
  });
  const [returnForm, setReturnForm] = useState({
    quantity: 1,
    reason: '',
    is_defect: false
  });
  const [returnLoading, setReturnLoading] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'receipts') {
      fetchReceipts(1);
    } else if (tab === 'returns') {
      fetchReturns(1);
    }
  };

  const fetchReceipts = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (searchQuery) params.search = searchQuery;
      if (startDate) params.start = dayjs(startDate).tz(tz).startOf('day').utc().format();
      if (endDate) params.end = dayjs(endDate).tz(tz).endOf('day').utc().format();
      const response = await axios.get(`/api/business/${business_slug}/receipts/`, { params });
      setReceipts(response.data.results);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReturns = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (searchQuery) params.search = searchQuery;
      if (startDate) params.start = dayjs(startDate).tz(tz).startOf('day').utc().format();
      if (endDate) params.end = dayjs(endDate).tz(tz).endOf('day').utc().format();
      const response = await axios.get(`/api/business/${business_slug}/returns/`, { params });
      setReturns(response.data.results);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReceiptDetails = async (receiptId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/business/${business_slug}/receipts/${receiptId}/`);
      setSelectedReceipt(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openReturnModal = async (sale) => {
    setReturnForm({
      quantity: 1,
      reason: '',
      is_defect: false
    });
    setReturnModal({
      open: true,
      sale,
      maxQty: sale.available_to_return || 1
    });
  };

  const closeReturnModal = () => {
    setReturnModal({ open: false, sale: null, maxQty: 1 });
    setError(null);
  };

  const submitReturn = async () => {
    if (!returnModal.sale?.id) {
      setError('Не найдена продажа для возврата.');
      return;
    }
    const qty = Number(returnForm.quantity);
    if (!qty || qty < 1) {
      setError('Количество должно быть не меньше 1.');
      return;
    }
    if (qty > (returnModal.maxQty || 1)) {
      setError(`Максимальное количество для возврата: ${returnModal.maxQty}.`);
      return;
    }
    setReturnLoading(true);
    try {
      const payload = {
        sale: returnModal.sale.id,
        quantity: qty,
        reason: returnForm.reason || '',
        is_defect: !!returnForm.is_defect
      };
      await axios.post(`/api/business/${business_slug}/returns/create/`, payload);
      if (activeTab !== 'returns') setActiveTab('returns');
      await fetchReturns(1);
      if (selectedReceipt) {
        await fetchReceiptDetails(selectedReceipt.id);
      }
      closeReturnModal();
      setError(null);
      alert('Возврат успешно создан.');
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e.message;
      setError(`Ошибка при создании возврата: ${msg}`);
    } finally {
      setReturnLoading(false);
    }
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setDateRange([start, end]);
  };

  const applyDateFilter = () => {
    if (activeTab === 'receipts') {
      fetchReceipts(1);
    } else if (tab === 'returns') {
      fetchReturns(1);
    }
  };

  const resetDateFilter = () => {
    setDateRange([null, null]);
    if (activeTab === 'receipts') {
      fetchReceipts(1);
    } else if (activeTab === 'returns') {
      fetchReturns(1);
    }
  };

  const formatDisplayDate = (date) => {
    if (!date) return 'Не указано';
    return dayjs(date).tz(tz).format('DD.MM.YYYY HH:mm');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (activeTab === 'receipts') {
      fetchReceipts(1);
    } else if (activeTab === 'returns') {
      fetchReturns(1);
    }
  };

  const handlePageChange = (page) => {
    if (activeTab === 'receipts') {
      fetchReceipts(page);
    } else if (activeTab === 'returns') {
      fetchReturns(page);
    }
  };

  useEffect(() => {
    if (activeTab === 'receipts') {
      fetchReceipts();
    } else if (activeTab === 'returns') {
      fetchReturns();
    }
  }, [business_slug, activeTab]);

  // Автоматически открыть чек из query параметра
  useEffect(() => {
    const receiptId = searchParams.get('receipt');
    if (receiptId && !selectedReceipt) {
      fetchReceiptDetails(parseInt(receiptId));
      // Убираем параметр из URL
      searchParams.delete('receipt');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  if (loading && !selectedReceipt) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Loader size="large" />
      </div>
    );
  }

  if (error && !selectedReceipt) {
    return <div className={styles.error}>Ошибка: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>История транзакций</h1>
        <div className={styles.businessInfo}>
          <span>{business_slug}</span>
        </div>
      </div>
      <div className={styles.tabs}>
        <button
          className={`${styles.tabButton} ${activeTab === 'receipts' ? styles.active : ''}`}
          onClick={() => handleTabChange('receipts')}
        >
          <FaReceipt /> Текущие чеки
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'returns' ? styles.active : ''}`}
          onClick={() => handleTabChange('returns')}
        >
          <FaExchangeAlt /> Возвраты
        </button>
      </div>
      <div className={styles.content}>
        <div className={styles.filters}>
          <div className={styles.searchBar}>
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder={
                  activeTab === 'returns'
                    ? 'Поиск по номеру чека или товару...'
                    : 'Поиск по номеру чека...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit">
                <FaSearch />
              </button>
            </form>
          </div>
          <div className={styles.dateFilter}>
            <div className={styles.dateRangePicker}>
              <FaCalendarAlt className={styles.calendarIcon} />
              <DatePicker
                selectsRange
                startDate={startDate}
                endDate={endDate}
                onChange={handleDateChange}
                dateFormat="dd.MM.yyyy"
                className={styles.dateInput}
                maxDate={new Date()}
                placeholderText="Выберите период"
                calendarClassName={styles.calendarWrapper}
                popperClassName={styles.datePickerPopper}
              />
              {(startDate || endDate) && (
                <div className={styles.datePickerActions}>
                  <button
                    className={styles.applyButton}
                    onClick={applyDateFilter}
                  >
                    Применить
                  </button>
                  <button
                    className={styles.resetButton}
                    onClick={resetDateFilter}
                  >
                    Сбросить
                  </button>
                </div>
              )}
            </div>
            <div className={styles.dateRangeDisplay}>
              {startDate && endDate ? (
                `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
              ) : (
                'Весь период'
              )}
            </div>
          </div>
        </div>
        {activeTab === 'receipts' ? (
          <div className={styles.receiptsList}>
            {receipts.length === 0 ? (
              <div className={styles.empty}>Чеки не найдены</div>
            ) : (
              <table className={styles.receiptsTable}>
                <thead>
                  <tr>
                    <th>Номер</th>
                    <th>Дата</th>
                    <th>Сумма</th>
                    <th>Способ оплаты</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt.id}>
                      <td>{receipt.number}</td>
                      <td>{new Date(receipt.created_at).toLocaleString()}</td>
                      <td>{parseFloat(receipt.total_amount).toLocaleString()} ₸</td>
                      <td>{receipt.payment_method}</td>
                      <td>
                        <span className={`${styles.status} ${receipt.is_paid ? styles.paid : styles.unpaid}`}>
                          {receipt.is_paid ? 'Оплачен' : 'Не оплачен'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            onClick={() => fetchReceiptDetails(receipt.id)}
                            className={styles.viewButton}
                          >
                            <FaEye /> Просмотр
                          </button>
                          <button
                            onClick={() => printReceiptPdf(receipt.receipt_pdf_file)}
                            className={styles.printButton}
                          >
                            <FaPrint /> Печать
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className={styles.returnsList}>
            {returns.length === 0 ? (
              <div className={styles.empty}>Возвраты не найдены</div>
            ) : (
              <table className={styles.returnsTable}>
                <thead>
                  <tr>
                    <th>Чек</th>
                    <th>Товар</th>
                    <th>Количество</th>
                    <th>Дата возврата</th>
                    <th>Причина</th>
                    <th>Сумма возврата</th>
                    <th>Дефект</th>
                    <th>Склад</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((returnItem) => (
                    <tr key={returnItem.id}>
                      <td>{returnItem.receipt_number}</td>
                      <td>
                        <div className={styles.productInfo}>
                          <div className={styles.productName}>
                            {returnItem.product_name}
                          </div>
                          <div className={styles.variantName}>
                            {returnItem.variant_name}
                          </div>
                        </div>
                      </td>
                      <td>{returnItem.quantity}</td>
                      <td>{new Date(returnItem.return_date).toLocaleString()}</td>
                      <td>{returnItem.reason}</td>
                      <td>{parseFloat(returnItem.refund_amount).toLocaleString()} ₸</td>
                      <td>
                        {returnItem.is_defect ? (
                          <span className={styles.defectYes}>Да</span>
                        ) : (
                          <span className={styles.defectNo}>Нет</span>
                        )}
                      </td>
                      <td>{returnItem.location_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {pagination.total_pages > 1 && (
          <div className={styles.pagination}>
            <button
              disabled={!pagination.has_previous}
              onClick={() => handlePageChange(pagination.current_page - 1)}
            >
              <FaChevronLeft />
            </button>
            {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
              let pageNum;
              if (pagination.total_pages <= 5) {
                pageNum = i + 1;
              } else if (pagination.current_page <= 3) {
                pageNum = i + 1;
              } else if (pagination.current_page >= pagination.total_pages - 2) {
                pageNum = pagination.total_pages - 4 + i;
              } else {
                pageNum = pagination.current_page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={pagination.current_page === pageNum ? styles.active : ''}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              disabled={!pagination.has_next}
              onClick={() => handlePageChange(pagination.current_page + 1)}
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>
      {selectedReceipt && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Чек № {selectedReceipt.number}</h2>
              <button
                className={styles.closeButton}
                onClick={() => setSelectedReceipt(null)}
              >
                <FaTimes />
              </button>
            </div>
            <div className={styles.receiptDetails}>
              <div className={styles.receiptMeta}>
                <div><strong>Дата:</strong> {new Date(selectedReceipt.created_at).toLocaleString()}</div>
                <div><strong>Сумма:</strong> {parseFloat(selectedReceipt.total_amount).toLocaleString()} ₸</div>
                <div><strong>Сумма возвращенных товаров:</strong> {parseFloat(selectedReceipt.total_returns_amount).toLocaleString()} ₸</div>
                <div><strong>Итоговая сумма(Продажи - Возвраты):</strong> {parseFloat(selectedReceipt.profit_with_returns).toLocaleString()} ₸</div>
                <div><strong>Оплата:</strong> {selectedReceipt.payment_method}</div>
                {selectedReceipt.discount_amount > 0 && (
                  <div><strong>Скидка (чек):</strong> {selectedReceipt.discount_amount} ₸</div>
                )}
                {selectedReceipt.discount_percent > 0 && (
                  <div><strong>Скидка (чек):</strong> {selectedReceipt.discount_percent}%</div>
                )}
              </div>
              <div className={styles.receiptActions}>
                <button
                  onClick={() => printReceiptPdf(selectedReceipt.receipt_pdf_file)}
                  className={styles.printButton}
                >
                  <FaPrint /> Печать чека
                </button>
                <button
                  onClick={() => openReceiptPdf(selectedReceipt.receipt_pdf_file)}
                  className={styles.pdfButton}
                >
                  <FaFilePdf /> Открыть PDF
                </button>
              </div>
              <div className={styles.receiptItems}>
                <h3>Проданные товары:</h3>
                <table className={styles.itemsTable}>
                  <thead>
                    <tr>
                      <th>Товар</th>
                      <th>Цена</th>
                      <th>Продано</th>
                      <th>Возвращено</th>
                      <th>Итого</th>
                      <th>Сумма</th>
                      <th>Скидка</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReceipt?.sales?.map((sale) => (
                      <tr key={sale.id}>
                        <td>
                          <div className={styles.productInfo}>
                            <div className={styles.productName}>
                              {sale.variant.product_name}
                            </div>
                            <div className={styles.productAttributes}>
                              {sale.variant.attributes.map(attr => (
                                <div key={attr.id}>
                                  <strong>{attr.category_attribute_name}:</strong> {attr.predefined_value_name || attr.custom_value}
                                </div>
                              ))}
                            </div>
                            <div className={styles.productSku}>
                              Артикул: {sale.variant.sku}
                            </div>
                          </div>
                        </td>
                        <td>{parseFloat(sale.final_price_per_unit || sale.price_per_unit).toLocaleString()} ₸</td>
                        <td>{sale.quantity}</td>
                        <td>{sale.returned_quantity || 0}</td>
                        <td>{(sale.quantity - (sale.returned_quantity || 0))}</td>
                        <td>{parseFloat(sale.total_price).toLocaleString()} ₸</td>
                        <td>
                          {(sale.discount_amount > 0 || sale.discount_percent > 0) && (
                            <div>
                              {sale.discount_amount > 0 && `${sale.discount_amount} ₸`}
                              {sale.discount_amount > 0 && sale.discount_percent > 0 && ', '}
                              {sale.discount_percent > 0 && `${sale.discount_percent}%`}
                              {selectedReceipt.discount_percent > 0 && ` (+${selectedReceipt.discount_percent}% на чек)`}
                            </div>
                          )}
                          {!(sale.discount_amount > 0 || sale.discount_percent > 0 || selectedReceipt.discount_percent > 0) && '-'}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.returnButton}
                            onClick={() => openReturnModal(sale)}
                            title="Оформить возврат"
                            disabled={sale.available_to_return === 0}
                          >
                            <FaExchangeAlt /> Возврат
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedReceipt?.sales?.some(sale => sale.returns?.length > 0) && (
                <div className={styles.returnsHistory}>
                  <h3>История возвратов:</h3>
                  <table className={styles.returnsTable}>
                    <thead>
                      <tr>
                        <th>Товар</th>
                        <th>Количество</th>
                        <th>Дата возврата</th>
                        <th>Причина</th>
                        <th>Сумма возврата</th>
                        <th>Дефект</th>
                        <th>Склад</th>
                        <th>Создал</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.sales.flatMap(sale =>
                        sale.returns.map(returnItem => (
                          <tr key={returnItem.id}>
                            <td>
                              <div className={styles.productInfo}>
                                <div className={styles.productName}>
                                  {sale.variant.product_name}
                                </div>
                                <div className={styles.variantName}>
                                  {sale.variant.name}
                                </div>
                              </div>
                            </td>
                            <td>{returnItem.quantity}</td>
                            <td>{new Date(returnItem.return_date).toLocaleString()}</td>
                            <td>{returnItem.reason || '—'}</td>
                            <td>{parseFloat(returnItem.refund_amount).toLocaleString()} ₸</td>
                            <td>
                              {returnItem.is_defect ? (
                                <span className={styles.defectYes}>Да</span>
                              ) : (
                                <span className={styles.defectNo}>Нет</span>
                              )}
                            </td>
                            <td>{returnItem.location_name || '—'}</td>
                            <td>{returnItem.created_by_name || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {(selectedReceipt.customer_name || selectedReceipt.customer_phone) && (
                <div className={styles.customerInfo}>
                  <h3>Информация о клиенте:</h3>
                  {selectedReceipt.customer_name && (
                    <div><strong>Имя:</strong> {selectedReceipt.customer_name}</div>
                  )}
                  {selectedReceipt.customer_phone && (
                    <div><strong>Телефон:</strong> {selectedReceipt.customer_phone}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {returnModal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>
                Возврат — {returnModal.sale?.variant?.product_name || 'Товар'} (продажа #{returnModal.sale?.id})
              </h2>
              <button className={styles.closeButton} onClick={closeReturnModal}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.returnForm}>
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.formRow}>
                <label>Доступно к возврату</label>
                <div className={styles.readonlyValue}>{returnModal.maxQty}</div>
              </div>
              <div className={styles.formRow}>
                <label>Количество</label>
                <input
                  type="number"
                  min={1}
                  max={returnModal.maxQty || 1}
                  value={returnForm.quantity}
                  onChange={(e) => setReturnForm(f => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className={styles.formRow}>
                <label>Причина</label>
                <textarea
                  placeholder="Не подошёл размер, выявлен дефект и т.п."
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm(f => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <div className={styles.formRowCheckbox}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={returnForm.is_defect}
                    onChange={(e) => setReturnForm(f => ({ ...f, is_defect: e.target.checked }))}
                  />
                  Дефект
                </label>
              </div>
              <div className={styles.modalActionsRight}>
                <button
                  className={styles.cancelButton}
                  type="button"
                  onClick={closeReturnModal}
                  disabled={returnLoading}
                >
                  Отмена
                </button>
                <button
                  className={styles.submitReturnButton}
                  type="button"
                  onClick={submitReturn}
                  disabled={returnLoading}
                >
                  {returnLoading ? 'Отправка...' : 'Создать возврат'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;