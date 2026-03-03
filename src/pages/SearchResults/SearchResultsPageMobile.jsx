import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import ProductCard from '../../components/ProductCard/ProductCard';
import FiltersSectionMobile from '../../components/FiltersSection/FiltersSectionMobile';
import Loader from '../../components/Loader';
import { FaFilter, FaTimes, FaSortAmountDown } from 'react-icons/fa';
import styles from '../MarkeplaceProducts/ProductsPageMobile.module.css';
import { useSearchFilters, buildSearchParams } from './useSearchFilters';

/** Группирует результаты поиска по product_id и возвращает один объект продукта на товар. */
function resultsToProducts(results) {
  if (!results?.length) return [];
  const byProduct = new Map();
  for (const hit of results) {
    const id = hit.product_id;
    if (!byProduct.has(id)) byProduct.set(id, []);
    byProduct.get(id).push(hit);
  }
  return Array.from(byProduct.entries()).map(([productId, hits]) => {
    const first = hits[0];
    const prices = hits.map((h) => Number(h.price_min) || 0).filter(Boolean);
    const minP = prices.length ? Math.min(...prices) : 0;
    const maxP = prices.length ? Math.max(...prices) : minP;
    return {
      id: Number(productId),
      name: first.variant_name || first.product_name || '',
      min_price: minP,
      max_price: maxP,
      default_variant: {
        price: String(minP),
        current_price: String(minP),
        discount: '0',
      },
      main_image: first.main_image || null,
      business_name: first.business_name || '',
      business_logo: first.business_logo || null,
    };
  });
}

const SORT_OPTIONS = [
  { value: '', label: 'По релевантности' },
  { value: 'price_min', label: 'По возрастанию цены' },
  { value: '-price_min', label: 'По убыванию цены' },
  { value: 'variant_name', label: 'По названию (А-Я)' },
  { value: '-variant_name', label: 'По названию (Я-А)' },
];

const PRICE_RANGES = [
  { label: 'До 5 000 ₸', min: '', max: '5000' },
  { label: '5 000 - 15 000 ₸', min: '5000', max: '15000' },
  { label: '15 000 - 60 000 ₸', min: '15000', max: '60000' },
  { label: '60 000 - 120 000 ₸', min: '60000', max: '120000' },
  { label: '120 000 ₸ и дороже', min: '120000', max: '' },
];

const SearchResultsPageMobile = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    q,
    page,
    sortOption,
    handleSortChange,
    categoryId,
    tempFilters,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    handleAttributeSelect,
    isAttributeSelected,
    applyFilters,
    resetFilters,
    resetFilterCategory,
    buildSearchParams: buildParams,
  } = useSearchFilters();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [showAllSubcategories, setShowAllSubcategories] = useState(false);
  const observerTarget = useRef(null);

  const subcategoriesFromApi = data?.subcategories ?? [];
  const filtersFromApi = data?.filters?.filters ?? [];
  const categoryFromApi = data?.category ?? null;

  useEffect(() => {
    if (!q.trim()) {
      setData(null);
      setAllProducts([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAllProducts([]);
    setCurrentPage(1);
    setHasMore(false);
    const params = buildParams(searchParams, filtersFromApi);
    params.page = '1';

    const fetchResults = async () => {
      try {
        const response = await axios.get('/search/api/', { params });
        if (!cancelled) {
          setData(response.data);
          const products = resultsToProducts(response.data.results ?? []);
          setAllProducts(products);
          setCurrentPage(1);
          const total = response.data.total ?? 0;
          const size = response.data.page_size ?? 12;
          setHasMore(total > size);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || err.message || 'Ошибка поиска');
          setData(null);
          setAllProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchResults();
    return () => { cancelled = true; };
  }, [q, searchParams.toString()]);

  const loadMoreProducts = useCallback(async () => {
    if (loadingMore || !hasMore || !data) return;
    setLoadingMore(true);
    try {
      const params = buildParams(searchParams, filtersFromApi);
      params.page = String(currentPage + 1);
      const response = await axios.get('/search/api/', { params });
      const newProducts = resultsToProducts(response.data.results ?? []);
      setAllProducts((prev) => [...prev, ...newProducts]);
      setCurrentPage((p) => p + 1);
      const total = response.data.total ?? 0;
      const size = response.data.page_size ?? 12;
      setHasMore((currentPage + 1) * size < total);
    } catch (err) {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, currentPage, data, searchParams.toString(), filtersFromApi]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreProducts();
        }
      },
      { threshold: 0.1 }
    );
    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasMore, loadingMore, loading, loadMoreProducts]);

  const toggleFilters = () => {
    if (isFiltersOpen) setIsFiltersOpen(false);
    else {
      setIsSortOpen(false);
      setIsFiltersOpen(true);
    }
  };

  const toggleSort = () => {
    if (isSortOpen) setIsSortOpen(false);
    else {
      setIsFiltersOpen(false);
      setIsSortOpen(true);
    }
  };

  const handleSortSelect = (value) => {
    handleSortChange(value || undefined);
    setIsSortOpen(false);
  };

  const handlePriceRangeSelect = (min, max) => {
    setPriceMin(min);
    setPriceMax(max);
  };

  const isPriceRangeSelected = (min, max) => priceMin === min && priceMax === max;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Loader size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.productsPage}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>!</div>
          <h3>Произошла ошибка</h3>
          <p>{error}</p>
          <button className={styles.primaryButton} onClick={() => window.location.reload()}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!q.trim()) {
    return (
      <div className={styles.productsPage}>
        <div className={styles.productsContent}>
          <div className={styles.noProducts}>
            <p>Введите запрос в поле поиска в шапке сайта.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.productsPage}>
      <div className={styles.subcategoriesSection}>
        <div className={styles.subcategoriesChips}>
          <button
            className={styles.categoriesModalButton}
            onClick={toggleFilters}
            aria-label="Фильтры"
          >
            <FaFilter />
            {Object.keys(tempFilters).length > 0 && (
              <span className={styles.filterBadge}>{Object.keys(tempFilters).length}</span>
            )}
          </button>
          <button
            className={styles.categoriesModalButton}
            onClick={toggleSort}
            aria-label="Сортировка"
          >
            <FaSortAmountDown />
          </button>
          {subcategoriesFromApi.length > 0 && (
            <>
              <button
                className={styles.categoriesModalButton}
                onClick={() => setIsCategoriesModalOpen(true)}
                aria-label="Все категории"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.categoriesModalIcon}>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              {subcategoriesFromApi.map((sub) => (
                <button
                  key={sub.id}
                  className={`${styles.subcategoryChip} ${Number(categoryId) === Number(sub.id) ? styles.subcategoryChipActive : ''}`}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set('category_id', String(sub.id));
                    params.set('page', '1');
                    navigate({ pathname: '/marketplace/search', search: params.toString() });
                  }}
                >
                  {sub.name}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      <div className={styles.productsContent}>
        {allProducts.length > 0 ? (
          <>
            <div className={styles.productGrid}>
              {allProducts.map((product, index) => (
                <div
                  key={`${product.id}-${index}`}
                  className={styles.productCardWrapper}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            <div ref={observerTarget} className={styles.infiniteScrollTrigger}>
              {loadingMore && (
                <div className={styles.loadingMore}>
                  <Loader size="small" />
                  <p>Загрузка товаров...</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.noProducts}>
            <div className={styles.noProductsIcon}>📦</div>
            <h3>По запросу «{q}» ничего не найдено</h3>
            <p>Попробуйте изменить параметры поиска</p>
            <button className={styles.primaryButton} onClick={resetFilters}>
              Сбросить фильтры
            </button>
          </div>
        )}
      </div>

      {/* Модальное окно фильтров */}
      {isFiltersOpen && (
        <>
          <div className={styles.modalOverlay} onClick={toggleFilters} />
          <div className={styles.filtersModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Фильтры</h2>
              <button className={styles.cancelButton} onClick={toggleFilters} aria-label="Отмена">
                Отмена
              </button>
            </div>
            <div className={styles.modalContent}>
              {subcategoriesFromApi.length > 0 && (
                <div className={styles.filterSection}>
                  <div className={styles.filterCategoryHeader}>
                    <h4 className={styles.filterTitle}>Подкатегории</h4>
                  </div>
                  <div className={styles.filterChips}>
                    {(showAllSubcategories ? subcategoriesFromApi : subcategoriesFromApi.slice(0, 5)).map((sub) => (
                      <button
                        key={sub.id}
                        className={`${styles.filterChip} ${Number(categoryId) === Number(sub.id) ? styles.filterChipSelected : ''}`}
                        onClick={() => {
                          const params = new URLSearchParams(searchParams);
                          params.set('category_id', String(sub.id));
                          params.set('page', '1');
                          navigate({ pathname: '/marketplace/search', search: params.toString() });
                          setIsFiltersOpen(false);
                        }}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                  {subcategoriesFromApi.length > 5 && (
                    <button
                      className={styles.showMoreButton}
                      onClick={() => setShowAllSubcategories(!showAllSubcategories)}
                    >
                      {showAllSubcategories ? 'Свернуть' : `Показать все (${subcategoriesFromApi.length})`}
                    </button>
                  )}
                </div>
              )}

              <div className={styles.filterSection}>
                <div className={styles.filterCategoryHeader}>
                  <h4 className={styles.filterTitle}>Цена</h4>
                </div>
                <div className={styles.priceInputs}>
                  <input
                    type="number"
                    placeholder="от"
                    className={styles.priceInput}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="до"
                    className={styles.priceInput}
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    min="0"
                  />
                </div>
                <div className={styles.priceRanges}>
                  {PRICE_RANGES.map((range, index) => (
                    <button
                      key={index}
                      className={`${styles.priceRangeChip} ${isPriceRangeSelected(range.min, range.max) ? styles.priceRangeChipSelected : ''}`}
                      onClick={() => handlePriceRangeSelect(range.min, range.max)}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              <FiltersSectionMobile
                filtersLoading={false}
                filters={filtersFromApi}
                isAttributeSelected={isAttributeSelected}
                handleAttributeSelect={handleAttributeSelect}
                tempFilters={tempFilters}
                resetFilterCategory={resetFilterCategory}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.closeModalButton}
                onClick={() => {
                  applyFilters();
                  setIsFiltersOpen(false);
                }}
              >
                Применить
              </button>
            </div>
          </div>
        </>
      )}

      {/* Модальное окно сортировки */}
      {isSortOpen && (
        <>
          <div className={styles.modalOverlay} onClick={toggleSort} />
          <div className={styles.sortModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Сортировка</h2>
              <button className={styles.cancelButton} onClick={toggleSort} aria-label="Отмена">
                Отмена
              </button>
            </div>
            <div className={styles.sortOptions}>
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value || 'relevance'}
                  className={`${styles.sortOption} ${sortOption === option.value ? styles.sortOptionActive : ''}`}
                  onClick={() => handleSortSelect(option.value)}
                >
                  {option.label}
                  {((!option.value && !sortOption) || sortOption === option.value) && (
                    <span className={styles.checkmark}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Модальное окно подкатегорий снизу */}
      {isCategoriesModalOpen && subcategoriesFromApi.length > 0 && (
        <>
          <div className={styles.modalOverlay} onClick={() => setIsCategoriesModalOpen(false)} />
          <div className={styles.categoriesBottomModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.bottomModalHandle} />
            <div className={styles.bottomModalHeader}>
              <h2>Подкатегории</h2>
              <button className={styles.closeButton} onClick={() => setIsCategoriesModalOpen(false)} aria-label="Закрыть">
                <FaTimes />
              </button>
            </div>
            <div className={styles.bottomModalContent}>
              <div className={styles.categoriesModalList}>
                {subcategoriesFromApi.map((sub) => (
                  <button
                    key={sub.id}
                    className={`${styles.categoriesModalItem} ${Number(categoryId) === Number(sub.id) ? styles.categoriesModalItemActive : ''}`}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.set('category_id', String(sub.id));
                      params.set('page', '1');
                      navigate({ pathname: '/marketplace/search', search: params.toString() });
                      setIsCategoriesModalOpen(false);
                    }}
                  >
                    <span>{sub.name}</span>
                    {Number(categoryId) === Number(sub.id) && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SearchResultsPageMobile;
