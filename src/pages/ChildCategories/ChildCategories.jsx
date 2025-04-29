import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import axios from 'axios';
import axios from "../../api/axiosDefault.js";
import './ChildCategories.css'; // Используем тот же CSS

const ChildCategories = () => {
  const { pk } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`marketplace/api/categories/${pk}/`);
  
        if (response.data.should_redirect) {
          navigate(response.data.redirect_to);
          return;
        }
  
        if (response.data && response.data.category) {
          setCategory(response.data.category);
          setChildren(response.data.children || []);
        } else {
          throw new Error('Неверная структура ответа от сервера');
        }
      } catch (err) {
        console.error('Ошибка загрузки:', err);
        setError(err.message);
        navigate('/business-categories', { replace: true });
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [pk, navigate]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Загрузка подкатегорий...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <p>Произошла ошибка: {error}</p>
        <button onClick={() => navigate('/business-categories')}>Вернуться к категориям</button>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="not-found">
        <p>Категория не найдена</p>
        <button onClick={() => navigate('/business-categories')}>Вернуться к категориям</button>
      </div>
    );
  }

  if (parseInt(pk, 10) === 25 && children.length === 2) {
    return (
        <div className="special-category-container-wrapper">
          <div className="special-category-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h1>{category.name}</h1>
            <button onClick={() => navigate(-1)} className="back-button" style={{
              background: 'transparent',
              border: '1px solid #ccc',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              cursor: 'pointer'
            }}>
              &larr; Назад
            </button>
          </div>
          <div className="special-category-container">
            {children.map(child => (
              <div
                key={child.id}
                className="category-card"
                onClick={() => navigate(`/marketplace/categories/${child.id}`)}
                style={{
                  backgroundImage: child.big_image
                    ? `url(http://localhost:8000${child.big_image})`
                    : 'none'
                }}
              >
                <div className="image-overlay"></div>
                <div className="label">{child.name}</div>
              </div>
            ))}
          </div>
        </div>
      );
  }
  

  return (
    <div className="marketplace-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>{category.name}</h1>
        <button onClick={() => navigate(-1)} className="back-button" style={{
          background: 'transparent',
          border: '1px solid #ccc',
          borderRadius: '6px',
          padding: '0.5rem 1rem',
          cursor: 'pointer'
        }}>
          &larr; Назад
        </button>
      </div>

      {children.length > 0 ? (
        <div className="categories-grid">
          {children.map(child => (
            <div
              key={child.id}
              onClick={() => navigate(`/marketplace/categories/${child.id}`)}
              className="category-card"
              style={{
                backgroundImage: child.big_image
                  ? `url(http://localhost:8000${child.big_image})`
                  : 'none'
              }}
            >
              <div className="image-overlay"></div>
              <div className="category-name">{child.name}</div>
            </div>
          ))}
        </div>
      ) : (
        <p>Нет подкатегорий</p>
      )}
    </div>
  );
};

export default ChildCategories;
