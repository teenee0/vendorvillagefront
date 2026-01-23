import React, { useState } from 'react';
import { useProductsPage } from './useProductsPage';
import ProductCard from '/src/components/ProductCard/ProductCard.jsx';
import Breadcrumbs from '/src/components/Breadcrumbs/Breadcrumbs.jsx';
import FiltersSection from '/src/components/FiltersSection/FiltersSection.jsx';
import Loader from '../../components/Loader';
import styles from './ProductsPageDesktop.module.css';

const ProductsPageDesktop = () => {
  const {
    data,
    filters,
    loading,
    filtersLoading,
    error,
    searchQuery,
    setSearchQuery,
    sortOption,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    expandedFilters,
    tempFilters,
    visibleFiltersCount,
    setVisibleFiltersCount,
    showAllSubcategories,
    setShowAllSubcategories,
    handleAttributeSelect,
    isAttributeSelected,
    applyFilters,
    handleSearch,
    handlePageChange,
    handleSortChange,
    toggleFilter,
    resetFilters,
    generatePaginationItems,
    pk,
    navigate,
    location
  } = useProductsPage();

  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  const toggleFilters = () => {
    setIsFiltersOpen(!isFiltersOpen);
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
        <div className={styles.errorIcon}>!</div>
        <h3>Произошла ошибка</h3>
        <p>{error}</p>
        <button
          className={styles.primaryButton}
          onClick={() => window.location.reload()}
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.notFoundContainer}>
        <h3>Категория не найдена</h3>
        <button
          className={styles.primaryButton}
          onClick={() => navigate('/marketplace')}
        >
          Вернуться в каталог
        </button>
      </div>
    );
  }

  if (!data.products || !data.category) {
    return (
      <div className={styles.notFoundContainer}>
        <h3>Данные не загружены</h3>
        <button
          className={styles.primaryButton}
          onClick={() => window.location.reload()}
        >
          Обновить страницу
        </button>
      </div>
    );
  }

  return (
    <div className={styles.productsPage}>
      <Breadcrumbs breadcrumbs={data?.breadcrumbs} />

      <div className={styles.pageHeader}>
        <h1>{data.category.name}</h1>

        <div className={styles.headerActions}>
          <button
            className={styles.filterToggle}
            onClick={toggleFilters}
          >
            {isFiltersOpen ? 'Скрыть фильтры' : 'Показать фильтры'}
          </button>

          <form
            onSubmit={handleSearch}
            className={styles.searchForm}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по товарам..."
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" strokeWidth="2" />
                <path d="M21 21L16.65 16.65" strokeWidth="2" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {data.subcategories && data.subcategories.length > 0 && (
        <div className={styles.subcategoriesSection}>
          <div className={styles.subcategoriesChips}>
            {data.subcategories.map(subcat => (
              <button
                key={subcat.id}
                className={`${styles.subcategoryChip} ${location.pathname.includes(`/categories/${subcat.id}`) ? styles.subcategoryChipActive : ''}`}
                onClick={() => {
                  navigate(`/marketplace/categories/${subcat.id}/products/`);
                }}
              >
                {subcat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.productsContainer}>
        <aside className={`${styles.sidebar} ${isFiltersOpen ? styles.open : styles.closed}`}>
          <div className={styles.sidebarHeader}>
            <h3>Фильтры</h3>
            <button
              className={styles.closeFilters}
              onClick={toggleFilters}
            >
              ×
            </button>
          </div>

          <FiltersSection
            filtersLoading={filtersLoading}
            filters={filters}
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
        <main className={styles.mainContent}>
          <div className={styles.productsHeader}>
            <p className={styles.productsCount}>
              Найдено товаров: <strong>{data.pagination?.total_items || data.products.length}</strong>
            </p>
            <div className={styles.sortContainer}>
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

          {data.products.length > 0 ? (
            <>
              <div className={styles.productGrid}>
                {data.products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {data.pagination && data.pagination.total_pages > 1 && (
                <div className={styles.pagination}>
                  {data.pagination.has_previous && (
                    <button
                      className={styles.paginationArrow}
                      onClick={() => handlePageChange(data.pagination.current_page - 1)}
                    >
                      ← Назад
                    </button>
                  )}

                  <div className={styles.pageNumbers}>
                    {generatePaginationItems(data.pagination.current_page, data.pagination.total_pages).map((item, index) => {
                      if (item === '...') {
                        return <span key={`ellipsis-${index}`} className={styles.paginationEllipsis}>...</span>;
                      }
                      return (
                        <button
                          key={item}
                          className={`${styles.paginationNumber} ${item === data.pagination.current_page ? styles.active : ''}`}
                          onClick={() => handlePageChange(item)}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>

                  {data.pagination.has_next && (
                    <button
                      className={styles.paginationArrow}
                      onClick={() => handlePageChange(data.pagination.current_page + 1)}
                    >
                      Вперед →
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
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
              <h3>Товары не найдены</h3>
              <p>
                Попробуйте изменить параметры поиска
              </p>
              <button
                className={styles.primaryButton}
                onClick={resetFilters}
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductsPageDesktop;


