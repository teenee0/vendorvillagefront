import React, { useState, useEffect, useCallback } from 'react';
import axios from "../../api/axiosDefault.js";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductManagementCard from '../../components/ProductManagementCard/ProductManagementCard.jsx';
import styles from './ProductManagement.module.css';
import InfiniteScroll from 'react-infinite-scroll-component';
import FiltersSection from '/src/components/FiltersSection/FiltersSection.jsx';

const ProductManagement = () => {
    const { business_slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

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
    const [viewMode, setViewMode] = useState('cards');

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('-created_at');
    const [tempFilters, setTempFilters] = useState({});
    const [expandedFilters, setExpandedFilters] = useState({});
    const [visibleFiltersCount, setVisibleFiltersCount] = useState(3);
    const [isFiltersOpen, setIsFiltersOpen] = useState(true);

    // Initialize from URL params
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        setSearchQuery(queryParams.get('search') || '');
        setSortOption(queryParams.get('sort') || '-created_at');
        setPriceMin(queryParams.get('price_min') || '');
        setPriceMax(queryParams.get('price_max') || '');
        setSelectedCategory(queryParams.get('category') || null);

        const initialFilters = {};
        queryParams.forEach((value, key) => {
            if (key.startsWith('attr_')) {
                initialFilters[key] = initialFilters[key] || [];
                initialFilters[key].push(value);
            }
        });
        setTempFilters(initialFilters);
    }, [location.search]);

    const handleDeleteProduct = async (productId) => {
        try {
            const confirmDelete = window.confirm('Вы уверены, что хотите удалить этот товар?');
            if (!confirmDelete) return;

            await axios.delete(`/api/business/${business_slug}/products/${productId}/delete`);

            // Обновляем список товаров после удаления
            setData(prev => ({
                ...prev,
                products: prev.products.filter(product => product.id !== productId),
                pagination: {
                    ...prev.pagination,
                    total_items: prev.pagination.total_items - 1
                }
            }));

            // Можно добавить уведомление об успешном удалении
            alert('Товар успешно удален');
        } catch (error) {
            console.error('Ошибка при удалении товара:', error);
            alert('Не удалось удалить товар');
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

            const response = await axios.get(
                `/api/business/${business_slug}/products/?${queryParams.toString()}`
            );

            setData(response.data);

            // Initialize expanded filters
            const initialExpanded = {};
            response.data.filters?.filters?.forEach(filter => {
                initialExpanded[filter.id] = false;
            });
            setExpandedFilters(initialExpanded);

        } catch (err) {
            console.error('Ошибка загрузки:', err);
            setError(err.message || 'Произошла ошибка при загрузке данных');
        } finally {
            setLoading(false);
            setFiltersLoading(false);
        }
    }, [business_slug, location.search]);

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

    const getImageUrl = (imagePath) => {
        if (!imagePath) return '';

        if (/^https?:\/\//i.test(imagePath)) {
            return imagePath;
        }
        if (imagePath.startsWith('/media/')) {
            return `http://localhost:8000${imagePath}`;
        }
        if (!imagePath.startsWith('/')) {
            return `http://localhost:8000/media/${imagePath}`;
        }
        return `http://localhost:8000${imagePath}`;
    };



    // Render product cards view
    const renderCardsView = () => (
        <InfiniteScroll
            dataLength={data.products.length}
            next={loadMoreProducts}
            hasMore={data.pagination?.has_next || false}
            loader={<div className={styles.loadingMore}>Загрузка...</div>}
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
                    handleCardClick={() => navigate(`/business/${businessSlug}/products/${product.id}/`)}
                />
            ))}
        </InfiniteScroll>
    );

    // Render table view with variants
    const renderTableView = () => {
        const allVariants = data.products.flatMap(product =>
            product.variants.map(variant => ({
                ...variant,
                productId: product.id,
                productName: product.name,
                productDescription: product.description,
                categoryName: product.category_name,
                mainImage: product.main_image,
                isActive: product.is_active
            }))
        );

        return (
            <div className={styles.tableWrapper}>
                <div className={styles.tableScrollContainer}>
                    <InfiniteScroll
                        dataLength={allVariants.length}
                        next={loadMoreProducts}
                        hasMore={data.pagination?.has_next || false}
                        loader={<div className={styles.loadingMore}>Загрузка...</div>}
                    >
                        <table className={styles.productsTable}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Фото</th>
                                    <th>Название</th>
                                    <th>Категория</th>
                                    <th>Цена</th>
                                    <th>Артикул</th>
                                    <th>Склад</th>
                                    <th>Всего</th>
                                    <th>Зарезервировано</th>
                                    <th>Доступно</th>
                                    <th>Атрибуты</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Add product row */}
                                <tr
                                    className={styles.addProductRow}
                                    onClick={() => navigate(`/business/${business_slug}/products/create`)}
                                >
                                    <td colSpan="12">
                                        <i className={`fa fa-plus-circle-fill ${styles.addRowIcon}`}></i>
                                        <span>Добавить новый товар</span>
                                    </td>
                                </tr>

                                {/* Variant rows */}
                                {allVariants.map((variant, index) => (
                                    <tr key={`${variant.productId}-${variant.id}`} className={styles.productRow}>
                                        <td>{index + 1}</td>
                                        <td>
                                            {variant.mainImage && (
                                                <img
                                                    src={getImageUrl(variant.mainImage.image)}
                                                    alt={variant.productName}
                                                    className={styles.tableImage}
                                                />
                                            )}
                                        </td>
                                        <td className={styles.productNameCell}>
                                            <div className={styles.productNameWrapper}>
                                                {variant.productName.substring(0, 20)}...
                                                {variant.has_custom_name && variant.custom_name && (
                                                    <div className={styles.customName}>
                                                        <small>Кастомное имя: {variant.custom_name}</small>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>{variant.categoryName}</td>
                                        <td className={styles.priceCell}>
                                            <div className={styles.priceWrapper}>
                                                <div className={styles.priceRow}>
                                                    <span className={styles.priceLabel}>Цена:</span>
                                                    <span className={styles.priceValue}>{variant.price}</span>
                                                </div>
                                                {variant.discount && variant.discount > 0 && (
                                                    <>
                                                        <div className={styles.priceRow}>
                                                            <span className={styles.priceLabel}>Скидка:</span>
                                                            <span className={styles.discountBadge}>-{variant.discount}%</span>
                                                        </div>
                                                        <div className={styles.priceRow}>
                                                            <span className={styles.priceLabel}>Итог:</span>
                                                            <span className={styles.finalPrice}>{variant.current_price}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className={styles.skuCell}>
                                            <div className={styles.skuWrapper}>
                                                {variant.sku}
                                            </div>
                                        </td>
                                        <td>{variant.stocks[0].location_name}</td>
                                        <td>{variant.stocks[0].quantity}</td>
                                        <td>{variant.stocks[0].reserved_quantity}</td>
                                        <td>{variant.stocks[0].available_quantity}</td>
                                        <td className={styles.attributesCell}>
                                            <div className={styles.attributesList}>
                                                {variant.attributes.map(attr => (
                                                    <div key={attr.id} className={styles.attributeItem}>
                                                        <strong>{attr.attribute_name}:</strong>
                                                        <span
                                                            className={styles.attributeValue}
                                                            title={attr.display_value}
                                                        >
                                                            {attr.display_value.length > 15
                                                                ? `${attr.display_value.substring(0, 15)}...`
                                                                : attr.display_value}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>

                                        <td className={styles.actionsCell}>
                                            <button
                                                className={styles.actionButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/business/${business_slug}/products/${variant.productId}/edit`);
                                                }}
                                            >
                                                <i className="fa fa-pencil"></i>
                                            </button>
                                            <button
                                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteProduct(variant.productId);
                                                }}
                                            >
                                                <i className="fa fa-trash"></i>
                                            </button>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </InfiniteScroll>
                </div>
            </div>
        );
    };

    if (loading && !data.products.length) {
        return <div className={styles.loading}>Загрузка товаров...</div>;
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
                    <button className={styles.exportButton}>
                        <i className="fa fa-download"></i> Экспорт
                    </button>
                    <button className={styles.settingsButton}>
                        <i className="fa fa-gear"></i> Настройки
                    </button>
                </div>
            </div>

            <div className={styles.contentWrapper}>
                <aside className={styles.sidebar}>
                    {/* Categories filter */}
                    <div className={styles.filterSection}>
                        <h4 className={styles.filterTitle}>Категории</h4>
                        <div className={styles.categoriesList}>
                            <button
                                className={`${styles.categoryButton} ${!selectedCategory ? styles.active : ''}`}
                                onClick={() => setSelectedCategory(null)}
                            >
                                Все товары
                            </button>
                            {data.categories.map(category => (
                                <button
                                    key={category.id}
                                    className={`${styles.categoryButton} ${selectedCategory === category.id ? styles.active : ''}`}
                                    onClick={() => setSelectedCategory(category.id)}
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

                <main className={viewMode === 'cards' ? styles.mainContentFlex : styles.mainContentGrid}>
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
                            </select>
                        </div>
                    </div>

                    {/* View mode toggle */}
                    <div className={styles.viewToggle}>
                        <button
                            className={`${styles.viewToggleButton} ${viewMode === 'cards' ? styles.active : ''}`}
                            onClick={() => setViewMode('cards')}
                        >
                            <i className="fa fa-grid-3x3-gap"></i> Карточки
                        </button>
                        <button
                            className={`${styles.viewToggleButton} ${viewMode === 'table' ? styles.active : ''}`}
                            onClick={() => setViewMode('table')}
                        >
                            <i className="fa fa-list-ul"></i> Таблица
                        </button>
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
                    ) : viewMode === 'cards' ? renderCardsView() : renderTableView()}
                </main>
            </div>
        </div>
    );
};

export default ProductManagement;