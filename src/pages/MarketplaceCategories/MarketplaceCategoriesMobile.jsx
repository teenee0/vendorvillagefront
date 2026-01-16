import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketplaceCategories } from './useMarketplaceCategories';
import { useFileUtils } from '../../hooks/useFileUtils';
import Loader from '../../components/Loader';
import styles from './MarketplaceCategoriesMobile.module.css';

const MarketplaceCategoriesMobile = () => {
  const { categories, loading } = useMarketplaceCategories();
  const { getBackgroundImageUrl } = useFileUtils();
  const navigate = useNavigate();

  const handleCardClick = (categoryId) => {
    navigate(`/marketplace/categories/${categoryId}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className={styles.marketplaceContainerMobile}>
      <div className={styles.marketplaceHeaderMobile}>
        <h1 className={styles.marketplaceTitleMobile}>Категории</h1>
      </div>
      <div className={styles.categoriesListMobile}>
        {categories.map((category, index) => (
          <div
            key={category.id}
            onClick={() => handleCardClick(category.id)}
            className={styles.categoryItemMobile}
            style={{
              backgroundImage: category.big_image 
                ? getBackgroundImageUrl(category.big_image)
                : 'linear-gradient(135deg, var(--royal-emerald) 0%, var(--luminous-sapphire) 100%)',
              animationDelay: `${index * 0.06}s`
            }}
          >
            <div className={styles.categoryOverlayMobile}></div>
            <div className={styles.categoryGradientMobile}></div>
            <div className={styles.categoryContentWrapperMobile}>
              <div className={styles.categoryNameWrapperMobile}>
                <h2 className={styles.categoryNameMobile}>{category.name}</h2>
              </div>
              <div className={styles.categoryArrowWrapperMobile}>
                <div className={styles.categoryArrowMobile}>
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketplaceCategoriesMobile;
