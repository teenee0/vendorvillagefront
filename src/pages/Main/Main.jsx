import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axiosDefault.js';
import ProductCard from '../../components/ProductCard/ProductCard.jsx';
import Loader from '../../components/Loader';
import TextType from '../../components/TextType/TextType.jsx';
import './Main.css';

function Main() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const carouselRef = useRef(null);

  const services = [
    {
      id: 1,
      icon: 'fa-shopping-bag',
      title: 'Маркетплейс',
      description: 'Широкий ассортимент товаров',
      link: '/business-categories',
      gradient: 'marketplace-gradient',
      available: true
    },
    {
      id: 2,
      icon: 'fa-utensils',
      title: 'Рестораны',
      description: 'Закажите еду из лучших ресторанов города',
      gradient: 'restaurants-gradient',
      available: false
    },
    {
      id: 3,
      icon: 'fa-store',
      title: 'Сайты бизнесов',
      description: 'Персональные страницы для вашего бизнеса',
      gradient: 'business-gradient',
      available: false
    },
    {
      id: 4,
      icon: 'fa-building',
      title: 'ТРЦ',
      description: 'Торгово-развлекательные центры в вашем городе',
      gradient: 'trc-gradient',
      available: false
    },
    {
      id: 5,
      icon: 'fa-briefcase',
      title: 'Для Бизнеса',
      description: 'Решения и инструменты для развития вашего бизнеса',
      gradient: 'business-solutions-gradient',
      available: false
    },
    {
      id: 6,
      icon: 'fa-route',
      title: 'Item Route',
      description: 'Создай путь покупок для своего города',
      gradient: 'item-route-gradient',
      available: false
    }
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get('marketplace/api/products/?page_size=8&sort=-created_at');
        setProducts(response.data.products || []);
      } catch (err) {
        console.error('Ошибка загрузки товаров:', err);
        setError(err.message || 'Произошла ошибка при загрузке товаров');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/business-categories?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const servicesPerPage = 3;
  const totalPages = Math.ceil(services.length / servicesPerPage);

  const goToNext = () => {
    setCurrentServiceIndex((prev) => (prev + 1) % totalPages);
  };

  const goToPrev = () => {
    setCurrentServiceIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const goToPage = (pageIndex) => {
    setCurrentServiceIndex(pageIndex);
  };

  return (
    <div className="main-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="main-page-container">
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="hero-title-main">
                <TextType
                  text="Все в одном месте"
                  as="span"
                  typingSpeed={100}
                  initialDelay={500}
                  pauseDuration={9000}
                  showCursor={true}
                  cursorCharacter="_"
                  cursorBlinkDuration={0.8}
                  loop={true}
                />
              </span>
              <span className="hero-title-sub">товары, еда и бизнесы</span>
            </h1>
            <p className="hero-description">
              Откройте для себя лучшие товары, рестораны и бизнес-платформы в одном удобном месте. Быстро, просто и эффективно.
            </p>
            <form className="search-bar" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Поиск товаров, ресторанов, бизнесов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit">
                <i className="fas fa-search"></i> Найти
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Services Carousel */}
      <section className="services-section">
        <div className="main-page-container">
          <div className="services-carousel-wrapper">
            <button 
              className="carousel-nav carousel-prev"
              onClick={goToPrev}
              aria-label="Предыдущий слайд"
              disabled={totalPages <= 1}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="services-carousel-container">
              <div 
                className="services-carousel" 
                ref={carouselRef}
                style={{ transform: `translateX(-${currentServiceIndex * 100}%)` }}
              >
                {Array.from({ length: totalPages }).map((_, pageIndex) => (
                  <div key={pageIndex} className="services-page">
                    {services
                      .slice(pageIndex * servicesPerPage, (pageIndex + 1) * servicesPerPage)
                      .map((service) => (
                        <div key={service.id} className={`service-card ${service.gradient}`}>
                          <div className="service-card-background"></div>
                          <div className="service-card-content">
                            <div className="service-icon">
                              <i className={`fas ${service.icon}`}></i>
                            </div>
                            <h3 className="service-title">{service.title}</h3>
                            <p className="service-description">{service.description}</p>
                            {service.available ? (
                              <Link to={service.link} className="service-link">
                                Перейти
                                <i className="fas fa-arrow-right"></i>
              </Link>
                            ) : (
                              <div className="service-link coming-soon">
                                Скоро
                                <i className="fas fa-clock"></i>
                              </div>
                            )}
                          </div>
                          <div className="service-card-overlay"></div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
            <button 
              className="carousel-nav carousel-next"
              onClick={goToNext}
              aria-label="Следующий слайд"
              disabled={totalPages <= 1}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
          {totalPages > 1 && (
            <div className="carousel-indicators">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  className={`carousel-indicator ${index === currentServiceIndex ? 'active' : ''}`}
                  onClick={() => goToPage(index)}
                  aria-label={`Перейти к странице ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Marketplace Products Section */}
      <section className="marketplace-section">
        <div className="main-page-container">
          <div className="section-header">
            <div className="section-header-content">
              <h2 className="section-title">
                <span className="section-title-icon">
                  <i className="fas fa-shopping-bag"></i>
                </span>
                Рекомендуем для вас
              </h2>
              <p className="section-subtitle">
                Товары, блюда и бизнесы, которые могут вас заинтересовать
              </p>
            </div>
            <Link to="/business-categories" className="section-view-all">
              Смотреть все
              <i className="fas fa-arrow-right"></i>
            </Link>
          </div>

          {loading ? (
            <div className="loader-container">
              <Loader />
            </div>
          ) : error ? (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              <p>{error}</p>
            </div>
          ) : products.length > 0 ? (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="no-products">
              <i className="fas fa-box-open"></i>
              <p>Товары пока не добавлены</p>
            </div>
          )}
        </div>
      </section>

      {/* Advertisement Section */}
      <section className="advertisement-section">
        <div className="main-page-container">
          <div className="advertisement-card">
            <div className="advertisement-content">
              <div className="advertisement-icon">
                <i className="fas fa-bullhorn"></i>
              </div>
              <h3 className="advertisement-title">Рекламное место</h3>
              <p className="advertisement-text">Здесь может быть ваша реклама</p>
              <button className="advertisement-button">
                Разместить рекламу
              </button>
            </div>
            <div className="advertisement-pattern"></div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Main;
