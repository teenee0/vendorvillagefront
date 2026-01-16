import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { FaArrowUp, FaArrowDown, FaCalendarAlt, FaTimes, FaFilePdf, FaUndo, FaExclamationTriangle, FaChartLine, FaReceipt, FaMoneyBillWave, FaShoppingCart, FaUndoAlt, FaTasks, FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import { FcLineChart } from "react-icons/fc";
import { Chart } from 'chart.js/auto';
import axios from '../../api/axiosDefault';
import { useFileUtils } from '../../hooks/useFileUtils';
import { useLocation } from '../../hooks/useLocation';
import styles from './BusinessMainPageMobile.module.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { motion, AnimatePresence } from 'framer-motion';
import StatCard from '../../components/StatCard/StatCard';
import AnimatedChart from '../../components/AnimatedChart/AnimatedChart';
import TransactionCard from '../../components/TransactionCard/TransactionCard';
import EmptyState from '../../components/EmptyState/EmptyState';

const customDatePickerStyles = `
  .react-datepicker {
    font-family: inherit;
    background-color: var(--obsidian-elite);
    border: 1px solid var(--gilded-shadow);
    border-radius: 12px;
    color: var(--platinum-gleam);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
  
  .react-datepicker__header {
    background-color: var(--phantom-noir);
    border-bottom: 1px solid var(--gilded-shadow);
    border-radius: 12px 12px 0 0;
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

const BusinessMainPageMobile = () => {
  const { getFileUrl } = useFileUtils();
  const { selectedLocation, getLocationParam } = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('week');
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [customDateSelected, setCustomDateSelected] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const { business_slug } = useParams();
  const navigate = useNavigate();
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = async (start, end) => {
    try {
      setLoading(true);

      const startUtc = dayjs(start)
        .tz(tz)
        .startOf('day')
        .utc()
        .format();

      const endUtc = dayjs(end)
        .tz(tz)
        .endOf('day')
        .utc()
        .format();

      const locationParams = getLocationParam();
      console.log('BusinessMainPageMobile: Location params', locationParams);
      console.log('BusinessMainPageMobile: Selected location', selectedLocation);

      const params = {
        start: startUtc,
        end: endUtc,
        tz,
        ...locationParams
      };

      console.log('BusinessMainPageMobile: Final API params', params);
      const response = await axios.get(`/api/business/${business_slug}/dashboard/`, { params });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setCustomDateSelected(false);
    
    const now = dayjs();
    let start, end;
    
    switch (newPeriod) {
      case 'today':
        start = now.startOf('day');
        end = now.endOf('day');
        break;
      case 'week':
        start = now.subtract(1, 'week').startOf('day');
        end = now.endOf('day');
        break;
      case 'month':
        start = now.subtract(1, 'month').startOf('day');
        end = now.endOf('day');
        break;
      default:
        return;
    }
    
    setDateRange([start.toDate(), end.toDate()]);
    fetchData(start.toDate(), end.toDate());
  };

  const handleCustomDateChange = (dates) => {
    const [start, end] = dates;
    setDateRange([start, end]);
    setCustomDateSelected(true);
    
    if (start && end) {
      fetchData(start, end);
    }
  };

  const createChart = () => {
    if (!data?.chart_data || !chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    const chartData = data.chart_data;

    const labels = chartData.map(item => dayjs(item.date).format('DD MMM'));
    const revenueData = chartData.map(item => parseFloat(item.revenue || 0));
    const ordersData = chartData.map(item => parseInt(item.orders || 0));
    const variantsData = chartData.map(item => parseInt(item.variants_sold || 0));
    const refundData = chartData.map(item => parseFloat(item.refund_amount || 0));
    const returnsCountData = chartData.map(item => parseInt(item.returns_count || 0));

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Доход (₸)',
            data: revenueData,
            borderColor: '#2daf9f',
            backgroundColor: 'rgba(45, 175, 159, 0.1)',
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Заказы',
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
          },
          {
            label: 'Возвраты (₸)',
            data: refundData,
            borderColor: '#ff4757',
            backgroundColor: 'rgba(255, 71, 87, 0.1)',
            borderDash: [10, 5],
            tension: 0.3,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
                family: 'inherit',
                size: 12
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
                if (context.datasetIndex === 0 || context.datasetIndex === 3) {
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
              font: { size: 10 },
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
              font: { size: 10 },
              callback: function (value) {
                return value.toLocaleString('ru-RU');
              }
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#ffffff',
              font: { size: 10 }
            }
          }
        }
      }
    });
  };

  const handleTransactionClick = useCallback(async (transaction) => {
    // Предотвращаем множественные вызовы
    if (selectedTransaction?.id === transaction.id) {
      return;
    }
    
    setSelectedTransaction(transaction);
    setModalLoading(true);
    setTransactionDetails(null);
    
    try {
      const response = await axios.get(`/api/business/${business_slug}/receipts/${transaction.id}/`);
      setTransactionDetails(response.data);
    } catch (err) {
      console.error('Ошибка загрузки деталей транзакции:', err);
    } finally {
      setModalLoading(false);
    }
  }, [business_slug, selectedTransaction?.id]);

  const closeModal = () => {
    setSelectedTransaction(null);
    setTransactionDetails(null);
  };

  const printReceipt = () => {
    if (!transactionDetails) return;
    
    const printWindow = window.open('', '_blank', 'width=580,height=400');
    const receiptHtml = `
      <html>
        <head>
          <title>Чек #${transactionDetails.number}</title>
          <style>
            body { margin: 0; width: 58mm; height: 40mm; display: flex; justify-content: center; align-items: center; font-family: 'Inter', sans-serif; font-size: 8px; }
            .receipt { text-align: center; }
            .header { font-weight: bold; margin-bottom: 10px; }
            .items { margin: 10px 0; }
            .total { font-weight: bold; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">Чек #${transactionDetails.number}</div>
            <div>Дата: ${new Date(transactionDetails.created_at).toLocaleString('ru-RU')}</div>
            <div class="items">
              ${transactionDetails.sales?.map(sale => `
                <div>${sale.variant.product_name} - ${sale.quantity}шт × ${parseFloat(sale.price_per_unit).toLocaleString('ru-RU')}₸</div>
              `).join('')}
            </div>
            <div class="total">Итого: ${parseFloat(transactionDetails.amount).toLocaleString('ru-RU')}₸</div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  useEffect(() => {
    // Ждем, пока локация будет готова
    if (selectedLocation !== undefined) {
      console.log('BusinessMainPageMobile: Location ready, selectedLocation:', selectedLocation);
      handlePeriodChange('week');
    }
  }, [selectedLocation]);

  // Дополнительный useEffect для отслеживания изменений локации
  useEffect(() => {
    if (startDate && endDate && selectedLocation !== undefined) {
      console.log('BusinessMainPageMobile: Location changed, refetching data');
      fetchData(startDate, endDate);
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (data) {
      createChart();
    }
  }, [data]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <FaExclamationTriangle className={styles.errorIcon} />
        <h3>Ошибка загрузки</h3>
        <p>{error}</p>
        <button 
          className={styles.retryButton}
          onClick={() => handlePeriodChange(period)}
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  const TransactionModal = memo(({ transaction, details, onClose, loading }) => {
    if (!transaction) return null;

    const totalDiscount = details?.sales?.reduce((sum, sale) => 
      sum + parseFloat(sale.discount_amount || 0), 0) || 0;

    return (
      <>
        <div className={styles.modalOverlay} onClick={onClose}></div>
        <div className={styles.transactionModal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2>Чек #{transaction.number}</h2>
            <button
              className={styles.cancelButton}
              onClick={onClose}
              aria-label="Отмена"
            >
              Отмена
            </button>
          </div>
          
          <div className={styles.modalContent}>
            {loading ? (
              <div className={styles.modalLoading}>
                <div className={styles.loadingSpinner}></div>
                <p>Загрузка деталей...</p>
              </div>
            ) : (
              <>
                <div className={styles.receiptInfo}>
                  <div className={styles.receiptHeader}>
                    <div className={styles.receiptNumber}>#{transaction.number}</div>
                    <div className={styles.receiptDate}>
                      {new Date(transaction.created_at).toLocaleString('ru-RU')}
                    </div>
                    <div className={styles.receiptAmount}>
                      {parseFloat(transaction.amount).toLocaleString('ru-RU')} ₸
                    </div>
                    <div className={styles.paymentMethod}>
                      {transaction.payment_method}
                    </div>
                  </div>
                </div>

                {details?.sales && (
                  <div className={styles.receiptItems}>
                    <h4>Товары:</h4>
                    {details.sales.map((sale, index) => (
                      <div key={index} className={styles.receiptItem}>
                        <div className={styles.itemHeader}>
                          <div className={styles.productImage}>
                            {sale.variant.product_images && sale.variant.product_images.length > 0 ? (
                              <img 
                                src={getFileUrl(sale.variant.product_images[0].image)} 
                                alt={sale.variant.product_name}
                                className={styles.productImg}
                                onError={(e) => {
                                  console.error('Image load error:', e.target.src);
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className={styles.noImagePlaceholder}>
                                <i className="fa fa-image"></i>
                              </div>
                            )}
                          </div>
                          <div className={styles.productInfo}>
                            <h4>{sale.variant.product_name}</h4>
                            <p className={styles.variantName}>{sale.variant.name}</p>
                            <p className={styles.sku}>SKU: {sale.variant.sku}</p>
                          </div>
                        </div>

                        {/* Атрибуты товара */}
                        {sale.variant.attributes && sale.variant.attributes.length > 0 && (
                          <div className={styles.itemAttributes}>
                            {sale.variant.attributes.map(attr => (
                              <div key={attr.id} className={styles.attribute}>
                                <span>{attr.category_attribute_name}: </span>
                                <strong>
                                  {attr.predefined_value_name || attr.custom_value || 'Не указано'}
                                </strong>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Информация о складе */}
                        {sale.variant.stocks_data && (
                          <div className={styles.stockInfo}>
                            <small>Доступно на складе: {sale.variant.stocks_data.total_available_quantity}</small>
                          </div>
                        )}

                        <div className={styles.itemPricing}>
                          <div className={styles.priceRow}>
                            <span>{sale.quantity} × </span>
                            <span className={styles.originalPrice}>
                              {parseFloat(sale.price_per_unit).toLocaleString('ru-RU')} ₸
                            </span>
                            {parseFloat(sale.discount_percent || 0) > 0 && (
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
                          
                          {/* Информация о продажах и скидках */}
                          {sale.variant.sold_quantity && (
                            <div className={styles.soldInfo}>
                              <small>Продано единиц: {sale.variant.sold_quantity}</small>
                            </div>
                          )}
                        </div>

                        {/* Возвраты если есть */}
                        {sale.returns && sale.returns.length > 0 && (
                          <div className={styles.returnsSection}>
                            <h5><FaUndo /> Возвраты по этому товару:</h5>
                            {sale.returns.map((returnItem) => (
                              <div key={returnItem.id} className={styles.returnItem}>
                                <div className={styles.returnHeader}>
                                  <span>Количество: {returnItem.quantity}</span>
                                  <span className={styles.refundAmount}>
                                    -{parseFloat(returnItem.refund_amount).toLocaleString('ru-RU')} ₸
                                  </span>
                                </div>
                                <p className={styles.returnReason}>
                                  <strong>Причина:</strong> {returnItem.reason}
                                </p>
                                <p className={styles.returnLocation}>
                                  <strong>Местоположение:</strong> {returnItem.location_name}
                                </p>
                                <p className={styles.returnDate}>
                                  {new Date(returnItem.return_date).toLocaleString('ru-RU')}
                                </p>
                                {returnItem.is_defect && (
                                  <span className={styles.defectBadge}>
                                    <FaExclamationTriangle /> Брак
                                  </span>
                                )}
                                {returnItem.created_by_name && (
                                  <p className={styles.createdBy}>
                                    Создано: {returnItem.created_by_name}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Доступно для возврата */}
                        {sale.available_to_return > 0 && (
                          <div className={styles.availableReturn}>
                            <small>Доступно для возврата: {sale.available_to_return}</small>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.receiptFooter}>
                  {totalDiscount > 0 && (
                    <div className={styles.discountTotal}>
                      Скидка: -{totalDiscount.toLocaleString('ru-RU')} ₸
                    </div>
                  )}
                  <div className={styles.totalAmount}>
                    Итого: {parseFloat(transaction.amount).toLocaleString('ru-RU')} ₸
                  </div>
                </div>

              </>
            )}
          </div>

          <div className={styles.modalActions}>
            <button 
              className={styles.closeModalButton}
              onClick={printReceipt}
            >
              <FaFilePdf /> Печать чека
            </button>
          </div>
        </div>
      </>
    );
  });

  return (
    <div className={styles.container}>
      <style>{customDatePickerStyles}</style>
      
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          <FaChartLine className={styles.titleIcon} />
          Дашборд
        </h1>
        
      </div>

      {/* Period Selector */}
      <div className={styles.periodSelector}>
        <div className={styles.periodButtons}>
          {[
            { key: 'today', label: 'Сегодня' },
            { key: 'week', label: 'Неделя' },
            { key: 'month', label: 'Месяц' }
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`${styles.periodButton} ${period === key ? styles.active : ''}`}
              onClick={() => handlePeriodChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
        
        <div className={styles.customDateContainer}>
          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={handleCustomDateChange}
            dateFormat="dd MMM yyyy"
            className={styles.dateInput}
            maxDate={new Date()}
            calendarClassName={styles.calendarWrapper}
            popperClassName={styles.datePickerPopper}
            placeholderText="Выберите период"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tabButton} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FaChartLine />
          Обзор
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'transactions' ? styles.active : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <FaReceipt />
          Транзакции
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className={styles.tabContent}
          >
            {/* Stats Cards */}
            <div className={styles.statsGrid}>
              <StatCard
                title="Общий доход"
                value={`${data?.totals?.revenue ? parseFloat(data.totals.revenue).toLocaleString('ru-RU') : '0'} ₸`}
                icon={<FaMoneyBillWave />}
                color="primary"
                delay={0}
              />

              <StatCard
                title="Всего продаж"
                value={data?.totals?.orders || 0}
                icon={<FaShoppingCart />}
                color="success"
                delay={0.1}
              />

              <StatCard
                title="Продано товаров"
                value={data?.totals?.sales_count || 0}
                icon={<FaReceipt />}
                color="warning"
                delay={0.2}
              />

              <StatCard
                title="Возвраты"
                value={data?.totals?.returns_count || 0}
                icon={<FaUndoAlt />}
                color="danger"
                delay={0.3}
              />
            </div>

            {/* Chart */}
            {console.log('BusinessMainPageMobile: Chart data', data?.chart)}
            <AnimatedChart
              data={data?.chart}
              title={
                <div className={styles.chartTitle}>
                  <FcLineChart className={styles.chartIcon} />
                  Продажи за период
                </div>
              }
              height={300}
            />

            {/* Секция задач */}
            {data?.tasks && data.tasks.length > 0 && (
              <div className={styles.tasksSection}>
                <div className={styles.tasksHeader}>
                  <h5 className={styles.tasksTitle}>
                    <FaTasks className={styles.tasksIcon} /> Актуальные задачи
                  </h5>
                  <button 
                    className={styles.viewAllTasksButton}
                    onClick={() => navigate(`/business/${business_slug}/tasks`)}
                  >
                    Все <FaArrowRight className={styles.arrowIcon} />
                  </button>
                </div>
                <div className={styles.tasksList}>
                  {data.tasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={styles.taskCard}
                      onClick={() => navigate(`/business/${business_slug}/tasks/${task.id}`)}
                    >
                      <div className={styles.taskCardHeader}>
                        <h6 className={styles.taskTitle}>{task.title}</h6>
                        <div className={styles.taskBadges}>
                          <span className={`${styles.taskBadge} ${styles[`priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`]}`}>
                            {task.priority_display}
                          </span>
                          <span className={`${styles.taskBadge} ${styles[`status${task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('_', '')}`]}`}>
                            {task.status_display}
                          </span>
                        </div>
                      </div>
                      
                      {task.progress && (
                        <div className={styles.taskProgress}>
                          <div className={styles.taskProgressInfo}>
                            <span>Прогресс</span>
                            <span className={styles.taskProgressPercentage}>
                              {task.progress.percentage}%
                            </span>
                          </div>
                          <div className={styles.taskProgressBar}>
                            <div 
                              className={styles.taskProgressBarFill}
                              style={{ width: `${task.progress.percentage}%` }}
                            ></div>
                          </div>
                          <div className={styles.taskProgressStats}>
                            {task.progress.completed} из {task.progress.total} пунктов
                          </div>
                        </div>
                      )}

                      <div className={styles.taskMeta}>
                        {task.assignees && task.assignees.length > 0 && (
                          <div className={styles.taskAssignees}>
                            <FaCheckCircle className={styles.taskMetaIcon} />
                            <span>
                              {task.assignees.map(a => a.name).join(', ')}
                            </span>
                          </div>
                        )}
                        {task.due_date && (
                          <div className={styles.taskDueDate}>
                            <FaCalendarAlt className={styles.taskMetaIcon} />
                            <span>
                              {dayjs(task.due_date).format('DD.MM.YYYY')}
                            </span>
                          </div>
                        )}
                        {task.location_name && (
                          <div className={styles.taskLocation}>
                            <span>{task.location_name}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'transactions' && (
          <motion.div
            key="transactions"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className={styles.tabContent}
          >
            <div className={styles.transactionsList}>
              <h5 className={styles.sectionTitle}>
                <FaReceipt className={styles.sectionIcon} />
                Последние транзакции
              </h5>
              
              {data?.transactions?.slice(0, 10).map((transaction, index) => (
                <TransactionCard
                  key={transaction.id || index}
                  transaction={transaction}
                  onClick={() => handleTransactionClick(transaction)}
                  delay={index * 0.1}
                />
              ))}
              
              {data?.transactions?.length === 0 && (
                <EmptyState
                  icon={<FaReceipt />}
                  title="Транзакций не найдено"
                  description="За выбранный период транзакций не было совершено. Попробуйте изменить период или проверить настройки."
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction Modal */}
      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          details={transactionDetails}
          onClose={closeModal}
          loading={modalLoading}
        />
      )}
    </div>
  );
};

export default BusinessMainPageMobile;

