import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useChildCategories } from './useChildCategories';
import { useFileUtils } from '../../hooks/useFileUtils';
import Loader from '../../components/Loader';
import styles from './ChildCategoriesDesktop.module.css';

const ChildCategoriesDesktop = () => {
  const { category, children, loading, error, pk } = useChildCategories();
  const { getBackgroundImageUrl } = useFileUtils();
  const navigate = useNavigate();

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
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            &larr; Назад
          </button>
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

  return (
    <div className={styles.marketplaceContainer}>
      <div className={styles.headerSection}>
        <h1>{category.name}</h1>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          &larr; Назад
        </button>
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


