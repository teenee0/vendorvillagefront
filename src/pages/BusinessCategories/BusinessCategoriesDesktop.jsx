import React from 'react';
import { Link } from 'react-router-dom';
import { useBusinessCategories } from './useBusinessCategories';
import './BusinessCategories.css';

const BusinessCategoriesDesktop = () => {
  const { categories, loading, getBusinessEmoji } = useBusinessCategories();

  if (loading) {
    return (
      <div className="business-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Загрузка категорий...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="business-container">
      <div className="business-header">
        <h1 className="business-title">
          <span className="title-icon">🏢</span>
          <span>Выберите категорию</span>
        </h1>
      </div>
      <div className="business-grid">
        {categories.map((category, index) => (
          <Link 
            key={category.id} 
            to={`/${category.url}`} 
            className="business-card"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="card-gradient"></div>
            <div className="card-content">
              <div className="card-emoji-wrapper">
                <div className="card-emoji">{getBusinessEmoji(category.name)}</div>
                <div className="emoji-glow"></div>
              </div>
              <h2 className="card-name">{category.name}</h2>
              <p className="card-description">{category.description}</p>
            </div>
            <div className="explore-button">
              <span>Исследовать</span>
              <i className="fas fa-arrow-right"></i>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BusinessCategoriesDesktop;
