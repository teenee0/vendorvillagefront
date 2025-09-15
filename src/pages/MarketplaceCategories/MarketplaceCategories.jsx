import React, { useState, useEffect } from 'react';
// import axios from 'axios';
import axios from "../../api/axiosDefault.js";
import { Link } from 'react-router-dom';
import { useFileUtils } from '../../hooks/useFileUtils';
import './MarketplaceCategories.css';

const MarketplaceCategories = () => {
  const { getBackgroundImageUrl } = useFileUtils();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('marketplace/api/categories/');
        setCategories(response.data);
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCategories();
  }, []);

  if (loading) return (
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
  );

  return (
    <div className="marketplace-container">
      <div className="categories-grid">
        {categories.map(category => (
          <Link 
            to={`/marketplace/categories/${category.id}`} 
            key={category.id} 
            className="category-card"
            style={{
              backgroundImage: category.big_image 
                ? getBackgroundImageUrl(category.big_image)
                : 'none'
            }}
          >
            <div className="image-overlay"></div>
            <div className="category-name">{category.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MarketplaceCategories;