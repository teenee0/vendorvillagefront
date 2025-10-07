import React, { useEffect, useState, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import styles from './ProductPage.module.css';
import axios from '../../api/axiosDefault';
import { useParams, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaCalendarAlt } from 'react-icons/fa';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Loader from '../../components/Loader';

dayjs.extend(utc);
dayjs.extend(timezone);

const customDatePickerStyles = `
  .react-datepicker {
    font-family: 'Inter', sans-serif;
    background: var(--obsidian-elite);
    border: 1px solid var(--gilded-shadow);
    border-radius: var(--radius-sm);
    color: var(--platinum-gleam);
  }
  .react-datepicker__header {
    background: var(--phantom-noir);
    border-bottom: 1px solid var(--gilded-shadow);
  }
  .react-datepicker__current-month,
  .react-datepicker__day-name {
    color: var(--silver-whisper);
  }
  .react-datepicker__day {
    color: var(--platinum-gleam);
  }
  .react-datepicker__day:hover {
    background: var(--gilded-shadow);
  }
  .react-datepicker__day--selected {
    background: var(--royal-emerald);
    color: var(--platinum-gleam);
  }
  .react-datepicker__day--keyboard-selected {
    background: var(--royal-emerald);
    color: var(--platinum-gleam);
  }
  .react-datepicker__navigation-icon::before {
    border-color: var(--silver-whisper);
  }
`;

const SalesChart = ({ analytics }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const generateColorPalette = (count) => {
        const colors = [];
        const hueStep = 360 / count;
        for (let i = 0; i < count; i++) {
            const hue = (i * hueStep) % 360;
            colors.push(`hsl(${hue}, 70%, 50%)`);
        }
        return colors;
    };

    useEffect(() => {
        if (!analytics || !chartRef.current) return;

        const ctx = chartRef.current.getContext('2d');
        const variantCount = analytics.variants.length;
        const colorPalette = generateColorPalette(variantCount);

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: analytics.chart.map(item => item.date),
                datasets: analytics.variants.map((variant, index) => ({
                    label: variant.name,
                    data: analytics.chart.map(dateItem => {
                        const variantData = variant.chart.find(v => v.date === dateItem.date);
                        return variantData ? variantData.amount : 0;
                    }),
                    borderColor: colorPalette[index],
                    backgroundColor: colorPalette[index] + '33',
                    borderWidth: 2,
                    tension: 0.3,
                    pointBackgroundColor: '#ffffff',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBorderColor: colorPalette[index],
                    pointBorderWidth: 2,
                    fill: false
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: 'var(--platinum-gleam)',
                            font: { family: "'Inter', sans-serif", size: 12 },
                            padding: 10,
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: 'var(--phantom-noir)',
                        titleColor: 'var(--platinum-gleam)',
                        bodyColor: 'var(--platinum-gleam)',
                        borderColor: 'var(--gilded-shadow)',
                        borderWidth: 1,
                        padding: 12,
                        bodyFont: { size: 14 },
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.parsed.y.toLocaleString('ru-RU')} ₸`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'var(--gilded-shadow)', drawBorder: false },
                        ticks: { color: 'var(--silver-whisper)' }
                    },
                    y: {
                        grid: { color: 'var(--gilded-shadow)', drawBorder: false },
                        ticks: {
                            color: 'var(--silver-whisper)',
                            callback: function (value) {
                                return value.toLocaleString('ru-RU') + ' ₸';
                            }
                        }
                    }
                },
                interaction: { intersect: false, mode: 'index' }
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [analytics]);

    return <canvas ref={chartRef} />;
};

const SalesTab = ({ product, businessSlug }) => {
    const [salesData, setSalesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [locations, setLocations] = useState([]);
    const [filters, setFilters] = useState({
        date_from: null,
        date_to: null,
        location_id: null,
        has_returns: null,
        variant_id: null,
        sort_by: '-sale_date',
        page: 1
    });
    const tz = 'Asia/Qyzylorda';

    const fetchSalesData = async () => {
        try {
            setLoading(true);
            const params = {
                date_from: filters.date_from ? dayjs(filters.date_from).tz(tz).format('YYYY-MM-DD') : null,
                date_to: filters.date_to ? dayjs(filters.date_to).tz(tz).format('YYYY-MM-DD') : null,
                location_id: filters.location_id || null,
                has_returns: filters.has_returns,
                variant_id: filters.variant_id || null,
                sort_by: filters.sort_by,
                page: filters.page,
                page_size: 12
            };
            const response = await axios.get(
                `/api/business/${businessSlug}/products/${product.id}/sales/filtered/`,
                { params }
            );
            setSalesData(response.data);
        } catch (err) {
            console.error('Error fetching sales:', err);
            setError('Ошибка загрузки данных о продажах');
        } finally {
            setLoading(false);
        }
    };

    const fetchLocations = async () => {
        try {
            const params = {};
            if (filters.variant_id) {
                params.variant = filters.variant_id;
            } else {
                params.product = product.id;
            }
            const response = await axios.get(`/api/business/${businessSlug}/locations/`, { params });
            setLocations(response.data.results || response.data);
        } catch (err) {
            console.error('Error fetching locations:', err);
            setError('Ошибка загрузки локаций');
            setLocations([
                { id: 2, name: 'Miledi на Гагарина' },
                { id: 4, name: 'Miledi на Акана Серы' }
            ]); // Fallback from JSON
        }
    };

    useEffect(() => {
        fetchSalesData();
        fetchLocations();
    }, [filters.page, filters.date_from, filters.date_to, filters.location_id, filters.has_returns, filters.variant_id, filters.sort_by]);

    useEffect(() => {
        fetchLocations();
    }, [filters.variant_id, product.id]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        setFilters(prev => ({ ...prev, page: newPage }));
    };

    return (
        <div className={styles.salesSection}>
            <h3>Продажи</h3>
            <div className={styles.filterSection}>
                <div className={styles.filterGroup}>
                    <label>Период:</label>
                    <div className={styles.dateRangePicker}>
                        <FaCalendarAlt className={styles.calendarIcon} />
                        <DatePicker
                            selectsRange
                            startDate={filters.date_from}
                            endDate={filters.date_to}
                            onChange={([start, end]) => {
                                handleFilterChange('date_from', start);
                                handleFilterChange('date_to', end);
                            }}
                            dateFormat="dd MMM yyyy"
                            className={styles.filterInput}
                            placeholderText="Выберите период"
                            maxDate={new Date()}
                        />
                    </div>
                </div>
                <div className={styles.filterGroup}>
                    <label>Локация:</label>
                    <select
                        value={filters.location_id || ''}
                        onChange={(e) => handleFilterChange('location_id', e.target.value || null)}
                        className={styles.filterInput}
                    >
                        <option value="">Все локации</option>
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                    </select>
                </div>
                <div className={styles.filterGroup}>
                    <label>Вариант:</label>
                    <select
                        value={filters.variant_id || ''}
                        onChange={(e) => handleFilterChange('variant_id', e.target.value || null)}
                        className={styles.filterInput}
                    >
                        <option value="">Все варианты</option>
                        {product.variants.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>
                <div className={styles.filterGroup}>
                    <label>Возвраты:</label>
                    <select
                        value={filters.has_returns || ''}
                        onChange={(e) => handleFilterChange('has_returns', e.target.value || null)}
                        className={styles.filterInput}
                    >
                        <option value="">Все</option>
                        <option value="true">С возвратами</option>
                        <option value="false">Без возвратов</option>
                    </select>
                </div>
                <div className={styles.filterGroup}>
                    <label>Сортировка:</label>
                    <select
                        value={filters.sort_by}
                        onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                        className={styles.filterInput}
                    >
                        <option value="-sale_date">По дате (убыв.)</option>
                        <option value="sale_date">По дате (возр.)</option>
                        <option value="-quantity">По количеству (убыв.)</option>
                        <option value="quantity">По количеству (возр.)</option>
                        <option value="-total_price">По сумме (убыв.)</option>
                        <option value="total_price">По сумме (возр.)</option>
                    </select>
                </div>
            </div>
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                    <Loader size="medium" />
                </div>
            ) : error ? (
                <div className={styles.error}>{error}</div>
            ) : salesData ? (
                <>
                    <div className={styles.statsCard}>
                        <h4>Статистика</h4>
                        <div className={styles.statsGrid}>
                            <div className={styles.statItem}>
                                <span>Всего продаж:</span>
                                <span>{salesData.statistics.total_sales}</span>
                            </div>
                            <div className={styles.statItem}>
                                <span>Продано единиц:</span>
                                <span>{salesData.statistics.total_quantity_sold}</span>
                            </div>
                            <div className={styles.statItem}>
                                <span>Общая сумма:</span>
                                <span>{salesData.statistics.total_amount.toLocaleString('ru-RU')} ₸</span>
                            </div>
                            <div className={styles.statItem}>
                                <span>Возвратов:</span>
                                <span>{salesData.statistics.total_returns_count}</span>
                            </div>
                            <div className={styles.statItem}>
                                <span>Возвращено единиц:</span>
                                <span>{salesData.statistics.total_returned_quantity}</span>
                            </div>
                            <div className={styles.statItem}>
                                <span>Сумма возвратов:</span>
                                <span>{salesData.statistics.total_refund_amount.toLocaleString('ru-RU')} ₸</span>
                            </div>
                            <div className={styles.statItem}>
                                <span>Чистое количество:</span>
                                <span>{salesData.statistics.net_quantity_sold}</span>
                            </div>
                            <div className={styles.statItem}>
                                <span>Чистая сумма:</span>
                                <span>{salesData.statistics.net_amount.toLocaleString('ru-RU')} ₸</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.salesList}>
                        {salesData.results.map(sale => (
                            <div key={sale.id} className={styles.saleItem}>
                                <div className={styles.saleHeader}>
                                    <span>Продажа #{sale.id}</span>
                                    <span className={sale.returns.length > 0 ? styles.danger : styles.success}>
                                        {sale.final_total_price
                                            ? parseFloat(sale.final_total_price).toLocaleString('ru-RU') + ' ₸'
                                            : parseFloat(sale.total_price).toLocaleString('ru-RU') + ' ₸'}
                                        {sale.returns.length > 0 && <span className={styles.refundedBadge}> Возвраты</span>}
                                    </span>
                                </div>
                                <div className={styles.saleDetails}>
                                    <span>Дата: {new Date(sale.sale_date).toLocaleString('ru-RU')}</span>
                                    <span>Локация: {locations.find(loc => loc.id === sale.location_id)?.name || 'Неизвестная локация'}</span>
                                    <span>Количество: {sale.quantity}</span>

                                    {/* Скидка на товар (если есть) */}
                                    {parseFloat(sale.discount_percent) > 0 && (
                                        <span>Скидка: {parseFloat(sale.discount_percent).toLocaleString('ru-RU')}%</span>
                                    )}
                                    {parseFloat(sale.discount_amount) > 0 && (
                                        <span>Сумма скидки: {parseFloat(sale.discount_amount).toLocaleString('ru-RU')} ₸</span>
                                    )}

                                    {/* Скидка на чек (если есть) */}
                                    {parseFloat(sale.receipt_discount_percent) > 0 && (
                                        <span>Скидка на чек: {parseFloat(sale.receipt_discount_percent).toLocaleString('ru-RU')}%</span>
                                    )}
                                    {parseFloat(sale.receipt_discount_amount) > 0 && (
                                        <span>
                                            Скидка на чек: {parseFloat(sale.receipt_discount_amount).toLocaleString('ru-RU')} ₸
                                            {sale.receipt_discount_amount_percent && ` ~ ${parseFloat(sale.receipt_discount_amount_percent).toLocaleString('ru-RU')}%`}
                                        </span>
                                    )}
                                </div>
                                {sale.returns.length > 0 && (
                                    <div className={styles.returnsInfo}>
                                        <h5>Возвраты:</h5>
                                        {sale.returns.map(returnItem => (
                                            <div key={returnItem.id} className={styles.returnItem}>
                                                <span>Количество: {returnItem.quantity}</span>
                                                <span>Сумма: {parseFloat(returnItem.refund_amount).toLocaleString('ru-RU')} ₸</span>
                                                <span>Причина: {returnItem.reason}</span>
                                                <span>Дата: {new Date(returnItem.return_date).toLocaleString('ru-RU')}</span>
                                                <span>Склад: {returnItem.location_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className={styles.pagination}>
                        <button
                            disabled={!salesData.pagination.has_previous}
                            onClick={() => handlePageChange(salesData.pagination.current_page - 1)}
                            className={styles.pageButton}
                        >
                            Назад
                        </button>
                        <span>Страница {salesData.pagination.current_page} из {salesData.pagination.total_pages}</span>
                        <button
                            disabled={!salesData.pagination.has_next}
                            onClick={() => handlePageChange(salesData.pagination.current_page + 1)}
                            className={styles.pageButton}
                        >
                            Вперед
                        </button>
                    </div>
                </>
            ) : (
                <div className={styles.error}>Нет данных о продажах</div>
            )}
        </div>
    );
};

const ProductPage = () => {
    const { business_slug, product_id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [defectQuantity, setDefectQuantity] = useState('');
    const [defectReason, setDefectReason] = useState('');
    const [reserveQuantity, setReserveQuantity] = useState('');
    const [reserveRemoveQuantity, setReserveRemoveQuantity] = useState('');
    const [showAllDefects, setShowAllDefects] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [selectedStockIndex, setSelectedStockIndex] = useState(0);
    const [activeMainTab, setActiveMainTab] = useState('stock');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [productResponse, historyResponse, analyticsResponse] = await Promise.all([
                    axios.get(`/api/business/${business_slug}/products/${product_id}/info`),
                    axios.get(`/api/business/${business_slug}/products/${product_id}/full-history/`),
                    axios.get(`/api/business/${business_slug}/products/${product_id}/analytics/`)
                ]);

                setProduct(productResponse.data);
                setAnalytics(analyticsResponse.data);
                const formattedHistory = formatHistoryData(historyResponse.data);
                setHistory(formattedHistory);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Ошибка загрузки данных');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [business_slug, product_id]);

    const fetchAnalytics = async () => {
        setAnalyticsLoading(true);
        try {
            const response = await axios.get(`/api/business/${business_slug}/products/${product_id}/analytics/`);
            setAnalytics(response.data);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError('Ошибка загрузки аналитики');
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const response = await axios.get(`/api/business/${business_slug}/products/${product_id}/full-history/`);
            const formattedHistory = formatHistoryData(response.data);
            setHistory(formattedHistory);
        } catch (err) {
            console.error('Error fetching history:', err);
            setError('Ошибка загрузки истории');
        } finally {
            setHistoryLoading(false);
        }
    };

    const formatHistoryData = (historyData) => {
        const result = [];
        if (historyData.stocks && Array.isArray(historyData.stocks)) {
            historyData.stocks.forEach(stockGroup => {
                if (stockGroup.history && Array.isArray(stockGroup.history)) {
                    stockGroup.history.forEach(item => {
                        result.push({
                            type: 'stock',
                            id: item.id,
                            date: item.history_date,
                            user: item.history_user,
                            action: getActionName(item.history_type),
                            changes: item.changed_fields || {},
                            variantId: stockGroup.variant_id,
                            stockId: stockGroup.stock_id
                        });
                    });
                }
            });
        }
        return result.sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const getActionName = (actionType) => {
        switch (actionType) {
            case '+': return 'Создание';
            case '~': return 'Изменение';
            case '-': return 'Удаление';
            default: return actionType;
        }
    };

    const refreshProductData = async () => {
        try {
            const response = await axios.get(`/api/business/${business_slug}/products/${product_id}/info`);
            setProduct(response.data);
            setSelectedStockIndex(0);
        } catch (err) {
            setError('Ошибка обновления данных товара');
        }
    };

    const handleAddDefect = async (stockId) => {
        if (!defectQuantity || !defectReason) return;
        try {
            await axios.post(
                `/api/business/${business_slug}/stocks/${stockId}/defects/create/`,
                { quantity: parseInt(defectQuantity), reason: defectReason }
            );
            await refreshProductData();
            setDefectQuantity('');
            setDefectReason('');
        } catch (err) {
            setError('Ошибка при добавлении брака');
        }
    };

    const handleRemoveDefect = async (defectId, stockId) => {
        try {
            await axios.post(
                `/api/business/${business_slug}/stocks/${defectId}/defects/remove/`,
                { defect_id: defectId }
            );
            await refreshProductData();
        } catch (err) {
            setError('Ошибка при удалении брака');
        }
    };

    const handleAddReserve = async (stockId) => {
        if (!reserveQuantity) return;
        try {
            await axios.post(
                `/api/business/${business_slug}/stocks/${stockId}/reserve/`,
                { quantity: parseInt(reserveQuantity) }
            );
            await refreshProductData();
            setReserveQuantity('');
        } catch (err) {
            setError('Ошибка при резервировании товара');
        }
    };

    const handleRemoveReserve = async (stockId) => {
        if (!reserveRemoveQuantity || reserveRemoveQuantity <= 0) {
            setError('Введите корректное количество');
            return;
        }
        try {
            await axios.post(
                `/api/business/${business_slug}/stocks/${stockId}/reserve/remove/`,
                { quantity: parseInt(reserveRemoveQuantity) }
            );
            await refreshProductData();
            setReserveRemoveQuantity('');
            setError(null);
        } catch (err) {
            setError('Ошибка при снятии резерва: ' + (err.response?.data?.detail || err.message));
        }
    };

    const printSingleBarcode = (variant, productName) => {
        const barcodeUrl = variant.barcode_image.startsWith('/')
            ? `${window.location.origin}${variant.barcode_image}`
            : variant.barcode_image;

        const content = `
          <html>
            <head>
              <title>Печать баркода</title>
              <style>
                @page { size: 58mm 40mm; margin: 0; }
                body { margin: 0; width: 58mm; height: 40mm; display: flex; justify-content: center; align-items: center; font-family: 'Inter', sans-serif; font-size: 8px; }
                .product { text-align: center; width: 100%; padding: 1mm 2mm; }
                .name { font-weight: bold; font-size: 13px; margin-bottom: 1mm; }
                .barcode-img { height: 24mm; width: auto; max-width: 95%; }
                .price { font-size: 15px; font-weight: bold; margin-top: 0.5mm; }
                .attributes { margin-top: 0.5mm; font-size: 7px; }
                .attribute { display: flex; justify-content: space-between; gap: 2mm; }
                .attribute-name { font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="product">
                <div class="name">${variant.name}</div>
                <img class="barcode-img" src="${barcodeUrl}" alt="barcode" />
                <div class="price">
                    ${parseFloat(variant.discount) > 0
                ? `<strike class="old-price-barcode">${parseFloat(variant.price).toLocaleString('ru-RU')} ₸</strike>
                   <span class="current-price-barcode">${parseFloat(variant.current_price).toLocaleString('ru-RU')} ₸</span>`
                : `${parseFloat(variant.price).toLocaleString('ru-RU')} ₸`
            }
                </div>
              </div>
            </body>
          </html>
        `;

        const printWindow = window.open('', '_blank', 'width=580,height=400');
        printWindow.document.open();
        printWindow.document.write(content);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <Loader size="large" />
        </div>
    );
    if (error) return <div className={styles.error}>{error}</div>;
    if (!product) return null;

    const selectedVariant = product.variants[selectedVariantIndex];
    const mainImage = product.images.find(img => img.is_main) || product.images[0];
    const selectedStock = selectedVariant.stocks_data.stocks[selectedStockIndex];

    return (
        <div className={styles.pageWrapper}>
            <style>{customDatePickerStyles}</style>
            <div className={styles.container}>
                <div className={styles.productHeader}>
                    <div className={styles.headerRow}>
                        <h1 className={styles.title}>{product.name}</h1>
                        <button
                            onClick={() => navigate(`/business/${business_slug}/products/${product_id}/edit`)}
                            className={styles.editButton}
                        >
                            Редактировать товар
                        </button>
                    </div>
                    <p className={styles.category}>Категория: {product.category_name}</p>
                </div>

                <div className={styles.productContent}>
                    <div className={styles.gallerySection}>
                        {mainImage && (
                            <div className={styles.mainImage}>
                                <img src={mainImage.image} alt="Главное изображение" />
                            </div>
                        )}
                        <div className={styles.thumbnailList}>
                            {product.images.map(img => (
                                <img key={img.id} src={img.image} alt="" className={styles.thumbnail} />
                            ))}
                        </div>
                    </div>

                    <div className={styles.productInfo}>
                        <p className={styles.description}>{product.description}</p>
                        <div className={styles.variantSelector}>
                            <label>Вариант:</label>
                            <select
                                value={selectedVariantIndex}
                                onChange={(e) => {
                                    setSelectedVariantIndex(parseInt(e.target.value));
                                    setSelectedStockIndex(0);
                                }}
                                className={styles.selectInput}
                            >
                                {product.variants.map((v, i) => (
                                    <option key={v.id} value={i}>
                                        {v.name} — {parseFloat(v.price).toLocaleString('ru-RU')} ₸
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.variantDetails}>
                            <h3>Характеристики:</h3>
                            <ul>
                                {selectedVariant.attributes.map(attr => (
                                    <li key={attr.id}>
                                        <strong>{attr.category_attribute_name}:</strong>{' '}
                                        {attr.predefined_value_name || attr.custom_value || '-'}
                                    </li>
                                ))}
                            </ul>
                            <div className={styles.priceSection}>
                                <div className={styles.priceBlock}>
                                    <span className={styles.priceLabel}>Цена:</span>
                                    <span className={styles.priceValue}>
                                        {parseFloat(selectedVariant.current_price).toLocaleString('ru-RU')} ₸
                                    </span>
                                </div>
                                {parseFloat(selectedVariant.discount) > 0 && (
                                    <>
                                        <div className={styles.priceBlock}>
                                            <span className={styles.priceLabel}>Цена без скидки:</span>
                                            <span className={styles.oldPrice}>
                                                {parseFloat(selectedVariant.price).toLocaleString('ru-RU')} ₸
                                            </span>
                                        </div>
                                        <div className={styles.priceBlock}>
                                            <span className={styles.priceLabel}>Скидка:</span>
                                            <span className={styles.discountValue}>
                                                {selectedVariant.discount}%
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className={styles.stockInfo}>
                                <div className={styles.stockSelector}>
                                    <label>Склад:</label>
                                    <select
                                        value={selectedStockIndex}
                                        onChange={(e) => setSelectedStockIndex(parseInt(e.target.value))}
                                        className={styles.selectInput}
                                    >
                                        {selectedVariant.stocks_data.stocks.map((stock, index) => (
                                            <option key={stock.id} value={index}>
                                                {stock.location.name} (Доступно: {stock.available_quantity} шт.)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.stockStats}>
                                    <div className={styles.stockStat}>
                                        <span className={styles.statLabel}>Всего на складе:</span>
                                        <span>{selectedStock.quantity} шт.</span>
                                    </div>
                                    <div className={styles.stockStat}>
                                        <span className={styles.statLabel}>Доступно для продажи:</span>
                                        <span>{selectedStock.available_quantity} шт.</span>
                                    </div>
                                    <div className={styles.stockStat}>
                                        <span className={styles.statLabel}>Зарезервировано:</span>
                                        <span>{selectedStock.reserved_quantity} шт.</span>
                                    </div>
                                    <div className={styles.stockStat}>
                                        <span className={styles.statLabel}>Браковано:</span>
                                        <span>{selectedStock.defect_quantity} шт.</span>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.barcodeSection}>
                                <h4>Баркод</h4>
                                <img
                                    src={selectedVariant.barcode_image}
                                    alt="Баркод"
                                    className={styles.barcodeImg}
                                />
                                <p className={styles.barcodeNumber}>{selectedVariant.barcode}</p>
                                <button
                                    onClick={() => printSingleBarcode(selectedVariant, product.name)}
                                    className={styles.actionButton}
                                >
                                    Печать баркода
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.mainTabs}>
                    <button
                        className={`${styles.mainTabButton} ${activeMainTab === 'stock' ? styles.activeMainTab : ''}`}
                        onClick={() => setActiveMainTab('stock')}
                    >
                        Управление складом
                    </button>
                    <button
                        className={`${styles.mainTabButton} ${activeMainTab === 'sales' ? styles.activeMainTab : ''}`}
                        onClick={() => setActiveMainTab('sales')}
                    >
                        Продажи
                    </button>
                    <button
                        className={`${styles.mainTabButton} ${activeMainTab === 'analytics' ? styles.activeMainTab : ''}`}
                        onClick={() => setActiveMainTab('analytics')}
                    >
                        Аналитика
                    </button>
                    <button
                        className={`${styles.mainTabButton} ${activeMainTab === 'history' ? styles.activeMainTab : ''}`}
                        onClick={() => setActiveMainTab('history')}
                    >
                        История изменений
                    </button>
                </div>

                <div className={styles.mainTabContent}>
                    {activeMainTab === 'stock' && (
                        <StockManagementTab
                            selectedStock={selectedStock}
                            defectQuantity={defectQuantity}
                            setDefectQuantity={setDefectQuantity}
                            defectReason={defectReason}
                            setDefectReason={setDefectReason}
                            reserveQuantity={reserveQuantity}
                            setReserveQuantity={setReserveQuantity}
                            reserveRemoveQuantity={reserveRemoveQuantity}
                            setReserveRemoveQuantity={setReserveRemoveQuantity}
                            handleAddDefect={handleAddDefect}
                            handleRemoveDefect={handleRemoveDefect}
                            handleAddReserve={handleAddReserve}
                            handleRemoveReserve={handleRemoveReserve}
                            showAllDefects={showAllDefects}
                            setShowAllDefects={setShowAllDefects}
                        />
                    )}
                    {activeMainTab === 'sales' && (
                        <SalesTab product={product} businessSlug={business_slug} />
                    )}
                    {activeMainTab === 'analytics' && (
                        <AnalyticsTab
                            analytics={analytics}
                            analyticsLoading={analyticsLoading}
                            error={error}
                        />
                    )}
                    {activeMainTab === 'history' && (
                        <HistoryTab
                            history={history}
                            historyLoading={historyLoading}
                            error={error}
                            selectedVariant={selectedVariant}
                            fetchHistory={fetchHistory}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const StockManagementTab = ({
    selectedStock,
    defectQuantity,
    setDefectQuantity,
    defectReason,
    setDefectReason,
    reserveQuantity,
    setReserveQuantity,
    reserveRemoveQuantity,
    setReserveRemoveQuantity,
    handleAddDefect,
    handleRemoveDefect,
    handleAddReserve,
    handleRemoveReserve,
    showAllDefects,
    setShowAllDefects
}) => {
    const [activeTab, setActiveTab] = useState('defects');

    return (
        <div className={styles.stockManagementSection}>
            <div className={styles.subTabs}>
                <button
                    className={`${styles.subTabButton} ${activeTab === 'defects' ? styles.activeSubTab : ''}`}
                    onClick={() => setActiveTab('defects')}
                >
                    Браки
                </button>
                <button
                    className={`${styles.subTabButton} ${activeTab === 'reserves' ? styles.activeSubTab : ''}`}
                    onClick={() => setActiveTab('reserves')}
                >
                    Резервы
                </button>
            </div>
            {activeTab === 'defects' && (
                <div className={styles.defectsSection}>
                    <h3>Добавить брак</h3>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>Количество:</label>
                            <input
                                type="number"
                                min="1"
                                max={selectedStock.quantity}
                                value={defectQuantity}
                                onChange={(e) => setDefectQuantity(e.target.value)}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Причина:</label>
                            <input
                                type="text"
                                value={defectReason}
                                onChange={(e) => setDefectReason(e.target.value)}
                                className={styles.input}
                                placeholder="Опишите причину брака"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => handleAddDefect(selectedStock.id)}
                        className={styles.actionButton}
                        disabled={!defectQuantity || !defectReason}
                    >
                        Добавить брак
                    </button>
                    <h3>Список браков</h3>
                    {selectedStock.defects.length > 0 ? (
                        <div className={styles.defectsList}>
                            {selectedStock.defects.slice(0, showAllDefects ? undefined : 3).map(defect => (
                                <div key={defect.id} className={styles.defectItem}>
                                    <div className={styles.defectHeader}>
                                        <span className={styles.defectQuantity}>{defect.quantity} шт.</span>
                                        <span className={styles.defectDate}>
                                            {new Date(defect.created_at).toLocaleDateString()}
                                        </span>
                                        <button
                                            onClick={() => handleRemoveDefect(defect.id, selectedStock.id)}
                                            className={styles.removeButton}
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                    <div className={styles.defectReason}>
                                        {defect.reason}
                                    </div>
                                </div>
                            ))}
                            {!showAllDefects && selectedStock.defects.length > 3 && (
                                <button
                                    className={styles.showMoreButton}
                                    onClick={() => setShowAllDefects(true)}
                                >
                                    Показать все ({selectedStock.defects.length - 3} скрыто)
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className={styles.noItems}>Браков нет</p>
                    )}
                </div>
            )}
            {activeTab === 'reserves' && (
                <div className={styles.reservesSection}>
                    <h3>Резервирование товара</h3>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>Количество для резерва:</label>
                            <input
                                type="number"
                                min="1"
                                max={selectedStock.available_quantity}
                                value={reserveQuantity}
                                onChange={(e) => setReserveQuantity(e.target.value)}
                                className={styles.input}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => handleAddReserve(selectedStock.id)}
                        className={styles.actionButton}
                        disabled={!reserveQuantity}
                    >
                        Зарезервировать
                    </button>
                    {selectedStock.reserved_quantity > 0 && (
                        <div className={styles.currentReserve}>
                            <h3>Текущий резерв</h3>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Количество для снятия:</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={selectedStock.reserved_quantity}
                                        value={reserveRemoveQuantity}
                                        onChange={(e) => setReserveRemoveQuantity(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveReserve(selectedStock.id)}
                                className={styles.removeButton}
                                disabled={!reserveRemoveQuantity || reserveRemoveQuantity > selectedStock.reserved_quantity}
                            >
                                Снять с резерва
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const AnalyticsTab = ({ analytics, analyticsLoading, error }) => {
    return (
        <div className={styles.analyticsSection}>
            {analyticsLoading ? (
                <div className={styles.loading}>Загрузка аналитики...</div>
            ) : error ? (
                <div className={styles.error}>{error}</div>
            ) : analytics ? (
                <div className={styles.analyticsGrid}>
                    <div className={styles.analyticsCard}>
                        <h3>Общие показатели</h3>
                        <div className={styles.analyticsMetric}>
                            <span className={styles.metricLabel}>Выручка:</span>
                            <span className={styles.metricValue}>
                                {analytics.totals.revenue.toLocaleString('ru-RU')} ₸
                            </span>
                        </div>
                        <div className={styles.analyticsMetric}>
                            <span className={styles.metricLabel}>Продажи:</span>
                            <span className={styles.metricValue}>
                                {analytics.totals.sales_count} шт.
                            </span>
                        </div>
                    </div>
                    <div className={`${styles.analyticsCard} ${styles.chartCard}`}>
                        <h3>Динамика продаж</h3>
                        <div className={styles.chartContainer}>
                            <SalesChart analytics={analytics} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.error}>Не удалось загрузить данные аналитики</div>
            )}
        </div>
    );
};

const HistoryTab = ({ history, historyLoading, error, selectedVariant, fetchHistory }) => {
    return (
        <div className={styles.historySection}>
            <div className={styles.historyControls}>
                <button
                    onClick={fetchHistory}
                    className={styles.refreshButton}
                    disabled={historyLoading}
                >
                    {historyLoading ? 'Загрузка...' : 'Обновить историю'}
                </button>
            </div>
            {historyLoading ? (
                <div className={styles.loading}>Загрузка истории...</div>
            ) : error ? (
                <div className={styles.error}>{error}</div>
            ) : history.length > 0 ? (
                <div className={styles.historyList}>
                    {history.map((record, index) => (
                        <div key={`${record.type}-${record.id}-${index}`} className={styles.historyItem}>
                            <div className={styles.historyHeader}>
                                <div className={styles.historyMeta}>
                                    <span className={styles.historyType}>
                                        {record.type === 'stock' && 'Склад'}
                                        {record.type === 'variant' && 'Вариант'}
                                    </span>
                                    <span className={styles.historyAction}>
                                        {record.action}
                                    </span>
                                </div>
                                <div className={styles.historyInfo}>
                                    <span className={styles.historyDate}>
                                        {new Date(record.date).toLocaleString('ru-RU')}
                                    </span>
                                    <span className={styles.historyUser}>
                                        {record.user || 'Система'}
                                    </span>
                                </div>
                            </div>
                            {record.changes && Object.keys(record.changes).length > 0 && (
                                <div className={styles.historyChanges}>
                                    {Object.entries(record.changes).map(([field, change]) => (
                                        <div key={field} className={styles.changeItem}>
                                            <span className={styles.changeField}>{field}:</span>
                                            <div className={styles.changeValues}>
                                                <span className={styles.oldValue}>{change.from}</span>
                                                <span className={styles.changeArrow}>→</span>
                                                <span className={styles.newValue}>{change.to}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className={styles.noHistory}>Нет истории изменений</p>
            )}
        </div>
    );
};

export default ProductPage;