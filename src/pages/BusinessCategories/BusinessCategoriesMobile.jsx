import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessCategories } from './useBusinessCategories';
import './BusinessCategories.css';

const BusinessCategoriesMobile = () => {
  const { categories, loading, getBusinessEmoji } = useBusinessCategories();
  const navigate = useNavigate();

  const handleCardClick = (url) => {
    navigate(`/${url}`);
  };

  if (loading) {
    return (
      <div className="business-container-mobile">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Загрузка категорий...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="business-container-mobile">
      <div className="business-header-mobile">
        <h1 className="business-title-mobile">
          <span>Выберите категорию</span>
        </h1>
      </div>
      <div className="business-list-mobile">
        {categories.map((category, index) => (
          <div
            key={category.id}
            onClick={() => handleCardClick(category.url)}
            className="business-card-mobile-new"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="card-mobile-left">
              <div className="card-emoji-mobile-wrapper">
                <div className="card-emoji-mobile">{getBusinessEmoji(category.name)}</div>
                <div className="emoji-glow-mobile"></div>
              </div>
            </div>
            <div className="card-mobile-content">
              <h2 className="card-name-mobile">{category.name}</h2>
              <p className="card-description-mobile">{category.description}</p>
            </div>
            <div className="card-mobile-arrow">
              <i className="fas fa-chevron-right"></i>
            </div>
            <div className="card-mobile-gradient"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BusinessCategoriesMobile;
