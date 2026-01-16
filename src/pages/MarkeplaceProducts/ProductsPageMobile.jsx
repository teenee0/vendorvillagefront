import React, { useState } from 'react';
import { useProductsPage } from './useProductsPage';
import ProductCard from '/src/components/ProductCard/ProductCard.jsx';
import Breadcrumbs from '/src/components/Breadcrumbs/Breadcrumbs.jsx';
import FiltersSectionMobile from '/src/components/FiltersSection/FiltersSectionMobile.jsx';
import Loader from '../../components/Loader';
import { FaFilter, FaTimes } from 'react-icons/fa';
import styles from './ProductsPageMobile.module.css';

const ProductsPageMobile = () => {
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
    setExpandedFilters,
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
    resetFilterCategory,
    generatePaginationItems,
    pk,
    navigate,
    location
  } = useProductsPage();

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const priceRanges = [
    { label: 'До 5 000 ₸', min: '', max: '5000' },
    { label: '5 000 - 15 000 ₸', min: '5000', max: '15000' },
    { label: '15 000 - 60 000 ₸', min: '15000', max: '60000' },
    { label: '60 000 - 120 000 ₸', min: '60000', max: '120000' },
    { label: '120 000 ₸ и дороже', min: '120000', max: '' }
  ];

  const handlePriceRangeSelect = (min, max) => {
    setPriceMin(min);
    setPriceMax(max);
  };

  const isPriceRangeSelected = (min, max) => {
    return priceMin === min && priceMax === max;
  };

  const toggleFilters = () => {
    setIsFiltersOpen(!isFiltersOpen);
  };

  const [isSortOpen, setIsSortOpen] = useState(false);

  const toggleSort = () => {
    setIsSortOpen(!isSortOpen);
  };

  const sortOptions = [
    { value: '-created_at', label: 'Сначала новые' },
    { value: 'price', label: 'По возрастанию цены' },
    { value: '-price', label: 'По убыванию цены' },
    { value: 'name', label: 'По названию (А-Я)' },
    { value: '-name', label: 'По названию (Я-А)' }
  ];

  const handleSortSelect = (value) => {
    handleSortChange({ target: { value } });
    setIsSortOpen(false);
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
      {/* Фиксированный хедер */}
      <div className={styles.fixedHeader}>
        <div className={styles.headerTop}>
          <h1 className={styles.pageTitle}>{data.category.name}</h1>
        </div>

        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" />
              <path d="M21 21L16.65 16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск товаров..."
              className={styles.searchInput}
            />
          </div>
        </form>

        <div className={styles.headerActions}>
          <button
            className={styles.filterButton}
            onClick={toggleFilters}
            aria-label="Фильтры"
          >
            <FaFilter />
            {Object.keys(tempFilters).length > 0 && (
              <span className={styles.filterBadge}>{Object.keys(tempFilters).length}</span>
            )}
          </button>
          <button
            className={styles.sortButton}
            onClick={toggleSort}
            aria-label="Сортировка"
          >
            {sortOptions.find(opt => opt.value === sortOption)?.label || 'Сортировка'}
          </button>
        </div>
      </div>

      {/* Контент с отступом для фиксированного хедера */}
      <div className={styles.content}>
        <Breadcrumbs breadcrumbs={data?.breadcrumbs} />
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

      <div className={styles.productsContent}>
        {data.products.length > 0 ? (
          <>
            <div className={styles.productGrid}>
              {data.products.map((product, index) => (
                <div
                  key={product.id}
                  className={styles.productCardWrapper}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            {data.pagination && data.pagination.total_pages > 1 && (
              <div className={styles.pagination}>
                {data.pagination.has_previous && (
                  <button
                    className={styles.paginationButton}
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
                    className={styles.paginationButton}
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
            <div className={styles.noProductsIcon}>📦</div>
            <h3>Товары не найдены</h3>
            <p>Попробуйте изменить параметры поиска</p>
            <button
              className={styles.primaryButton}
              onClick={resetFilters}
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </div>

      {/* Модальное окно фильтров */}
      {isFiltersOpen && (
        <>
          <div className={styles.modalOverlay} onClick={toggleFilters}></div>
          <div className={styles.filtersModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Фильтры</h2>
              <button
                className={styles.cancelButton}
                onClick={toggleFilters}
                aria-label="Отмена"
              >
                Отмена
              </button>
            </div>

            <div className={styles.modalContent}>
              {data.subcategories && data.subcategories.length > 0 && (
                <div className={styles.filterSection}>
                  <div className={styles.filterCategoryHeader}>
                    <h4 className={styles.filterTitle}>Подкатегории</h4>
                  </div>
                  <div className={styles.filterChips}>
                    {(showAllSubcategories ? data.subcategories : data.subcategories.slice(0, 5)).map(subcat => (
                      <button
                        key={subcat.id}
                        className={`${styles.filterChip} ${location.pathname.includes(`/categories/${subcat.id}`) ? styles.filterChipSelected : ''}`}
                        onClick={() => {
                          navigate(`/marketplace/categories/${subcat.id}/products/`);
                          setIsFiltersOpen(false);
                        }}
                      >
                        {subcat.name}
                      </button>
                    ))}
                  </div>
                  {data.subcategories.length > 5 && (
                    <button
                      className={styles.showMoreButton}
                      onClick={() => setShowAllSubcategories(!showAllSubcategories)}
                    >
                      {showAllSubcategories ? 'Свернуть' : `Показать все (${data.subcategories.length})`}
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
                  {priceRanges.map((range, index) => (
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
                filtersLoading={filtersLoading}
                filters={filters}
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
          <div className={styles.modalOverlay} onClick={toggleSort}></div>
          <div className={styles.sortModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Сортировка</h2>
              <button
                className={styles.cancelButton}
                onClick={toggleSort}
                aria-label="Отмена"
              >
                Отмена
              </button>
            </div>

            <div className={styles.sortOptions}>
              {sortOptions.map(option => (
                <button
                  key={option.value}
                  className={`${styles.sortOption} ${sortOption === option.value ? styles.sortOptionActive : ''}`}
                  onClick={() => handleSortSelect(option.value)}
                >
                  {option.label}
                  {sortOption === option.value && (
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
    </div>
  );
};

export default ProductsPageMobile;

