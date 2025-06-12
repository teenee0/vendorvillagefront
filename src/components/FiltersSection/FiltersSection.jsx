import React from 'react';
import styles from './FiltersSection.module.css';

const FiltersSection = ({
  filtersLoading,
  filters,
  visibleFiltersCount,
  expandedFilters,
  toggleFilter,
  isAttributeSelected,
  handleAttributeSelect,
  setVisibleFiltersCount
}) => {
  return (
    <div className={styles.filtersContainer}>
      {filtersLoading ? (
        <div className={styles.filtersLoading}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка фильтров...</p>
        </div>
      ) : (
        <>
          {filters.slice(0, visibleFiltersCount).map(filter => (
            <div key={filter.id} className={`${styles.attributeSection} ${expandedFilters[filter.id] ? styles.expanded : ''}`}>
              <div 
                className={styles.filterHeader}
                onClick={() => toggleFilter(filter.id)}
              >
                <h4 className={styles.filterTitle}>
                  {filter.name}
                </h4>
                <div className={styles.filterToggleIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              
              <div className={styles.attributeValuesContainer}>
                <div className={styles.attributeValues}>
                  {filter.values.map(value => {
                    const filterValue = value.id ? value.id : `val_${value.value}`;
                    
                    return (
                      <button
                        key={`${filter.id}-${filterValue}`}
                        className={`${styles.attributeValueButton} ${
                          isAttributeSelected(filter.id, filterValue) ? styles.selected : ''
                        }`}
                        onClick={() => handleAttributeSelect(filter.id, filterValue)}
                      >
                        {value.value}
                        {isAttributeSelected(filter.id, filterValue) && (
                          <span className={styles.checkmark}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {filters.length > 2 && (
            <button 
              className={styles.showMoreFilters}
              onClick={() => {
                if (visibleFiltersCount >= filters.length) {
                  setVisibleFiltersCount(2);
                } else {
                  setVisibleFiltersCount(filters.length);
                }
              }}
            >
              {visibleFiltersCount >= filters.length ? 'Свернуть фильтры' : 'Показать все фильтры'}
              <span className={`${styles.chevron} ${visibleFiltersCount >= filters.length ? styles.up : styles.down}`}></span>
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default FiltersSection;