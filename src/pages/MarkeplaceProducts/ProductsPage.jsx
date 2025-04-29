import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
// import axios from 'axios';
import axios from "../../api/axiosDefault.js";
import './ProductsPage.css';
import ProductCard from '/src/components/ProductCard/ProductCard.jsx';
import Breadcrumbs from '/src/components/Breadcrumbs/Breadcrumbs.jsx';


const ProductsPage = () => {
  const { pk } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('-id');
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // Инициализация фильтров из URL
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    setSearchQuery(queryParams.get('search') || '');
    setSortOption(queryParams.get('sort') || '-id');
    setPriceMin(queryParams.get('price_min') || '');
    setPriceMax(queryParams.get('price_max') || '');
  }, [location.search]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams(location.search);
        
        // Добавляем дефолтные параметры, если их нет
        if (!queryParams.has('sort')) {
          queryParams.set('sort', '-id');
        }
        
        const response = await axios.get(
          `marketplace/api/categories/${pk}/products/?${queryParams.toString()}`
        );
        
        setData(response.data);
      } catch (err) {
        console.error('Ошибка загрузки:', err);
        setError(err.message || 'Произошла ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pk, location.search]);

  const updateURL = () => {
    const queryParams = new URLSearchParams();
    if (searchQuery) queryParams.set('search', searchQuery);
    if (priceMin) queryParams.set('price_min', priceMin);
    if (priceMax) queryParams.set('price_max', priceMax);
    queryParams.set('sort', sortOption);
    queryParams.set('page', 1);
    navigate(`?${queryParams.toString()}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateURL();
  };

  const handlePriceFilter = () => {
    updateURL();
  };

  const handlePageChange = (page) => {
    const queryParams = new URLSearchParams(location.search);
    queryParams.set('page', page);
    navigate(`?${queryParams.toString()}`);
    window.scrollTo(0, 0);
  };

  const handleSortChange = (e) => {
    const newSortOption = e.target.value;
    setSortOption(newSortOption);
    const queryParams = new URLSearchParams(location.search);
    queryParams.set('sort', newSortOption);
    queryParams.set('page', 1);
    navigate(`?${queryParams.toString()}`);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setPriceMin('');
    setPriceMax('');
    setSortOption('-id');
    navigate(`/marketplace/categories/${pk}/products/`);
  };

  const toggleFilters = () => {
    setIsFiltersOpen(!isFiltersOpen);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Загружаем товары...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">!</div>
        <h3>Произошла ошибка</h3>
        <p>{error}</p>
        <button 
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="not-found-container">
        <h3>Категория не найдена</h3>
        <button 
          className="primary-button"
          onClick={() => navigate('/marketplace')}
        >
          Вернуться в каталог
        </button>
      </div>
    );
  }

  // Добавим проверку на наличие данных
  if (!data.products || !data.category) {
    return (
      <div className="not-found-container">
        <h3>Данные не загружены</h3>
        <button 
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Обновить страницу
        </button>
      </div>
    );
  }

  return (
    <div className="products-page">
      {/* Хлебные крошки */}
      <Breadcrumbs 
        breadcrumbs={data?.breadcrumbs} 
      />

      {/* Заголовок и поиск */}
      <div className="page-header">
        <h1>{data.category.name}</h1>
        
        <div className="header-actions">
          <button 
            className="filter-toggle"
            onClick={toggleFilters}
          >
            {isFiltersOpen ? 'Скрыть фильтры' : 'Показать фильтры'}
          </button>
          
          <form 
            onSubmit={handleSearch}
            className="search-form"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по товарам..."
              className="search-input"
            />
            <button type="submit" className="search-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" strokeWidth="2"/>
                <path d="M21 21L16.65 16.65" strokeWidth="2"/>
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Основное содержимое */}
      <div className="products-container">
        {/* Боковая панель фильтров */}
        <aside className={`sidebar ${isFiltersOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h3>Фильтры</h3>
            <button 
              className="close-filters"
              onClick={toggleFilters}
            >
              ×
            </button>
          </div>
          
          {/* Фильтр по подкатегориям */}
          <div className="filter-section">
            <h4 className="filter-title">
              Подкатегории
            </h4>
            <ul className="subcategory-list">
              {data.subcategories.map(subcat => (
                <li key={subcat.id} className="subcategory-item">
                  <button 
                    className={`subcategory-button ${location.pathname.includes(`/categories/${subcat.id}`) ? 'active' : ''}`}
                    onClick={() => navigate(`/marketplace/categories/${subcat.id}/products/`)}
                  >
                    {subcat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Фильтр по цене */}
          <div className="filter-section">
            <h4 className="filter-title">
              Цена
            </h4>
            <div className="price-inputs">
              <input 
                type="number" 
                placeholder="от" 
                className="price-input"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
              <span className="price-separator">-</span>
              <input 
                type="number" 
                placeholder="до" 
                className="price-input"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </div>
            <button 
              className="apply-filter-button"
              onClick={handlePriceFilter}
            >
              Применить
            </button>
          </div>

          <button 
            className="reset-filters-button"
            onClick={resetFilters}
          >
            Сбросить все фильтры
          </button>
        </aside>

        {/* Список товаров */}
        <main className="main-content">
          {/* Сортировка и количество */}
          <div className="products-header">
            <p className="products-count">
              Найдено товаров: <strong>{data.pagination?.total_items || data.products.length}</strong>
            </p>
            <div className="sort-container">
              <label className="sort-label">Сортировка:</label>
              <select 
                value={sortOption}
                onChange={handleSortChange}
                className="sort-select"
              >
                <option value="-created_at">Сначала новые</option>
                <option value="price">По возрастанию цены</option>
                <option value="-price">По убыванию цены</option>
                <option value="name">По названию (А-Я)</option>
                <option value="-name">По названию (Я-А)</option>
              </select>
            </div>
          </div>

          {/* Сетка товаров */}
          {data.products.length > 0 ? (
            <>
              <div className="product-grid">
                {data.products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Пагинация */}
              {data.pagination && data.pagination.total_pages > 1 && (
                <div className="pagination">
                  {data.pagination.has_previous && (
                    <button 
                      className="pagination-arrow"
                      onClick={() => handlePageChange(data.pagination.current_page - 1)}
                    >
                      ← Назад
                    </button>
                  )}
                  
                  <div className="page-numbers">
                    {generatePaginationItems(data.pagination.current_page, data.pagination.total_pages).map((item, index) => {
                      if (item === '...') {
                        return <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>;
                      }
                      return (
                        <button
                          key={item}
                          className={`pagination-number ${item === data.pagination.current_page ? 'active' : ''}`}
                          onClick={() => handlePageChange(item)}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                  
                  {data.pagination.has_next && (
                    <button 
                      className="pagination-arrow"
                      onClick={() => handlePageChange(data.pagination.current_page + 1)}
                    >
                      Вперед →
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="no-products">
              <svg 
                width="80" 
                height="80" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="rgba(255, 255, 255, 0.3)" 
                className="no-products-icon"
              >
                <path d="M4 16L8.5 10.5L11 13.5L14.5 9L20 16M4 16H20M4 16V4H20V16" strokeWidth="1.5"/>
              </svg>
              <h3>Товары не найдены</h3>
              <p>
                Попробуйте изменить параметры поиска
              </p>
              <button 
                className="primary-button"
                onClick={resetFilters}
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

function generatePaginationItems(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  if (currentPage <= 3) {
    return [1, 2, 3, 4, '...', totalPages];
  }
  
  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}


export default ProductsPage;
// Остальной код компонента остается без изменений