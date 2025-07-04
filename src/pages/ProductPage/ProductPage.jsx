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
                                    <span className={styles.stockLabel}>Остаток:</span>
                                    <span>{selectedVariant.stocks[0].quantity} шт.</span>
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