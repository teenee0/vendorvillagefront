import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChildCategories } from './useChildCategories';
import { useFileUtils } from '../../hooks/useFileUtils';
import Loader from '../../components/Loader';
import styles from './ChildCategoriesDesktop.module.css';

const ChildCategoriesDesktop = () => {
  const { category, children, hasAllDescendants, loading, error, pk } = useChildCategories();
  const { getBackgroundImageUrl } = useFileUtils();
  const navigate = useNavigate();
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  if (loading) {
    return (
      <div className={styles.loadingSpinner}>
        <div className={styles.spinner}></div>
        <p>Загрузка подкатегорий...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorMessage}>
        <p>Произошла ошибка: {error}</p>
        <button onClick={() => navigate('/business-categories')}>Вернуться к категориям</button>
      </div>
    );
  }

  if (!category) {
    return (
      <div className={styles.notFound}>
        <p>Категория не найдена</p>
        <button onClick={() => navigate('/business-categories')}>Вернуться к категориям</button>
      </div>
    );
  }

  // Специальная логика для категорий с 2 подкатегориями - вертикальные карточки
  if (children.length === 2) {
    return (
      <div className={styles.specialCategoryContainerWrapper}>
        <div className={styles.specialCategoryHeader}>
          <h1>{category.name}</h1>
          <div className={styles.headerActions}>
            <button
              onClick={() => navigate(`/marketplace/categories/${pk}/products/`)}
              className={styles.showAllProductsButton}
              aria-label="Показать все товары"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={styles.showAllIcon}
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span>Все товары</span>
            </button>
            <button onClick={() => navigate(-1)} className={styles.backButton}>
              &larr; Назад
            </button>
          </div>
        </div>
        <div className={styles.specialCategoryContainer}>
          {children.map(child => (
            <div
              key={child.id}
              className={styles.categoryCard}
              onClick={() => navigate(`/marketplace/categories/${child.id}`)}
              style={{
                backgroundImage: child.big_image
                  ? getBackgroundImageUrl(child.big_image)
                  : 'none'
              }}
            >
              <div className={styles.imageOverlay}></div>
              <div className={styles.label}>{child.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Логика для категорий с более чем 6 подкатегориями - три колонки с подкатегориями
  if (hasAllDescendants && children.length > 6) {
    // Разделяем категории на три колонки
    const itemsPerColumn = Math.ceil(children.length / 3);
    const columns = [
      children.slice(0, itemsPerColumn),
      children.slice(itemsPerColumn, itemsPerColumn * 2),
      children.slice(itemsPerColumn * 2)
    ];

    return (
      <div className={styles.marketplaceContainer}>
        <div className={styles.headerSection}>
          <h1>{category.name}</h1>
          <div className={styles.headerActions}>
            <button
              onClick={() => navigate(`/marketplace/categories/${pk}/products/`)}
              className={styles.showAllProductsButton}
              aria-label="Показать все товары"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={styles.showAllIcon}
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span>Все товары</span>
            </button>
            <button onClick={() => navigate(-1)} className={styles.backButton}>
              &larr; Назад
            </button>
          </div>
        </div>

        <div className={styles.threeColumnLayout}>
          {columns.map((column, columnIndex) => (
            <div key={columnIndex} className={styles.column}>
              {column.map(parentCategory => {
                const isExpanded = expandedCategories.has(parentCategory.id);
                const allChildren = parentCategory.children || [];
                const visibleChildren = isExpanded 
                  ? allChildren 
                  : allChildren.slice(0, 4);
                const hiddenCount = allChildren.length - 4;
                const hasMore = hiddenCount > 0;

                const toggleExpand = (e) => {
                  e.stopPropagation();
                  setExpandedCategories(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(parentCategory.id)) {
                      newSet.delete(parentCategory.id);
                    } else {
                      newSet.add(parentCategory.id);
                    }
                    return newSet;
                  });
                };

                return (
                  <div key={parentCategory.id} className={styles.categoryGroup}>
                  <h3 
                    className={styles.categoryGroupTitle}
                    onClick={() => navigate(`/marketplace/categories/${parentCategory.id}/products/`)}
                  >
                    {parentCategory.name}
                  </h3>
                    {allChildren.length > 0 && (
                      <ul className={styles.subcategoryList}>
                        {visibleChildren.map((subcategory, idx) => (
                          <li 
                            key={subcategory.id || idx}
                            className={styles.subcategoryItem}
                            onClick={() => navigate(`/marketplace/categories/${subcategory.id}`)}
                          >
                            {subcategory.name}
                          </li>
                        ))}
                        {hasMore && (
                          <li className={styles.expandButton}>
                            <button 
                              onClick={toggleExpand}
                              className={styles.expandToggle}
                            >
                              <span>{isExpanded ? 'Свернуть' : `Еще ${hiddenCount}`}</span>
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24"
                                className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}
                              >
                                <path 
                                  fill="currentColor" 
                                  d="M6.293 9.293a1 1 0 0 1 1.414 0L12 13.586l4.293-4.293a1 1 0 1 1 1.414 1.414l-5 5a1 1 0 0 1-1.414 0l-5-5a1 1 0 0 1 0-1.414z"
                                />
                              </svg>
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.marketplaceContainer}>
      <div className={styles.headerSection}>
        <h1>{category.name}</h1>
        <div className={styles.headerActions}>
          <button
            onClick={() => navigate(`/marketplace/categories/${pk}/products/`)}
            className={styles.showAllProductsButton}
            aria-label="Показать все товары"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={styles.showAllIcon}
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span>Все товары</span>
          </button>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            &larr; Назад
          </button>
        </div>
      </div>

      {children.length > 0 ? (
        <div className={styles.categoriesGrid}>
          {children.map(child => (
            <div
              key={child.id}
              onClick={() => navigate(`/marketplace/categories/${child.id}`)}
              className={styles.categoryCard}
              style={{
                backgroundImage: child.big_image
                  ? getBackgroundImageUrl(child.big_image)
                  : 'none'
              }}
            >
              <div className={styles.imageOverlay}></div>
              <div className={styles.categoryName}>{child.name}</div>
            </div>
          ))}
        </div>
      ) : (
        <p>Нет подкатегорий</p>
      )}
    </div>
  );
};

export default ChildCategoriesDesktop;


