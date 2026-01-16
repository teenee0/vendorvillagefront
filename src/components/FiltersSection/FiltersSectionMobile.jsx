import React from 'react';
import styles from './FiltersSectionMobile.module.css';

const FiltersSectionMobile = ({
  filtersLoading,
  filters,
  isAttributeSelected,
  handleAttributeSelect,
  tempFilters,
  resetFilterCategory
}) => {
  if (filtersLoading) {
    return (
      <div className={styles.filtersLoading}>
        <div className={styles.loadingSpinner}></div>
        <p>Загрузка фильтров...</p>
      </div>
    );
  }

  return (
    <div className={styles.filtersContainer}>
      {filters.map(filter => {
        const hasSelectedValues = filter.values.some(value => {
          const filterValue = value.id ? value.id : `val_${value.value}`;
          return isAttributeSelected(filter.id, filterValue);
        });

        return (
          <div key={filter.id} className={styles.filterCategory}>
            <div className={styles.filterCategoryHeader}>
              <h4 className={styles.filterCategoryTitle}>{filter.name}</h4>
              {hasSelectedValues && (
                <button
                  className={styles.resetCategoryButton}
                  onClick={() => resetFilterCategory(filter.id)}
                >
                  Все
                </button>
              )}
            </div>
            
            <div className={styles.filterChips}>
              {filter.values.map(value => {
                const filterValue = value.id ? value.id : `val_${value.value}`;
                const isSelected = isAttributeSelected(filter.id, filterValue);
                
                return (
                  <button
                    key={`${filter.id}-${filterValue}`}
                    className={`${styles.filterChip} ${isSelected ? styles.filterChipSelected : ''}`}
                    onClick={() => handleAttributeSelect(filter.id, filterValue)}
                  >
                    {value.value}
                    {isSelected && (
                      <span className={styles.checkmark}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FiltersSectionMobile;


