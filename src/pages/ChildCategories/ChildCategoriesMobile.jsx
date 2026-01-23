import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChildCategories } from './useChildCategories';
import { useFileUtils } from '../../hooks/useFileUtils';
import Loader from '../../components/Loader';
import styles from './ChildCategoriesMobile.module.css';

const ChildCategoriesMobile = () => {
  const { category, children, hasAllDescendants, loading, error, pk } = useChildCategories();
  const { getBackgroundImageUrl } = useFileUtils();
  const navigate = useNavigate();
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Loader size="large" />
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

  // Специальная логика для категории 25 (одежда)
  if (parseInt(pk, 10) === 25 && children.length === 2) {
    return (
      <div className={styles.specialCategoryContainerWrapper}>
        <div className={styles.specialCategoryHeader}>
          <h1 className={styles.specialCategoryTitle}>{category.name}</h1>
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
          {children.map((child, index) => (
            <div
              key={child.id}
              className={styles.categoryCard}
              onClick={() => navigate(`/marketplace/categories/${child.id}`)}
              style={{
                backgroundImage: child.big_image
                  ? getBackgroundImageUrl(child.big_image)
                  : 'linear-gradient(135deg, var(--royal-emerald) 0%, var(--luminous-sapphire) 100%)',
                animationDelay: `${index * 0.1}s`
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

  // Логика для категорий с более чем 6 подкатегориями - список с подкатегориями
  if (hasAllDescendants && children.length > 6) {
    return (
      <div className={styles.marketplaceContainer}>
        <div className={styles.headerSection}>
          <h1 className={styles.categoryTitle}>{category.name}</h1>
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

        <div className={styles.mobileCategoryList}>
          {children.map((parentCategory, index) => {
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
              <div 
                key={parentCategory.id} 
                className={styles.mobileCategoryGroup}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <h3 
                  className={styles.mobileCategoryGroupTitle}
                  onClick={() => navigate(`/marketplace/categories/${parentCategory.id}/products/`)}
                >
                  {parentCategory.name}
                </h3>
                {allChildren.length > 0 && (
                  <ul className={styles.mobileSubcategoryList}>
                    {visibleChildren.map((subcategory, idx) => (
                      <li 
                        key={subcategory.id || idx}
                        className={styles.mobileSubcategoryItem}
                        onClick={() => navigate(`/marketplace/categories/${subcategory.id}`)}
                      >
                        {subcategory.name}
                      </li>
                    ))}
                    {hasMore && (
                      <li className={styles.mobileExpandButton}>
                        <button 
                          onClick={toggleExpand}
                          className={styles.mobileExpandToggle}
                        >
                          <span>{isExpanded ? 'Свернуть' : `Еще ${hiddenCount}`}</span>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24"
                            className={`${styles.mobileExpandIcon} ${isExpanded ? styles.expanded : ''}`}
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
      </div>
    );
  }

  return (
    <div className={styles.marketplaceContainer}>
      <div className={styles.headerSection}>
        <h1 className={styles.categoryTitle}>{category.name}</h1>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          &larr; Назад
        </button>
      </div>

      {children.length > 0 ? (
        <div className={styles.categoriesList}>
          {children.map((child, index) => (
            <div
              key={child.id}
              onClick={() => navigate(`/marketplace/categories/${child.id}`)}
              className={styles.categoryItem}
              style={{
                backgroundImage: child.big_image
                  ? getBackgroundImageUrl(child.big_image)
                  : 'linear-gradient(135deg, var(--royal-emerald) 0%, var(--luminous-sapphire) 100%)',
                animationDelay: `${index * 0.05}s`
              }}
            >
              <div className={styles.imageOverlay}></div>
              <div className={styles.categoryContent}>
                <div className={styles.categoryName}>{child.name}</div>
                <div className={styles.categoryArrow}>
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.noCategories}>Нет подкатегорий</p>
      )}
    </div>
  );
};

export default ChildCategoriesMobile;


