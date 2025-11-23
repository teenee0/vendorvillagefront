import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import { useFileUtils } from '../../hooks/useFileUtils';
import styles from './ProductPageNew.module.css';
import Loader from '../../components/Loader';
import ProductSalesHistory from '../../components/ProductSalesHistory/ProductSalesHistory';
import dayjs from 'dayjs';
import { Chart } from 'chart.js/auto';

const ProductPageNew = () => {
    const { business_slug, product_id } = useParams();
    const navigate = useNavigate();
    const { getFileUrl } = useFileUtils();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editedPrices, setEditedPrices] = useState({});
    const [addingPrices, setAddingPrices] = useState({}); // {locationId-variantId: price}
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('locations');
    const [selectedLocationFilter, setSelectedLocationFilter] = useState(null);
    const [locationSearchTerm, setLocationSearchTerm] = useState('');
    const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [batchForm, setBatchForm] = useState({
        batch_number: '',
        received_date: dayjs().format('YYYY-MM-DD'),
        supplier: '',
        notes: '',
        stocks: [],
    });
    const [batchSaving, setBatchSaving] = useState(false);
    const [batchFormError, setBatchFormError] = useState('');
    const [defectModal, setDefectModal] = useState({
        open: false,
        stockId: null,
        variantName: '',
        locationName: '',
        batchNumber: '',
        quantity: '',
        reason: '',
        defectId: null,
        availableQuantity: 0,
    });
    const [defectSaving, setDefectSaving] = useState(false);
    const [defectError, setDefectError] = useState('');
    const [batchSort, setBatchSort] = useState('recent');
    const [batchFilter, setBatchFilter] = useState('all');
    const [batchPage, setBatchPage] = useState(1);
    const [batchPageSize, setBatchPageSize] = useState(5);
    const [defectSort, setDefectSort] = useState('recent');
    const [defectPage, setDefectPage] = useState(1);
    const [defectPageSize, setDefectPageSize] = useState(20);
    const [batchesData, setBatchesData] = useState([]);
    const [defectsData, setDefectsData] = useState([]);
    const [batchesPagination, setBatchesPagination] = useState(null);
    const [defectsPagination, setDefectsPagination] = useState(null);
    const [batchesLoading, setBatchesLoading] = useState(false);
    const [stockOverviewLocationFilter, setStockOverviewLocationFilter] = useState(null);
    const [stockOverviewVariantFilter, setStockOverviewVariantFilter] = useState(null);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsPeriod, setAnalyticsPeriod] = useState('day');
    const salesChartRef = useRef(null);
    const salesChartInstance = useRef(null);

    useEffect(() => {
        fetchProduct();
    }, [business_slug, product_id]);

    useEffect(() => {
        if (activeTab === 'batches') {
            fetchBatchesAndDefects();
        }
    }, [activeTab, business_slug, product_id, batchSort, batchFilter, batchPage, batchPageSize, defectSort, defectPage, defectPageSize]);

    useEffect(() => {
        if (activeTab === 'analytics') {
            fetchAnalytics();
        }
    }, [activeTab, business_slug, product_id, analyticsPeriod]);

    // Инициализация графика продаж
    useEffect(() => {
        if (!analyticsData || !salesChartRef.current || activeTab !== 'analytics') return;

        if (salesChartInstance.current) {
            salesChartInstance.current.destroy();
        }

        const ctx = salesChartRef.current.getContext('2d');
        const chartData = analyticsData.sales_chart || [];

        const labels = chartData.map(item => {
            const date = dayjs(item.period);
            if (analyticsPeriod === 'day') {
                return date.format('DD MMM');
            } else {
                return date.format('MMM YYYY');
            }
        });
        const revenueData = chartData.map(item => parseFloat(item.revenue || 0));
        const quantityData = chartData.map(item => parseInt(item.quantity || 0));
        const ordersData = chartData.map(item => parseInt(item.orders || 0));

        salesChartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Выручка (₸)',
                        data: revenueData,
                        borderColor: '#2daf9f',
                        backgroundColor: 'rgba(45, 175, 159, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y',
                        pointBackgroundColor: '#2daf9f',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Количество продаж',
                        data: quantityData,
                        borderColor: '#ff9f40',
                        backgroundColor: 'rgba(255, 159, 64, 0.1)',
                        borderDash: [5, 5],
                        tension: 0.3,
                        yAxisID: 'y1',
                        pointBackgroundColor: '#ff9f40',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Заказы',
                        data: ordersData,
                        borderColor: '#9966ff',
                        backgroundColor: 'rgba(153, 102, 255, 0.1)',
                        borderDash: [5, 5],
                        tension: 0.3,
                        yAxisID: 'y1',
                        pointBackgroundColor: '#9966ff',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
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
                            color: '#e0e0e0',
                            usePointStyle: true,
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#e0e0e0',
                        bodyColor: '#e0e0e0',
                        borderColor: '#404040',
                        borderWidth: 1,
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#9e9e9e' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: { color: '#9e9e9e' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        ticks: { color: '#9e9e9e' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });

        return () => {
            if (salesChartInstance.current) {
                salesChartInstance.current.destroy();
            }
        };
    }, [analyticsData, analyticsPeriod, activeTab]);

    // Закрытие выпадающего меню при клике вне его
    useEffect(() => {
        if (!isLocationDropdownOpen) return;

        const handleClickOutside = (event) => {
            const target = event.target;
            // Проверяем, что клик не был внутри выпадающего меню
            if (!target.closest('[data-dropdown-container]')) {
                setIsLocationDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isLocationDropdownOpen]);

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/business/${business_slug}/products/${product_id}/info`);
            setProduct(response.data);
        } catch (err) {
            console.error('Ошибка загрузки товара:', err);
            setError(err.response?.data?.detail || 'Ошибка загрузки товара');
        } finally {
            setLoading(false);
        }
    };

    const fetchBatchesAndDefects = async () => {
        try {
            setBatchesLoading(true);
            const params = {
                sort: batchSort,
                filter: batchFilter,
                page: batchPage,
                page_size: batchPageSize,
                defect_sort: defectSort,
                defect_page: defectPage,
                defect_page_size: defectPageSize,
            };
            const response = await axios.get(
                `/api/business/${business_slug}/products/${product_id}/batches-defects/`,
                { params }
            );
            setBatchesData(response.data.batches || []);
            setDefectsData(response.data.defects || []);
            setBatchesPagination(response.data.batches_pagination);
            setDefectsPagination(response.data.defects_pagination);
        } catch (err) {
            console.error('Ошибка загрузки партий и брака:', err);
            setError(err.response?.data?.detail || 'Ошибка загрузки партий и брака');
        } finally {
            setBatchesLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            setAnalyticsLoading(true);
            const response = await axios.get(
                `/api/business/${business_slug}/products/${product_id}/analytics/`,
                { params: { period: analyticsPeriod } }
            );
            setAnalyticsData(response.data);
        } catch (err) {
            console.error('Ошибка загрузки аналитики:', err);
            setError(err.response?.data?.detail || 'Ошибка загрузки аналитики');
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const handlePriceChange = (locationId, variantId, newPrice) => {
        const key = `${locationId}-${variantId}`;
        setEditedPrices(prev => ({
            ...prev,
            [key]: newPrice
        }));
    };

    const handleSavePrice = async (locationId, variantId, priceId, newPrice) => {
        try {
            setSaving(true);
            
            if (priceId) {
                // Обновляем существующую цену
                await axios.post(`/api/business/${business_slug}/location-price/create/`, {
                    variant_id: variantId,
                    location_id: locationId,
                    selling_price: newPrice,
                    is_active: true
                });
            } else {
                // Создаем новую цену
                await axios.post(`/api/business/${business_slug}/location-price/create/`, {
                    variant_id: variantId,
                    location_id: locationId,
                    selling_price: newPrice,
                    is_active: true
                });
            }

            // Удаляем из editedPrices
            const key = `${locationId}-${variantId}`;
            setEditedPrices(prev => {
                const newState = { ...prev };
                delete newState[key];
                return newState;
            });

            // Перезагружаем данные
            await fetchProduct();
        } catch (err) {
            console.error('Ошибка сохранения цены:', err);
            alert('Ошибка сохранения цены: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = (locationId, variantId) => {
        const key = `${locationId}-${variantId}`;
        setEditedPrices(prev => {
            const newState = { ...prev };
            delete newState[key];
            return newState;
        });
    };

    const handleStartAddingPrice = (locationId, variantId) => {
        const key = `${locationId}-${variantId}`;
        setAddingPrices(prev => ({ ...prev, [key]: 0 }));
    };

    const handleAddPriceChange = (locationId, variantId, newPrice) => {
        const key = `${locationId}-${variantId}`;
        setAddingPrices(prev => ({ ...prev, [key]: newPrice }));
    };

    const handleSaveNewPrice = async (locationId, variantId, newPrice) => {
        try {
            setSaving(true);
            await axios.post(`/api/business/${business_slug}/location-price/create/`, {
                variant_id: variantId,
                location_id: locationId,
                selling_price: newPrice,
                is_active: true
            });

            const key = `${locationId}-${variantId}`;
            setAddingPrices(prev => {
                const newState = { ...prev };
                delete newState[key];
                return newState;
            });

            await fetchProduct();
        } catch (err) {
            console.error('Ошибка добавления цены:', err);
            alert('Ошибка добавления цены: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleTogglePriceActive = async (locationId, variantId, priceId, currentActive) => {
        try {
            setSaving(true);
            await axios.post(`/api/business/${business_slug}/location-price/create/`, {
                variant_id: variantId,
                location_id: locationId,
                selling_price: product.locations
                    .find(loc => loc.id === locationId)
                    .variants.find(v => v.id === variantId).price,
                is_active: !currentActive
            });

            await fetchProduct();
        } catch (err) {
            console.error('Ошибка изменения статуса:', err);
            alert('Ошибка изменения статуса: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActiveFlag = async (locationId, variantId, priceId, flagName, currentValue) => {
        try {
            setSaving(true);
            const variant = product.locations
                .find(loc => loc.id === locationId)
                .variants.find(v => v.id === variantId);
            
            const updateData = {
                variant_id: variantId,
                location_id: locationId,
                selling_price: variant.price,
                is_active: variant.is_price_active,
                [flagName]: !currentValue
            };

            await axios.post(`/api/business/${business_slug}/location-price/create/`, updateData);

            await fetchProduct();
        } catch (err) {
            console.error('Ошибка изменения статуса:', err);
            const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message;
            alert('Ошибка изменения статуса: ' + errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleCancelAddPrice = (locationId, variantId) => {
        const key = `${locationId}-${variantId}`;
        setAddingPrices(prev => {
            const newState = { ...prev };
            delete newState[key];
            return newState;
        });
    };


    // Фильтрация локаций
    const filteredLocations = product && selectedLocationFilter
        ? product.locations.filter(loc => loc.id === selectedLocationFilter)
        : product?.locations || [];

    // Фильтрация локаций для выпадающего меню по поисковому запросу
    const filteredLocationOptions = (product?.locations || []).filter(loc => 
        loc.name.toLowerCase().includes(locationSearchTerm.toLowerCase())
    );

    const handleLocationSelect = (locationId) => {
        setSelectedLocationFilter(locationId);
        setIsLocationDropdownOpen(false);
        setLocationSearchTerm('');
    };

    const handleClearFilter = () => {
        setSelectedLocationFilter(null);
        setLocationSearchTerm('');
    };


    useEffect(() => {
        setBatchPage(1);
    }, [batchFilter, batchSort, batchPageSize]);

    useEffect(() => {
        setDefectPage(1);
    }, [defectSort, defectPageSize]);

    const formatBatchDate = (value) =>
        value ? dayjs(value).format('DD.MM.YYYY') : '—';

    const formatNumber = (value) => Number(value || 0).toLocaleString('ru-RU');

    // Получение всех уникальных вариантов для фильтра
    const allVariants = useMemo(() => {
        if (!product || !product.locations) return [];
        const variantsMap = new Map();
        product.locations.forEach(location => {
            location.variants?.forEach(variant => {
                if (!variantsMap.has(variant.id)) {
                    variantsMap.set(variant.id, variant);
                }
            });
        });
        return Array.from(variantsMap.values());
    }, [product]);

    // Подготовка данных для таблицы общих остатков
    const stockOverviewData = useMemo(() => {
        if (!product || !product.locations) return [];
        
        const rows = [];
        product.locations.forEach(location => {
            if (stockOverviewLocationFilter && location.id !== stockOverviewLocationFilter) return;
            
            location.variants.forEach(variant => {
                if (stockOverviewVariantFilter && variant.id !== stockOverviewVariantFilter) return;
                
                rows.push({
                    id: `${location.id}-${variant.id}`,
                    locationId: location.id,
                    locationName: location.name,
                    variantId: variant.id,
                    variantName: variant.name,
                    sku: variant.sku || '',
                    quantity: variant.quantity || 0,
                    availableQuantity: variant.available_quantity || 0,
                    reservedQuantity: variant.reserved_quantity || 0,
                    defectQuantity: (variant.quantity || 0) - (variant.available_quantity || 0) - (variant.reserved_quantity || 0),
                });
            });
        });
        
        return rows;
    }, [product, stockOverviewLocationFilter, stockOverviewVariantFilter]);

    // Экспорт данных в CSV
    const exportStockOverviewToCSV = () => {
        if (stockOverviewData.length === 0) {
            alert('Нет данных для экспорта');
            return;
        }

        const headers = ['Локация', 'Вариант', 'SKU', 'Всего', 'Доступно', 'Зарезервировано', 'Брак'];
        const rows = stockOverviewData.map(row => [
            row.locationName,
            row.variantName,
            row.sku,
            row.quantity,
            row.availableQuantity,
            row.reservedQuantity,
            row.defectQuantity,
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `остатки_${product.name}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const createEmptyBatchLine = () => ({
        tempId: `${Date.now()}-${Math.random()}`,
        locationId: '',
        variantId: '',
        variantName: '',
        variantOnLocationId: null,
        quantity: 0,
        cost_price: '',
        reserved_quantity: 0,
        is_available_for_sale: true,
        is_active_on_marketplace: false,
        is_active_for_offline_sale: false,
        is_active_on_own_site: false,
    });

    const openBatchModal = () => {
        setBatchForm({
            batch_number: '',
            received_date: dayjs().format('YYYY-MM-DD'),
            supplier: '',
            notes: '',
            stocks: [createEmptyBatchLine()],
        });
        setBatchFormError('');
        setBatchModalOpen(true);
    };

    const closeBatchModal = () => {
        setBatchModalOpen(false);
    };

    const handleBatchFieldChange = (field, value) => {
        setBatchForm(prev => ({ ...prev, [field]: value }));
    };

    const addBatchLine = () => {
        setBatchForm(prev => ({
            ...prev,
            stocks: [...prev.stocks, createEmptyBatchLine()],
        }));
    };

    const removeBatchLine = (tempId) => {
        setBatchForm(prev => {
            const updated = prev.stocks.filter(line => line.tempId !== tempId);
            return {
                ...prev,
                stocks: updated.length ? updated : [createEmptyBatchLine()],
            };
        });
    };

    const handleBatchLineLocationChange = (tempId, locationId) => {
        setBatchForm(prev => ({
            ...prev,
            stocks: prev.stocks.map(line =>
                line.tempId === tempId
                    ? {
                        ...line,
                        locationId,
                        variantId: '',
                        variantName: '',
                        variantOnLocationId: null,
                    }
                    : line
            ),
        }));
    };

    const handleBatchLineVariantChange = (tempId, variantId) => {
        setBatchForm(prev => ({
            ...prev,
            stocks: prev.stocks.map(line => {
                if (line.tempId !== tempId) return line;
                const location = (product?.locations || []).find(
                    loc => Number(loc.id) === Number(line.locationId)
                );
                if (!location) return line;
                const variant = (location.variants || []).find(
                    v => Number(v.id) === Number(variantId)
                );
                if (!variant) return line;
                if (!variant.price_id) {
                    alert('Сначала задайте цену для этого варианта на выбранной локации');
                    return line;
                }
                return {
                    ...line,
                    variantId,
                    variantName: variant.name,
                    variantOnLocationId: variant.price_id,
                };
            }),
        }));
    };

    const handleBatchLineFieldChange = (tempId, field, value) => {
        setBatchForm(prev => ({
            ...prev,
            stocks: prev.stocks.map(line =>
                line.tempId === tempId ? { ...line, [field]: value } : line
            ),
        }));
    };

    const handleSubmitBatch = async () => {
        setBatchFormError('');
        if (!batchForm.stocks.length) {
            setBatchFormError('Добавьте хотя бы одну позицию');
            return;
        }
        const invalidLine = batchForm.stocks.find(
            line => !line.variantOnLocationId || Number(line.quantity) <= 0
        );
        if (invalidLine) {
            setBatchFormError('Укажите локацию, вариант и количество для каждой позиции');
            return;
        }

        const payload = {
            batch_number: batchForm.batch_number || undefined,
            received_date: batchForm.received_date || undefined,
            supplier: batchForm.supplier || undefined,
            notes: batchForm.notes || '',
            stocks: batchForm.stocks.map(line => ({
                variant_on_location_id: line.variantOnLocationId,
                quantity: Number(line.quantity),
                cost_price: line.cost_price === '' ? null : Number(line.cost_price),
                reserved_quantity: line.reserved_quantity === '' ? 0 : Number(line.reserved_quantity),
                is_available_for_sale: !!line.is_available_for_sale,
                is_active_on_marketplace: !!line.is_active_on_marketplace,
                is_active_for_offline_sale: !!line.is_active_for_offline_sale,
                is_active_on_own_site: !!line.is_active_on_own_site,
            })),
        };

        try {
            setBatchSaving(true);
            await axios.post(`/api/business/${business_slug}/batches/create/`, payload);
            setBatchModalOpen(false);
            await fetchBatchesAndDefects();
            await fetchProduct();
            alert('Партия успешно создана');
        } catch (err) {
            const resp = err.response?.data;
            const detail =
                resp?.detail ||
                resp?.message ||
                (typeof resp === 'string'
                    ? resp
                    : JSON.stringify(resp));
            setBatchFormError(detail || 'Не удалось создать партию');
        } finally {
            setBatchSaving(false);
        }
    };

    const openDefectModal = (line, defect = null) => {
        setDefectError('');
        // При редактировании доступное количество = availableQuantity + текущее количество дефекта
        const availableQty = defect 
            ? (line.availableQuantity || 0) + (defect.quantity || 0)
            : (line.availableQuantity || 0);
        
        setDefectModal({
            open: true,
            stockId: line.stockId,
            variantName: line.variantName,
            locationName: line.locationName,
            batchNumber: line.batchNumber,
            quantity: defect ? defect.quantity : '',
            reason: defect ? defect.reason : '',
            defectId: defect ? defect.id : null,
            availableQuantity: availableQty,
        });
    };

    const closeDefectModal = () => {
        setDefectModal({
            open: false,
            stockId: null,
            variantName: '',
            locationName: '',
            batchNumber: '',
            quantity: '',
            reason: '',
            defectId: null,
            availableQuantity: 0,
        });
    };

    const handleSaveDefect = async () => {
        if (!defectModal.stockId) return;
        const qty = Number(defectModal.quantity);
        if (!qty || qty <= 0) {
            setDefectError('Количество должно быть больше 0');
            return;
        }
        if (qty > defectModal.availableQuantity) {
            setDefectError(`Количество не может превышать доступное: ${formatNumber(defectModal.availableQuantity)} шт.`);
            return;
        }

        setDefectSaving(true);
        try {
            if (defectModal.defectId) {
                await axios.patch(
                    `/api/business/${business_slug}/stocks/defects/${defectModal.defectId}/update/`,
                    {
                        quantity: qty,
                        reason: defectModal.reason || '',
                    }
                );
            } else {
                await axios.post(
                    `/api/business/${business_slug}/stocks/${defectModal.stockId}/defects/create/`,
                    {
                        quantity: qty,
                        reason: defectModal.reason || '',
                    }
                );
            }
            await fetchBatchesAndDefects();
            await fetchProduct();
            closeDefectModal();
        } catch (err) {
            const resp = err.response?.data;
            const detail =
                resp?.detail ||
                resp?.message ||
                (typeof resp === 'string'
                    ? resp
                    : Object.values(resp || {})[0]);
            setDefectError(detail || 'Не удалось сохранить брак');
        } finally {
            setDefectSaving(false);
        }
    };

    const handleDeleteDefect = async (defectId) => {
        if (!window.confirm('Удалить запись о браке?')) return;
        try {
            await axios.post(
                `/api/business/${business_slug}/stocks/${defectId}/defects/remove/`
            );
            await fetchBatchesAndDefects();
            await fetchProduct();
        } catch (err) {
            alert('Не удалось удалить брак: ' + (err.response?.data?.detail || err.message));
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <Loader size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.error}>{error}</div>
                <button onClick={() => navigate(`/business/${business_slug}/products/`)}>
                    Вернуться к товарам
                </button>
            </div>
        );
    }

    if (!product) return null;

    const mainImage = product.images.find(img => img.is_main) || product.images[0];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button 
                    className={styles.backButton}
                    onClick={() => navigate(`/business/${business_slug}/products/`)}
                >
                    ← Назад к товарам
                </button>
                <div className={styles.headerTitleRow}>
                <h1 className={styles.title}>{product.name}</h1>
                    <button 
                        className={styles.editButton}
                        onClick={() => navigate(`/business/${business_slug}/products/${product_id}/edit`)}
                    >
                        <i className="fa fa-edit"></i> Редактировать
                    </button>
                </div>
            </div>

            <div className={styles.productInfo}>
                {mainImage && (
                    <div className={styles.imageContainer}>
                        <img 
                            src={getFileUrl(mainImage.image)} 
                            alt={product.name}
                            className={styles.mainImage}
                        />
                    </div>
                )}
                <div className={styles.details}>
                    <div className={styles.category}>Категория: {product.category_name}</div>
                    <div className={styles.description}>{product.description}</div>
                    {(product.min_price || product.max_price) && (
                        <div className={styles.priceRangeInfo}>
                            <span className={styles.priceRangeLabel}>Диапазон цен:</span>
                            <span className={styles.priceRangeValue}>
                                {product.min_price && product.max_price ? (
                                    product.min_price === product.max_price ? (
                                        `${parseFloat(product.min_price).toLocaleString('ru-RU')} ₸`
                                    ) : (
                                        `${parseFloat(product.min_price).toLocaleString('ru-RU')} - ${parseFloat(product.max_price).toLocaleString('ru-RU')} ₸`
                                    )
                                ) : product.min_price ? (
                                    `от ${parseFloat(product.min_price).toLocaleString('ru-RU')} ₸`
                                ) : (
                                    `до ${parseFloat(product.max_price).toLocaleString('ru-RU')} ₸`
                                )}
                            </span>
                        </div>
                    )}
                    <div className={styles.statsInfo}>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Доступно всего:</span>
                            <span className={styles.statValue}>
                                {(product.total_available || 0).toLocaleString('ru-RU')} шт.
                            </span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Брак всего:</span>
                            <span className={`${styles.statValue} ${styles.statValueDefect}`}>
                                {(product.total_defect || 0).toLocaleString('ru-RU')} шт.
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'locations' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('locations')}
                >
                    Информация по локациям
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'batches' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('batches')}
                >
                    Партии и брак
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'stockOverview' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('stockOverview')}
                >
                    Общие остатки
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'salesHistory' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('salesHistory')}
                >
                    История продаж
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'analytics' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    Аналитика
                </button>
            </div>

            {activeTab === 'locations' && (
                <>
                    {/* Фильтр локаций */}
                    <div className={styles.locationFilter}>
                        <label className={styles.filterLabel}>Фильтр по локациям:</label>
                        <div className={styles.dropdownContainer} data-dropdown-container>
                            <div 
                                className={styles.dropdownButton}
                                onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                            >
                                <span>
                                    {selectedLocationFilter && product
                                        ? product.locations.find(l => l.id === selectedLocationFilter)?.name
                                        : 'Все локации'
                                    }
                                </span>
                                <i className={`fa fa-chevron-${isLocationDropdownOpen ? 'up' : 'down'}`}></i>
                            </div>
                            
                            {isLocationDropdownOpen && (
                                <div className={styles.dropdown}>
                                    <div className={styles.searchInputContainer}>
                                        <i className="fa fa-search"></i>
                                        <input
                                            type="text"
                                            placeholder="Поиск локаций..."
                                            value={locationSearchTerm}
                                            onChange={(e) => setLocationSearchTerm(e.target.value)}
                                            className={styles.searchInput}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    <div className={styles.dropdownList}>
                                        <div
                                            className={`${styles.dropdownItem} ${!selectedLocationFilter ? styles.selected : ''}`}
                                            onClick={() => handleClearFilter()}
                                        >
                                            Все локации
                                            {!selectedLocationFilter && <i className="fa fa-check"></i>}
                                        </div>
                                        {filteredLocationOptions.map(location => (
                                            <div
                                                key={location.id}
                                                className={`${styles.dropdownItem} ${selectedLocationFilter === location.id ? styles.selected : ''}`}
                                                onClick={() => handleLocationSelect(location.id)}
                                            >
                                                {location.name}
                                                {selectedLocationFilter === location.id && <i className="fa fa-check"></i>}
                                            </div>
                                        ))}
                                        {filteredLocationOptions.length === 0 && (
                                            <div className={styles.noResults}>Локации не найдены</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        {selectedLocationFilter && (
                            <button
                                onClick={handleClearFilter}
                                className={styles.clearFilterButton}
                            >
                                <i className="fa fa-times"></i> Сбросить
                            </button>
                        )}
                    </div>

                    <div className={styles.locationsList}>
                    {filteredLocations.map(location => (
                    <div key={location.id} className={styles.locationCard}>
                        <h3 className={styles.locationName}>{location.name}</h3>
                        <div className={styles.variantsList}>
                            {location.variants.map(variant => {
                                const editKey = `${location.id}-${variant.id}`;
                                const isEditing = editedPrices.hasOwnProperty(editKey);
                                const isAdding = addingPrices.hasOwnProperty(editKey);
                                const editedPrice = editedPrices[editKey];
                                const addingPrice = addingPrices[editKey];

                                return (
                                    <div key={variant.id} className={styles.variantCard}>
                                        <div className={styles.variantHeader}>
                                            <span className={styles.variantName}>{variant.name}</span>
                                            <span className={styles.variantSku}>SKU: {variant.sku}</span>
                                        </div>
                                        <div className={styles.variantAttributes}>
                                            {variant.attributes.map((attr, idx) => (
                                                <span key={idx} className={styles.attributeTag}>
                                                    {attr.name}: {attr.value}
                                                </span>
                                            ))}
                                        </div>
                                        <div className={styles.variantDetails}>
                                            {!variant.price && !isAdding ? (
                                                <button
                                                    className={styles.addPriceButton}
                                                    onClick={() => handleStartAddingPrice(location.id, variant.id)}
                                                >
                                                    <i className="fa fa-plus"></i> Добавить цену
                                                </button>
                                            ) : isAdding ? (
                                                <div className={styles.priceEdit}>
                                                    <input
                                                        type="number"
                                                        value={addingPrice}
                                                        onChange={(e) => handleAddPriceChange(location.id, variant.id, e.target.value)}
                                                        className={styles.priceInput}
                                                        placeholder="Цена"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                    <div className={styles.editButtons}>
                                                        <button
                                                            onClick={() => handleSaveNewPrice(location.id, variant.id, addingPrice)}
                                                            disabled={saving}
                                                            className={styles.saveButton}
                                                        >
                                                            Сохранить
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelAddPrice(location.id, variant.id)}
                                                            className={styles.cancelButton}
                                                        >
                                                            Отмена
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : isEditing ? (
                                                <div className={styles.priceEdit}>
                                                    <input
                                                        type="number"
                                                        value={editedPrice}
                                                        onChange={(e) => handlePriceChange(location.id, variant.id, e.target.value)}
                                                        className={styles.priceInput}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                    <div className={styles.editButtons}>
                                                        <button
                                                            onClick={() => handleSavePrice(location.id, variant.id, variant.price_id, editedPrice)}
                                                            disabled={saving}
                                                            className={styles.saveButton}
                                                        >
                                                            Сохранить
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelEdit(location.id, variant.id)}
                                                            className={styles.cancelButton}
                                                        >
                                                            Отмена
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={styles.priceSection}>
                                                    <div className={styles.priceRow}>
                                                        <div className={styles.priceInfo}>
                                                            <span className={styles.priceLabel}>Цена:</span>
                                                            <span className={styles.priceValue}>
                                                                {parseFloat(variant.price).toLocaleString('ru-RU')} ₸
                                                            </span>
                                                            <label className={styles.isActiveToggle}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={variant.is_price_active}
                                                                    onChange={() => handleTogglePriceActive(location.id, variant.id, variant.price_id, variant.is_price_active)}
                                                                    disabled={saving}
                                                                />
                                                                <span className={styles.toggleLabel}>
                                                                    {variant.is_price_active ? 'Активна' : 'Неактивна'}
                                                                </span>
                                                            </label>
                                                        </div>
                                                        <div className={styles.priceActions}>
                                                            <button
                                                                onClick={() => setEditedPrices(prev => ({ ...prev, [editKey]: variant.price }))}
                                                                className={styles.editButton}
                                                            >
                                                                Изменить
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className={styles.activeFlagsSection}>
                                                        <div className={styles.activeFlagsTitle}>Активность товара:</div>
                                                        <div className={styles.activeFlagsList}>
                                                            <label className={styles.activeFlagItem}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={variant.is_active_on_marketplace || false}
                                                                    onChange={() => handleToggleActiveFlag(
                                                                        location.id,
                                                                        variant.id,
                                                                        variant.price_id,
                                                                        'is_active_on_marketplace',
                                                                        variant.is_active_on_marketplace || false
                                                                    )}
                                                                    disabled={saving || variant.available_quantity === 0}
                                                                    title={variant.available_quantity === 0 ? 'Товар закончился. Добавьте партию товара перед активацией.' : ''}
                                                                />
                                                                <span className={styles.flagLabel}>
                                                                    Активен на маркетплейсе
                                                                </span>
                                                            </label>
                                                            <label className={styles.activeFlagItem}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={variant.is_active_for_offline_sale || false}
                                                                    onChange={() => handleToggleActiveFlag(
                                                                        location.id,
                                                                        variant.id,
                                                                        variant.price_id,
                                                                        'is_active_for_offline_sale',
                                                                        variant.is_active_for_offline_sale || false
                                                                    )}
                                                                    disabled={saving || variant.available_quantity === 0}
                                                                    title={variant.available_quantity === 0 ? 'Товар закончился. Добавьте партию товара перед активацией.' : ''}
                                                                />
                                                                <span className={styles.flagLabel}>
                                                                    Активен для оффлайн продажи
                                                                </span>
                                                            </label>
                                                            <label className={styles.activeFlagItem}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={variant.is_active_on_own_site || false}
                                                                    onChange={() => handleToggleActiveFlag(
                                                                        location.id,
                                                                        variant.id,
                                                                        variant.price_id,
                                                                        'is_active_on_own_site',
                                                                        variant.is_active_on_own_site || false
                                                                    )}
                                                                    disabled={saving || variant.available_quantity === 0}
                                                                    title={variant.available_quantity === 0 ? 'Товар закончился. Добавьте партию товара перед активацией.' : ''}
                                                                />
                                                                <span className={styles.flagLabel}>
                                                                    Активен для продажи на личном сайте
                                                                </span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className={styles.stockInfo}>
                                                <div className={styles.stockItem}>
                                                    <span>Доступно:</span>
                                                    <strong>{variant.available_quantity} шт.</strong>
                                                </div>
                                                <div className={styles.stockItem}>
                                                    <span>Резерв:</span>
                                                    <strong>{variant.reserved_quantity} шт.</strong>
                                                </div>
                                                <div className={styles.stockItem}>
                                                    <span>Брак:</span>
                                                    <strong className={styles.defectQuantity}>
                                                        {variant.defect_quantity || 0} шт.
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                </div>
                </>
            )}

            {activeTab === 'batches' && (
                <div className={styles.batchesSection}>
                    <div className={styles.batchesHeader}>
                        <div>
                            <h2>Партии и брак</h2>
                            <p>Контролируйте поставки и фиксируйте брак прямо со страницы товара.</p>
                        </div>
                    </div>
                    <div className={styles.batchControls}>
                        <div className={styles.filterGroup}>
                            <button
                                className={`${styles.filterButton} ${batchFilter === 'all' ? styles.filterButtonActive : ''}`}
                                onClick={() => setBatchFilter('all')}
                            >
                                Все
                            </button>
                            <button
                                className={`${styles.filterButton} ${batchFilter === 'has_stock' ? styles.filterButtonActive : ''}`}
                                onClick={() => setBatchFilter('has_stock')}
                            >
                                С остатком
                            </button>
                            <button
                                className={`${styles.filterButton} ${batchFilter === 'sold_out' ? styles.filterButtonActive : ''}`}
                                onClick={() => setBatchFilter('sold_out')}
                            >
                                Распроданы
                            </button>
                        </div>
                        <div className={styles.sortGroup}>
                            <label>Сортировка</label>
                            <select value={batchSort} onChange={(e) => setBatchSort(e.target.value)}>
                                <option value="recent">Сначала новые</option>
                                <option value="oldest">Сначала старые</option>
                                <option value="available">По остатку</option>
                                <option value="sold_out">Распроданы</option>
                                <option value="defect">По браку</option>
                            </select>
                        </div>
                        <div className={styles.pageSizeGroup}>
                            <label>На странице</label>
                            <select value={batchPageSize} onChange={(e) => setBatchPageSize(Number(e.target.value))}>
                                {[3, 5, 10].map((size) => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {batchesLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                            <Loader size="medium" />
                        </div>
                    ) : batchesData.length === 0 ? (
                        <div className={styles.emptyState}>
                            Поставок для этого товара пока нет. Создайте первую партию, чтобы добавить остатки.
                        </div>
                    ) : (
                        <div className={styles.batchesList}>
                            {batchesData.map(batch => (
                                <div key={batch.key} className={styles.batchCard}>
                                    <div className={styles.batchCardHeader}>
                                        <div>
                                            <div className={styles.batchNumber}>Партия {batch.batchNumber || 'Без партии'}</div>
                                            <div className={styles.batchMeta}>
                                                <span>{batch.batchStatusDisplay || 'Статус не указан'}</span>
                                                <span>Получено: {formatBatchDate(batch.receivedDate)}</span>
                                            </div>
                                        </div>
                                        <div className={styles.batchTotals}>
                                            <div>
                                                <span>Всего</span>
                                                <strong>{formatNumber(batch.totalQuantity)} шт.</strong>
                                            </div>
                                            <div>
                                                <span>Доступно</span>
                                                <strong>{formatNumber(batch.totalAvailable)} шт.</strong>
                                            </div>
                                            <div>
                                                <span>Резерв</span>
                                                <strong>{formatNumber(batch.totalReserved)} шт.</strong>
                                            </div>
                                            <div>
                                                <span>Брак</span>
                                                <strong>{formatNumber(batch.totalDefect)} шт.</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.batchLines}>
                                        {batch.lines.map(line => (
                                            <div key={line.stockId} className={styles.batchLine}>
                                                <div className={styles.batchLineInfo}>
                                                    <div className={styles.batchLineTitle}>
                                                        {line.variantName}
                                                        <span className={styles.batchLineSku}>SKU: {line.sku}</span>
                                                    </div>
                                                    <div className={styles.batchLineLocation}>{line.locationName}</div>
                                                    <div className={styles.batchLineStats}>
                                                        <span>Поступило: {formatNumber(line.quantity)} шт.</span>
                                                        <span>Доступно: {formatNumber(line.availableQuantity)} шт.</span>
                                                        <span>Резерв: {formatNumber(line.reservedQuantity)} шт.</span>
                                                        <span>Брак: {formatNumber(line.defectQuantity)} шт.</span>
                                                        {line.costPrice !== null && line.costPrice !== undefined && (
                                                            <span>
                                                                Себестоимость: {parseFloat(line.costPrice).toLocaleString('ru-RU')} ₸
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={styles.batchLineActions}>
                                                    <button
                                                        className={styles.secondaryButton}
                                                        onClick={() => openDefectModal(line)}
                                                        disabled={defectSaving}
                                                    >
                                                        <i className="fa fa-exclamation-triangle"></i> Добавить брак
                                                    </button>
                                                </div>
                                                {line.defects.length > 0 && (
                                                    <div className={styles.defectsList}>
                                                        {line.defects.map(defect => (
                                                            <div key={defect.id} className={styles.defectItem}>
                                                                <div>
                                                                    <strong>{formatNumber(defect.quantity)} шт.</strong>
                                                                    <span>{defect.reason || 'Без комментария'}</span>
                                                                </div>
                                                                <div className={styles.defectActions}>
                                                                    <button
                                                                        className={styles.linkButton}
                                                                        onClick={() => openDefectModal(line, defect)}
                                                                        disabled={defectSaving}
                                                                    >
                                                                        Изменить
                                                                    </button>
                                                                    <button
                                                                        className={styles.linkButtonDanger}
                                                                        onClick={() => handleDeleteDefect(defect.id)}
                                                                        disabled={defectSaving}
                                                                    >
                                                                        Удалить
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {batchesPagination && batchesPagination.total_pages > 1 && (
                        <div className={styles.pagination}>
                            <button
                                onClick={() => setBatchPage((prev) => Math.max(prev - 1, 1))}
                                disabled={!batchesPagination.has_previous}
                            >
                                <i className="fa fa-chevron-left"></i>
                            </button>
                            <span>{batchesPagination.current_page} / {batchesPagination.total_pages}</span>
                            <button
                                onClick={() => setBatchPage((prev) => prev + 1)}
                                disabled={!batchesPagination.has_next}
                            >
                                <i className="fa fa-chevron-right"></i>
                            </button>
                        </div>
                    )}

                    <div className={styles.defectsJournal}>
                        <div className={styles.defectsHeader}>
                            <div>
                                <h3>Журнал брака</h3>
                                <p>Все случаи выявленного брака по товарам.</p>
                            </div>
                            <div className={styles.defectControls}>
                                <label>Сортировка</label>
                                <select value={defectSort} onChange={(e) => setDefectSort(e.target.value)}>
                                    <option value="recent">Сначала новые</option>
                                    <option value="oldest">Сначала старые</option>
                                    <option value="quantity">По количеству</option>
                                </select>
                                <label>На странице</label>
                                <select value={defectPageSize} onChange={(e) => setDefectPageSize(Number(e.target.value))}>
                                    {[10, 20, 50].map((size) => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {defectsData.length === 0 ? (
                            <div className={styles.emptyState}>
                                Записей о браке пока нет. Добавьте брак через соответствующую партию.
                            </div>
                        ) : (
                            <>
                                <div className={styles.defectsTable}>
                                    <div className={styles.defectsTableHead}>
                                        <span>Дата</span>
                                        <span>Партия</span>
                                        <span>Вариант</span>
                                        <span>Локация</span>
                                        <span>Количество</span>
                                        <span>Комментарий</span>
                                    </div>
                                    {defectsData.map((defect) => (
                                        <div key={defect.id} className={styles.defectsTableRow}>
                                            <span>{defect.createdAt ? dayjs(defect.createdAt).format('DD.MM.YYYY HH:mm') : '—'}</span>
                                            <span>{defect.batchNumber || '—'}</span>
                                            <span>{defect.variantName}</span>
                                            <span>{defect.locationName}</span>
                                            <span>{formatNumber(defect.quantity)} шт.</span>
                                            <span>{defect.reason || '—'}</span>
                                        </div>
                                    ))}
                                </div>
                                {defectsPagination && defectsPagination.total_pages > 1 && (
                                    <div className={styles.pagination}>
                                        <button
                                            onClick={() => setDefectPage((prev) => Math.max(prev - 1, 1))}
                                            disabled={!defectsPagination.has_previous}
                                        >
                                            <i className="fa fa-chevron-left"></i>
                                        </button>
                                        <span>{defectsPagination.current_page} / {defectsPagination.total_pages}</span>
                                        <button
                                            onClick={() => setDefectPage((prev) => prev + 1)}
                                            disabled={!defectsPagination.has_next}
                                        >
                                            <i className="fa fa-chevron-right"></i>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'stockOverview' && (
                <div className={styles.stockOverviewSection}>
                    <div className={styles.stockOverviewHeader}>
                        <div>
                            <h2>Общие остатки</h2>
                            <p>Сводная таблица остатков по всем вариантам и локациям</p>
                        </div>
                        <button
                            className={styles.primaryButton}
                            onClick={exportStockOverviewToCSV}
                        >
                            <i className="fa fa-download"></i> Экспорт в CSV
                        </button>
                    </div>

                    <div className={styles.stockOverviewFilters}>
                        <div className={styles.filterGroup}>
                            <label>Фильтр по локации:</label>
                            <select
                                value={stockOverviewLocationFilter || ''}
                                onChange={(e) => setStockOverviewLocationFilter(e.target.value ? Number(e.target.value) : null)}
                                className={styles.filterSelect}
                            >
                                <option value="">Все локации</option>
                                {product?.locations?.map(location => (
                                    <option key={location.id} value={location.id}>
                                        {location.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Фильтр по варианту:</label>
                            <select
                                value={stockOverviewVariantFilter || ''}
                                onChange={(e) => setStockOverviewVariantFilter(e.target.value ? Number(e.target.value) : null)}
                                className={styles.filterSelect}
                            >
                                <option value="">Все варианты</option>
                                {allVariants.map(variant => (
                                    <option key={variant.id} value={variant.id}>
                                        {variant.name} {variant.sku ? `(${variant.sku})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {stockOverviewData.length === 0 ? (
                        <div className={styles.emptyState}>
                            Нет данных об остатках для отображения
                        </div>
                    ) : (
                        <div className={styles.stockOverviewTable}>
                            <div className={styles.stockOverviewTableHead}>
                                <span>Локация</span>
                                <span>Вариант</span>
                                <span>SKU</span>
                                <span>Всего</span>
                                <span>Доступно</span>
                                <span>Зарезервировано</span>
                                <span>Брак</span>
                            </div>
                            {stockOverviewData.map((row) => (
                                <div key={row.id} className={styles.stockOverviewTableRow}>
                                    <span>{row.locationName}</span>
                                    <span>{row.variantName}</span>
                                    <span>{row.sku || '—'}</span>
                                    <span>{formatNumber(row.quantity)}</span>
                                    <span className={styles.availableQuantity}>
                                        {formatNumber(row.availableQuantity)}
                                    </span>
                                    <span className={styles.reservedQuantity}>
                                        {formatNumber(row.reservedQuantity)}
                                    </span>
                                    <span className={styles.defectQuantity}>
                                        {formatNumber(row.defectQuantity)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {stockOverviewData.length > 0 && (
                        <div className={styles.stockOverviewSummary}>
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}>Всего записей:</span>
                                <span className={styles.summaryValue}>{stockOverviewData.length}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}>Общее доступно:</span>
                                <span className={`${styles.summaryValue} ${styles.summaryAvailable}`}>
                                    {formatNumber(stockOverviewData.reduce((sum, row) => sum + row.availableQuantity, 0))}
                                </span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}>Общий брак:</span>
                                <span className={`${styles.summaryValue} ${styles.summaryDefect}`}>
                                    {formatNumber(stockOverviewData.reduce((sum, row) => sum + row.defectQuantity, 0))}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'salesHistory' && (
                <ProductSalesHistory 
                    businessSlug={business_slug} 
                    productId={product_id} 
                />
            )}

            {activeTab === 'analytics' && (
                <div className={styles.analyticsSection}>
                    <div className={styles.analyticsHeader}>
                        <div>
                            <h2>Аналитика товара</h2>
                            <p>Графики продаж, динамика остатков и прогнозы</p>
                        </div>
                        <div className={styles.analyticsPeriodSelector}>
                            <label>Период:</label>
                            <select
                                value={analyticsPeriod}
                                onChange={(e) => setAnalyticsPeriod(e.target.value)}
                                className={styles.filterSelect}
                            >
                                <option value="day">По дням (7 дней)</option>
                                <option value="month">По месяцам (90 дней)</option>
                            </select>
                        </div>
                    </div>

                    {analyticsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                            <Loader size="medium" />
                        </div>
                    ) : analyticsData ? (
                        <>
                            {/* Общие итоги */}
                            <div className={styles.analyticsStats}>
                                <div className={styles.analyticsStatCard}>
                                    <div className={styles.statLabel}>Выручка</div>
                                    <div className={styles.statValue}>
                                        {formatNumber(analyticsData.totals?.revenue || 0)} ₸
                                    </div>
                                </div>
                                <div className={styles.analyticsStatCard}>
                                    <div className={styles.statLabel}>Продано товаров</div>
                                    <div className={styles.statValue}>
                                        {formatNumber(analyticsData.totals?.quantity_sold || 0)} шт.
                                    </div>
                                </div>
                                <div className={styles.analyticsStatCard}>
                                    <div className={styles.statLabel}>Заказов</div>
                                    <div className={styles.statValue}>
                                        {formatNumber(analyticsData.totals?.orders_count || 0)}
                                    </div>
                                </div>
                            </div>

                            {/* График продаж */}
                            <div className={styles.analyticsChartSection}>
                                <h3>График продаж</h3>
                                <div className={styles.chartContainer}>
                                    <canvas ref={salesChartRef} style={{ maxHeight: '400px' }}></canvas>
                                </div>
                            </div>

                            {/* Популярность вариантов */}
                            <div className={styles.analyticsSubSection}>
                                <h3>Популярность вариантов</h3>
                                {analyticsData.variant_popularity && analyticsData.variant_popularity.length > 0 ? (
                                    <div className={styles.variantPopularityTable}>
                                        <div className={styles.variantPopularityHead}>
                                            <span>Вариант</span>
                                            <span>SKU</span>
                                            <span>Выручка</span>
                                            <span>Продано</span>
                                            <span>Заказов</span>
                                        </div>
                                        {analyticsData.variant_popularity.map((variant) => (
                                            <div key={variant.id} className={styles.variantPopularityRow}>
                                                <span>{variant.name}</span>
                                                <span>{variant.sku || '—'}</span>
                                                <span>{formatNumber(variant.revenue)} ₸</span>
                                                <span>{formatNumber(variant.quantity_sold)} шт.</span>
                                                <span>{formatNumber(variant.orders_count)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>Нет данных о продажах вариантов</div>
                                )}
                            </div>

                            {/* Прогнозы */}
                            <div className={styles.analyticsSubSection}>
                                <h3>Прогнозы</h3>
                                <div className={styles.forecastCards}>
                                    <div className={styles.forecastCard}>
                                        <div className={styles.forecastTitle}>Следующие 7 дней</div>
                                        <div className={styles.forecastValue}>
                                            Выручка: {formatNumber(analyticsData.forecast?.next_7_days?.revenue || 0)} ₸
                                        </div>
                                        <div className={styles.forecastValue}>
                                            Продажи: {formatNumber(analyticsData.forecast?.next_7_days?.quantity || 0)} шт.
                                        </div>
                                    </div>
                                    <div className={styles.forecastCard}>
                                        <div className={styles.forecastTitle}>Следующие 30 дней</div>
                                        <div className={styles.forecastValue}>
                                            Выручка: {formatNumber(analyticsData.forecast?.next_30_days?.revenue || 0)} ₸
                                        </div>
                                        <div className={styles.forecastValue}>
                                            Продажи: {formatNumber(analyticsData.forecast?.next_30_days?.quantity || 0)} шт.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Динамика остатков */}
                            <div className={styles.analyticsSubSection}>
                                <h3>Текущие остатки</h3>
                                <div className={styles.stockDynamics}>
                                    <div className={styles.stockDynamicsItem}>
                                        <span className={styles.stockDynamicsLabel}>Всего:</span>
                                        <span className={styles.stockDynamicsValue}>
                                            {formatNumber(analyticsData.stock_dynamics?.current?.total_quantity || 0)} шт.
                                        </span>
                                    </div>
                                    <div className={styles.stockDynamicsItem}>
                                        <span className={styles.stockDynamicsLabel}>Доступно:</span>
                                        <span className={`${styles.stockDynamicsValue} ${styles.availableQuantity}`}>
                                            {formatNumber(analyticsData.stock_dynamics?.current?.available_quantity || 0)} шт.
                                        </span>
                                    </div>
                                    <div className={styles.stockDynamicsItem}>
                                        <span className={styles.stockDynamicsLabel}>Зарезервировано:</span>
                                        <span className={`${styles.stockDynamicsValue} ${styles.reservedQuantity}`}>
                                            {formatNumber(analyticsData.stock_dynamics?.current?.reserved_quantity || 0)} шт.
                                        </span>
                                    </div>
                                    <div className={styles.stockDynamicsItem}>
                                        <span className={styles.stockDynamicsLabel}>Брак:</span>
                                        <span className={`${styles.stockDynamicsValue} ${styles.defectQuantity}`}>
                                            {formatNumber(analyticsData.stock_dynamics?.current?.defect_quantity || 0)} шт.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={styles.emptyState}>Нет данных для отображения</div>
                    )}
                </div>
            )}

            {batchModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Новая партия для {product.name}</h3>
                            <button className={styles.closeButton} onClick={closeBatchModal}>
                                <i className="fa fa-times"></i>
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.modalGrid}>
                                <label>
                                    Номер партии (опционально)
                                    <input
                                        type="text"
                                        value={batchForm.batch_number}
                                        onChange={(e) => handleBatchFieldChange('batch_number', e.target.value)}
                                    />
                                </label>
                                <label>
                                    Дата поступления
                                    <input
                                        type="date"
                                        value={batchForm.received_date}
                                        onChange={(e) => handleBatchFieldChange('received_date', e.target.value)}
                                    />
                                </label>
                                <label>
                                    Поставщик
                                    <input
                                        type="text"
                                        value={batchForm.supplier}
                                        onChange={(e) => handleBatchFieldChange('supplier', e.target.value)}
                                        placeholder="ООО «Поставщик»"
                                    />
                                </label>
                                <label>
                                    Заметки
                                    <textarea
                                        value={batchForm.notes}
                                        onChange={(e) => handleBatchFieldChange('notes', e.target.value)}
                                        rows={2}
                                        placeholder="Дополнительная информация о партии"
                                    />
                                </label>
                            </div>

                            <div className={styles.batchLinesBuilder}>
                                <div className={styles.batchLinesHeader}>
                                    <h4>Товары в партии</h4>
                                    <button
                                        type="button"
                                        className={styles.linkButton}
                                        onClick={addBatchLine}
                                    >
                                        <i className="fa fa-plus"></i> Добавить позицию
                                    </button>
                                </div>
                                {batchForm.stocks.map(line => {
                                    const location = (product.locations || []).find(
                                        loc => Number(loc.id) === Number(line.locationId)
                                    );
                                    const variantsForLocation = location?.variants || [];
                                    return (
                                        <div key={line.tempId} className={styles.batchLineRow}>
                                            <div className={styles.batchLineColumn}>
                                                <label>
                                                    Локация
                                                    <select
                                                        value={line.locationId}
                                                        onChange={(e) => handleBatchLineLocationChange(line.tempId, e.target.value)}
                                                    >
                                                        <option value="">Выберите локацию</option>
                                                        {product.locations.map(loc => (
                                                            <option key={loc.id} value={loc.id}>
                                                                {loc.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </div>
                                            <div className={styles.batchLineColumn}>
                                                    <label>
                                                        Вариант
                                                        <select
                                                            value={line.variantId}
                                                            onChange={(e) => handleBatchLineVariantChange(line.tempId, e.target.value)}
                                                            disabled={!line.locationId}
                                                        >
                                                            <option value="">Выберите вариант</option>
                                                            {variantsForLocation.map(variant => (
                                                                <option
                                                                    key={variant.id}
                                                                    value={variant.id}
                                                                    disabled={!variant.price_id}
                                                                >
                                                                    {variant.name}{!variant.price_id ? ' (нет цены)' : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </label>
                                            </div>
                                            <div className={styles.batchLineColumn}>
                                                <label>
                                                    Количество
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={line.quantity}
                                                        onChange={(e) => handleBatchLineFieldChange(line.tempId, 'quantity', e.target.value)}
                                                    />
                                                </label>
                                            </div>
                                            <div className={styles.batchLineColumn}>
                                                <label>
                                                    Себестоимость
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={line.cost_price}
                                                        onChange={(e) => handleBatchLineFieldChange(line.tempId, 'cost_price', e.target.value)}
                                                        placeholder="₸"
                                                    />
                                                </label>
                                            </div>
                                            <div className={styles.batchLineColumn}>
                                                <label>
                                                    Резерв
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={line.reserved_quantity}
                                                        onChange={(e) => handleBatchLineFieldChange(line.tempId, 'reserved_quantity', e.target.value)}
                                                    />
                                                </label>
                                            </div>
                                            <div className={styles.batchLineToggles}>
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={line.is_available_for_sale}
                                                        onChange={(e) => handleBatchLineFieldChange(line.tempId, 'is_available_for_sale', e.target.checked)}
                                                    />
                                                    Доступно для продажи
                                                </label>
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={line.is_active_on_marketplace}
                                                        onChange={(e) => handleBatchLineFieldChange(line.tempId, 'is_active_on_marketplace', e.target.checked)}
                                                    />
                                                    На маркетплейсе
                                                </label>
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={line.is_active_for_offline_sale}
                                                        onChange={(e) => handleBatchLineFieldChange(line.tempId, 'is_active_for_offline_sale', e.target.checked)}
                                                    />
                                                    Оффлайн продажи
                                                </label>
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={line.is_active_on_own_site}
                                                        onChange={(e) => handleBatchLineFieldChange(line.tempId, 'is_active_on_own_site', e.target.checked)}
                                                    />
                                                    Личный сайт
                                                </label>
                                            </div>
                                            <button
                                                type="button"
                                                className={styles.removeLineButton}
                                                onClick={() => removeBatchLine(line.tempId)}
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    );
                                })}
                                {batchFormError && (
                                    <div className={styles.errorMessage}>{batchFormError}</div>
                                )}
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.secondaryButton}
                                onClick={closeBatchModal}
                                disabled={batchSaving}
                            >
                                Отмена
                            </button>
                            <button
                                className={styles.primaryButton}
                                onClick={handleSubmitBatch}
                                disabled={batchSaving}
                            >
                                {batchSaving ? 'Сохраняем...' : 'Создать партию'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {defectModal.open && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>{defectModal.defectId ? 'Редактирование брака' : 'Добавить брак'}</h3>
                            <button className={styles.closeButton} onClick={closeDefectModal}>
                                <i className="fa fa-times"></i>
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.defectMeta}>
                                <div className={styles.defectMetaRow}>
                                    <span className={styles.defectMetaLabel}>Партия:</span>
                                    <span className={styles.defectMetaValue}>
                                        {defectModal.batchNumber || 'Без номера'}
                                    </span>
                                </div>
                                <div className={styles.defectMetaRow}>
                                    <span className={styles.defectMetaLabel}>Вариант:</span>
                                    <span className={styles.defectMetaValue}>{defectModal.variantName}</span>
                                </div>
                                <div className={styles.defectMetaRow}>
                                    <span className={styles.defectMetaLabel}>Локация:</span>
                                    <span className={styles.defectMetaValue}>{defectModal.locationName}</span>
                                </div>
                                <div className={styles.defectMetaRow}>
                                    <span className={styles.defectMetaLabel}>Доступно для брака:</span>
                                    <span className={`${styles.defectMetaValue} ${styles.availableQuantity}`}>
                                        {formatNumber(defectModal.availableQuantity)} шт.
                                    </span>
                                </div>
                            </div>
                            <label>
                                Количество брака
                                <input
                                    type="number"
                                    min="1"
                                    max={defectModal.availableQuantity}
                                    value={defectModal.quantity}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Очищаем ошибку при изменении
                                        if (defectError) {
                                            setDefectError('');
                                        }
                                        if (value === '') {
                                            setDefectModal(prev => ({ ...prev, quantity: '' }));
                                            return;
                                        }
                                        const numValue = Number(value);
                                        if (!isNaN(numValue) && numValue > 0) {
                                            // Ограничиваем максимальным доступным количеством
                                            const limitedValue = Math.min(numValue, defectModal.availableQuantity);
                                            setDefectModal(prev => ({ ...prev, quantity: limitedValue.toString() }));
                                        }
                                    }}
                                    placeholder="Введите количество"
                                />
                                {defectModal.availableQuantity > 0 && (
                                    <span className={styles.inputHint}>
                                        Максимум: {formatNumber(defectModal.availableQuantity)} шт.
                                    </span>
                                )}
                            </label>
                            <label>
                                Причина брака
                                <textarea
                                    rows={4}
                                    value={defectModal.reason}
                                    onChange={(e) => setDefectModal(prev => ({ ...prev, reason: e.target.value }))}
                                    placeholder="Опишите причину брака, например: повреждена упаковка, брак производства и т.д."
                                />
                            </label>
                            {defectError && <div className={styles.errorMessage}>{defectError}</div>}
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.secondaryButton}
                                onClick={closeDefectModal}
                                disabled={defectSaving}
                            >
                                Отмена
                            </button>
                            <button
                                className={styles.primaryButton}
                                onClick={handleSaveDefect}
                                disabled={defectSaving}
                            >
                                {defectSaving ? 'Сохраняем...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductPageNew;

