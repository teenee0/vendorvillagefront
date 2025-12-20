import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import {
  FaSearch,
  FaPrint,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaFilePdf,
  FaReceipt,
  FaCalendarAlt,
  FaExchangeAlt,
  FaChevronDown,
  FaChevronUp,
  FaTimes
} from 'react-icons/fa';
import ModalCloseButton from '../../components/ModalCloseButton/ModalCloseButton';
import { DatePicker, ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { openReceiptPdf, printReceiptPdf } from '../../utils/printUtils';
import styles from './TransactionsMobile.module.css';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/ru';
import Loader from '../../components/Loader';
import { useFileUtils } from '../../hooks/useFileUtils';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('ru');

const TransactionsMobile = () => {
  const { business_slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getFileUrl } = useFileUtils();
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
  const [expandedAttributes, setExpandedAttributes] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

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
    if (dates && dates.length === 2) {
      setDateRange([dates[0]?.toDate() || null, dates[1]?.toDate() || null]);
    } else {
      setDateRange([null, null]);
    }
  };

  const applyDateFilter = () => {
    if (activeTab === 'receipts') {
      fetchReceipts(1);
    } else if (activeTab === 'returns') {
      fetchReturns(1);
    }
    setShowFilters(false);
  };

  const resetDateFilter = () => {
    setDateRange([null, null]);
    if (activeTab === 'receipts') {
      fetchReceipts(1);
    } else if (activeTab === 'returns') {
      fetchReturns(1);
    }
    setShowFilters(false);
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
      searchParams.delete('receipt');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  if (loading && !selectedReceipt && receipts.length === 0 && returns.length === 0) {
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
        <h1 className={styles.title}>Транзакции</h1>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'receipts' ? styles.active : ''}`}
          onClick={() => handleTabChange('receipts')}
        >
          <FaReceipt /> Чеки
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'returns' ? styles.active : ''}`}
          onClick={() => handleTabChange('returns')}
        >
          <FaExchangeAlt /> Возвраты
        </button>
      </div>

      {/* Search and Filters */}
      <div className={styles.filtersSection}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchInputGroup}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder={
                activeTab === 'returns'
                  ? 'Поиск по номеру чека или товару...'
                  : 'Поиск по номеру чека...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              Найти
            </button>
          </div>
        </form>

        <button
          className={styles.filterToggle}
          onClick={() => setShowFilters(!showFilters)}
        >
          <FaCalendarAlt /> {startDate && endDate ? 'Изменить период' : 'Выбрать период'}
        </button>

        {showFilters && (
          <div className={styles.dateFilterPanel}>
            <ConfigProvider locale={ruRU}>
              <DatePicker.RangePicker
                value={startDate && endDate ? [dayjs(startDate), dayjs(endDate)] : null}
                onChange={handleDateChange}
                format="DD.MM.YYYY"
                className={styles.dateInput}
                disabledDate={(current) => current && current > dayjs().endOf('day')}
                placeholder={['Начало', 'Конец']}
                getPopupContainer={(trigger) => trigger.parentElement}
              />
            </ConfigProvider>
            <div className={styles.dateFilterActions}>
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
            {startDate && endDate && (
              <div className={styles.dateRangeDisplay}>
                {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {error && !selectedReceipt && (
          <div className={styles.error}>Ошибка: {error}</div>
        )}

        {activeTab === 'receipts' ? (
          <div className={styles.receiptsList}>
            {loading && receipts.length === 0 ? (
              <div className={styles.loadingContainer}>
                <Loader />
              </div>
            ) : receipts.length === 0 ? (
              <div className={styles.empty}>
                <FaReceipt className={styles.emptyIcon} />
                <p>Чеки не найдены</p>
              </div>
            ) : (
              <>
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className={styles.receiptCard}
                    onClick={() => fetchReceiptDetails(receipt.id)}
                  >
                    <div className={styles.receiptCardHeader}>
                      <div className={styles.receiptNumber}>
                        <FaReceipt /> #{receipt.number}
                      </div>
                      <div className={styles.receiptAmount}>
                        {parseFloat(receipt.total_amount).toLocaleString('ru-RU')} ₸
                      </div>
                    </div>
                    <div className={styles.receiptCardMeta}>
                      <div className={styles.receiptDate}>
                        {new Date(receipt.created_at).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className={styles.receiptPayment}>
                        {receipt.payment_method || 'Не указано'}
                      </div>
                    </div>
                    <div className={styles.receiptCardFooter}>
                      <span className={`${styles.status} ${receipt.is_paid ? styles.paid : styles.unpaid}`}>
                        {receipt.is_paid ? 'Оплачен' : 'Не оплачен'}
                      </span>
                      <div className={styles.receiptActions}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            printReceiptPdf(receipt.receipt_pdf_file);
                          }}
                          className={styles.actionButton}
                        >
                          <FaPrint />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className={styles.returnsList}>
            {loading && returns.length === 0 ? (
              <div className={styles.loadingContainer}>
                <Loader />
              </div>
            ) : returns.length === 0 ? (
              <div className={styles.empty}>
                <FaExchangeAlt className={styles.emptyIcon} />
                <p>Возвраты не найдены</p>
              </div>
            ) : (
              <>
                {returns.map((returnItem) => (
                  <div key={returnItem.id} className={styles.returnCard}>
                    <div className={styles.returnCardHeader}>
                      <div className={styles.returnReceiptNumber}>
                        <FaReceipt /> Чек #{returnItem.receipt_number}
                      </div>
                      <div className={styles.returnAmount}>
                        -{parseFloat(returnItem.refund_amount).toLocaleString('ru-RU')} ₸
                      </div>
                    </div>
                    <div className={styles.returnProductInfo}>
                      <div className={styles.returnProductName}>
                        {returnItem.product_name}
                      </div>
                      <div className={styles.returnVariantName}>
                        {returnItem.variant_name}
                      </div>
                    </div>
                    <div className={styles.returnCardMeta}>
                      <div className={styles.returnMetaRow}>
                        <span className={styles.returnMetaLabel}>Количество:</span>
                        <span className={styles.returnMetaValue}>{returnItem.quantity}</span>
                      </div>
                      <div className={styles.returnMetaRow}>
                        <span className={styles.returnMetaLabel}>Дата:</span>
                        <span className={styles.returnMetaValue}>
                          {new Date(returnItem.return_date).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {returnItem.reason && (
                        <div className={styles.returnMetaRow}>
                          <span className={styles.returnMetaLabel}>Причина:</span>
                          <span className={styles.returnMetaValue}>{returnItem.reason}</span>
                        </div>
                      )}
                      <div className={styles.returnMetaRow}>
                        <span className={styles.returnMetaLabel}>Дефект:</span>
                        <span className={`${styles.defectBadge} ${returnItem.is_defect ? styles.defectYes : styles.defectNo}`}>
                          {returnItem.is_defect ? 'Да' : 'Нет'}
                        </span>
                      </div>
                      <div className={styles.returnMetaRow}>
                        <span className={styles.returnMetaLabel}>Склад:</span>
                        <span className={styles.returnMetaValue}>{returnItem.location_name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.paginationButton}
              disabled={!pagination.has_previous}
              onClick={() => handlePageChange(pagination.current_page - 1)}
            >
              <FaChevronLeft />
            </button>
            <div className={styles.paginationInfo}>
              Страница {pagination.current_page} из {pagination.total_pages}
            </div>
            <button
              className={styles.paginationButton}
              disabled={!pagination.has_next}
              onClick={() => handlePageChange(pagination.current_page + 1)}
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* Receipt Details Modal */}
      {selectedReceipt && (
        <div className={styles.modalOverlay} onClick={() => setSelectedReceipt(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Чек № {selectedReceipt.number}</h2>
              <ModalCloseButton onClick={() => setSelectedReceipt(null)} />
            </div>
            <div className={styles.modalBody}>
              <div className={styles.receiptDetails}>
                <div className={styles.receiptMeta}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Дата:</span>
                    <span className={styles.metaValue}>
                      {new Date(selectedReceipt.created_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Сумма:</span>
                    <span className={styles.metaValue}>
                      {parseFloat(selectedReceipt.total_amount).toLocaleString('ru-RU')} ₸
                    </span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Оплата:</span>
                    <span className={styles.metaValue}>
                      {selectedReceipt.payment_method || 'Не указано'}
                    </span>
                  </div>
                  {selectedReceipt.total_returns_amount > 0 && (
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Возвращено:</span>
                      <span className={styles.metaValue}>
                        {parseFloat(selectedReceipt.total_returns_amount || 0).toLocaleString('ru-RU')} ₸
                      </span>
                    </div>
                  )}
                  {selectedReceipt.profit_with_returns !== undefined && (
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Итого:</span>
                      <span className={styles.metaValue}>
                        {parseFloat(selectedReceipt.profit_with_returns || 0).toLocaleString('ru-RU')} ₸
                      </span>
                    </div>
                  )}
                  {(selectedReceipt.discount_amount > 0 || selectedReceipt.discount_percent > 0) && (
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Скидка:</span>
                      <span className={styles.metaValue}>
                        {selectedReceipt.discount_amount > 0 && `${parseFloat(selectedReceipt.discount_amount).toLocaleString('ru-RU')} ₸`}
                        {selectedReceipt.discount_amount > 0 && selectedReceipt.discount_percent > 0 && ', '}
                        {selectedReceipt.discount_percent > 0 && `${selectedReceipt.discount_percent}%`}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.receiptActions}>
                  <button
                    onClick={() => printReceiptPdf(selectedReceipt.receipt_pdf_file)}
                    className={styles.actionButtonLarge}
                  >
                    <FaPrint /> Печать чека
                  </button>
                  <button
                    onClick={() => openReceiptPdf(selectedReceipt.receipt_pdf_file)}
                    className={styles.actionButtonLarge}
                  >
                    <FaFilePdf /> Открыть PDF
                  </button>
                </div>

                <div className={styles.receiptItems}>
                  <h3 className={styles.sectionTitle}>Проданные товары:</h3>
                  {selectedReceipt?.sales?.map((sale) => (
                    <div key={sale.id} className={styles.saleItem}>
                      <div className={styles.saleItemHeader}>
                        <div className={styles.saleProductInfo}>
                          {sale.variant?.product_main_image?.image && (
                            <img
                              src={sale.variant.product_main_image.image}
                              alt={sale.variant.product_name}
                              className={styles.saleProductImage}
                            />
                          )}
                          <div className={styles.saleProductDetails}>
                            <div className={styles.saleProductName}>
                              {sale.variant?.product_name || 'Товар'}
                            </div>
                            <div className={styles.saleProductSku}>
                              Артикул: {sale.variant?.sku || '—'}
                            </div>
                          </div>
                        </div>
                        <div className={styles.saleItemPrice}>
                          {parseFloat(sale.total_price).toLocaleString('ru-RU')} ₸
                        </div>
                      </div>

                      <div className={styles.saleItemDetails}>
                        <div className={styles.saleDetailRow}>
                          <span>Цена за единицу:</span>
                          <span>{parseFloat(sale.final_price_per_unit || sale.price_per_unit).toLocaleString('ru-RU')} ₸</span>
                        </div>
                        <div className={styles.saleDetailRow}>
                          <span>Количество:</span>
                          <span><strong>{sale.quantity}</strong></span>
                        </div>
                        {sale.returned_quantity > 0 && (
                          <div className={styles.saleDetailRow}>
                            <span>Возвращено:</span>
                            <span>{sale.returned_quantity}</span>
                          </div>
                        )}
                        <div className={styles.saleDetailRow}>
                          <span>Итого:</span>
                          <span><strong>{(sale.quantity - (sale.returned_quantity || 0))}</strong></span>
                        </div>
                        {(sale.discount_amount > 0 || sale.discount_percent > 0) && (
                          <div className={styles.saleDetailRow}>
                            <span>Скидка:</span>
                            <span>
                              {sale.discount_amount > 0 && `${sale.discount_amount} ₸`}
                              {sale.discount_amount > 0 && sale.discount_percent > 0 && ', '}
                              {sale.discount_percent > 0 && `${sale.discount_percent}%`}
                              {selectedReceipt.discount_percent > 0 && ` (+${selectedReceipt.discount_percent}% на чек)`}
                            </span>
                          </div>
                        )}
                        {((sale.bonus_accrued && parseFloat(sale.bonus_accrued) > 0) || (sale.bonus_redeemed && parseFloat(sale.bonus_redeemed) > 0)) && (
                          <div className={styles.saleDetailRow}>
                            <span>Бонусы:</span>
                            <div className={styles.bonusInfo}>
                              {sale.bonus_accrued && parseFloat(sale.bonus_accrued) > 0 && (
                                <span className={styles.bonusAccrued}>
                                  +{parseFloat(sale.bonus_accrued).toFixed(2)}
                                </span>
                              )}
                              {sale.bonus_redeemed && parseFloat(sale.bonus_redeemed) > 0 && (
                                <span className={styles.bonusRedeemed}>
                                  -{parseFloat(sale.bonus_redeemed).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {sale.variant?.attributes && sale.variant.attributes.length > 0 && (
                          <div className={styles.attributesSection}>
                            <button
                              type="button"
                              className={styles.attributesToggle}
                              onClick={() => {
                                const newExpanded = new Set(expandedAttributes);
                                if (newExpanded.has(sale.id)) {
                                  newExpanded.delete(sale.id);
                                } else {
                                  newExpanded.add(sale.id);
                                }
                                setExpandedAttributes(newExpanded);
                              }}
                            >
                              {expandedAttributes.has(sale.id) ? (
                                <>
                                  <FaChevronUp /> Скрыть атрибуты
                                </>
                              ) : (
                                <>
                                  <FaChevronDown /> Показать атрибуты ({sale.variant.attributes.length})
                                </>
                              )}
                            </button>
                            {expandedAttributes.has(sale.id) && (
                              <div className={styles.productAttributes}>
                                {sale.variant.attributes.map(attr => (
                                  <div key={attr.id} className={styles.attributeItem}>
                                    <span className={styles.attributeName}>{attr.category_attribute_name}:</span>
                                    <span className={styles.attributeValue}>{attr.predefined_value_name || attr.custom_value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {sale.available_to_return > 0 && (
                        <button
                          type="button"
                          className={styles.returnButton}
                          onClick={() => openReturnModal(sale)}
                        >
                          <FaExchangeAlt /> Оформить возврат ({sale.available_to_return} шт.)
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {selectedReceipt?.sales?.some(sale => sale.returns?.length > 0) && (
                  <div className={styles.returnsHistory}>
                    <h3 className={styles.sectionTitle}>История возвратов:</h3>
                    {selectedReceipt.sales.flatMap(sale =>
                      sale.returns.map(returnItem => (
                        <div key={returnItem.id} className={styles.returnHistoryItem}>
                          <div className={styles.returnHistoryHeader}>
                            <div className={styles.returnHistoryProduct}>
                              {sale.variant.product_name}
                            </div>
                            <div className={styles.returnHistoryAmount}>
                              -{parseFloat(returnItem.refund_amount).toLocaleString('ru-RU')} ₸
                            </div>
                          </div>
                          <div className={styles.returnHistoryDetails}>
                            <div className={styles.returnHistoryRow}>
                              <span>Количество:</span>
                              <span>{returnItem.quantity}</span>
                            </div>
                            <div className={styles.returnHistoryRow}>
                              <span>Дата:</span>
                              <span>
                                {new Date(returnItem.return_date).toLocaleString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {returnItem.reason && (
                              <div className={styles.returnHistoryRow}>
                                <span>Причина:</span>
                                <span>{returnItem.reason}</span>
                              </div>
                            )}
                            <div className={styles.returnHistoryRow}>
                              <span>Дефект:</span>
                              <span className={`${styles.defectBadge} ${returnItem.is_defect ? styles.defectYes : styles.defectNo}`}>
                                {returnItem.is_defect ? 'Да' : 'Нет'}
                              </span>
                            </div>
                            <div className={styles.returnHistoryRow}>
                              <span>Склад:</span>
                              <span>{returnItem.location_name || '—'}</span>
                            </div>
                            {returnItem.created_by_name && (
                              <div className={styles.returnHistoryRow}>
                                <span>Создал:</span>
                                <span>{returnItem.created_by_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {(selectedReceipt.customer_name || selectedReceipt.customer_phone) && (
                  <div className={styles.customerInfo}>
                    <h3 className={styles.sectionTitle}>Информация о клиенте:</h3>
                    {selectedReceipt.customer_name && (
                      <div className={styles.customerRow}>
                        <span>Имя:</span>
                        <span>{selectedReceipt.customer_name}</span>
                      </div>
                    )}
                    {selectedReceipt.customer_phone && (
                      <div className={styles.customerRow}>
                        <span>Телефон:</span>
                        <span>{selectedReceipt.customer_phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModal.open && (
        <div className={styles.modalOverlay} onClick={closeReturnModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                Возврат — {returnModal.sale?.variant?.product_name || 'Товар'}
              </h2>
              <ModalCloseButton onClick={closeReturnModal} />
            </div>
            <div className={styles.modalBody}>
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
                    rows={4}
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
                <div className={styles.modalActions}>
                  <button
                    className={styles.cancelButton}
                    type="button"
                    onClick={closeReturnModal}
                    disabled={returnLoading}
                  >
                    Отмена
                  </button>
                  <button
                    className={styles.submitButton}
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
        </div>
      )}
    </div>
  );
};

export default TransactionsMobile;

