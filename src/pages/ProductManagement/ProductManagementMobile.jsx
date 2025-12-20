import React, { useState, useEffect, useCallback } from 'react';
import axios from "../../api/axiosDefault.js";
import { useParams, useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductManagementCard from '../../components/ProductManagementCard/ProductManagementCard.jsx';
import { useFileUtils } from '../../hooks/useFileUtils';
import { useLocation } from '../../hooks/useLocation';
import styles from './ProductManagementMobile.module.css';
import InfiniteScroll from 'react-infinite-scroll-component';
import FiltersSection from '/src/components/FiltersSection/FiltersSection.jsx';
import DeleteProductModal from '../../components/DeleteProductModal/DeleteProductModal.jsx';
import Loader from '../../components/Loader';

const ProductManagementMobile = () => {
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
    const [locationBinding, setLocationBinding] = useState('all');
    const [inStockOnly, setInStockOnly] = useState(false);
    const [tempFilters, setTempFilters] = useState({});
    const [expandedFilters, setExpandedFilters] = useState({});
    const [visibleFiltersCount, setVisibleFiltersCount] = useState(3);
    
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

    const updateURLWithFilters = (filters, priceMin, priceMax, category, locationBinding = 'all', inStock = false) => {
        const params = new URLSearchParams();
        
        if (searchQuery) params.set('search', searchQuery);
        if (sortOption) params.set('sort', sortOption);
        if (priceMin) params.set('price_min', priceMin);
        if (priceMax) params.set('price_max', priceMax);
        if (category) params.set('category', category);
        if (locationBinding && locationBinding !== 'all') params.set('location_binding', locationBinding);
        if (inStock) params.set('in_stock', '1');
        
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

    const applyMobileFilters = () => {
        setTempFilters({ ...mobileTempFilters });
        setPriceMin(mobilePriceMin);
        setPriceMax(mobilePriceMax);
        setSelectedCategory(mobileSelectedCategory);
        setLocationBinding(mobileLocationBinding);
        setInStockOnly(mobileInStockOnly);
        
        if (mobileSelectedLocation && mobileSelectedLocation !== 'all') {
            updateLocation(mobileSelectedLocation);
        } else {
            updateLocation('all');
        }
        
        updateURLWithFilters(
            mobileTempFilters,
            mobilePriceMin,
            mobilePriceMax,
            mobileSelectedCategory,
            mobileLocationBinding,
            mobileInStockOnly
        );
        
        closeMobileFilters();
        // fetchData() не нужен здесь, так как изменение URL через navigate автоматически вызовет useEffect
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

            setData(prev => ({
                ...prev,
                products: prev.products.filter(product => product.id !== productToDelete.id),
                pagination: {
                    ...prev.pagination,
                    total_items: prev.pagination.total_items - 1
                }
            }));

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

            if (!queryParams.has('sort')) {
                queryParams.set('sort', '-created_at');
            }

            // Устанавливаем размер страницы на 2 товара
            queryParams.set('page_size', '2');

            const locationParam = getLocationParam();
            if (locationParam && locationParam.location) {
                queryParams.set('location', locationParam.location);
            }
            
            if (locationBinding && locationBinding !== 'all') {
                queryParams.set('location_binding', locationBinding);
            }

            if (inStockOnly) {
                queryParams.set('in_stock', '1');
            }

            const response = await axios.get(
                `/api/business/${business_slug}/products/?${queryParams.toString()}`
            );

            setData(response.data);

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
        // Добавляем небольшую задержку, чтобы избежать множественных запросов при быстрых изменениях
        const timeoutId = setTimeout(() => {
            fetchData();
        }, 100);

        return () => clearTimeout(timeoutId);
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

    const isAttributeSelected = (filterId, value) => {
        const attrKey = `attr_${filterId}`;
        return tempFilters[attrKey]?.includes(value.toString()) || false;
    };

    // Apply all filters and update URL
    const applyFilters = () => {
        const queryParams = new URLSearchParams();

        if (searchQuery) queryParams.set('search', searchQuery);
        if (priceMin) queryParams.set('price_min', priceMin);
        if (priceMax) queryParams.set('price_max', priceMax);
        if (selectedCategory) queryParams.set('category', selectedCategory);
        if (locationBinding && locationBinding !== 'all') queryParams.set('location_binding', locationBinding);
        if (inStockOnly) queryParams.set('in_stock', '1');
        queryParams.set('sort', sortOption);
        queryParams.set('page', 1);

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
            queryParams.set('page_size', '2'); // Загружаем по 2 товара

            const locationParam = getLocationParam();
            if (locationParam && locationParam.location) {
                queryParams.set('location', locationParam.location);
            }
            
            if (locationBinding && locationBinding !== 'all') {
                queryParams.set('location_binding', locationBinding);
            }

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

    // Render product cards view
    const renderCardsView = () => (
        <InfiniteScroll
            dataLength={data.products.length}
            next={loadMoreProducts}
            hasMore={data.pagination?.has_next || false}
            loader={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}><Loader size="small" /></div>}
            className={styles.productsList}
        >
            {/* Add product card */}
            <motion.div
                className={`${styles.productCard} ${styles.addProductCard}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/business/${business_slug}/products/create`)}
            >
                <div className={styles.addProductContent}>
                    <div className={styles.addProductIconWrapper}>
                        <i className={`fa fa-plus ${styles.addProductIcon}`}></i>
                    </div>
                    <h5>Добавить товар</h5>
                    <p className={styles.addProductText}>Создайте новый товар для каталога</p>
                </div>
            </motion.div>

            {/* Product cards */}
            {data.products.map((product, index) => (
                <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <ProductManagementCard
                        product={product}
                        businessSlug={business_slug}
                        onDelete={handleDeleteProduct}
                        onToggleStatus={handleToggleStatus}
                        handleCardClick={() => navigate(`/business/${business_slug}/products/${product.id}/`)}
                    />
                </motion.div>
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
            {/* Mobile Header - Sticky */}
            <div className={styles.header}>
                <div className={styles.headerTop}>
                    <div className={styles.titleWrapper}>
                        <h1 className={styles.title}>
                            <i className={`fa fa-box-seam ${styles.titleIcon}`}></i>
                            Товары
                        </h1>
                        {data.pagination?.total_items > 0 && (
                            <span className={styles.badge}>
                                {data.pagination?.total_items || data.products.length}
                            </span>
                        )}
                    </div>
                    <motion.button
                        className={styles.addButton}
                        onClick={() => navigate(`/business/${business_slug}/products/create`)}
                        title="Добавить товар"
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.05 }}
                    >
                        <i className="fa fa-plus"></i>
                    </motion.button>
                </div>

                {/* Search Bar */}
                <div className={styles.searchContainer}>
                    <div className={styles.searchWrapper}>
                        <i className={`fa fa-search ${styles.searchIcon}`}></i>
                        <input
                            type="text"
                            placeholder="Поиск товаров..."
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                        />
                        {searchQuery && (
                            <motion.button
                                className={styles.clearButton}
                                onClick={() => {
                                    setSearchQuery('');
                                    resetFilters();
                                }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <i className="fa fa-times"></i>
                            </motion.button>
                        )}
                        <motion.button
                            className={styles.searchButton}
                            onClick={applyFilters}
                            whileTap={{ scale: 0.95 }}
                            title="Поиск"
                        >
                            <i className="fa fa-search"></i>
                        </motion.button>
                    </div>
                    <motion.button 
                        className={styles.filtersButton}
                        onClick={openMobileFilters}
                        whileTap={{ scale: 0.95 }}
                        title="Фильтры"
                    >
                        <i className="fa fa-filter"></i>
                        {(selectedCategory || priceMin || priceMax || Object.keys(tempFilters).length > 0 || locationBinding !== 'all' || inStockOnly) && (
                            <span className={styles.filterBadge}></span>
                        )}
                    </motion.button>
                </div>

                {/* Sort and Count Row */}
                <div className={styles.sortRow}>
                    <span className={styles.productsCount}>
                        {data.pagination?.total_items || data.products.length} товаров
                    </span>
                    <select
                        value={sortOption}
                        onChange={handleSortChange}
                        className={styles.sortSelect}
                    >
                        <option value="-created_at">🆕 Новые</option>
                        <option value="price">💰 Цена ↑</option>
                        <option value="-price">💰 Цена ↓</option>
                        <option value="name">🔤 А-Я</option>
                        <option value="-name">🔤 Я-А</option>
                    </select>
                </div>
            </div>

            {/* Products List */}
            <div className={styles.content}>
                {data.products.length === 0 && !loading ? (
                    <motion.div 
                        className={styles.emptyState}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className={styles.emptyIconWrapper}>
                            <i className={`fa fa-box-seam ${styles.emptyIcon}`}></i>
                        </div>
                        <h3 className={styles.emptyTitle}>Товары не найдены</h3>
                        <p className={styles.emptyText}>
                            {searchQuery || selectedCategory || priceMin || priceMax 
                                ? 'Попробуйте изменить параметры фильтрации'
                                : 'Добавьте первый товар в ваш каталог'}
                        </p>
                        <motion.button
                            className={styles.resetButton}
                            onClick={resetFilters}
                            whileTap={{ scale: 0.95 }}
                        >
                            {searchQuery || selectedCategory || priceMin || priceMax 
                                ? 'Сбросить фильтры'
                                : 'Добавить товар'}
                        </motion.button>
                    </motion.div>
                ) : renderCardsView()}
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
                                toggleFilter={(filterId) => {
                                    setExpandedFilters(prev => ({
                                        ...prev,
                                        [filterId]: !prev[filterId]
                                    }));
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
            
            {/* Delete Modal */}
            <DeleteProductModal
                isOpen={deleteModalOpen}
                onClose={closeDeleteModal}
                onConfirm={confirmDeleteProduct}
                productName={productToDelete?.name}
            />
    </div>
  );
};

export default ProductManagementMobile;
