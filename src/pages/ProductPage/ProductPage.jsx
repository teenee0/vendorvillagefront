import React, { useEffect, useState, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import styles from './ProductPage.module.css';
import axios from '../../api/axiosDefault';
import { useParams, useNavigate } from 'react-router-dom';

const SalesChart = ({ analytics }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    // Функция для генерации последовательных цветов
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

        // Уничтожаем предыдущий график
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        // Создаем новый график
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
                    backgroundColor: colorPalette[index] + '33', // Добавляем прозрачность
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
                            color: '#ffffff',
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12
                            },
                            padding: 10,
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        bodyFont: {
                            size: 14
                        },
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.parsed.y.toLocaleString('ru-RU')} ₸`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#666'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#666',
                            callback: function (value) {
                                return value.toLocaleString('ru-RU') + ' ₸';
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
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
    const [activeTab, setActiveTab] = useState('defects'); // 'defects' or 'reserves'
    const [reserveRemoveQuantity, setReserveRemoveQuantity] = useState('');
    const [showAllDefects, setShowAllDefects] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

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
            // Преобразуем данные в плоский массив для отображения
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

        // Обрабатываем историю складов
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

        // Сортируем по дате (новые сверху)
        return result.sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    // Функция для преобразования типа действия в читаемый формат
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
                @page {
                  size: 58mm 40mm;
                  margin: 0;
                }
                body {
                  margin: 0;
                  width: 58mm;
                  height: 40mm;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  font-family: Arial, sans-serif;
                  font-size: 8px;
                }
                .product {
                  text-align: center;
                  width: 100%;
                  padding: 1mm 2mm;
                }
                .name {
                  font-weight: bold;
                  font-size: 13px;
                  margin-bottom: 1mm;
                }
                .barcode-img {
                  height: 24mm;
                  width: auto;
                  max-width: 95%;
                }
                .barcode-number {
                  font-size: 8px;
                  margin-top: 0.5mm;
                }
                .price {
                  font-size: 15px;
                  font-weight: bold;
                  margin-top: 0.5mm;
                }
                .attributes {
                  margin-top: 0.5mm;
                  font-size: 7px;
                }
                .attribute {
                  display: flex;
                  justify-content: space-between;
                  gap: 2mm;
                }
                .attribute-name {
                  font-weight: 600;
                }
              </style>
            </head>
            <body>
              <div class="product">
                <div class="name">${variant.name}</div>
                <img class="barcode-img" src="${barcodeUrl}" alt="barcode" />
                <div class="price">
                    ${parseFloat(variant.discount) > 0
                ? `
                            <strike class="old-price-barcode">${parseFloat(variant.price).toLocaleString('ru-RU')} ₸</strike>
                            <span class="current-price-barcode">${parseFloat(variant.current_price).toLocaleString('ru-RU')} ₸</span>
                        `
                : `
                            ${parseFloat(variant.price).toLocaleString('ru-RU')} ₸
                        `
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


    if (loading) return <div className={styles.loading}>Загрузка...</div>;
    if (error) return <div className={styles.error}>{error}</div>;
    if (!product) return null;

    const selectedVariant = product.variants[selectedVariantIndex];
    const mainImage = product.images.find(img => img.is_main) || product.images[0];
    const stock = selectedVariant.stocks[0];

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.productHeader}>
                    <div className={styles.headerRow}>
                        <h1 className={styles.title}>{product.name}</h1>
                        <button
                            onClick={(e) => {
                                navigate(`/business/${business_slug}/products/${product_id}/edit`);
                            }}
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
                                onChange={(e) => setSelectedVariantIndex(parseInt(e.target.value))}
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
                                <div className={styles.stockItem}>
                                    <span className={styles.stockLabel}>Склад:</span>
                                    <span>{selectedVariant.stocks[0].location.name}</span>
                                </div>
                                <div className={styles.stockItem}>
                                    <span className={styles.stockLabel}>Всего:</span>
                                    <span>{selectedVariant.stocks[0].available_quantity} шт.</span>
                                    <span className={styles.stockLabel}>Остаток:</span>
                                    <span>{selectedVariant.stocks[0].available_quantity} шт.</span>
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

                                <div className={styles.printButtons}>
                                    <button
                                        onClick={() => printSingleBarcode(selectedVariant, product.name)}
                                        className={styles.printButton}
                                    >
                                        Печать баркода
                                    </button>
                                </div>

                            </div>

                        </div>
                    </div>
                </div>

                <div className={styles.stockManagementSection}>
                    <h2 className={styles.sectionTitle}>Управление складом</h2>

                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'defects' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('defects')}
                        >
                            Браки
                        </button>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'reserves' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('reserves')}
                        >
                            Резервы
                        </button>
                    </div>

                    {/* Секция информации о складе */}
                    <div className={styles.stockSummary}>
                        <h3>Информация о складе</h3>
                        <div className={styles.stockStats}>
                            <div className={styles.stockStat}>
                                <span className={styles.statLabel}>Всего на складе:</span>
                                <span className={styles.statValue}>{stock.quantity} шт.</span>
                            </div>
                            <div className={styles.stockStat}>
                                <span className={styles.statLabel}>Доступно для продажи:</span>
                                <span className={styles.statValue}>{stock.available_quantity} шт.</span>
                            </div>
                            <div className={styles.stockStat}>
                                <span className={styles.statLabel}>Зарезервировано:</span>
                                <span className={styles.statValue}>{stock.reserved_quantity} шт.</span>
                            </div>
                            <div className={styles.stockStat}>
                                <span className={styles.statLabel}>Браковано:</span>
                                <span className={styles.statValue}>{stock.defect_quantity} шт.</span>
                            </div>
                        </div>
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
                                        max={stock.quantity}
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
                                onClick={() => handleAddDefect(stock.id)}
                                className={styles.actionButton}
                                disabled={!defectQuantity || !defectReason}
                            >
                                Добавить брак
                            </button>

                            <h3>Список браков</h3>
                            {stock.defects.length > 0 ? (
                                <div className={styles.defectsList}>
                                    {stock.defects.slice(0, 3).map(defect => (
                                        <div key={defect.id} className={styles.defectItem}>
                                            <div className={styles.defectHeader}>
                                                <span className={styles.defectQuantity}>{defect.quantity} шт.</span>
                                                <span className={styles.defectDate}>
                                                    {new Date(defect.created_at).toLocaleDateString()}
                                                </span>
                                                <button
                                                    onClick={() => handleRemoveDefect(defect.id, stock.id)}
                                                    className={styles.removeButton}
                                                >
                                                    Удалить
                                                </button>
                                            </div>
                                            <div className={styles.defectReason}>
                                                {defect.reason.length > 50 ? (
                                                    <>
                                                        {defect.reason.substring(0, 50)}...
                                                        <button
                                                            className={styles.showMoreButton}
                                                            onClick={(e) => {
                                                                e.target.previousSibling.textContent = defect.reason;
                                                                e.target.style.display = 'none';
                                                            }}
                                                        >
                                                            Показать полностью
                                                        </button>
                                                    </>
                                                ) : (
                                                    defect.reason
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {stock.defects.length > 3 && !showAllDefects && (
                                        <div className={styles.showMoreWrapper}>
                                            <button
                                                className={styles.showMoreButton}
                                                onClick={() => setShowAllDefects(true)}
                                            >
                                                Показать все браки ({stock.defects.length - 3} скрыто)
                                            </button>
                                        </div>
                                    )}

                                    {showAllDefects &&
                                        stock.defects.slice(3).map(defect => (
                                            <div key={defect.id} className={styles.defectItem}>
                                                <div className={styles.defectHeader}>
                                                    <span className={styles.defectQuantity}>{defect.quantity} шт.</span>
                                                    <span className={styles.defectDate}>
                                                        {new Date(defect.created_at).toLocaleDateString()}
                                                    </span>
                                                    <button
                                                        onClick={() => handleRemoveDefect(defect.id, stock.id)}
                                                        className={styles.removeButton}
                                                    >
                                                        Удалить
                                                    </button>
                                                </div>
                                                <div className={styles.defectReason}>
                                                    {defect.reason.length > 50 ? (
                                                        <>
                                                            {defect.reason.substring(0, 50)}...
                                                            <button
                                                                className={styles.showMoreButton}
                                                                onClick={(e) => {
                                                                    e.target.previousSibling.textContent = defect.reason;
                                                                    e.target.style.display = 'none';
                                                                }}
                                                            >
                                                                Показать полностью
                                                            </button>
                                                        </>
                                                    ) : (
                                                        defect.reason
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    }
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
                                        max={stock.available_quantity}
                                        value={reserveQuantity}
                                        onChange={(e) => setReserveQuantity(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => handleAddReserve(stock.id)}
                                className={styles.actionButton}
                                disabled={!reserveQuantity}
                            >
                                Зарезервировать
                            </button>

                            {stock.reserved_quantity > 0 && (
                                <div className={styles.currentReserve}>
                                    <h3>Текущий резерв</h3>
                                    <div className={styles.reserveStats}>
                                        <div className={styles.reserveStat}>
                                            <span className={styles.statLabel}>Всего зарезервировано:</span>
                                            <span className={styles.statValue}>{stock.reserved_quantity} шт.</span>
                                        </div>
                                        <div className={styles.reserveStat}>
                                            <span className={styles.statLabel}>Доступно для резерва:</span>
                                            <span className={styles.statValue}>{stock.available_quantity} шт.</span>
                                        </div>
                                    </div>
                                    <div className={styles.formRow}>
                                        <div className={styles.formGroup}>
                                            <label>Количество для снятия:</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max={stock.reserved_quantity}
                                                value={reserveRemoveQuantity}
                                                onChange={(e) => setReserveRemoveQuantity(e.target.value)}
                                                className={styles.input}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveReserve(stock.id)}
                                        className={styles.removeButton}
                                        disabled={!reserveRemoveQuantity || reserveRemoveQuantity > stock.reserved_quantity}
                                    >
                                        Снять с резерва
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>


                <div className={styles.analyticsSection}>
                    <h2 className={styles.analyticsTitle}>Аналитика продаж</h2>

                    {analyticsLoading ? (
                        <div className={styles.loading}>Загрузка аналитики...</div>
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
                                <div className={styles.analyticsMetric}>
                                    <span className={styles.metricLabel}>Заказы:</span>
                                    <span className={styles.metricValue}>
                                        {analytics.totals.orders}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.analyticsCard}>
                                <h3>Показатели по вариантам</h3>
                                {analytics.variants.map(variant => (
                                    <div key={variant.id} className={styles.variantStat}>
                                        <h4>{variant.name}</h4>
                                        <div className={styles.analyticsMetric}>
                                            <span className={styles.metricLabel}>Выручка:</span>
                                            <span className={styles.metricValue}>
                                                {variant.totals.revenue.toLocaleString('ru-RU')} ₸
                                            </span>
                                        </div>
                                        <div className={styles.analyticsMetric}>
                                            <span className={styles.metricLabel}>Продажи:</span>
                                            <span className={styles.metricValue}>
                                                {variant.totals.sales_count} шт.
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className={`${styles.analyticsCard} ${styles.chartCard}`}>
                                <h3>Динамика продаж по вариантам</h3>
                                <div className={styles.chartContainer}>
                                    <SalesChart analytics={analytics} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.error}>Не удалось загрузить данные аналитики</div>
                    )}
                </div>

                <div className={styles.historySection}>
                    <h2 className={styles.sectionTitle}>История изменений</h2>
                    <div className={styles.historyControls}>
                        <button
                            onClick={fetchHistory}
                            className={styles.refreshButton}
                            disabled={historyLoading}
                        >
                            {historyLoading ? 'Загрузка...' : 'Обновить историю'}
                        </button>
                        <span className={styles.historyFilter}>
                            Показано для: {selectedVariant.name}
                        </span>
                    </div>

                    {historyLoading ? (
                        <div className={styles.loading}>Загрузка истории...</div>
                    ) : error ? (
                        <div className={styles.error}>{error}</div>
                    ) : history.filter(record => {
                        // Фильтруем записи по текущему варианту
                        if (record.type === 'stock') {
                            return selectedVariant.stocks.some(stock => stock.id === record.id);
                        }
                        if (record.type === 'variant') {
                            return record.id === selectedVariant.id;
                        }
                        return true;
                    }).length > 0 ? (
                        <div className={styles.historyList}>
                            {history
                                .filter(record => {
                                    if (record.type === 'stock') {
                                        return selectedVariant.stocks.some(stock => stock.id === record.id);
                                    }
                                    if (record.type === 'variant') {
                                        return record.id === selectedVariant.id;
                                    }
                                    return true;
                                })
                                .map((record, index) => (
                                    <div key={`${record.type}-${record.id}-${index}`} className={styles.historyItem}>
                                        <div className={styles.historyHeader}>
                                            <div className={styles.historyMeta}>
                                                <span className={styles.historyType}>
                                                    {record.type === 'product' && 'Товар'}
                                                    {record.type === 'variant' && 'Вариант'}
                                                    {record.type === 'stock' && 'Склад'}
                                                    {record.type === 'defect' && 'Брак'}
                                                </span>
                                                <span className={styles.historyAction}>
                                                    {record.action}
                                                </span>
                                            </div>
                                            <div className={styles.historyInfo}>
                                                <span className={styles.historyDate}>
                                                    {new Date(record.date).toLocaleString('ru-RU', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                                <span className={styles.historyUser}>
                                                    {record.user || 'Система'}
                                                </span>
                                            </div>
                                        </div>

                                        {record.changes && Object.keys(record.changes).length > 0 ? (
                                            <div className={styles.historyChanges}>
                                                {Object.entries(record.changes).map(([field, change]) => {
                                                    // Функции для форматирования
                                                    const getFieldName = (field) => {
                                                        const names = {
                                                            quantity: 'Количество',
                                                            reserved_quantity: 'Резерв',
                                                            defect_quantity: 'Браковано',
                                                            price: 'Цена',
                                                            discount: 'Скидка',
                                                            sku: 'Артикул',
                                                            last_updated: 'Обновлено',
                                                            created_at: 'Создано'
                                                        };
                                                        return names[field] || field;
                                                    };

                                                    const formatValue = (value, field) => {
                                                        if (value === null || value === undefined) return '—';

                                                        if (['quantity', 'reserved_quantity', 'defect_quantity'].includes(field)) {
                                                            return `${value} шт.`;
                                                        }

                                                        if (field === 'price') {
                                                            return `${parseFloat(value).toLocaleString('ru-RU')} ₸`;
                                                        }

                                                        if (field === 'discount') {
                                                            return `${value}%`;
                                                        }

                                                        if (['last_updated', 'created_at'].includes(field)) {
                                                            return new Date(value).toLocaleString('ru-RU');
                                                        }

                                                        return value;
                                                    };

                                                    return (
                                                        <div key={field} className={styles.changeItem}>
                                                            <span className={styles.changeField}>{getFieldName(field)}:</span>
                                                            <div className={styles.changeValues}>
                                                                <span className={styles.oldValue}>
                                                                    {formatValue(change.from, field)}
                                                                </span>
                                                                <span className={styles.changeArrow}>→</span>
                                                                <span className={styles.newValue}>
                                                                    {formatValue(change.to, field)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className={styles.noChanges}>Изменений не зафиксировано</div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <p className={styles.noHistory}>Нет истории изменений для этого варианта</p>
                    )}
                </div>
            </div>
        </div>
    );
};


export default ProductPage;