import React, { useState, useEffect, useCallback } from 'react';
import axios from "../../api/axiosDefault.js";
import { useParams, useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductManagementCard from '../../components/ProductManagementCard/ProductManagementCard.jsx';
import { useFileUtils } from '../../hooks/useFileUtils';
import { useLocation } from '../../hooks/useLocation';
import styles from './ProductManagement.module.css';
import InfiniteScroll from 'react-infinite-scroll-component';
import FiltersSection from '/src/components/FiltersSection/FiltersSection.jsx';
import DeleteProductModal from '../../components/DeleteProductModal/DeleteProductModal.jsx';
import Loader from '../../components/Loader';

const ProductManagement = () => {
    const { business_slug } = useParams();
    const navigate = useNavigate();
    const location = useRouterLocation();
    const { getFileUrl } = useFileUtils();
    const { getLocationParam, selectedLocation, updateLocation } = useLocation();

    const [data, setData] = useState({
        products: [],
        categories: [],
        filters: { filters: [] },
        pagination: {},
        applied_filters: {}
    });
    const [loading, setLoading] = useState(true);
    const [filtersLoading, setFiltersLoading] = useState(true);
    const [error, setError] = useState(null);
    const [locations, setLocations] = useState([]);
    const [locationsLoading, setLocationsLoading] = useState(true);

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('-created_at');
    const [locationBinding, setLocationBinding] = useState('all'); // all, bound, unbound
    const [inStockOnly, setInStockOnly] = useState(false); // Фильтр "Есть в наличии"
    const [tempFilters, setTempFilters] = useState({});
    const [expandedFilters, setExpandedFilters] = useState({});
    const [visibleFiltersCount, setVisibleFiltersCount] = useState(3);
    const [isFiltersOpen, setIsFiltersOpen] = useState(true);
    
    // Delete modal states
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    
    // Mobile filters states
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [mobileTempFilters, setMobileTempFilters] = useState({});
    const [mobilePriceMin, setMobilePriceMin] = useState('');
    const [mobilePriceMax, setMobilePriceMax] = useState('');
    const [mobileSelectedCategory, setMobileSelectedCategory] = useState(null);
    const [mobileSelectedLocation, setMobileSelectedLocation] = useState(null);
    const [mobileLocationBinding, setMobileLocationBinding] = useState('all');
    const [mobileInStockOnly, setMobileInStockOnly] = useState(false);

    // Fetch locations
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                setLocationsLoading(true);
                const response = await axios.get(`/api/business/${business_slug}/locations/`);
                setLocations(response.data || []);
            } catch (err) {
                console.error('Ошибка загрузки локаций:', err);
            } finally {
                setLocationsLoading(false);
            }
        };

        if (business_slug) {
            fetchLocations();
        }
    }, [business_slug]);

    // Initialize from URL params
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        setSearchQuery(queryParams.get('search') || '');
        setSortOption(queryParams.get('sort') || '-created_at');
        setPriceMin(queryParams.get('price_min') || '');
        setPriceMax(queryParams.get('price_max') || '');
        setSelectedCategory(queryParams.get('category') || null);
        setLocationBinding(queryParams.get('location_binding') || 'all');
        setInStockOnly(queryParams.get('in_stock') === '1');

        const initialFilters = {};
        queryParams.forEach((value, key) => {
            if (key.startsWith('attr_')) {
                initialFilters[key] = initialFilters[key] || [];
                initialFilters[key].push(value);
            }
        });
        setTempFilters(initialFilters);
    }, [location.search]);

    // Mobile filters functions
    const openMobileFilters = () => {
        // Копируем текущие значения в мобильные состояния
        setMobileTempFilters({ ...tempFilters });
        setMobilePriceMin(priceMin);
        setMobilePriceMax(priceMax);
        setMobileSelectedCategory(selectedCategory);
        setMobileSelectedLocation(selectedLocation || 'all');
        setMobileLocationBinding(locationBinding);
        setMobileInStockOnly(inStockOnly);
        setIsMobileFiltersOpen(true);
    };

    const closeMobileFilters = () => {
        setIsMobileFiltersOpen(false);
    };

    const applyMobileFilters = () => {
        // Применяем мобильные фильтры к основным состояниям
        setTempFilters({ ...mobileTempFilters });
        setPriceMin(mobilePriceMin);
        setPriceMax(mobilePriceMax);
        setSelectedCategory(mobileSelectedCategory);
        setLocationBinding(mobileLocationBinding);
        setInStockOnly(mobileInStockOnly);
        
        // Обновляем локацию через хук
        if (mobileSelectedLocation && mobileSelectedLocation !== 'all') {
            updateLocation(mobileSelectedLocation);
        } else {
            updateLocation('all');
        }
        
        // Обновляем URL с новыми фильтрами
        updateURLWithFilters(
            mobileTempFilters,
            mobilePriceMin,
            mobilePriceMax,
            mobileSelectedCategory,
            mobileLocationBinding,
            mobileInStockOnly
        );
        
        // Закрываем мобильное меню
        closeMobileFilters();
        
        // Перезагружаем данные
        fetchData();
    };

    const resetMobileFilters = () => {
        setMobileTempFilters({});
        setMobilePriceMin('');
        setMobilePriceMax('');
        setMobileSelectedCategory(null);
        setMobileSelectedLocation('all');
        setMobileLocationBinding('all');
        setMobileInStockOnly(false);
    };

    const updateURLWithFilters = (filters, priceMin, priceMax, category, locationBinding = 'all', inStock = false) => {
        const params = new URLSearchParams();
        
        if (searchQuery) params.set('search', searchQuery);
        if (sortOption) params.set('sort', sortOption);
        if (priceMin) params.set('price_min', priceMin);
        if (priceMax) params.set('price_max', priceMax);
        if (category) params.set('category', category);
        if (locationBinding && locationBinding !== 'all') params.set('location_binding', locationBinding);
        if (inStock) params.set('in_stock', '1');
        
        // Добавляем атрибуты
        Object.entries(filters).forEach(([key, values]) => {
            if (Array.isArray(values)) {
                values.forEach(value => params.append(key, value));
            } else if (values) {
                params.set(key, values);
            }
        });
        
        const newUrl = `${location.pathname}?${params.toString()}`;
        navigate(newUrl, { replace: true });
    };

    const handleDeleteProduct = (productId, productName) => {
        setProductToDelete({ id: productId, name: productName });
        setDeleteModalOpen(true);
    };

    const confirmDeleteProduct = async (deleteType) => {
        if (!productToDelete) return;

        try {
            let apiEndpoint;
            
            if (deleteType === 'soft') {
                apiEndpoint = `/api/business/${business_slug}/products/${productToDelete.id}/soft-delete`;
            } else {
                apiEndpoint = `/api/business/${business_slug}/products/${productToDelete.id}/hard-delete`;
            }

            const method = deleteType === 'soft' ? 'post' : 'delete';
            const response = await axios[method](apiEndpoint);

            // Обновляем список товаров после удаления
            setData(prev => ({
                ...prev,
                products: prev.products.filter(product => product.id !== productToDelete.id),
                pagination: {
                    ...prev.pagination,
                    total_items: prev.pagination.total_items - 1
                }
            }));

            // Показываем уведомление об успехе
            const message = deleteType === 'soft' 
                ? `Товар "${productToDelete.name}" успешно архивирован`
                : `Товар "${productToDelete.name}" полностью удален`;
            
            alert(message);
        } catch (error) {
            console.error('Ошибка при удалении товара:', error);
            alert('Не удалось удалить товар: ' + (error.response?.data?.detail || error.message));
        }
    };

    const closeDeleteModal = () => {
        setDeleteModalOpen(false);
        setProductToDelete(null);
    };

    const handleToggleStatus = async (productId, currentStatus) => {
        try {
            const newStatus = !currentStatus;
            const confirmMessage = newStatus
                ? 'Вы уверены, что хотите активировать этот товар?'
                : 'Вы уверены, что хотите деактивировать этот товар?';

            if (!window.confirm(confirmMessage)) return;

            await axios.patch(`/api/business/${business_slug}/products/${productId}/toggle-status/`, {
                is_active: newStatus
            });

            // Обновляем статус товара в состоянии
            setData(prev => ({
                ...prev,
                products: prev.products.map(product =>
                    product.id === productId
                        ? { ...product, is_active: newStatus }
                        : product
                )
            }));

            alert(`Товар успешно ${newStatus ? 'активирован' : 'деактивирован'}`);
        } catch (error) {
            console.error('Ошибка при изменении статуса товара:', error);
            alert('Не удалось изменить статус товара');
        }
    };

    // Fetch products and filters
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setFiltersLoading(true);

            const queryParams = new URLSearchParams(location.search);

            // Ensure sort parameter is set
            if (!queryParams.has('sort')) {
                queryParams.set('sort', '-created_at');
            }

            // Добавляем параметр location из хука (если != 'all')
            const locationParam = getLocationParam();
            if (locationParam && locationParam.location) {
                queryParams.set('location', locationParam.location);
            }
            
            // Добавляем параметр location_binding
            if (locationBinding && locationBinding !== 'all') {
                queryParams.set('location_binding', locationBinding);
            }

            // Добавляем фильтр "Есть в наличии"
            if (inStockOnly) {
                queryParams.set('in_stock', '1');
            }

            const response = await axios.get(
                `/api/business/${business_slug}/products/?${queryParams.toString()}`
            );

            setData(response.data);

            // Initialize expanded filters
            const initialExpanded = {};
            response.data.filters?.filters?.forEach(filter => {
                initialExpanded[filter.id] = true;
            });
            setExpandedFilters(initialExpanded);

        } catch (err) {
            console.error('Ошибка загрузки:', err);
            setError(err.message || 'Произошла ошибка при загрузке данных');
        } finally {
            setLoading(false);
            setFiltersLoading(false);
        }
    }, [business_slug, location.search, selectedLocation, locationBinding, inStockOnly]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle attribute selection
    const handleAttributeSelect = (filterId, value) => {
        setTempFilters(prev => {
            const newFilters = { ...prev };
            const attrKey = `attr_${filterId}`;

            if (!newFilters[attrKey]) {
                newFilters[attrKey] = [];
            }

            const valueStr = value.toString();
            const index = newFilters[attrKey].indexOf(valueStr);

            if (index === -1) {
                newFilters[attrKey] = [...newFilters[attrKey], valueStr];
            } else {
                newFilters[attrKey] = newFilters[attrKey].filter(v => v !== valueStr);
                if (newFilters[attrKey].length === 0) {
                    delete newFilters[attrKey];
                }
            }

            return newFilters;
        });
    };

    // Check if attribute is selected
    const isAttributeSelected = (filterId, value) => {
        const attrKey = `attr_${filterId}`;
        return tempFilters[attrKey]?.includes(value.toString()) || false;
    };

    // Apply all filters and update URL
    const applyFilters = () => {
        const queryParams = new URLSearchParams();

        // Basic filters
        if (searchQuery) queryParams.set('search', searchQuery);
        if (priceMin) queryParams.set('price_min', priceMin);
        if (priceMax) queryParams.set('price_max', priceMax);
        if (selectedCategory) queryParams.set('category', selectedCategory);
        if (locationBinding && locationBinding !== 'all') queryParams.set('location_binding', locationBinding);
        if (inStockOnly) queryParams.set('in_stock', '1');
        queryParams.set('sort', sortOption);
        queryParams.set('page', 1);

        // Attribute filters
        Object.entries(tempFilters).forEach(([key, values]) => {
            values.forEach(value => {
                queryParams.append(key, value);
            });
        });

        navigate(`?${queryParams.toString()}`);
    };

    // Reset all filters
    const resetFilters = () => {
        setSearchQuery('');
        setPriceMin('');
        setPriceMax('');
        setSelectedCategory(null);
        setSortOption('-created_at');
        setTempFilters({});
        setLocationBinding('all');
        setInStockOnly(false);
        updateLocation('all');
        navigate(`/business/${business_slug}/products`);
    };

    // Toggle filter expansion
    const toggleFilter = (filterId) => {
        setExpandedFilters(prev => ({
            ...prev,
            [filterId]: !prev[filterId]
        }));
    };

    // Toggle filters visibility
    const toggleFilters = () => {
        setIsFiltersOpen(!isFiltersOpen);
    };

    // Handle sort change
    const handleSortChange = (e) => {
        const newSortOption = e.target.value;
        setSortOption(newSortOption);
        const queryParams = new URLSearchParams(location.search);
        queryParams.set('sort', newSortOption);
        queryParams.set('page', 1);
        navigate(`?${queryParams.toString()}`);
    };

    // Load more products for infinite scroll
    const loadMoreProducts = async () => {
        if (!data.pagination?.has_next) return;

        try {
            const nextPage = data.pagination.current_page + 1;
            const queryParams = new URLSearchParams(location.search);
            queryParams.set('page', nextPage);

            // Добавляем параметр location из хука
            const locationParam = getLocationParam();
            if (locationParam && locationParam.location) {
                queryParams.set('location', locationParam.location);
            }
            
            // Добавляем параметр location_binding
            if (locationBinding && locationBinding !== 'all') {
                queryParams.set('location_binding', locationBinding);
            }

            // Добавляем фильтр "Есть в наличии"
            if (inStockOnly) {
                queryParams.set('in_stock', '1');
            }

            const response = await axios.get(
                `/api/business/${business_slug}/products/?${queryParams.toString()}`
            );

            setData(prev => ({
                ...prev,
                products: [...prev.products, ...response.data.products],
                pagination: response.data.pagination
            }));
        } catch (err) {
            console.error('Error loading more products:', err);
        }
    };

    // Используем централизованную утилиту из хука



    // Render product cards view
    const renderCardsView = () => (
        <InfiniteScroll
            dataLength={data.products.length}
            next={loadMoreProducts}
            hasMore={data.pagination?.has_next || false}
            loader={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}><Loader size="small" /></div>}
            className={styles.productsGrid}
        >
            {/* Add product card */}
            <motion.div
                className={`${styles.productCard} ${styles.addProductCard}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/business/${business_slug}/products/create`)}
            >
                <div className={styles.addProductContent}>
                    <i className={`fa fa-plus-circle ${styles.addProductIcon}`}></i>
                    <h5>Добавить товар</h5>
                    <p className={styles.addProductText}>Создайте новый товар для вашего бизнеса</p>
                </div>
            </motion.div>

            {/* Product cards */}
            {data.products.map(product => (
                <ProductManagementCard
                    key={product.id}
                    product={product}
                    businessSlug={business_slug}
                    onDelete={handleDeleteProduct}
                    onToggleStatus={handleToggleStatus}
                    handleCardClick={() => navigate(`/business/${businessSlug}/products/${product.id}/`)}
                />
            ))}
        </InfiniteScroll>
    );


    if (loading && !data.products.length) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <Loader size="large" />
            </div>
        );
    }

    if (error) {
        return <div className={styles.error}>Ошибка: {error}</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>
                    <i className={`fa fa-box-seam ${styles.titleIcon}`}></i>
                    Товары
                </h1>
                <div className={styles.headerActions}>
                    <button
                        className={styles.addProductButton}
                        onClick={() => navigate(`/business/${business_slug}/products/create`)}
                    >
                        Добавить Товар
                    </button>
                    <button
                        className={styles.attachLocationButton}
                        onClick={() => navigate(`/business/${business_slug}/variants-location-price`)}
                    >
                        <i className="fa fa-link"></i> Привязать к локации
                    </button>
                    <button className={styles.exportButton}>
                        <i className="fa fa-download"></i> Экспорт
                    </button>
                    <button className={styles.settingsButton}>
                        <i className="fa fa-gear"></i> Настройки
                    </button>
                </div>
            </div>

            {/* Mobile Filters Button */}
            <button 
                className={styles.mobileFiltersButton}
                onClick={openMobileFilters}
            >
                <i className="fa fa-filter"></i>
                Фильтры
            </button>

            <div className={styles.contentWrapper}>
                <aside className={styles.sidebar}>
                    {/* Locations filter */}
                    <div className={styles.filterSection}>
                        <h4 className={styles.filterTitle}>Локации</h4>
                        {locationsLoading ? (
                            <div className={styles.loadingText}>Загрузка локаций...</div>
                        ) : (
                            <div className={styles.categoriesList}>
                                <button
                                    className={`${styles.categoryButton} ${(!selectedLocation || selectedLocation === 'all') ? styles.active : ''}`}
                                    onClick={() => {
                                        updateLocation('all');
                                    }}
                                >
                                    По всем точкам
                                </button>
                                {locations.map(loc => (
                                    <button
                                        key={loc.id}
                                        className={`${styles.categoryButton} ${selectedLocation === String(loc.id) ? styles.active : ''}`}
                                        onClick={() => {
                                            updateLocation(String(loc.id));
                                        }}
                                    >
                                        {loc.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Location binding filter */}
                    <div className={styles.filterSection}>
                        <h4 className={styles.filterTitle}>Привязка к локациям</h4>
                        <div className={styles.categoriesList}>
                            <button
                                className={`${styles.categoryButton} ${locationBinding === 'all' ? styles.active : ''}`}
                                onClick={() => {
                                    setLocationBinding('all');
                                    const queryParams = new URLSearchParams(location.search);
                                    queryParams.delete('location_binding');
                                    queryParams.set('page', 1);
                                    navigate(`?${queryParams.toString()}`);
                                }}
                            >
                                Все товары
                            </button>
                            <button
                                className={`${styles.categoryButton} ${locationBinding === 'bound' ? styles.active : ''}`}
                                onClick={() => {
                                    setLocationBinding('bound');
                                    const queryParams = new URLSearchParams(location.search);
                                    queryParams.set('location_binding', 'bound');
                                    queryParams.set('page', 1);
                                    navigate(`?${queryParams.toString()}`);
                                }}
                            >
                                Привязанные
                            </button>
                            <button
                                className={`${styles.categoryButton} ${locationBinding === 'unbound' ? styles.active : ''}`}
                                onClick={() => {
                                    setLocationBinding('unbound');
                                    const queryParams = new URLSearchParams(location.search);
                                    queryParams.set('location_binding', 'unbound');
                                    queryParams.set('page', 1);
                                    navigate(`?${queryParams.toString()}`);
                                }}
                            >
                                Не привязанные
                            </button>
                        </div>
                    </div>

                    {/* Categories filter */}
                    <div className={styles.filterSection}>
                        <h4 className={styles.filterTitle}>Категории</h4>
                        <div className={styles.categoriesList}>
                            <button
                                className={`${styles.categoryButton} ${!selectedCategory ? styles.active : ''}`}
                                onClick={() => {
                                    setSelectedCategory(null);
                                    const queryParams = new URLSearchParams(location.search);
                                    queryParams.delete('category');
                                    queryParams.set('page', 1);
                                    navigate(`?${queryParams.toString()}`);
                                }}
                            >
                                Все товары
                            </button>
                            {data.categories.map(category => (
                                <button
                                    key={category.id}
                                    className={`${styles.categoryButton} ${selectedCategory === category.id ? styles.active : ''}`}
                                    onClick={() => {
                                        setSelectedCategory(category.id);
                                        const queryParams = new URLSearchParams(location.search);
                                        queryParams.set('category', category.id);
                                        queryParams.set('page', 1);
                                        navigate(`?${queryParams.toString()}`);
                                    }}
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Attributes filters */}
                    <div className={styles.filterSection}>
                        <FiltersSection
                            filtersLoading={loading}
                            filters={data.filters?.filters || []}
                            visibleFiltersCount={visibleFiltersCount}
                            expandedFilters={expandedFilters}
                            toggleFilter={toggleFilter}
                            isAttributeSelected={isAttributeSelected}
                            handleAttributeSelect={handleAttributeSelect}
                            setVisibleFiltersCount={setVisibleFiltersCount}
                        />
                    </div>

                    {/* Price filter */}
                    <div className={styles.filterSection}>
                        <h4 className={styles.filterTitle}>Цена</h4>
                        <div className={styles.priceInputs}>
                            <input
                                type="number"
                                placeholder="от"
                                className={styles.priceInput}
                                value={priceMin}
                                onChange={(e) => setPriceMin(e.target.value)}
                                min="0"
                            />
                            <span className={styles.priceSeparator}>-</span>
                            <input
                                type="number"
                                placeholder="до"
                                className={styles.priceInput}
                                value={priceMax}
                                onChange={(e) => setPriceMax(e.target.value)}
                                min="0"
                            />
                        </div>
                    </div>

                    {/* In stock filter */}
                    <div className={styles.filterSection}>
                        <div className={styles.checkboxFilter}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={inStockOnly}
                                    onChange={(e) => setInStockOnly(e.target.checked)}
                                />
                                <span>Только товары в наличии</span>
                            </label>
                        </div>
                        <button
                            className={styles.applyFilterButton}
                            onClick={applyFilters}
                        >
                            Применить все фильтры
                        </button>
                    </div>
                    <button
                        className={styles.resetFiltersButton}
                        onClick={resetFilters}
                    >
                        Сбросить все фильтры
                    </button>
                </aside>

                <main className={styles.mainContentFlex}>
                    {/* Search and sort */}
                    <div className={styles.productsHeader}>
                        <div className={styles.searchContainer}>
                            <input
                                type="text"
                                placeholder="Поиск по товарам..."
                                className={styles.searchInput}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                            />
                            {searchQuery && (
                                <button
                                    className={styles.clearButton}
                                    onClick={() => {
                                        setSearchQuery('');
                                        resetFilters();
                                    }}
                                >
                                    <i className="fa fa-times"></i>
                                </button>
                            )}
                            <button
                                className={styles.searchButton}
                                onClick={applyFilters}
                            >
                                <i className="fa fa-search"></i>
                            </button>
                        </div>

                        <div className={styles.sortContainer}>
                            <span className={styles.productsCount}>
                                Найдено товаров: <strong>{data.pagination?.total_items || data.products.length}</strong>
                            </span>
                            <label className={styles.sortLabel}>Сортировка:</label>
                            <select
                                value={sortOption}
                                onChange={handleSortChange}
                                className={styles.sortSelect}
                            >
                                <option value="-created_at">Сначала новые</option>
                                <option value="price">По возрастанию цены</option>
                                <option value="-price">По убыванию цены</option>
                                <option value="name">По названию (А-Я)</option>
                                <option value="-name">По названию (Я-А)</option>
                                <option value="category">По категории (А-Я)</option>
                                <option value="-category">По категории (Я-А)</option>
                            </select>
                        </div>
                    </div>

                    {/* Products display */}
                    {data.products.length === 0 ? (
                        <div className={styles.emptyState}>
                            <i className={`fa fa-box-seam ${styles.emptyIcon}`}></i>
                            <h3 className={styles.emptyTitle}>Товары не найдены</h3>
                            <p className={styles.emptyText}>Попробуйте изменить параметры фильтрации</p>
                            <button
                                className={styles.resetButton}
                                onClick={resetFilters}
                            >
                                Сбросить фильтры
                            </button>
                        </div>
                    ) : renderCardsView()}
                </main>
            </div>
            
            {/* Mobile Filters Menu */}
            <div className={`${styles.mobileFiltersOverlay} ${isMobileFiltersOpen ? styles.active : ''}`} onClick={closeMobileFilters}>
                <div className={`${styles.mobileFiltersPanel} ${isMobileFiltersOpen ? styles.active : ''}`} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.mobileFiltersHeader}>
                        <h3 className={styles.mobileFiltersTitle}>Фильтры</h3>
                        <button className={styles.mobileFiltersClose} onClick={closeMobileFilters}>
                            <i className="fa fa-times"></i>
                        </button>
                    </div>
                    
                    <div className={styles.mobileFiltersContent}>
                        {/* Locations filter */}
                        <div className={styles.filterSection}>
                            <h4 className={styles.filterTitle}>Локации</h4>
                            {locationsLoading ? (
                                <div className={styles.loadingText}>Загрузка локаций...</div>
                            ) : (
                                <div className={styles.categoriesList}>
                                    <button
                                        className={`${styles.categoryButton} ${(!mobileSelectedLocation || mobileSelectedLocation === 'all') ? styles.active : ''}`}
                                        onClick={() => setMobileSelectedLocation('all')}
                                    >
                                        По всем точкам
                                    </button>
                                    {locations.map(loc => (
                                        <button
                                            key={loc.id}
                                            className={`${styles.categoryButton} ${mobileSelectedLocation === String(loc.id) ? styles.active : ''}`}
                                            onClick={() => setMobileSelectedLocation(String(loc.id))}
                                        >
                                            {loc.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Location binding filter */}
                        <div className={styles.filterSection}>
                            <h4 className={styles.filterTitle}>Привязка к локациям</h4>
                            <div className={styles.categoriesList}>
                                <button
                                    className={`${styles.categoryButton} ${mobileLocationBinding === 'all' ? styles.active : ''}`}
                                    onClick={() => setMobileLocationBinding('all')}
                                >
                                    Все товары
                                </button>
                                <button
                                    className={`${styles.categoryButton} ${mobileLocationBinding === 'bound' ? styles.active : ''}`}
                                    onClick={() => setMobileLocationBinding('bound')}
                                >
                                    Привязанные
                                </button>
                                <button
                                    className={`${styles.categoryButton} ${mobileLocationBinding === 'unbound' ? styles.active : ''}`}
                                    onClick={() => setMobileLocationBinding('unbound')}
                                >
                                    Не привязанные
                                </button>
                            </div>
                        </div>

                        {/* Categories filter */}
                        <div className={styles.filterSection}>
                            <h4 className={styles.filterTitle}>Категории</h4>
                            <div className={styles.categoriesList}>
                                <button
                                    className={`${styles.categoryButton} ${!mobileSelectedCategory ? styles.active : ''}`}
                                    onClick={() => setMobileSelectedCategory(null)}
                                >
                                    Все товары
                                </button>
                                {data.categories.map(category => (
                                    <button
                                        key={category.id}
                                        className={`${styles.categoryButton} ${mobileSelectedCategory === category.id ? styles.active : ''}`}
                                        onClick={() => setMobileSelectedCategory(category.id)}
                                    >
                                        {category.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Attributes filters */}
                        <div className={styles.filterSection}>
                            <FiltersSection
                                filtersLoading={loading}
                                filters={data.filters?.filters || []}
                                visibleFiltersCount={visibleFiltersCount}
                                expandedFilters={expandedFilters}
                                toggleFilter={(filterId, attributeId) => {
                                    const newFilters = { ...mobileTempFilters };
                                    const key = `attr_${filterId}`;
                                    
                                    if (!newFilters[key]) {
                                        newFilters[key] = [];
                                    }
                                    
                                    if (newFilters[key].includes(attributeId)) {
                                        newFilters[key] = newFilters[key].filter(id => id !== attributeId);
                                        if (newFilters[key].length === 0) {
                                            delete newFilters[key];
                                        }
                                    } else {
                                        newFilters[key].push(attributeId);
                                    }
                                    
                                    setMobileTempFilters(newFilters);
                                }}
                                isAttributeSelected={(filterId, attributeId) => {
                                    const key = `attr_${filterId}`;
                                    return mobileTempFilters[key]?.includes(attributeId) || false;
                                }}
                                handleAttributeSelect={(filterId, attributeId) => {
                                    const newFilters = { ...mobileTempFilters };
                                    const key = `attr_${filterId}`;
                                    
                                    if (!newFilters[key]) {
                                        newFilters[key] = [];
                                    }
                                    
                                    if (newFilters[key].includes(attributeId)) {
                                        newFilters[key] = newFilters[key].filter(id => id !== attributeId);
                                        if (newFilters[key].length === 0) {
                                            delete newFilters[key];
                                        }
                                    } else {
                                        newFilters[key].push(attributeId);
                                    }
                                    
                                    setMobileTempFilters(newFilters);
                                }}
                                setVisibleFiltersCount={setVisibleFiltersCount}
                            />
                        </div>

                        {/* Price filter */}
                        <div className={styles.filterSection}>
                            <h4 className={styles.filterTitle}>Цена</h4>
                            <div className={styles.priceInputs}>
                                <input
                                    type="number"
                                    placeholder="от"
                                    className={styles.priceInput}
                                    value={mobilePriceMin}
                                    onChange={(e) => setMobilePriceMin(e.target.value)}
                                    min="0"
                                />
                                <span className={styles.priceSeparator}>-</span>
                                <input
                                    type="number"
                                    placeholder="до"
                                    className={styles.priceInput}
                                    value={mobilePriceMax}
                                    onChange={(e) => setMobilePriceMax(e.target.value)}
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* In stock filter */}
                        <div className={styles.filterSection}>
                            <div className={styles.checkboxFilter}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={mobileInStockOnly}
                                        onChange={(e) => setMobileInStockOnly(e.target.checked)}
                                    />
                                    <span>Только товары в наличии</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div className={styles.mobileFiltersActions}>
                        <button
                            className={styles.mobileApplyButton}
                            onClick={applyMobileFilters}
                        >
                            Применить
                        </button>
                        <button
                            className={styles.mobileResetButton}
                            onClick={resetMobileFilters}
                        >
                            Сбросить
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Модальное окно удаления */}
            <DeleteProductModal
                isOpen={deleteModalOpen}
                onClose={closeDeleteModal}
                onConfirm={confirmDeleteProduct}
                productName={productToDelete?.name}
            />
        </div>
    );
};

export default ProductManagement;