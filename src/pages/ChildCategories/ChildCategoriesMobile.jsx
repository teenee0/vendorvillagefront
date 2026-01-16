import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useChildCategories } from './useChildCategories';
import { useFileUtils } from '../../hooks/useFileUtils';
import Loader from '../../components/Loader';
import styles from './ChildCategoriesMobile.module.css';

const ChildCategoriesMobile = () => {
  const { category, children, loading, error, pk } = useChildCategories();
  const { getBackgroundImageUrl } = useFileUtils();
  const navigate = useNavigate();

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
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            &larr; Назад
          </button>
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


