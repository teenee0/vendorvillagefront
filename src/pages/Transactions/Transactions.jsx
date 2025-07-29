import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import {
  FaSearch,
  FaTrashAlt,
  FaPrint,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaFilePdf
} from 'react-icons/fa';
import { openReceiptPdf, printReceiptPdf } from '../../utils/printUtils';
import styles from './TransactionsPage.module.css';

const TransactionsPage = () => {
  const { business_slug } = useParams();
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
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
  

  // Печать чека
  const printReceipt = async (pdfUrl) => {
  await printReceiptPdf(pdfUrl);
};

  // Поиск
  const handleSearch = (e) => {
    e.preventDefault();
    fetchReceipts(1);
  };

  // Пагинация
  const handlePageChange = (page) => {
    fetchReceipts(page);
  };

  useEffect(() => {
    fetchReceipts();
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

      <div className={styles.content}>
        {/* Основной список чеков */}
        {!selectedReceipt && (
          <>
            <div className={styles.searchBar}>
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Поиск по номеру чека..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit">
                  <FaSearch />
                </button>
              </form>
            </div>

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
          </>
        )}

        {/* Детали чека */}
        {selectedReceipt && (
          <div className={styles.receiptDetails}>
            <button
              className={styles.backButton}
              onClick={() => setSelectedReceipt(null)}
            >
              <FaChevronLeft /> Назад к списку
            </button>

            <div className={styles.receiptHeader}>
              <h2>Чек № {selectedReceipt.number}</h2>
              <div className={styles.receiptMeta}>
                <span>Дата: {new Date(selectedReceipt.created_at).toLocaleString()}</span>
                <span>Сумма: {parseFloat(selectedReceipt.total_amount).toLocaleString()} ₸</span>
                <span>Оплата: {selectedReceipt.payment_method}</span>
                {selectedReceipt.discount_amount > 0 && (
                  <span>Скидка: {selectedReceipt.discount_amount} ₸</span>
                )}
                {selectedReceipt.discount_percent > 0 && (
                  <span>Скидка: {selectedReceipt.discount_percent}%</span>
                )}
              </div>
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
              <table>
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

            {selectedReceipt.customer_name || selectedReceipt.customer_phone ? (
              <div className={styles.customerInfo}>
                <h3>Информация о клиенте:</h3>
                {selectedReceipt.customer_name && (
                  <p><strong>Имя:</strong> {selectedReceipt.customer_name}</p>
                )}
                {selectedReceipt.customer_phone && (
                  <p><strong>Телефон:</strong> {selectedReceipt.customer_phone}</p>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;