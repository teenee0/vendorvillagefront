import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import ProductCard from '../../components/ProductCard/ProductCard';
import FiltersSection from '../../components/FiltersSection/FiltersSection';
import Loader from '../../components/Loader';
import styles from '../MarkeplaceProducts/ProductsPageDesktop.module.css';
import { useSearchFilters, buildSearchParams } from './useSearchFilters';

/** Группирует результаты поиска по product_id и возвращает один объект продукта на товар (не на вариант). */
function resultsToProducts(results) {
  if (!results?.length) return [];
  const byProduct = new Map();
  for (const hit of results) {
    const id = hit.product_id;
    if (!byProduct.has(id)) {
      byProduct.set(id, []);
    }
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

const searchBreadcrumbs = [{ id: 'search', name: 'Поиск', path: '/marketplace/search' }];

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    q,
    page,
    categoryId,
    tempFilters,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    expandedFilters,
    visibleFiltersCount,
    setVisibleFiltersCount,
    handleAttributeSelect,
    isAttributeSelected,
    toggleFilter,
    resetFilterCategory,
    applyFilters,
    resetFilters,
    buildSearchParams: buildParams,
  } = useSearchFilters();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  const filtersFromApi = data?.filters?.filters ?? [];
  const categoryFromApi = data?.category ?? null;
  const subcategoriesFromApi = data?.subcategories ?? [];

  useEffect(() => {
    if (!q.trim()) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = buildParams(searchParams);

    const fetchResults = async () => {
      try {
        const response = await axios.get('/search/api/', { params });
        if (!cancelled) {
          setData(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || err.message || 'Ошибка поиска');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchResults();
    return () => { cancelled = true; };
  }, [q, page, searchParams.toString()]);

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    navigate({ pathname: '/marketplace/search', search: params.toString() });
  };

  const toggleFilters = () => setIsFiltersOpen((v) => !v);

  const handleResetFilters = () => resetFilters();

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
        <Breadcrumbs breadcrumbs={searchBreadcrumbs} />
        <div className={styles.pageHeader}>
          <h1>Поиск</h1>
        </div>
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

  const results = data?.results ?? [];
  const products = resultsToProducts(results);
  const totalPages = data?.page_size ? Math.ceil((data?.total ?? 0) / data.page_size) : 0;

  if (!q.trim()) {
    return (
      <div className={styles.productsPage}>
        <Breadcrumbs breadcrumbs={searchBreadcrumbs} />
        <div className={styles.pageHeader}>
          <h1>Поиск по каталогу</h1>
        </div>
        <div className={styles.productsContainer}>
          <main className={styles.mainContent}>
            <p className={styles.productsCount} style={{ marginBottom: '1rem' }}>
              Введите запрос в поле поиска в шапке сайта.
            </p>
          </main>
        </div>
      </div>
    );
  }

  const sidebar = (
    <>
      {categoryFromApi?.name && (
        <div className={styles.filterSection}>
          <h4 className={styles.filterTitle}>Категория</h4>
          <p className={styles.productsCount} style={{ margin: 0 }}>
            {categoryFromApi.name}
          </p>
        </div>
      )}
      <FiltersSection
        filtersLoading={false}
        filters={filtersFromApi}
        visibleFiltersCount={visibleFiltersCount}
        expandedFilters={expandedFilters}
        toggleFilter={toggleFilter}
        isAttributeSelected={isAttributeSelected}
        handleAttributeSelect={handleAttributeSelect}
        setVisibleFiltersCount={setVisibleFiltersCount}
      />
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
          <input
            type="number"
            placeholder="до"
            className={styles.priceInput}
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            min="0"
          />
        </div>
        <button className={styles.applyFilterButton} onClick={applyFilters}>
          Применить все фильтры
        </button>
      </div>
      <button type="button" className={styles.resetFiltersButton} onClick={handleResetFilters}>
        Сбросить все фильтры
      </button>
    </>
  );

  return (
    <div className={styles.productsPage}>
      <Breadcrumbs breadcrumbs={searchBreadcrumbs} productName={q ? `«${q}»` : undefined} />

      <div className={styles.pageHeader}>
        <h1>Результаты поиска: «{q}»</h1>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.filterToggle}
            onClick={toggleFilters}
          >
            {isFiltersOpen ? 'Скрыть фильтры' : 'Показать фильтры'}
          </button>
        </div>
      </div>

      {subcategoriesFromApi.length > 0 && (
        <div className={styles.subcategoriesSection}>
          <div className={styles.subcategoriesChips}>
            {subcategoriesFromApi.map((sub) => (
              <button
                key={sub.id}
                type="button"
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
          </div>
        </div>
      )}

      <div className={styles.productsContainer}>
        <aside className={`${styles.sidebar} ${isFiltersOpen ? styles.open : styles.closed}`}>
          <div className={styles.sidebarHeader}>
            <h3>Фильтры</h3>
            <button type="button" className={styles.closeFilters} onClick={toggleFilters} aria-label="Закрыть">
              ×
            </button>
          </div>
          {sidebar}
        </aside>

        <main className={styles.mainContent}>
          <div className={styles.productsHeader}>
            <p className={styles.productsCount}>
              Найдено товаров: <strong>{products.length}</strong>
            </p>
          </div>

          {products.length === 0 ? (
            <div className={styles.noProducts}>
              <svg
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255, 255, 255, 0.3)"
                className={styles.noProductsIcon}
              >
                <path d="M4 16L8.5 10.5L11 13.5L14.5 9L20 16M4 16H20M4 16V4H20V16" strokeWidth="1.5" />
              </svg>
              <h3>По запросу «{q}» ничего не найдено</h3>
              <p>Попробуйте изменить формулировку или параметры фильтров.</p>
              <button type="button" className={styles.primaryButton} onClick={handleResetFilters}>
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <>
              <div className={styles.productGrid}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  {page > 1 && (
                    <button
                      type="button"
                      className={styles.paginationArrow}
                      onClick={() => handlePageChange(page - 1)}
                    >
                      ← Назад
                    </button>
                  )}
                  <div className={styles.pageNumbers}>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let num;
                      if (totalPages <= 7) num = i + 1;
                      else if (page <= 4) num = i + 1;
                      else if (page >= totalPages - 3) num = totalPages - 6 + i;
                      else num = page - 3 + i;
                      return (
                        <button
                          key={num}
                          type="button"
                          className={`${styles.paginationNumber} ${num === page ? styles.active : ''}`}
                          onClick={() => handlePageChange(num)}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                  {page < totalPages && (
                    <button
                      type="button"
                      className={styles.paginationArrow}
                      onClick={() => handlePageChange(page + 1)}
                    >
                      Вперед →
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

    </div>
  );
};

export default SearchResultsPage;
