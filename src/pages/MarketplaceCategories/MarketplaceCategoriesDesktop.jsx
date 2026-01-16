import React from 'react';
import { Link } from 'react-router-dom';
import { useMarketplaceCategories } from './useMarketplaceCategories';
import { useFileUtils } from '../../hooks/useFileUtils';
import Loader from '../../components/Loader';
import styles from './MarketplaceCategoriesDesktop.module.css';

const MarketplaceCategoriesDesktop = () => {
  const { categories, loading } = useMarketplaceCategories();
  const { getBackgroundImageUrl } = useFileUtils();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className={styles.marketplaceContainerDesktop}>
      <div className={styles.marketplaceHeaderDesktop}>
        <h1 className={styles.marketplaceTitleDesktop}>Категории</h1>
      </div>
      <div className={styles.categoriesGridDesktop}>
        {categories.map(category => (
          <Link 
            to={`/marketplace/categories/${category.id}`} 
            key={category.id} 
            className={styles.categoryCardDesktop}
            style={{
              backgroundImage: category.big_image 
                ? getBackgroundImageUrl(category.big_image)
                : 'none'
            }}
          >
            <div className={styles.imageOverlayDesktop}></div>
            <div className={styles.categoryNameDesktop}>{category.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MarketplaceCategoriesDesktop;
