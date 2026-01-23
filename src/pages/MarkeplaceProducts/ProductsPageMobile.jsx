import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProductsPage } from './useProductsPage';
import ProductCard from '/src/components/ProductCard/ProductCard.jsx';
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
    allProducts,
    hasMore,
    loadingMore,
    loadMoreProducts,
    pk,
    navigate,
    location
  } = useProductsPage();

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const observerTarget = useRef(null);

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
    const newState = !isFiltersOpen;
    // Закрываем сортировку, если открываем фильтры
    if (newState && isSortOpen) {
      setIsSortOpen(false);
    }
    setIsFiltersOpen(newState);
  };

  const toggleSort = () => {
    const newState = !isSortOpen;
    // Закрываем фильтры, если открываем сортировку
    if (newState && isFiltersOpen) {
      setIsFiltersOpen(false);
    }
    setIsSortOpen(newState);
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

  // Infinite scroll observer
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
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, loadMoreProducts]);

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
      </div>

      {data.subcategories && data.subcategories.length > 0 && (
        <div className={styles.subcategoriesSection}>
          <div className={styles.subcategoriesChips}>
            <button
              className={styles.categoriesModalButton}
              onClick={() => setIsCategoriesModalOpen(true)}
              aria-label="Все категории"
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className={styles.categoriesModalIcon}
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
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

            {/* Элемент для отслеживания скролла */}
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

      {/* Модальное окно категорий снизу */}
      {isCategoriesModalOpen && (
        <>
          <div 
            className={styles.modalOverlay} 
            onClick={() => setIsCategoriesModalOpen(false)}
          ></div>
          <div 
            className={styles.categoriesBottomModal} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.bottomModalHandle}></div>
            <div className={styles.bottomModalHeader}>
              <h2>Подкатегории</h2>
              <button
                className={styles.closeButton}
                onClick={() => setIsCategoriesModalOpen(false)}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>
            <div className={styles.bottomModalContent}>
              {data.subcategories && data.subcategories.length > 0 ? (
                <div className={styles.categoriesModalList}>
                  {data.subcategories.map(subcat => (
                    <button
                      key={subcat.id}
                      className={`${styles.categoriesModalItem} ${location.pathname.includes(`/categories/${subcat.id}`) ? styles.categoriesModalItemActive : ''}`}
                      onClick={() => {
                        navigate(`/marketplace/categories/${subcat.id}/products/`);
                        setIsCategoriesModalOpen(false);
                      }}
                    >
                      <span>{subcat.name}</span>
                      {location.pathname.includes(`/categories/${subcat.id}`) && (
                        <svg 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2"
                        >
                          <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles.noCategoriesText}>Нет подкатегорий</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductsPageMobile;

