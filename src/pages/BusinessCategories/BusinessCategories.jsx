import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './BusinessCategories.css';

const BusinessCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/business-categories/');
        setCategories(response.data);
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCategories();
  }, []);
  

  const getBusinessEmoji = (name) => {
    switch(name) {
      case 'Маркетплейс': return '🛍️';
      case 'ТРЦ': return '🏬';
      case 'Рестораны': return '🍽️';
      default: return '🏢';
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="business-container">
      <h1 className="business-title">Категории бизнесов</h1>
      <div className="business-grid">
        {categories.map(category => (
          <div key={category.id} className="business-card">
            <div className="card-content">
              <div className="card-emoji">{getBusinessEmoji(category.name)}</div>
              <h2 className="card-name">{category.name}</h2>
              <p className="card-description">{category.description}</p>
            </div>
            <Link to={`/${category.url}`} className="explore-button">
              Жмяк (Перейти)
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BusinessCategories;