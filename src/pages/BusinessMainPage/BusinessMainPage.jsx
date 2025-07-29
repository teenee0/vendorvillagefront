import { useState, useEffect, useRef } from 'react';
import { FaArrowUp, FaArrowDown, FaCalendarAlt, FaTimes, FaFilePdf } from 'react-icons/fa';
import { FcLineChart } from "react-icons/fc";
import { Chart } from 'chart.js/auto';
import axios from '../../api/axiosDefault';
import styles from './BusinessMainPage.module.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

const customDatePickerStyles = `
  .react-datepicker {
    font-family: inherit;
    background-color: var(--obsidian-elite);
    border: 1px solid var(--gilded-shadow);
    border-radius: 8px;
    color: var(--platinum-gleam);
  }
  
  .react-datepicker__header {
    background-color: var(--phantom-noir);
    border-bottom: 1px solid var(--gilded-shadow);
  }
  
  .react-datepicker__current-month,
  .react-datepicker__day-name {
    color: var(--platinum-gleam);
  }
  
  .react-datepicker__day {
    color: var(--platinum-gleam);
    &:hover {
      background-color: var(--gilded-shadow);
    }
  }
  
  .react-datepicker__day--selected {
    background-color: var(--royal-emerald);
    color: white;
  }
  
  .react-datepicker__day--keyboard-selected {
    background-color: var(--royal-emerald);
    color: white;
  }
  
  .react-datepicker__navigation-icon::before {
    border-color: var(--platinum-gleam);
  }
`;
dayjs.extend(utc);
dayjs.extend(timezone);
const BusinessMainPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('week');
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [customDateSelected, setCustomDateSelected] = useState(false);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const { business_slug } = useParams();
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = async (start, end) => {
    try {
      setLoading(true);

      // Преобразуем даты в начало и конец дня в указанной временной зоне
      const startUtc = dayjs(start)
        .tz(tz)
        .startOf('day') // Начало дня в локальном времени
        .utc()
        .format();

      const endUtc = dayjs(end)
        .tz(tz)
        .endOf('day') // Конец дня в локальном времени
        .utc()
        .format();

      const params = {
        start: startUtc,
        end: endUtc,
        tz
      };

      // console.log('Запрос к API с параметрами:', params); // Для отладки

      const response = await axios.get(
        `/api/business/${business_slug}/dashboard/`,
        { params }
      );

      setData(response.data);
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const end = dayjs().tz(tz).toDate();
    const start = dayjs()
      .tz(tz)
      .subtract(period === 'week' ? 7 : 30, 'day')
      .toDate();
    setDateRange([start, end]);
    setCustomDateSelected(false);
  }, [period, tz]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData(startDate, endDate);
    }
  }, [startDate, endDate, business_slug]);

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setDateRange([start, end]);
    setCustomDateSelected(!!start && !!end);

    if (start && end) {
      fetchData(start, end);
    }
  };

  const getReportTitle = () => {
    if (customDateSelected && startDate && endDate) {
      const formatDate = (date) => {
        return date.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      };
      return `Отчет за период: ${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    return `Отчет за ${period === 'week' ? 'неделю' : 'месяц'}`;
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setCustomDateSelected(false);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (newPeriod === 'week' ? 7 : 30));
    setDateRange([start, end]);
  };

  useEffect(() => {
    if (!chartRef.current || !data) return;

    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const chartLabels = data.chart.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    });

    // Подготовка данных для графиков
    const salesData = data.chart.map(item => parseFloat(item.amount));
    const ordersData = data.chart.map(item => item.orders || 0);
    const variantsData = data.chart.map(item => item.variants || 0);

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: 'Продажи (₸)',
            data: salesData,
            borderColor: '#2daf9f',
            backgroundColor: 'rgba(45, 175, 159, 0.1)',
            tension: 0.3,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'Количество операций',
            data: ordersData,
            borderColor: '#ff9f40',
            backgroundColor: 'rgba(255, 159, 64, 0.1)',
            borderDash: [5, 5],
            tension: 0.3,
            yAxisID: 'y1'
          },
          {
            label: 'Проданные товары',
            data: variantsData,
            borderColor: '#9966ff',
            backgroundColor: 'rgba(153, 102, 255, 0.1)',
            borderDash: [5, 5],
            tension: 0.3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#ffffff',
              font: {
                family: 'inherit'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.datasetIndex === 0) {
                  label += context.parsed.y.toLocaleString('ru-RU') + ' ₸';
                } else {
                  label += context.parsed.y.toLocaleString('ru-RU');
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            beginAtZero: true,
            ticks: {
              color: '#2daf9f',
              callback: function (value) {
                return value.toLocaleString('ru-RU') + ' ₸';
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            beginAtZero: true,
            ticks: {
              color: '#ff9f40',
              callback: function (value) {
                return value.toLocaleString('ru-RU');
              }
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#ffffff'
            }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  if (loading) return <div className={styles.loading}>Загрузка данных...</div>;
  if (error) return <div className={styles.error}>Ошибка: {error}</div>;

  // транзакции

  const fetchTransactionDetails = async (receiptNumber) => {
    try {
      setModalLoading(true);
      const response = await axios.get(
        `/api/business/${business_slug}/receipts/${receiptNumber}/`
      );
      setTransactionDetails(response.data);
    } catch (err) {
      console.error('Ошибка при загрузке деталей:', err);
      setError('Не удалось загрузить детали транзакции');
    } finally {
      setModalLoading(false);
    }
  };

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    fetchTransactionDetails(transaction.id);
  };

  // Закрытие модального окна
  const closeModal = () => {
    setSelectedTransaction(null);
    setTransactionDetails(null);
  };

  const getFileUrl = (imagePath) => {
        if (!imagePath) return '';
        if (/^https?:\/\//i.test(imagePath)) return imagePath;
        if (imagePath.startsWith('/media/')) return `http://localhost:8000${imagePath}`;
        if (!imagePath.startsWith('/')) return `http://localhost:8000/media/${imagePath}`;
        return `http://localhost:8000${imagePath}`;
    };


  const TransactionModal = ({ transaction, details, onClose, loading }) => {
    if (!transaction) return null;

    const formattedDate = new Date(transaction.created_at).toLocaleString('ru-RU');
    const totalDiscount = parseFloat(details?.discount_amount) ||
      (parseFloat(details?.total_amount) *
        (parseFloat(details?.discount_percent) / 100));

    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>

          <div className={styles.receiptHeader}>
            <h3>Чек #{transaction.number}</h3>
            <div className={styles.receiptMeta}>
              <span>{formattedDate}</span>
              <span className={styles.paymentMethod}>
                {transaction.payment_method}
              </span>
            </div>
          </div>

          {loading ? (
            <div className={styles.modalLoading}>Загрузка деталей...</div>
          ) : (
            <>
              <div className={styles.itemsList}>
                {details?.sales?.map((sale) => (
                  <div key={sale.id} className={styles.itemCard}>
                    {sale.variant.product_images?.length > 0 && (
                      <div className={styles.itemImage}>
                        <img
                          src={getFileUrl(sale.variant.product_images[0].image)}
                          alt={sale.variant.product_name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder-product.png';
                          }}
                        />
                      </div>
                    )}
                    <div className={styles.itemInfo}>
                      <h4>{sale.variant.product_name}</h4>
                      <div className={styles.itemAttributes}>
                        {sale.variant.attributes.map(attr => (
                          <div key={attr.id} className={styles.attribute}>
                            <span>{attr.category_attribute_name}: </span>
                            <strong>{attr.predefined_value_name || attr.custom_value}</strong>
                          </div>
                        ))}
                      </div>
                      <div className={styles.itemPricing}>
                        <div className={styles.priceRow}>
                          <span>{sale.quantity} × </span>
                          <span className={styles.originalPrice}>
                            {parseFloat(sale.price_per_unit).toLocaleString('ru-RU')} ₸
                          </span>
                          {sale.discount_percent > 0 && (
                            <>
                              <span className={styles.discountBadge}>
                                -{sale.discount_percent}%
                              </span>
                              <span className={styles.finalPrice}>
                                {parseFloat(sale.total_price).toLocaleString('ru-RU')} ₸
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.receiptFooter}>
                {totalDiscount > 0 && (
                  <div className={styles.discountInfo}>
                    <span>Скидка:</span>
                    <span className={styles.discountAmount}>
                      -{totalDiscount.toLocaleString('ru-RU')} ₸
                      {details.discount_percent > 0 && ` (${details.discount_percent}%)`}
                    </span>
                  </div>
                )}

                <div className={styles.totalRow}>
                  <span>Итого:</span>
                  <span className={styles.totalAmount}>
                    {parseFloat(details?.total_amount).toLocaleString('ru-RU')} ₸
                  </span>
                </div>

                <div className={styles.actionButtons}>
                  <a
                    href={getFileUrl(transactionDetails.receipt_pdf_file)}
                    className={styles.downloadButton}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaFilePdf /> Скачать PDF
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.app}>
      <style>{customDatePickerStyles}</style>
      <main className={styles.mainContent}>
        <div className={styles.headerWithControls}>
          <h3 className={styles.pageTitle}>
            <FcLineChart className={styles.icon} /> {getReportTitle()}
          </h3>

          <div className={styles.periodControls}>
            <button
              className={`${styles.periodButton} ${period === 'week' && !customDateSelected ? styles.active : ''}`}
              onClick={() => handlePeriodChange('week')}
            >
              Неделя
            </button>
            <button
              className={`${styles.periodButton} ${period === 'month' && !customDateSelected ? styles.active : ''}`}
              onClick={() => handlePeriodChange('month')}
            >
              Месяц
            </button>

            <div className={styles.dateRangePicker}>
              <FaCalendarAlt className={styles.calendarIcon} />
              <DatePicker
                selectsRange
                startDate={startDate}
                endDate={endDate}
                onChange={handleDateChange}
                dateFormat="dd MMM yyyy"
                className={styles.dateInput}
                maxDate={new Date()}
                calendarClassName={styles.calendarWrapper}
                popperClassName={styles.datePickerPopper}
                placeholderText="Выберите период"
              />
            </div>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.success}`}>
            <h6>Общий доход</h6>
            <h3>{data?.totals?.revenue ? parseFloat(data.totals.revenue).toLocaleString('ru-RU') : '0'} ₸</h3>
          </div>

          <div className={`${styles.statCard} ${styles.warning}`}>
            <h6>Продано товаров</h6>
            <h3>{data?.totals?.sales_count || 0}</h3>
          </div>

          <div className={`${styles.statCard} ${styles.success}`}>
            <h6>Всего продаж</h6>
            <h3>{data?.totals?.orders || 0}</h3>

          </div>

          <div className={`${styles.statCard} ${styles.danger}`}>
            <h6>Возвраты</h6>
            <h3>пока что не работает</h3>
          </div>
        </div>

        <div className={styles.contentRow}>
          <div className={styles.chartContainer}>
            <h5>Продажи за период</h5>
            <canvas ref={chartRef} height="250"></canvas>
          </div>

          <div className={styles.transactionList}>
            {data?.transactions?.slice(0, 5).map((transaction, index) => (
              <div
                key={index}
                className={styles.transactionItem}
                onClick={() => handleTransactionClick(transaction)}
              >
                <div className={styles.transactionHeader}>
                  <span>#{transaction.number}</span>
                  <span className={transaction.is_refund ? styles.danger : styles.success}>
                    {transaction.is_refund ? '-' : '+'}₸{parseFloat(transaction.amount).toLocaleString('ru-RU')}
                  </span>
                </div>
                <small>
                  {new Date(transaction.created_at).toLocaleString('ru-RU')}
                </small>
              </div>
            ))}
          </div>

          {/* Модальное окно деталей транзакции */}
          <TransactionModal
            transaction={selectedTransaction}
            details={transactionDetails}
            onClose={closeModal}
            loading={modalLoading}
          />
        </div>
      </main>
    </div>
  );
};

export default BusinessMainPage;