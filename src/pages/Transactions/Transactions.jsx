import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import {
  FaSearch,
  FaTrashAlt,
  FaPrint,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaFilePdf,
  FaHistory,
  FaReceipt,
  FaChevronDown,
  FaChevronUp,
  FaTimes
} from 'react-icons/fa';
import { openReceiptPdf, printReceiptPdf } from '../../utils/printUtils';
import styles from './TransactionsPage.module.css';

const TransactionsPage = () => {
  const { business_slug } = useParams();
  const [activeTab, setActiveTab] = useState('receipts');
  const [receipts, setReceipts] = useState([]);
  const [receiptsHistory, setReceiptsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    has_next: false,
    has_previous: false
  });
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  

  // Загрузка чеков
  const fetchReceipts = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (searchQuery) params.search = searchQuery;

      const response = await axios.get(
        `/api/business/${business_slug}/receipts/`,
        { params }
      );

      setReceipts(response.data.results);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка истории чеков
  const fetchReceiptsHistory = async (page = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/business/${business_slug}/receipts/history/`,
        { params: { page } }
      );
      setReceiptsHistory(response.data.results);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка деталей чека
  const fetchReceiptDetails = async (receiptId) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/business/${business_slug}/receipts/${receiptId}/`
      );
      setSelectedReceipt(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Удаление чека
  const deleteReceipt = async (receiptId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот чек?')) return;

    try {
      await axios.delete(
        `/api/business/${business_slug}/receipts/${receiptId}/`
      );
      fetchReceipts(pagination.current_page);
      setSelectedReceipt(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Переключение вкладок
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'receipts') {
      fetchReceipts();
    } else {
      fetchReceiptsHistory();
    }
  };

  // Раскрытие/скрытие истории для конкретного чека
  const toggleHistory = (receiptId) => {
    setExpandedHistoryIds(prev => 
      prev.includes(receiptId)
        ? prev.filter(id => id !== receiptId)
        : [...prev, receiptId]
    );
  };

  // Форматирование изменений
  const formatChanges = (changes) => {
    if (!changes || Object.keys(changes).length === 0) {
      return <div className={styles.noChanges}>Изменений не обнаружено</div>;
    }

    return Object.entries(changes).map(([field, values]) => {
      let fieldName;
      switch (field) {
        case 'total_amount':
          fieldName = 'Сумма';
          break;
        case 'is_deleted':
          fieldName = 'Статус удаления';
          break;
        case 'payment_method_id':
          fieldName = 'Способ оплаты';
          break;
        default:
          fieldName = field;
      }

      return (
        <div key={field} className={styles.changeItem}>
          <strong>{fieldName}:</strong> с {values.from} на {values.to}
        </div>
      );
    });
  };

  // Определение типа операции
  const getOperationType = (type) => {
    switch (type) {
      case '+':
        return 'Создание';
      case '~':
        return 'Изменение';
      case '-':
        return 'Удаление';
      default:
        return type;
    }
  };

  // Обработчик поиска
  const handleSearch = (e) => {
    e.preventDefault();
    if (activeTab === 'receipts') {
      fetchReceipts(1);
    } else {
      fetchReceiptsHistory(1);
    }
  };

  // Пагинация
  const handlePageChange = (page) => {
    if (activeTab === 'receipts') {
      fetchReceipts(page);
    } else {
      fetchReceiptsHistory(page);
    }
  };

  useEffect(() => {
    if (activeTab === 'receipts') {
      fetchReceipts();
    } else {
      fetchReceiptsHistory();
    }
  }, [business_slug]);

  if (loading && !selectedReceipt) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error) {
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
          className={`${styles.tabButton} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => handleTabChange('history')}
        >
          <FaHistory /> История изменений
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.searchBar}>
          <form onSubmit={handleSearch}>
            <input
              type="text"
              placeholder={`Поиск по номеру чека...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit">
              <FaSearch />
            </button>
          </form>
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
                            onClick={() => printReceipt(receipt.receipt_pdf_file)}
                            className={styles.printButton}
                          >
                            <FaPrint /> Печать
                          </button>
                          <button
                            onClick={() => deleteReceipt(receipt.id)}
                            className={styles.deleteButton}
                          >
                            <FaTrashAlt /> Удалить
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
          <div className={styles.historyList}>
            {receiptsHistory.length === 0 ? (
              <div className={styles.empty}>История изменений не найдена</div>
            ) : (
              <div className={styles.historyContainer}>
                {receiptsHistory.map((item) => (
                  <div key={item.receipt.id} className={styles.historyItem}>
                    <div 
                      className={styles.historyHeader}
                      onClick={() => toggleHistory(item.receipt.id)}
                    >
                      <div className={styles.historyMainInfo}>
                        <span className={styles.receiptNumber}>
                          Чек № {item.receipt.number}
                        </span>
                        <span className={styles.receiptDate}>
                          {new Date(item.receipt.created_at).toLocaleString()}
                        </span>
                        <span className={styles.receiptAmount}>
                          {parseFloat(item.receipt.total_amount).toLocaleString()} ₸
                        </span>
                        <span className={`${styles.receiptStatus} ${
                          item.history.some(h => h.is_deleted) ? styles.deleted : styles.active
                        }`}>
                          {item.receipt.is_paid ? 'Оплачен' : 'Не оплачен'} | 
                          {item.history.some(h => h.is_deleted) ? ' Удален' : ' Активен'}
                        </span>
                      </div>
                      <div className={styles.historyToggle}>
                        {expandedHistoryIds.includes(item.receipt.id) ? (
                          <>
                            <FaChevronUp /> Скрыть
                          </>
                        ) : (
                          <>
                            <FaChevronDown /> Показать
                          </>
                        )}
                      </div>
                    </div>

                    {expandedHistoryIds.includes(item.receipt.id) && (
                      <div className={styles.historyDetails}>
                        <div className={styles.historyRecords}>
                          {item.history.map((record, index) => (
                            <div key={index} className={`${styles.historyRecord} ${
                              record.is_deleted ? styles.deleted : ''
                            }`}>
                              <div className={styles.recordHeader}>
                                <span className={styles.recordType}>
                                  {getOperationType(record.type)}
                                </span>
                                <span className={styles.recordDate}>
                                  {new Date(record.date).toLocaleString()}
                                </span>
                                <span className={styles.recordUser}>
                                  Пользователь: {record.user}
                                </span>
                              </div>
                              
                              <div className={styles.recordDetails}>
                                <div className={styles.recordAmount}>
                                  Сумма: {parseFloat(record.total_amount).toLocaleString()} ₸
                                </div>
                                {record.discount_amount > 0 && (
                                  <div className={styles.recordDiscount}>
                                    Скидка: {record.discount_amount} ₸
                                  </div>
                                )}
                                {record.discount_percent > 0 && (
                                  <div className={styles.recordDiscount}>
                                    Скидка: {record.discount_percent}%
                                  </div>
                                )}
                              </div>
                              
                              <div className={styles.recordChanges}>
                                {formatChanges(record.changes)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Пагинация */}
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

      {/* Модальное окно с деталями чека */}
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
                <div><strong>Оплата:</strong> {selectedReceipt.payment_method}</div>
                {selectedReceipt.discount_amount > 0 && (
                  <div><strong>Скидка:</strong> {selectedReceipt.discount_amount} ₸</div>
                )}
                {selectedReceipt.discount_percent > 0 && (
                  <div><strong>Скидка:</strong> {selectedReceipt.discount_percent}%</div>
                )}
              </div>

              <div className={styles.receiptActions}>
                <button
                  onClick={() => printReceipt(selectedReceipt.receipt_pdf_file)}
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
                <button
                  onClick={() => deleteReceipt(selectedReceipt.id)}
                  className={styles.deleteButton}
                >
                  <FaTrashAlt /> Удалить чек
                </button>
              </div>

              <div className={styles.receiptItems}>
                <h3>Товары:</h3>
                <table className={styles.itemsTable}>
                  <thead>
                    <tr>
                      <th>Товар</th>
                      <th>Цена</th>
                      <th>Кол-во</th>
                      <th>Сумма</th>
                      <th>Скидка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReceipt.sales.map((sale) => (
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
                        <td>{parseFloat(sale.price_per_unit).toLocaleString()} ₸</td>
                        <td>{sale.quantity}</td>
                        <td>{parseFloat(sale.total_price).toLocaleString()} ₸</td>
                        <td>
                          {sale.discount_amount > 0 && `${sale.discount_amount} ₸`}
                          {sale.discount_percent > 0 && `${sale.discount_percent}%`}
                          {!sale.discount_amount && !sale.discount_percent && '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
    </div>
  );
};

export default TransactionsPage;