import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import styles from './ProductSalesHistory.module.css';
import Loader from '../Loader';

const ProductSalesHistory = ({ businessSlug, productId }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        location: '',
        variant: '',
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        fetchSalesHistory();
    }, [businessSlug, productId, filters]);

    const fetchSalesHistory = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.location) params.location = filters.location;
            if (filters.variant) params.variant = filters.variant;
            if (filters.startDate) params.start_date = filters.startDate;
            if (filters.endDate) params.end_date = filters.endDate;

            const response = await axios.get(
                `/api/business/${businessSlug}/products/${productId}/sales-history/`,
                { params }
            );
            setData(response.data);
        } catch (err) {
            console.error('Ошибка загрузки истории продаж:', err);
            setError(err.response?.data?.detail || 'Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const goToReceipt = (receiptId) => {
        navigate(`/business/${businessSlug}/transactions?receipt=${receiptId}`);
    };

    const goToBatch = (batchId) => {
        navigate(`/business/${businessSlug}/batches?batch=${batchId}`);
    };

    const exportToExcel = async () => {
        try {
            // Строим параметры запроса на основе текущих фильтров
            const params = {};
            if (filters.location) params.location = filters.location;
            if (filters.variant) params.variant = filters.variant;
            if (filters.startDate) params.start_date = filters.startDate;
            if (filters.endDate) params.end_date = filters.endDate;

            const response = await axios.get(
                `/api/business/${businessSlug}/products/${productId}/sales-history/export-excel/`,
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
            let filename = `История_продаж_${new Date().toISOString().split('T')[0]}.xlsx`;
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
        } catch (err) {
            console.error('Ошибка экспорта в Excel:', err);
            alert('Ошибка экспорта в Excel: ' + (err.response?.data?.detail || err.message));
        }
    };

    if (loading) return <Loader />;
    if (error) return <div className={styles.error}>{error}</div>;
    if (!data) return null;

    return (
        <div className={styles.container}>
            {/* Статистика */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Всего продаж</div>
                    <div className={styles.statValue}>{data.statistics.total_sales}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Продано {data.product?.unit_display || 'шт.'}</div>
                    <div className={styles.statValue}>{data.statistics.total_quantity_sold}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Выручка</div>
                    <div className={styles.statValue}>{data.statistics.total_revenue.toFixed(2)} ₸</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Возвратов</div>
                    <div className={styles.statValue}>
                        {data.statistics.total_returns_count} ({data.statistics.total_returned_quantity} {data.product?.unit_display || 'шт.'})
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Сумма возвратов</div>
                    <div className={styles.statValue}>{data.statistics.total_refunded.toFixed(2)} ₸</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Чистая выручка</div>
                    <div className={styles.statValue}>{data.statistics.net_revenue.toFixed(2)} ₸</div>
                </div>
            </div>

            {/* Фильтры и экспорт */}
            <div className={styles.filtersContainer}>
            <div className={styles.filters}>
                <input
                    type="date"
                    placeholder="Дата начала"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className={styles.filterInput}
                />
                <input
                    type="date"
                    placeholder="Дата окончания"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className={styles.filterInput}
                />
                <button onClick={() => setFilters({ location: '', variant: '', startDate: '', endDate: '' })} className={styles.clearButton}>
                    Сбросить фильтры
                    </button>
                </div>
                <button onClick={exportToExcel} className={styles.exportButton} disabled={!data || data.sales.length === 0}>
                    <i className="fa fa-file-excel"></i> Экспорт в Excel
                </button>
            </div>

            {/* Разбивка по партиям */}
            {data.batches_breakdown.length > 0 && (
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Продажи по партиям</h3>
                    <div className={styles.table}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Номер партии</th>
                                    <th>Продано {data.product?.unit_display || 'шт.'}</th>
                                    <th>Выручка</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.batches_breakdown.map((batch) => (
                                    <tr key={batch.batch_id}>
                                        <td>{batch.batch_number}</td>
                                        <td>{batch.quantity_sold}</td>
                                        <td>{batch.revenue.toFixed(2)} ₸</td>
                                        <td>
                                            <button 
                                                onClick={() => goToBatch(batch.batch_id)}
                                                className={styles.linkButton}
                                            >
                                                Открыть партию →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Разбивка по локациям */}
            {data.locations_breakdown.length > 0 && (
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Продажи по локациям</h3>
                    <div className={styles.table}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Локация</th>
                                    <th>Продано {data.product?.unit_display || 'шт.'}</th>
                                    <th>Выручка</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.locations_breakdown.map((location) => (
                                    <tr key={location.location_id}>
                                        <td>{location.location_name}</td>
                                        <td>{location.quantity_sold}</td>
                                        <td>{location.revenue.toFixed(2)} ₸</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Детальная история продаж */}
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Детальная история продаж</h3>
                {data.sales.length === 0 ? (
                    <div className={styles.noData}>Нет данных о продажах</div>
                ) : (
                    <div className={styles.salesList}>
                        {data.sales.map((sale) => (
                            <div key={sale.id} className={styles.saleCard}>
                                <div className={styles.saleHeader}>
                                    <div className={styles.saleDate}>
                                        {new Date(sale.sale_date).toLocaleString('ru-RU')}
                                    </div>
                                    <div className={styles.saleReceipt}>
                                        Чек: <button 
                                            onClick={() => goToReceipt(sale.receipt.id)}
                                            className={styles.linkButton}
                                        >
                                            {sale.receipt.number}
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.saleBody}>
                                    <div className={styles.saleInfo}>
                                        <div className={styles.infoRow}>
                                            <strong>Вариант:</strong> {sale.variant.auto_name} 
                                            {sale.variant.sku && <span className={styles.sku}>(SKU: {sale.variant.sku})</span>}
                                        </div>
                                        <div className={styles.infoRow}>
                                            <strong>Локация:</strong> {sale.location.name} ({sale.location.location_type})
                                        </div>
                                        {sale.batch && (
                                            <div className={styles.infoRow}>
                                                <strong>Партия:</strong> 
                                                <button 
                                                    onClick={() => goToBatch(sale.batch.id)}
                                                    className={styles.linkButton}
                                                >
                                                    {sale.batch.batch_number}
                                                </button>
                                                <span className={styles.batchInfo}>
                                                    (Дата: {new Date(sale.batch.received_date).toLocaleDateString('ru-RU')})
                                                    {sale.batch.supplier && `, Поставщик: ${sale.batch.supplier}`}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.salePricing}>
                                        <div className={styles.priceRow}>
                                            <span>Количество:</span>
                                            <strong>{sale.quantity} {data.product?.unit_display || 'шт.'}</strong>
                                        </div>
                                        <div className={styles.priceRow}>
                                            <span>Цена за единицу:</span>
                                            <span>{sale.price_per_unit.toFixed(2)} ₸</span>
                                        </div>
                                        {(sale.discount_percent > 0 || sale.discount_amount > 0) && (
                                            <div className={styles.priceRow}>
                                                <span>Скидка:</span>
                                                <span className={styles.discount}>
                                                    {sale.discount_percent > 0 && `${sale.discount_percent}%`}
                                                    {sale.discount_amount > 0 && ` ${sale.discount_amount.toFixed(2)} ₸`}
                                                </span>
                                            </div>
                                        )}
                                        <div className={styles.priceRow}>
                                            <span>Итого:</span>
                                            <strong className={styles.total}>{sale.final_total_price.toFixed(2)} ₸</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Информация о возвратах */}
                                {sale.has_returns && (
                                    <div className={styles.returnsSection}>
                                        <div className={styles.returnsHeader}>
                                            ⚠️ Возвраты ({sale.total_returned} из {sale.quantity} {data.product?.unit_display || 'шт.'})
                                        </div>
                                        {sale.returns.map((ret) => (
                                            <div key={ret.id} className={styles.returnItem}>
                                                <div className={styles.returnInfo}>
                                                    <span>{new Date(ret.return_date).toLocaleString('ru-RU')}</span>
                                                    <span>{ret.quantity} {data.product?.unit_display || 'шт.'}</span>
                                                    {ret.is_defect && <span className={styles.defectBadge}>БРАК</span>}
                                                </div>
                                                <div className={styles.returnAmount}>Возврат: {ret.refund_amount.toFixed(2)} ₸</div>
                                                {ret.reason && <div className={styles.returnReason}>Причина: {ret.reason}</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Информация о покупателе */}
                                {(sale.receipt.customer_name || sale.receipt.customer_phone) && (
                                    <div className={styles.customerInfo}>
                                        Покупатель: {sale.receipt.customer_name} {sale.receipt.customer_phone}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductSalesHistory;

