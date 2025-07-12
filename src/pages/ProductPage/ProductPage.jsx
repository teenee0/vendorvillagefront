import React, { useEffect, useState } from 'react';
import styles from './ProductPage.module.css';
import axios from '../../api/axiosDefault';
import { useParams, useNavigate } from 'react-router-dom';

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

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await axios.get(`/api/business/${business_slug}/products/${product_id}/info`);
                setProduct(response.data);
            } catch (err) {
                setError('Ошибка загрузки товара');
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [business_slug, product_id]);

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
                  size: 40mm 30mm;
                  margin: 0;
                }
                body {
                  margin: 0;
                  width: 40mm;
                  height: 30mm;
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
                .sku {
                  font-weight: bold;
                  font-size: 8.5px;
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
                  font-size: 8px;
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
                <div class="sku">${variant.sku}</div>
                <img class="barcode-img" src="${barcodeUrl}" alt="barcode" />
                <div class="price-barcode">
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
      
                <div class="attributes">
                  ${variant.attributes.map(attr => `
                    <div class="attribute">
                      <span class="attribute-name">${attr.category_attribute_name}:</span>
                      <span class="attribute-value">
                        ${attr.predefined_value_name || attr.custom_value || '-'}
                      </span>
                    </div>
                  `).join('')}
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

    // Заглушка для данных аналитики
    const salesAnalytics = {
        totalSold: 1245,
        monthlyData: [
            { month: 'Янв', sales: 120, revenue: 240000 },
            { month: 'Фев', sales: 145, revenue: 290000 },
            { month: 'Мар', sales: 98, revenue: 196000 },
            { month: 'Апр', sales: 210, revenue: 420000 },
            { month: 'Май', sales: 175, revenue: 350000 },
            { month: 'Июн', sales: 230, revenue: 460000 },
            { month: 'Июл', sales: 195, revenue: 390000 },
            { month: 'Авг', sales: 110, revenue: 220000 },
            { month: 'Сен', sales: 0, revenue: 0 },
            { month: 'Окт', sales: 0, revenue: 0 },
            { month: 'Ноя', sales: 0, revenue: 0 },
            { month: 'Дек', sales: 0, revenue: 0 },
        ],
        bestMonth: { month: 'Июн', sales: 230, revenue: 460000 },
        averagePrice: 2000,
        stockTurnover: 3.2,
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
                                        {v.sku} — {parseFloat(v.price).toLocaleString('ru-RU')} ₽
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

                    <div className={styles.analyticsGrid}>
                        <div className={styles.analyticsCard}>
                            <h3>Общие показатели</h3>
                            <div className={styles.analyticsMetric}>
                                <span className={styles.metricLabel}>Всего продано:</span>
                                <span className={styles.metricValue}>{salesAnalytics.totalSold} шт.</span>
                            </div>
                            <div className={styles.analyticsMetric}>
                                <span className={styles.metricLabel}>Средняя цена:</span>
                                <span className={styles.metricValue}>
                                    {salesAnalytics.averagePrice.toLocaleString('ru-RU')} ₸
                                </span>
                            </div>
                            <div className={styles.analyticsMetric}>
                                <span className={styles.metricLabel}>Оборачиваемость:</span>
                                <span className={styles.metricValue}>{salesAnalytics.stockTurnover} раз</span>
                            </div>
                        </div>

                        <div className={styles.analyticsCard}>
                            <h3>Лучший месяц</h3>
                            <div className={styles.bestMonth}>
                                <span className={styles.bestMonthName}>{salesAnalytics.bestMonth.month}</span>
                                <div className={styles.bestMonthStats}>
                                    <div className={styles.bestMonthStat}>
                                        <span className={styles.statLabel}>Продажи:</span>
                                        <span className={styles.statValue}>{salesAnalytics.bestMonth.sales} шт.</span>
                                    </div>
                                    <div className={styles.bestMonthStat}>
                                        <span className={styles.statLabel}>Выручка:</span>
                                        <span className={styles.statValue}>
                                            {salesAnalytics.bestMonth.revenue.toLocaleString('ru-RU')} ₸
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`${styles.analyticsCard} ${styles.chartCard}`}>
                            <h3>Продажи по месяцам</h3>
                            <div className={styles.chartPlaceholder}>
                                {salesAnalytics.monthlyData.map((item, index) => (
                                    <div key={index} className={styles.chartBarContainer}>
                                        <div
                                            className={styles.chartBar}
                                            style={{ height: `${(item.sales / salesAnalytics.bestMonth.sales) * 100}%` }}
                                        ></div>
                                        <span className={styles.chartLabel}>{item.month}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductPage;