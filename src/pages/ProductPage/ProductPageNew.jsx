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
    const [writeoffModal, setWriteoffModal] = useState({
        open: false,
        stockId: null,
        variantName: '',
        locationName: '',
        batchNumber: '',
        quantity: '',
        reason: 'other',
        reasonDetail: '',
        availableQuantity: 0,
        writeoffId: null, // ID списания для редактирования
    });
    const [writeoffSaving, setWriteoffSaving] = useState(false);
    const [writeoffError, setWriteoffError] = useState('');
    const [batchHistoryModal, setBatchHistoryModal] = useState({
        open: false,
        stockId: null,
        batchNumber: '',
        variantName: '',
        locationName: '',
        history: [],
        loading: false,
    });
    const [variantLocationHistoryModal, setVariantLocationHistoryModal] = useState({
        open: false,
        variantLocationId: null,
        variantName: '',
        locationName: '',
        history: [],
        loading: false,
        page: 1,
        hasMore: false,
        loadingMore: false,
    });
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
    const [analyticsData, setAnalyticsData] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsPeriod, setAnalyticsPeriod] = useState('day');
    const [locationBatchesShown, setLocationBatchesShown] = useState({}); // {locationId: count}
    const [locationBatchFilter, setLocationBatchFilter] = useState({}); // {locationId: 'all'|'has_stock'|'sold_out'}
    const [locationBatchesData, setLocationBatchesData] = useState({}); // {locationId: {batches: [], pagination: {}}}
    const [locationBatchesLoading, setLocationBatchesLoading] = useState({}); // {locationId: boolean}
    const salesChartRef = useRef(null);
    const salesChartInstance = useRef(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        fetchProduct();
    }, [business_slug, product_id]);

    // Сброс индекса изображения при загрузке нового продукта
    useEffect(() => {
        if (product?.images?.length > 0) {
            const mainIndex = product.images.findIndex(img => img.is_main);
            setCurrentImageIndex(mainIndex >= 0 ? mainIndex : 0);
        }
    }, [product?.id]);

    useEffect(() => {
        // Загружаем локации отдельным запросом после загрузки основного продукта
        if (product && product.id && !product.locations) {
            fetchProductLocations();
        }
    }, [product?.id, business_slug, product_id]);

    useEffect(() => {
        if (activeTab === 'locations' && product?.locations) {
            // Загружаем партии для каждой локации
            product.locations.forEach(location => {
                const filter = locationBatchFilter[location.id] || 'all';
                fetchBatchesForLocation(location.id, filter, 1, false);
            });
        }
    }, [activeTab, business_slug, product_id, product?.locations?.length]);

    // Перезагружаем партии при изменении фильтра локаций
    useEffect(() => {
        if (activeTab === 'locations' && product?.locations) {
            if (selectedLocationFilter) {
                // Загружаем партии только для выбранной локации
                const filter = locationBatchFilter[selectedLocationFilter] || 'all';
                fetchBatchesForLocation(selectedLocationFilter, filter, 1, false);
            } else {
                // Загружаем партии для всех локаций
                product.locations.forEach(location => {
                    const filter = locationBatchFilter[location.id] || 'all';
                    fetchBatchesForLocation(location.id, filter, 1, false);
                });
            }
        }
    }, [selectedLocationFilter, activeTab]);

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

    const fetchProductLocations = async (locationId = null) => {
        try {
            const params = locationId ? { location_id: locationId } : {};
            const response = await axios.get(
                `/api/business/${business_slug}/products/${product_id}/locations/`,
                { params }
            );
            setProduct(prev => ({
                ...prev,
                locations: response.data.locations || []
            }));
        } catch (err) {
            console.error('Ошибка загрузки локаций товара:', err);
            // Не показываем ошибку пользователю, просто оставляем пустой массив
            setProduct(prev => ({
                ...prev,
                locations: []
            }));
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
            await fetchProductLocations();
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

            // Обновляем состояние локально без перезагрузки страницы
            setProduct(prev => ({
                ...prev,
                locations: prev.locations.map(loc =>
                    loc.id === locationId
                        ? {
                              ...loc,
                              variants: loc.variants.map(v =>
                                  v.id === variantId
                                      ? { ...v, is_price_active: !currentActive }
                                      : v
                              )
                          }
                        : loc
                )
            }));
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

            // Обновляем состояние локально без перезагрузки страницы
            setProduct(prev => ({
                ...prev,
                locations: prev.locations.map(loc =>
                    loc.id === locationId
                        ? {
                              ...loc,
                              variants: loc.variants.map(v =>
                                  v.id === variantId
                                      ? { ...v, [flagName]: !currentValue }
                                      : v
                              )
                          }
                        : loc
                )
            }));
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

    const printBarcode = (variant) => {
        const barcodeUrl = getFileUrl(variant.barcode_image);

        const variantName = variant.name || product.name;
        const variantPrice = variant.price 
            ? `${parseFloat(variant.price).toLocaleString('ru-RU')} ₸ за ${product?.unit_display || 'шт.'}`
            : 'Цена не установлена';

        const attributesHtml = variant.attributes && variant.attributes.length > 0
            ? `<div class="attributes">
                ${variant.attributes.map(attr => `
                    <div class="attribute">
                        <span class="attribute-name">${attr.name}:</span>
                        <span>${attr.value}</span>
                    </div>
                `).join('')}
            </div>`
            : '';

        const content = `
          <html>
            <head>
              <title>Печать штрих-кода</title>
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
                <div class="name">${variantName}</div>
                <img class="barcode-img" src="${barcodeUrl}" alt="barcode" />
                <div class="price">${variantPrice}</div>
                ${attributesHtml}
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


    // Используем локации напрямую из продукта (уже отфильтрованные на сервере)
    const filteredLocations = product?.locations || [];

    // Фильтрация локаций для выпадающего меню по поисковому запросу
    // Используем locations_for_filter из продукта (список для фильтрации)
    const locationOptions = product?.locations_for_filter || [];
    const filteredLocationOptions = locationOptions.filter(loc => 
        loc.name.toLowerCase().includes(locationSearchTerm.toLowerCase())
    );

    const handleLocationSelect = (locationId) => {
        setSelectedLocationFilter(locationId);
        setIsLocationDropdownOpen(false);
        setLocationSearchTerm('');
        // Загружаем локации с фильтром с сервера
        fetchProductLocations(locationId);
    };

    const handleClearFilter = () => {
        setSelectedLocationFilter(null);
        setLocationSearchTerm('');
        // Загружаем все локации с сервера
        fetchProductLocations();
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

    // Функция для загрузки партий для конкретной локации с сервера
    const fetchBatchesForLocation = async (locationId, filter = 'all', page = 1, append = false) => {
        try {
            setLocationBatchesLoading(prev => ({ ...prev, [locationId]: true }));
            const params = {
                location_id: locationId,
                location_filter: filter,
                location_sort: 'recent', // Можно добавить выбор сортировки позже
                location_page: page,
                location_page_size: 3,
            };
            const response = await axios.get(
                `/api/business/${business_slug}/products/${product_id}/batches-defects/`,
                { params }
            );
            const newBatches = response.data.batches || [];
            const pagination = response.data.batches_pagination || null;
            
            if (append) {
                // Объединяем новые данные с существующими
                setLocationBatchesData(prev => ({
                    ...prev,
                    [locationId]: {
                        batches: [...(prev[locationId]?.batches || []), ...newBatches],
                        pagination: pagination,
                    }
                }));
            } else {
                // Заменяем данные
                setLocationBatchesData(prev => ({
                    ...prev,
                    [locationId]: {
                        batches: newBatches,
                        pagination: pagination,
                    }
                }));
            }
        } catch (err) {
            console.error(`Ошибка загрузки партий для локации ${locationId}:`, err);
            setLocationBatchesData(prev => ({
                ...prev,
                [locationId]: {
                    batches: prev[locationId]?.batches || [],
                    pagination: prev[locationId]?.pagination || null,
                }
            }));
        } finally {
            setLocationBatchesLoading(prev => ({ ...prev, [locationId]: false }));
        }
    };

    // Функция для загрузки еще партий для локации
    const handleLoadMoreBatches = (locationId) => {
        const currentData = locationBatchesData[locationId];
        const currentFilter = locationBatchFilter[locationId] || 'all';
        if (!currentData || !currentData.pagination) return;
        
        const nextPage = (currentData.pagination.current_page || 1) + 1;
        if (nextPage <= (currentData.pagination.total_pages || 1)) {
            fetchBatchesForLocation(locationId, currentFilter, nextPage, true);
        }
    };

    // Функция для установки фильтра партий для локации
    const handleLocationBatchFilterChange = (locationId, filter) => {
        setLocationBatchFilter(prev => ({
            ...prev,
            [locationId]: filter
        }));
        // Загружаем данные с новым фильтром с первой страницы
        fetchBatchesForLocation(locationId, filter, 1, false);
    };

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
                    // Подтягиваем значения активности из БД, если они есть
                    is_active_on_marketplace: variant.is_active_on_marketplace || false,
                    is_active_for_offline_sale: variant.is_active_for_offline_sale || false,
                    is_active_on_own_site: variant.is_active_on_own_site || false,
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
        
        // Если batch_number указан и не пустой, добавляем его
        if (batchForm.batch_number && batchForm.batch_number.trim() !== '') {
            payload.batch_number = batchForm.batch_number;
        }

        try {
            setBatchSaving(true);
            await axios.post(`/api/business/${business_slug}/batches/create/`, payload);
            setBatchModalOpen(false);
            await fetchBatchesAndDefects();
            await fetchProduct();
            await fetchProductLocations();
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
            setDefectError(`Количество не может превышать доступное: ${formatNumber(defectModal.availableQuantity)} ${product?.unit_display || 'шт.'}`);
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
            await fetchProductLocations();
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
            await fetchProductLocations();
        } catch (err) {
            alert('Не удалось удалить брак: ' + (err.response?.data?.detail || err.message));
        }
    };

    const openWriteoffModal = (line, writeoff = null) => {
        setWriteoffError('');
        // При редактировании доступное количество = availableQuantity + текущее количество списания
        const availableQty = writeoff 
            ? (line.availableQuantity || 0) + (writeoff.quantity || 0)
            : (line.availableQuantity || 0);
        
        setWriteoffModal({
            open: true,
            stockId: line.stockId,
            variantName: line.variantName,
            locationName: line.locationName,
            batchNumber: line.batchNumber,
            quantity: writeoff ? (typeof writeoff.quantity === 'number' ? writeoff.quantity.toString() : writeoff.quantity) : '',
            reason: writeoff ? (writeoff.reason || 'other') : 'other',
            reasonDetail: writeoff ? (writeoff.reasonDetail || '') : '',
            writeoffId: writeoff ? writeoff.id : null,
            availableQuantity: availableQty,
        });
    };

    const closeWriteoffModal = () => {
        setWriteoffModal({
            open: false,
            stockId: null,
            variantName: '',
            locationName: '',
            batchNumber: '',
            quantity: '',
            reason: 'other',
            reasonDetail: '',
            availableQuantity: 0,
        });
    };

    const handleSaveWriteoff = async () => {
        if (!writeoffModal.stockId) return;
        const qty = Number(writeoffModal.quantity);
        if (!qty || qty <= 0) {
            setWriteoffError('Количество должно быть больше 0');
            return;
        }
        if (qty > writeoffModal.availableQuantity) {
            setWriteoffError(`Количество не может превышать доступное: ${formatNumber(writeoffModal.availableQuantity)} ${product?.unit_display || 'шт.'}`);
            return;
        }

        setWriteoffSaving(true);
        try {
            if (writeoffModal.writeoffId) {
                // Редактирование существующего списания
                await axios.patch(
                    `/api/business/${business_slug}/stocks/writeoffs/${writeoffModal.writeoffId}/update/`,
                    {
                        quantity: qty,
                        reason: writeoffModal.reason,
                        reason_detail: writeoffModal.reasonDetail || '',
                    }
                );
            } else {
                // Создание нового списания
                await axios.post(
                    `/api/business/${business_slug}/stocks/${writeoffModal.stockId}/writeoffs/create/`,
                    {
                        quantity: qty,
                        reason: writeoffModal.reason,
                        reason_detail: writeoffModal.reasonDetail || '',
                    }
                );
            }
            await fetchBatchesAndDefects();
            await fetchProduct();
            await fetchProductLocations();
            closeWriteoffModal();
        } catch (err) {
            const resp = err.response?.data;
            const detail =
                resp?.detail ||
                resp?.message ||
                (typeof resp === 'string'
                    ? resp
                    : Object.values(resp || {})[0]);
            setWriteoffError(detail || (writeoffModal.writeoffId ? 'Не удалось обновить списание' : 'Не удалось создать списание'));
        } finally {
            setWriteoffSaving(false);
        }
    };

    const handleDeleteWriteoff = async (writeoffId) => {
        if (!window.confirm('Удалить запись о списании?')) return;
        setWriteoffSaving(true);
        try {
            await axios.delete(`/api/business/${business_slug}/stocks/writeoffs/${writeoffId}/delete/`);
            await fetchBatchesAndDefects();
            await fetchProduct();
            await fetchProductLocations();
        } catch (err) {
            const resp = err.response?.data;
            const detail = resp?.detail || resp?.message || 'Не удалось удалить списание';
            alert(detail);
        } finally {
            setWriteoffSaving(false);
        }
    };

    const openVariantLocationHistoryModal = async (variantLocationId, variantName, locationName) => {
        setVariantLocationHistoryModal({
            open: true,
            variantLocationId,
            variantName,
            locationName,
            history: [],
            loading: true,
            page: 1,
            hasMore: false,
            loadingMore: false,
        });

        try {
            const response = await axios.get(
                `/api/business/${business_slug}/variant-locations/${variantLocationId}/movement-history/`,
                { params: { page: 1, page_size: 20 } }
            );

            setVariantLocationHistoryModal(prev => ({
                ...prev,
                history: response.data.history || [],
                loading: false,
                hasMore: response.data.pagination?.has_next || false,
                page: 1,
            }));
        } catch (err) {
            console.error('Ошибка загрузки истории:', err);
            alert('Ошибка загрузки истории: ' + (err.response?.data?.detail || err.message));
            setVariantLocationHistoryModal(prev => ({
                ...prev,
                loading: false,
            }));
        }
    };

    const closeVariantLocationHistoryModal = () => {
        setVariantLocationHistoryModal({
            open: false,
            variantLocationId: null,
            variantName: '',
            locationName: '',
            history: [],
            loading: false,
            page: 1,
            hasMore: false,
            loadingMore: false,
        });
    };

    const loadMoreVariantLocationHistory = async () => {
        const { variantLocationId, page, hasMore, loadingMore } = variantLocationHistoryModal;
        
        if (!hasMore || loadingMore) return;

        setVariantLocationHistoryModal(prev => ({ ...prev, loadingMore: true }));

        try {
            const response = await axios.get(
                `/api/business/${business_slug}/variant-locations/${variantLocationId}/movement-history/`,
                { params: { page: page + 1, page_size: 20 } }
            );

            setVariantLocationHistoryModal(prev => ({
                ...prev,
                history: [...prev.history, ...(response.data.history || [])],
                page: page + 1,
                hasMore: response.data.pagination?.has_next || false,
                loadingMore: false,
            }));
        } catch (err) {
            console.error('Ошибка загрузки истории:', err);
            setVariantLocationHistoryModal(prev => ({ ...prev, loadingMore: false }));
        }
    };

    const exportVariantLocationHistoryToExcel = async () => {
        const { variantLocationId, variantName, locationName } = variantLocationHistoryModal;
        
        try {
            const response = await axios.get(
                `/api/business/${business_slug}/variant-locations/${variantLocationId}/movement-history/export-excel/`,
                { responseType: 'blob' }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const filename = `История_движения_${variantName}_${locationName}_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Ошибка экспорта:', err);
            alert('Ошибка экспорта в Excel: ' + (err.response?.data?.detail || err.message));
        }
    };

    const openBatchHistoryModal = async (stockId, variantName, locationName, batchNumber) => {
        setBatchHistoryModal({
            open: true,
            batchId: null,
            stockId: stockId,
            batchNumber: batchNumber,
            variantName: variantName,
            locationName: locationName,
            history: [],
            loading: true,
        });
        
        try {
            const response = await axios.get(`/api/business/${business_slug}/stocks/${stockId}/movement-history/`);
            setBatchHistoryModal(prev => ({
                ...prev,
                history: response.data.history || [],
                loading: false,
            }));
        } catch (err) {
            console.error('Ошибка загрузки истории:', err);
            alert('Не удалось загрузить историю движения товара');
            setBatchHistoryModal(prev => ({
                ...prev,
                loading: false,
            }));
        }
    };

    const closeBatchHistoryModal = () => {
        setBatchHistoryModal({
            open: false,
            stockId: null,
            batchNumber: '',
            variantName: '',
            locationName: '',
            history: [],
            loading: false,
        });
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

    const images = product.images || [];
    const currentImage = images[currentImageIndex] || images[0];

    const handlePrevImage = () => {
        setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    };

    const handleNextImage = () => {
        setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    };

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
                {images.length > 0 && (
                    <div className={styles.imageContainer}>
                        {images.length > 1 && (
                            <>
                                <button 
                                    className={styles.imageNavButton}
                                    onClick={handlePrevImage}
                                    aria-label="Предыдущее изображение"
                                >
                                    <i className="fa fa-chevron-left"></i>
                                </button>
                                <button 
                                    className={`${styles.imageNavButton} ${styles.imageNavButtonRight}`}
                                    onClick={handleNextImage}
                                    aria-label="Следующее изображение"
                                >
                                    <i className="fa fa-chevron-right"></i>
                                </button>
                            </>
                        )}
                        <div 
                            className={styles.imageSlider}
                            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                        >
                            {images.map((img, index) => (
                                <img 
                                    key={img.id || index}
                                    src={getFileUrl(img.image)} 
                                    alt={`${product.name} - фото ${index + 1}`}
                                    className={styles.mainImage}
                                />
                            ))}
                        </div>
                        {images.length > 1 && (
                            <div className={styles.imageIndicator}>
                                {currentImageIndex + 1} / {images.length}
                            </div>
                        )}
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
                                {(product.total_available || 0).toLocaleString('ru-RU')} {product?.unit_display || 'шт.'}
                            </span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Брак всего:</span>
                            <span className={`${styles.statValue} ${styles.statValueDefect}`}>
                                {(product.total_defect || 0).toLocaleString('ru-RU')} {product?.unit_display || 'шт.'}
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
                                    {selectedLocationFilter && product?.locations_for_filter
                                        ? product.locations_for_filter.find(l => l.id === selectedLocationFilter)?.name
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
                                                    <span className={styles.priceUnitLabel}>
                                                        ₸ за {product?.unit_display || 'шт.'}
                                                    </span>
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
                                                    <span className={styles.priceUnitLabel}>
                                                        ₸ за {product?.unit_display || 'шт.'}
                                                    </span>
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
                                                                {parseFloat(variant.price).toLocaleString('ru-RU')} ₸ за {product?.unit_display || 'шт.'}
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
                                                            {variant.price_id && (
                                                                <button
                                                                    onClick={() => openVariantLocationHistoryModal(variant.price_id, variant.name, location.name)}
                                                                    className={styles.historyButton}
                                                                    title="История движения"
                                                                >
                                                                    <i className="fa fa-history"></i> История движения
                                                                </button>
                                                            )}
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
                                                    <strong>{variant.available_quantity} {product?.unit_display || 'шт.'}</strong>
                                                </div>
                                                <div className={styles.stockItem}>
                                                    <span>Резерв:</span>
                                                    <strong>{variant.reserved_quantity} {product?.unit_display || 'шт.'}</strong>
                                                </div>
                                                <div className={styles.stockItem}>
                                                    <span>Брак:</span>
                                                    <strong className={styles.defectQuantity}>
                                                        {variant.defect_quantity || 0} {product?.unit_display || 'шт.'}
                                                    </strong>
                                                </div>
                                            </div>
                                            {variant.barcode_image && (
                                                <div className={styles.barcodeSection}>
                                                    <h4 className={styles.barcodeTitle}>Штрих-код</h4>
                                                    <div className={styles.barcodeImageContainer}>
                                                        <img
                                                            src={getFileUrl(variant.barcode_image)}
                                                            alt="Штрих-код"
                                                            className={styles.barcodeImg}
                                                        />
                                                    </div>
                                                    {variant.barcode && (
                                                        <p className={styles.barcodeNumber}>{variant.barcode}</p>
                                                    )}
                                                    <button
                                                        onClick={() => printBarcode(variant)}
                                                        className={styles.printBarcodeButton}
                                                        title="Печать штрих-кода"
                                                    >
                                                        <i className="fa fa-print"></i> Печать штрих-кода
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Партии для этой локации */}
                        {(() => {
                            const locationData = locationBatchesData[location.id];
                            const isLoading = locationBatchesLoading[location.id];
                            const currentFilter = locationBatchFilter[location.id] || 'all';
                            
                            if (isLoading && !locationData) {
                                return (
                                    <div className={styles.locationBatchesSection}>
                                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                                            <Loader size="small" />
                                        </div>
                                    </div>
                                );
                            }
                            
                            const locationBatches = locationData?.batches || [];
                            
                            if (locationBatches.length === 0 && !isLoading) return null;
                            
                            const pagination = locationData?.pagination;
                            const hasMore = pagination && pagination.has_next;
                            
                            return (
                                <div className={styles.locationBatchesSection}>
                                    <div className={styles.locationBatchesHeader}>
                                        <h4 className={styles.locationBatchesTitle}>Партии товара</h4>
                                        {/* Фильтры для партий */}
                                        <div className={styles.locationBatchFilters}>
                                            <button
                                                className={`${styles.filterButton} ${currentFilter === 'all' ? styles.filterButtonActive : ''}`}
                                                onClick={() => handleLocationBatchFilterChange(location.id, 'all')}
                                                disabled={isLoading}
                                            >
                                                Все
                                            </button>
                                            <button
                                                className={`${styles.filterButton} ${currentFilter === 'has_stock' ? styles.filterButtonActive : ''}`}
                                                onClick={() => handleLocationBatchFilterChange(location.id, 'has_stock')}
                                                disabled={isLoading}
                                            >
                                                С остатком
                                            </button>
                                            <button
                                                className={`${styles.filterButton} ${currentFilter === 'sold_out' ? styles.filterButtonActive : ''}`}
                                                onClick={() => handleLocationBatchFilterChange(location.id, 'sold_out')}
                                                disabled={isLoading}
                                            >
                                                Распроданы
                                            </button>
                                        </div>
                                    </div>
                                    {locationBatches.map(batch => {
                                        // Фильтруем линии партии для этой локации
                                        const locationLines = batch.lines.filter(line => line.locationId === location.id);
                                        if (locationLines.length === 0) return null;
                                        
                                        return (
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
                                                            <strong>{formatNumber(locationLines.reduce((sum, line) => sum + line.quantity, 0))} {product?.unit_display || 'шт.'}</strong>
                                                        </div>
                                                        <div>
                                                            <span>Доступно</span>
                                                            <strong>{formatNumber(locationLines.reduce((sum, line) => sum + line.availableQuantity, 0))} {product?.unit_display || 'шт.'}</strong>
                                                        </div>
                                                        <div>
                                                            <span>Резерв</span>
                                                            <strong>{formatNumber(locationLines.reduce((sum, line) => sum + line.reservedQuantity, 0))} {product?.unit_display || 'шт.'}</strong>
                                                        </div>
                                                        <div>
                                                            <span>Брак</span>
                                                            <strong>{formatNumber(locationLines.reduce((sum, line) => sum + line.defectQuantity, 0))} {product?.unit_display || 'шт.'}</strong>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={styles.batchLines}>
                                                    {locationLines.map(line => (
                                                        <div key={line.stockId} className={styles.batchLine}>
                                                            <div className={styles.batchLineInfo}>
                                                                <div className={styles.batchLineTitle}>
                                                                    {line.variantName}
                                                                    <span className={styles.batchLineSku}>SKU: {line.sku}</span>
                                                                </div>
                                                                <div className={styles.batchLineStats}>
                                                                    <span>Поступило: {formatNumber(line.quantity)} {line.unit_display || 'шт.'}</span>
                                                                    <span>Доступно: {formatNumber(line.availableQuantity)} {line.unit_display || 'шт.'}</span>
                                                                    <span>Продано: {formatNumber(line.soldQuantity || 0)} {line.unit_display || 'шт.'}</span>
                                                                    {line.returnedQuantity !== undefined && line.returnedQuantity !== null && line.returnedQuantity > 0 && (
                                                                        <span>Возврат: {formatNumber(line.returnedQuantity)} {line.unit_display || 'шт.'}</span>
                                                                    )}
                                                                    <span>Резерв: {formatNumber(line.reservedQuantity)} {line.unit_display || 'шт.'}</span>
                                                                    <span>Брак: {formatNumber(line.defectQuantity)} {line.unit_display || 'шт.'}</span>
                                                                    {line.writeoffQuantity !== undefined && line.writeoffQuantity !== null && line.writeoffQuantity > 0 && (
                                                                        <span>Списано: {formatNumber(line.writeoffQuantity)} {line.unit_display || 'шт.'}</span>
                                                                    )}
                                                                    {line.inventoryAdjustment !== undefined && line.inventoryAdjustment !== null && line.inventoryAdjustment !== 0 && (
                                                                        <span className={line.inventoryAdjustment > 0 ? styles.inventorySurplus : styles.inventoryShortage}>
                                                                            {line.inventoryAdjustment > 0 ? 'Прибыло' : 'Убыло'} в результате инвентаризации: {formatNumber(Math.abs(line.inventoryAdjustment))} {line.unit_display || 'шт.'}
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
                                                                <button
                                                                    className={styles.secondaryButton}
                                                                    onClick={() => openWriteoffModal(line)}
                                                                    disabled={writeoffSaving}
                                                                >
                                                                    <i className="fa fa-trash"></i> Списать товар
                                                                </button>
                                                                <button
                                                                    className={styles.historyButton}
                                                                    onClick={() => openBatchHistoryModal(line.stockId, line.variantName, line.locationName, batch.batchNumber)}
                                                                >
                                                                    <i className="fa fa-history"></i> История движения
                                                                </button>
                                                            </div>
                                                                {line.defects && line.defects.length > 0 && (
                                                                    <div className={styles.defectsList}>
                                                                        {line.defects.map(defect => (
                                                                            <div key={defect.id} className={styles.defectItem}>
                                                                                <div>
                                                                                    <strong>Брак: {formatNumber(defect.quantity)} {product?.unit_display || 'шт.'}</strong>
                                                                                    <span>{defect.reason || 'Причина не указана'}</span>
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
                                                            {line.writeoffs && line.writeoffs.length > 0 && (
                                                                <div className={styles.writeoffsList}>
                                                                    {line.writeoffs.map(writeoff => (
                                                                        <div key={writeoff.id} className={styles.defectItem}>
                                                                            <div>
                                                                                <strong>Списание: {formatNumber(writeoff.quantity)} {product?.unit_display || 'шт.'}</strong>
                                                                                <span>
                                                                                    {writeoff.reasonDisplay || writeoff.reason} 
                                                                                    {writeoff.reasonDetail ? ` - ${writeoff.reasonDetail}` : ''}
                                                                                    {writeoff.transfer && (
                                                                                        <span className={styles.transferBadge}>
                                                                                            (Перемещение {writeoff.transferNumber})
                                                                                        </span>
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                            {!writeoff.transfer && (
                                                                                <div className={styles.defectActions}>
                                                                                    <button
                                                                                        className={styles.linkButton}
                                                                                        onClick={() => openWriteoffModal(line, writeoff)}
                                                                                        disabled={writeoffSaving}
                                                                                    >
                                                                                        Изменить
                                                                                    </button>
                                                                                    <button
                                                                                        className={styles.linkButtonDanger}
                                                                                        onClick={() => handleDeleteWriteoff(writeoff.id)}
                                                                                        disabled={writeoffSaving}
                                                                                    >
                                                                                        Удалить
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {/* Кнопка "Загрузить еще" */}
                                    {hasMore && (
                                        <div className={styles.loadMoreBatchesContainer}>
                                            <button
                                                className={styles.loadMoreButton}
                                                onClick={() => handleLoadMoreBatches(location.id)}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? 'Загрузка...' : 'Загрузить еще'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
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
                                                <strong>{formatNumber(batch.totalQuantity)} {product?.unit_display || 'шт.'}</strong>
                                            </div>
                                            <div>
                                                <span>Доступно</span>
                                                <strong>{formatNumber(batch.totalAvailable)} {product?.unit_display || 'шт.'}</strong>
                                            </div>
                                            <div>
                                                <span>Резерв</span>
                                                <strong>{formatNumber(batch.totalReserved)} {product?.unit_display || 'шт.'}</strong>
                                            </div>
                                            <div>
                                                <span>Брак</span>
                                                <strong>{formatNumber(batch.totalDefect)} {product?.unit_display || 'шт.'}</strong>
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
                                                        <span>Поступило: {formatNumber(line.quantity)} {line.unit_display || 'шт.'}</span>
                                                        <span>Доступно: {formatNumber(line.availableQuantity)} {line.unit_display || 'шт.'}</span>
                                                        <span>Продано: {formatNumber(line.soldQuantity || 0)} {line.unit_display || 'шт.'}</span>
                                                        {line.returnedQuantity !== undefined && line.returnedQuantity !== null && line.returnedQuantity > 0 && (
                                                            <span>Возврат: {formatNumber(line.returnedQuantity)} {line.unit_display || 'шт.'}</span>
                                                        )}
                                                        <span>Резерв: {formatNumber(line.reservedQuantity)} {line.unit_display || 'шт.'}</span>
                                                        <span>Брак: {formatNumber(line.defectQuantity)} {line.unit_display || 'шт.'}</span>
                                                        {line.writeoffQuantity !== undefined && line.writeoffQuantity !== null && line.writeoffQuantity > 0 && (
                                                            <span>Списано: {formatNumber(line.writeoffQuantity)} {line.unit_display || 'шт.'}</span>
                                                        )}
                                                        {line.inventoryAdjustment !== undefined && line.inventoryAdjustment !== null && line.inventoryAdjustment !== 0 && (
                                                            <span className={line.inventoryAdjustment > 0 ? styles.inventorySurplus : styles.inventoryShortage}>
                                                                {line.inventoryAdjustment > 0 ? 'Прибыло' : 'Убыло'} в результате инвентаризации: {formatNumber(Math.abs(line.inventoryAdjustment))} {line.unit_display || 'шт.'}
                                                            </span>
                                                        )}
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
                                                    <button
                                                        className={styles.secondaryButton}
                                                        onClick={() => openWriteoffModal(line)}
                                                        disabled={writeoffSaving}
                                                    >
                                                        <i className="fa fa-trash"></i> Списать товар
                                                    </button>
                                                </div>
                                                {line.writeoffs && line.writeoffs.length > 0 && (
                                                    <div className={styles.defectsList}>
                                                        {line.writeoffs.map(writeoff => (
                                                            <div key={writeoff.id} className={styles.defectItem}>
                                                                <div>
                                                                    <strong>Списание: {formatNumber(writeoff.quantity)} {product?.unit_display || 'шт.'}</strong>
                                                                    <span>
                                                                        {writeoff.reasonDisplay || writeoff.reason} 
                                                                        {writeoff.reasonDetail ? ` - ${writeoff.reasonDetail}` : ''}
                                                                        {writeoff.transfer && (
                                                                            <span className={styles.transferBadge}>
                                                                                (Перемещение {writeoff.transferNumber})
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <div className={styles.defectActions}>
                                                                    {!writeoff.transfer && (
                                                                        <>
                                                                            <button
                                                                                className={styles.linkButton}
                                                                                onClick={() => openWriteoffModal(line, writeoff)}
                                                                                disabled={writeoffSaving}
                                                                            >
                                                                                Изменить
                                                                            </button>
                                                                            <button
                                                                                className={styles.linkButtonDanger}
                                                                                onClick={() => handleDeleteWriteoff(writeoff.id)}
                                                                                disabled={writeoffSaving}
                                                                            >
                                                                                Удалить
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {writeoff.transfer && (
                                                                        <span className={styles.transferInfo}>
                                                                            Связано с перемещением
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {line.defects.length > 0 && (
                                                    <div className={styles.defectsList}>
                                                        {line.defects.map(defect => (
                                                            <div key={defect.id} className={styles.defectItem}>
                                                                <div>
                                                                    <strong>Брак: {formatNumber(defect.quantity)} {product?.unit_display || 'шт.'}</strong>
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
                                            <span>{formatNumber(defect.quantity)} {product?.unit_display || 'шт.'}</span>
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
                                        {formatNumber(analyticsData.totals?.quantity_sold || 0)} {analyticsData.unit_display || product?.unit_display || 'шт.'}
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
                                                <span>{formatNumber(variant.quantity_sold)} {product?.unit_display || 'шт.'}</span>
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
                                            Продажи: {formatNumber(analyticsData.forecast?.next_7_days?.quantity || 0)} {analyticsData.unit_display || product?.unit_display || 'шт.'}
                                        </div>
                                    </div>
                                    <div className={styles.forecastCard}>
                                        <div className={styles.forecastTitle}>Следующие 30 дней</div>
                                        <div className={styles.forecastValue}>
                                            Выручка: {formatNumber(analyticsData.forecast?.next_30_days?.revenue || 0)} ₸
                                        </div>
                                        <div className={styles.forecastValue}>
                                            Продажи: {formatNumber(analyticsData.forecast?.next_30_days?.quantity || 0)} {analyticsData.unit_display || product?.unit_display || 'шт.'}
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
                                            {formatNumber(analyticsData.stock_dynamics?.current?.total_quantity || 0)} {analyticsData.unit_display || product?.unit_display || 'шт.'}
                                        </span>
                                    </div>
                                    <div className={styles.stockDynamicsItem}>
                                        <span className={styles.stockDynamicsLabel}>Доступно:</span>
                                        <span className={`${styles.stockDynamicsValue} ${styles.availableQuantity}`}>
                                            {formatNumber(analyticsData.stock_dynamics?.current?.available_quantity || 0)} {analyticsData.unit_display || product?.unit_display || 'шт.'}
                                        </span>
                                    </div>
                                    <div className={styles.stockDynamicsItem}>
                                        <span className={styles.stockDynamicsLabel}>Зарезервировано:</span>
                                        <span className={`${styles.stockDynamicsValue} ${styles.reservedQuantity}`}>
                                            {formatNumber(analyticsData.stock_dynamics?.current?.reserved_quantity || 0)} {analyticsData.unit_display || product?.unit_display || 'шт.'}
                                        </span>
                                    </div>
                                    <div className={styles.stockDynamicsItem}>
                                        <span className={styles.stockDynamicsLabel}>Брак:</span>
                                        <span className={`${styles.stockDynamicsValue} ${styles.defectQuantity}`}>
                                            {formatNumber(analyticsData.stock_dynamics?.current?.defect_quantity || 0)} {analyticsData.unit_display || product?.unit_display || 'шт.'}
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
                                        {formatNumber(defectModal.availableQuantity)} {product?.unit_display || 'шт.'}
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
                                        Максимум: {formatNumber(defectModal.availableQuantity)} {product?.unit_display || 'шт.'}
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

            {writeoffModal.open && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>{writeoffModal.writeoffId ? 'Редактирование списания' : 'Списать товар'}</h3>
                            <button className={styles.closeButton} onClick={closeWriteoffModal}>
                                <i className="fa fa-times"></i>
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.defectMeta}>
                                <div className={styles.defectMetaRow}>
                                    <span className={styles.defectMetaLabel}>Партия:</span>
                                    <span className={styles.defectMetaValue}>
                                        {writeoffModal.batchNumber || 'Без номера'}
                                    </span>
                                </div>
                                <div className={styles.defectMetaRow}>
                                    <span className={styles.defectMetaLabel}>Вариант:</span>
                                    <span className={styles.defectMetaValue}>{writeoffModal.variantName}</span>
                                </div>
                                <div className={styles.defectMetaRow}>
                                    <span className={styles.defectMetaLabel}>Локация:</span>
                                    <span className={styles.defectMetaValue}>{writeoffModal.locationName}</span>
                                </div>
                                <div className={styles.defectMetaRow}>
                                    <span className={styles.defectMetaLabel}>Доступно:</span>
                                    <span className={styles.defectMetaValue}>
                                        {formatNumber(writeoffModal.availableQuantity)} {product?.unit_display || 'шт.'}
                                    </span>
                                </div>
                            </div>
                            <label>
                                Количество для списания
                                <input
                                    type="number"
                                    step={product?.unit_display === 'шт.' ? '1' : '0.001'}
                                    min="0.001"
                                    max={writeoffModal.availableQuantity}
                                    value={writeoffModal.quantity}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Очищаем ошибку при изменении
                                        if (writeoffError) {
                                            setWriteoffError('');
                                        }
                                        if (value === '') {
                                            setWriteoffModal(prev => ({ ...prev, quantity: '' }));
                                            return;
                                        }
                                        const numValue = Number(value);
                                        if (!isNaN(numValue) && numValue > 0) {
                                            // Ограничиваем максимальным доступным количеством
                                            const limitedValue = Math.min(numValue, writeoffModal.availableQuantity);
                                            setWriteoffModal(prev => ({ ...prev, quantity: limitedValue.toString() }));
                                        }
                                    }}
                                    placeholder="Введите количество"
                                />
                                {writeoffModal.availableQuantity > 0 && (
                                    <span className={styles.inputHint}>
                                        Максимум: {formatNumber(writeoffModal.availableQuantity)} {product?.unit_display || 'шт.'}
                                    </span>
                                )}
                            </label>
                            <label>
                                Причина списания
                                <div className={styles.reasonSelector}>
                                    {[
                                        { value: 'expired', label: 'Истек срок годности', icon: 'fa-calendar-times' },
                                        { value: 'damaged', label: 'Поврежден', icon: 'fa-exclamation-triangle' },
                                        { value: 'lost', label: 'Потерян', icon: 'fa-search' },
                                        { value: 'other', label: 'Другое', icon: 'fa-ellipsis-h' }
                                    ].map(reason => (
                                        <button
                                            key={reason.value}
                                            type="button"
                                            className={`${styles.reasonOption} ${writeoffModal.reason === reason.value ? styles.reasonOptionActive : ''}`}
                                            onClick={() => setWriteoffModal(prev => ({ ...prev, reason: reason.value }))}
                                        >
                                            <i className={`fa ${reason.icon}`}></i>
                                            <span>{reason.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </label>
                            <label>
                                Дополнительная информация
                                <textarea
                                    rows={4}
                                    value={writeoffModal.reasonDetail}
                                    onChange={(e) => setWriteoffModal(prev => ({ ...prev, reasonDetail: e.target.value }))}
                                    placeholder="Опишите детали списания, например: повреждена упаковка, товар утерян при транспортировке и т.д."
                                />
                            </label>
                            {writeoffError && <div className={styles.errorMessage}>{writeoffError}</div>}
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.secondaryButton}
                                onClick={closeWriteoffModal}
                                disabled={writeoffSaving}
                            >
                                Отмена
                            </button>
                            <button
                                className={styles.primaryButton}
                                onClick={handleSaveWriteoff}
                                disabled={writeoffSaving}
                            >
                                {writeoffSaving ? 'Сохраняем...' : (writeoffModal.writeoffId ? 'Сохранить' : 'Списать')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {batchHistoryModal.open && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className={styles.modalHeader}>
                            <h3>История движения товара</h3>
                            <button className={styles.closeButton} onClick={closeBatchHistoryModal}>
                                <i className="fa fa-times"></i>
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            {batchHistoryModal.loading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>
                                    <Loader size="medium" />
                                </div>
                            ) : batchHistoryModal.history.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--silver-whisper)' }}>
                                    История движения отсутствует
                                </div>
                            ) : (
                                <div>
                                    <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--onyx-midnight)', borderRadius: '8px', border: '1px solid var(--gilded-shadow)' }}>
                                        <div><strong>Вариант:</strong> {batchHistoryModal.variantName}</div>
                                        <div><strong>Локация:</strong> {batchHistoryModal.locationName}</div>
                                        {batchHistoryModal.batchNumber && <div><strong>Партия:</strong> {batchHistoryModal.batchNumber}</div>}
                                    </div>
                                    <div className={styles.historyContainer}>
                                        {batchHistoryModal.history.map((dateGroup, idx) => (
                                            <div key={idx} className={styles.historyDateGroup}>
                                                <div className={styles.historyDateHeader}>
                                                    <i className="fa fa-calendar"></i>
                                                    <span>{dateGroup.date_display}</span>
                                                </div>
                                                <div className={styles.historyRecords}>
                                                    {dateGroup.records.map((record, recordIdx) => {
                                                        const isPositive = record.quantity > 0;
                                                        const quantityDisplay = Math.abs(record.quantity);
                                                        return (
                                                            <div key={recordIdx} className={styles.historyRecord}>
                                                                <div className={styles.historyRecordHeader}>
                                                                    <span className={styles.historyRecordType}>
                                                                        {record.type === 'received' && <i className="fa fa-arrow-down" style={{ color: '#4ade80' }}></i>}
                                                                        {record.type === 'sale' && <i className="fa fa-shopping-cart" style={{ color: '#f87171' }}></i>}
                                                                        {record.type === 'return' && <i className="fa fa-undo" style={{ color: '#4ade80' }}></i>}
                                                                        {record.type === 'defect' && <i className="fa fa-exclamation-triangle" style={{ color: '#fbbf24' }}></i>}
                                                                        {record.type === 'writeoff' && <i className="fa fa-trash" style={{ color: '#f87171' }}></i>}
                                                                        {record.type === 'inventory' && <i className="fa fa-clipboard-check" style={{ color: record.quantity > 0 ? '#4ade80' : '#f87171' }}></i>}
                                                                        {record.type_display}
                                                                    </span>
                                                                    <span className={styles.historyRecordTime}>
                                                                        {record.date ? new Date(record.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                                    </span>
                                                                </div>
                                                                <div className={styles.historyRecordQuantity} style={{ color: isPositive ? '#4ade80' : '#f87171' }}>
                                                                    {isPositive ? '+' : '-'}{formatNumber(quantityDisplay)} {product?.unit_display || 'шт.'}
                                                                </div>
                                                                {record.user && (
                                                                    <div className={styles.historyRecordUser}>
                                                                        <i className="fa fa-user"></i>
                                                                        {record.user}
                                                                    </div>
                                                                )}
                                                                {record.description && (
                                                                    <div className={styles.historyRecordDescription}>
                                                                        {record.description}
                                                                    </div>
                                                                )}
                                                                {record.receipt_number && (
                                                                    <div className={styles.historyRecordReceipt}>
                                                                        <i className="fa fa-receipt"></i>
                                                                        Чек: {record.receipt_number}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.primaryButton}
                                onClick={closeBatchHistoryModal}
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {variantLocationHistoryModal.open && (
                <div className={styles.modalOverlay}>
                    <div 
                        className={styles.modalContent} 
                        style={{ maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
                    >
                        <div className={styles.modalHeader}>
                            <h3>История движения товара</h3>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button
                                    onClick={exportVariantLocationHistoryToExcel}
                                    className={styles.exportButton}
                                    title="Экспорт в Excel"
                                >
                                    <i className="fa fa-file-excel"></i> Экспорт в Excel
                                </button>
                                <button className={styles.closeButton} onClick={closeVariantLocationHistoryModal}>
                                    <i className="fa fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div 
                            className={styles.modalBody} 
                            style={{ flex: 1, overflowY: 'auto' }}
                            onScroll={(e) => {
                                const element = e.target;
                                const scrollBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
                                if (scrollBottom < 100 && variantLocationHistoryModal.hasMore && !variantLocationHistoryModal.loadingMore) {
                                    loadMoreVariantLocationHistory();
                                }
                            }}
                        >
                            {variantLocationHistoryModal.loading ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>
                                    <Loader size="medium" />
                                </div>
                            ) : variantLocationHistoryModal.history.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--silver-whisper)' }}>
                                    История движения отсутствует
                                </div>
                            ) : (
                                <div>
                                    <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--onyx-midnight)', borderRadius: '8px', border: '1px solid var(--gilded-shadow)' }}>
                                        <div><strong>Вариант:</strong> {variantLocationHistoryModal.variantName}</div>
                                        <div><strong>Локация:</strong> {variantLocationHistoryModal.locationName}</div>
                                    </div>
                                    <div className={styles.historyContainer}>
                                        {variantLocationHistoryModal.history.map((dateGroup, idx) => (
                                            <div key={idx} className={styles.historyDateGroup}>
                                                <div className={styles.historyDateHeader}>
                                                    <i className="fa fa-calendar"></i>
                                                    <span>{dateGroup.date_display}</span>
                                                </div>
                                                <div className={styles.historyRecords}>
                                                    {dateGroup.records.map((record, recordIdx) => {
                                                        const historyRecordType = record.type === 'received' ? 'fa-arrow-down' :
                                                            record.type === 'sale' ? 'fa-shopping-cart' :
                                                            record.type === 'return' ? 'fa-undo' :
                                                            record.type === 'defect' ? 'fa-exclamation-triangle' :
                                                            record.type === 'writeoff' ? 'fa-trash' :
                                                            record.type === 'inventory' ? 'fa-clipboard-check' : 'fa-circle';
                                                        
                                                        const historyRecordTypeColor = record.type === 'received' ? '#4ade80' :
                                                            record.type === 'sale' ? '#f87171' :
                                                            record.type === 'return' ? '#4ade80' :
                                                            record.type === 'defect' ? '#fbbf24' :
                                                            record.type === 'writeoff' ? '#ef4444' :
                                                            record.type === 'inventory' ? (record.quantity > 0 ? '#4ade80' : '#f87171') : '#9ca3af';
                                                        
                                                        const dateTime = record.date ? new Date(record.date) : null;
                                                        const timeStr = dateTime ? dateTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
                                                        
                                                        return (
                                                            <div key={recordIdx} className={styles.historyRecord}>
                                                                <div className={styles.historyRecordHeader}>
                                                                    <div className={styles.historyRecordType}>
                                                                        <i className={`fa ${historyRecordType}`} style={{ color: historyRecordTypeColor }}></i>
                                                                        <span>{record.type_display}</span>
                                                                    </div>
                                                                    <div className={styles.historyRecordTime}>{timeStr}</div>
                                                                </div>
                                                                <div className={styles.historyRecordChanges}>
                                                                    <div className={styles.historyChangeItem}>
                                                                        <span className={styles.historyChangeLabel}>Изменение:</span>
                                                                        <span className={record.quantity > 0 ? styles.historyChangeNew : styles.historyChangeOld}>
                                                                            {record.quantity > 0 ? '+' : ''}{formatNumber(record.quantity)} {product?.unit_display || 'шт.'}
                                                                        </span>
                                                                    </div>
                                                                    {record.batch_number && (
                                                                        <div className={styles.historyChangeItem}>
                                                                            <span className={styles.historyChangeLabel}>Партия:</span>
                                                                            <span>{record.batch_number}</span>
                                                                        </div>
                                                                    )}
                                                                    {record.user && (
                                                                        <div className={styles.historyChangeItem}>
                                                                            <span className={styles.historyChangeLabel}>Пользователь:</span>
                                                                            <span>{record.user}</span>
                                                                        </div>
                                                                    )}
                                                                    {record.receipt_number && (
                                                                        <div className={styles.historyChangeItem}>
                                                                            <span className={styles.historyChangeLabel}>Чек:</span>
                                                                            <span>{record.receipt_number}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {record.description && (
                                                                    <div className={styles.historyRecordReason}>
                                                                        {record.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                        {variantLocationHistoryModal.hasMore && (
                                            <div style={{ textAlign: 'center', padding: '1rem' }}>
                                                {variantLocationHistoryModal.loadingMore ? (
                                                    <Loader size="small" />
                                                ) : (
                                                    <button
                                                        onClick={loadMoreVariantLocationHistory}
                                                        className={styles.loadMoreButton}
                                                    >
                                                        Загрузить еще
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {!variantLocationHistoryModal.hasMore && variantLocationHistoryModal.history.length > 0 && (
                                            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--silver-whisper)' }}>
                                                Все записи загружены
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductPageNew;

