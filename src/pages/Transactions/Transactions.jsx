import React, { useState, useEffect, useRef } from 'react';
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
  FaCalendarAlt,
  FaExchangeAlt,
  FaChevronDown,
  FaChevronUp,
  FaFileExcel,
  FaCaretDown
} from 'react-icons/fa';
import ModalCloseButton from '../../components/ModalCloseButton/ModalCloseButton';
import { DatePicker, ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { openReceiptPdf, printReceiptPdf } from '../../utils/printUtils';
import styles from './TransactionsPage.module.css';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/ru';
import Loader from '../../components/Loader';
import { useFileUtils } from '../../hooks/useFileUtils';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('ru');

const TransactionsPage = () => {
  const { business_slug } = useParams();
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
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [locations, setLocations] = useState([]);
  const [exportParams, setExportParams] = useState({
    location: '',
    startDate: null,
    endDate: null,
  });
  const [exportLoading, setExportLoading] = useState(false);

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
  };

  const resetDateFilter = () => {
    setDateRange([null, null]);
    if (activeTab === 'receipts') {
      fetchReceipts(1);
    } else if (activeTab === 'returns') {
      fetchReturns(1);
    }
  };

  const openExportModal = () => {
    setExportModalOpen(true);
    // Сбрасываем параметры при открытии
    setExportParams({
      location: '',
      startDate: null,
      endDate: null,
    });
  };

  const closeExportModal = () => {
    setExportModalOpen(false);
  };

  const handleExportDateChange = (dates) => {
    if (dates && dates.length === 2) {
      setExportParams(prev => ({
        ...prev,
        startDate: dates[0]?.toDate() || null,
        endDate: dates[1]?.toDate() || null,
      }));
    } else {
      setExportParams(prev => ({
        ...prev,
        startDate: null,
        endDate: null,
      }));
    }
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const params = {};
      
      if (exportParams.location) {
        params.location = exportParams.location;
      }
      if (exportParams.startDate) {
        params.start = dayjs(exportParams.startDate).tz(tz).startOf('day').utc().format();
      }
      if (exportParams.endDate) {
        params.end = dayjs(exportParams.endDate).tz(tz).endOf('day').utc().format();
      }

      const response = await axios.get(
        `/api/business/${business_slug}/receipts/export-excel/`,
        { 
          params,
          responseType: 'blob' 
        }
      );

      // Создаем ссылку для скачивания файла
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Получаем имя файла из заголовка Content-Disposition
      const contentDisposition = response.headers['content-disposition'];
      let filename = `Чеки_${new Date().toISOString().split('T')[0]}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      closeExportModal();
    } catch (err) {
      console.error('Ошибка экспорта в Excel:', err);
      alert('Ошибка экспорта в Excel: ' + (err.response?.data?.detail || err.message));
    } finally {
      setExportLoading(false);
    }
  };

  const formatDisplayDate = (date) => {
    if (!date) return 'Не указано';
    return dayjs(date).tz(tz).format('DD.MM.YYYY HH:mm');
  };

  // Компонент селектора с поиском
  const SearchableLocationSelect = ({ locations, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const selectRef = useRef(null);

    // Фильтруем опции по поисковому запросу
    const filteredLocations = locations.filter(location =>
      location.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Получаем выбранную локацию
    const selectedLocation = locations.find(loc => String(loc.id) === String(value));

    // Закрываем при клике вне компонента
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (selectRef.current && !selectRef.current.contains(event.target)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (locationId) => {
      onChange(locationId);
      setIsOpen(false);
      setSearchQuery('');
    };

    return (
      <div className={styles.searchableSelect} ref={selectRef}>
        <div
          className={styles.searchableSelectTrigger}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={styles.searchableSelectValue}>
            {selectedLocation ? selectedLocation.name : 'Все локации'}
          </span>
          <FaCaretDown className={styles.searchableSelectArrow} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }} />
        </div>
        {isOpen && (
          <div className={styles.searchableSelectDropdown}>
            <div className={styles.searchableSelectSearch}>
              <FaSearch />
              <input
                type="text"
                placeholder="Поиск локации..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
            <div className={styles.searchableSelectOptions}>
              <div
                className={`${styles.searchableSelectOption} ${!value ? styles.searchableSelectOptionSelected : ''}`}
                onClick={() => handleSelect('')}
              >
                Все локации
              </div>
              {filteredLocations.length === 0 ? (
                <div className={styles.searchableSelectNoResults}>
                  Ничего не найдено
                </div>
              ) : (
                filteredLocations.map(location => (
                  <div
                    key={location.id}
                    className={`${styles.searchableSelectOption} ${String(location.id) === String(value) ? styles.searchableSelectOptionSelected : ''}`}
                    onClick={() => handleSelect(location.id)}
                  >
                    {location.name}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
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

  // Загружаем локации для модального окна экспорта
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await axios.get(`/api/business/${business_slug}/locations/`);
        setLocations(response.data);
      } catch (err) {
        console.error('Ошибка загрузки локаций:', err);
      }
    };
    if (business_slug) {
      fetchLocations();
    }
  }, [business_slug]);

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
          <span>Бизнес: {business_slug}</span>
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
              <ConfigProvider locale={ruRU}>
                <DatePicker.RangePicker
                  value={startDate && endDate ? [dayjs(startDate), dayjs(endDate)] : null}
                onChange={handleDateChange}
                  format="DD.MM.YYYY"
                className={styles.dateInput}
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                  placeholder={['Начало', 'Конец']}
                  getPopupContainer={(trigger) => trigger.parentElement}
                  popupClassName={styles.datePickerPopper}
              />
              </ConfigProvider>
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
          <button onClick={openExportModal} className={styles.exportButton}>
            <FaFileExcel /> Экспорт в Excel
          </button>
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
                      <td>
                        <strong>#{receipt.number}</strong>
                      </td>
                      <td>{new Date(receipt.created_at).toLocaleString('ru-RU', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</td>
                      <td>
                        <strong>{parseFloat(receipt.total_amount).toLocaleString('ru-RU')} ₸</strong>
                      </td>
                      <td>{receipt.payment_method || 'Не указано'}</td>
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
                      <td>
                        <strong>#{returnItem.receipt_number}</strong>
                      </td>
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
                      <td>
                        <strong>{returnItem.quantity}</strong>
                      </td>
                      <td>{new Date(returnItem.return_date).toLocaleString('ru-RU', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</td>
                      <td>{returnItem.reason || '—'}</td>
                      <td>
                        <strong>{parseFloat(returnItem.refund_amount).toLocaleString('ru-RU')} ₸</strong>
                      </td>
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
              <ModalCloseButton onClick={() => setSelectedReceipt(null)} />
            </div>
            <div className={styles.receiptDetails}>
              <div className={styles.receiptMeta}>
                <div><strong>Дата:</strong> {new Date(selectedReceipt.created_at).toLocaleString('ru-RU', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
                <div><strong>Сумма:</strong> {parseFloat(selectedReceipt.total_amount).toLocaleString('ru-RU')} ₸</div>
                <div><strong>Сумма возвращенных товаров:</strong> {parseFloat(selectedReceipt.total_returns_amount || 0).toLocaleString('ru-RU')} ₸</div>
                <div><strong>Итоговая сумма (Продажи - Возвраты):</strong> {parseFloat(selectedReceipt.profit_with_returns || 0).toLocaleString('ru-RU')} ₸</div>
                <div><strong>Оплата:</strong> {selectedReceipt.payment_method || 'Не указано'}</div>
                {selectedReceipt.discount_amount > 0 && (
                  <div><strong>Скидка (чек):</strong> {parseFloat(selectedReceipt.discount_amount).toLocaleString('ru-RU')} ₸</div>
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
                      <th>Бонусы</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReceipt?.sales?.map((sale) => (
                      <tr key={sale.id}>
                        <td>
                          <div className={styles.productInfo}>
                            {sale.variant?.product_main_image?.image && (
                              <img 
                                src={sale.variant.product_main_image.image} 
                                alt={sale.variant.product_name}
                                className={styles.productImage}
                              />
                            )}
                            <div className={styles.productDetails}>
                              <div className={styles.productName}>
                                {sale.variant?.product_name || 'Товар'}
                              </div>
                              <div className={styles.productSku}>
                                Артикул: {sale.variant?.sku || '—'}
                              </div>
                              {sale.variant?.attributes && sale.variant.attributes.length > 0 && (
                                <div className={styles.attributesContainer}>
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
                          </div>
                        </td>
                        <td>{parseFloat(sale.final_price_per_unit || sale.price_per_unit).toLocaleString('ru-RU')} ₸</td>
                        <td><strong>{sale.quantity}</strong></td>
                        <td>{sale.returned_quantity || 0}</td>
                        <td><strong>{(sale.quantity - (sale.returned_quantity || 0))}</strong></td>
                        <td><strong>{parseFloat(sale.total_price).toLocaleString('ru-RU')} ₸</strong></td>
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
                          {((sale.bonus_accrued && parseFloat(sale.bonus_accrued) > 0) || (sale.bonus_redeemed && parseFloat(sale.bonus_redeemed) > 0)) ? (
                            <div className={styles.bonusInfo}>
                              {sale.bonus_accrued && parseFloat(sale.bonus_accrued) > 0 && (
                                <div className={styles.bonusAccrued}>
                                  <span className={styles.bonusLabel}>Начислено:</span>
                                  <span className={styles.bonusValue}>+{parseFloat(sale.bonus_accrued).toFixed(2)}</span>
                                </div>
                              )}
                              {sale.bonus_redeemed && parseFloat(sale.bonus_redeemed) > 0 && (
                                <div className={styles.bonusRedeemed}>
                                  <span className={styles.bonusLabel}>Списано:</span>
                                  <span className={styles.bonusValue}>-{parseFloat(sale.bonus_redeemed).toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>-</span>
                          )}
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
                            <td>{new Date(returnItem.return_date).toLocaleString('ru-RU', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</td>
                            <td>{returnItem.reason || '—'}</td>
                            <td><strong>{parseFloat(returnItem.refund_amount).toLocaleString('ru-RU')} ₸</strong></td>
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
      {/* Модальное окно экспорта */}
      {exportModalOpen && (
        <div className={styles.modalOverlay} onClick={closeExportModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Экспорт чеков в Excel</h2>
              <ModalCloseButton onClick={closeExportModal} />
            </div>
            <div className={styles.modalBody}>
              <div className={styles.exportForm}>
                <div className={styles.formGroup}>
                  <label>Локация:</label>
                  <SearchableLocationSelect
                    locations={locations}
                    value={exportParams.location}
                    onChange={(locationId) => setExportParams(prev => ({ ...prev, location: locationId }))}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Период:</label>
                  <ConfigProvider locale={ruRU}>
                    <DatePicker.RangePicker
                      value={
                        exportParams.startDate && exportParams.endDate
                          ? [dayjs(exportParams.startDate), dayjs(exportParams.endDate)]
                          : null
                      }
                      onChange={handleExportDateChange}
                      format="DD.MM.YYYY"
                      className={styles.dateInput}
                      disabledDate={(current) => current && current > dayjs().endOf('day')}
                      placeholder={['Начало', 'Конец']}
                      getPopupContainer={(trigger) => trigger.parentElement}
                    />
                  </ConfigProvider>
                </div>

                <div className={styles.modalActions}>
                  <button
                    onClick={handleExport}
                    disabled={exportLoading}
                    className={styles.exportSubmitButton}
                  >
                    {exportLoading ? 'Экспорт...' : 'Экспортировать'}
                  </button>
                  <button
                    onClick={closeExportModal}
                    className={styles.cancelButton}
                    disabled={exportLoading}
                  >
                    Отмена
                  </button>
                </div>
              </div>
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
              <ModalCloseButton onClick={closeReturnModal} />
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