import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation } from 'react-router-dom';
import ProductCard from '../../components/ProductCard/ProductCard.jsx';
import Loader from '../../components/Loader';
import LogoLoop from '../../components/LogoLoop/LogoLoop.jsx';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useMainPageProductsInfinite } from '../../hooks/useMainPageProductsInfinite';
import styles from './MainMobile.module.css';

function MainMobile() {
  const location = useLocation();
  const {
    products,
    loading,
    loadingMore,
    error,
    hasNext,
    loadMore,
  } = useMainPageProductsInfinite();
  const servicesScrollRef = useRef(null);
  const infiniteSentinelRef = useRef(null);

  const currentUrl = `${window.location.origin}${location.pathname}`;

  const services = [
    {
      id: 1,
      icon: 'fa-shopping-bag',
      title: 'Маркетплейс',
      description: 'Широкий ассортимент товаров',
      link: '/business-categories',
      gradient: 'marketplaceGradient',
      available: true,
    },
    {
      id: 5,
      icon: 'fa-briefcase',
      title: 'Для Бизнеса',
      description: 'Решения и инструменты для развития вашего бизнеса',
      link: '/business-contact',
      gradient: 'businessSolutionsGradient',
      available: true,
    },
    {
      id: 2,
      icon: 'fa-utensils',
      title: 'Рестораны',
      description: 'Закажите еду из лучших ресторанов города',
      gradient: 'restaurantsGradient',
      available: false,
    },
    {
      id: 3,
      icon: 'fa-store',
      title: 'Сайты бизнесов',
      description: 'Персональные страницы для вашего бизнеса',
      gradient: 'businessGradient',
      available: false,
    },
    {
      id: 4,
      icon: 'fa-building',
      title: 'ТРЦ',
      description: 'Торгово-развлекательные центры в вашем городе',
      gradient: 'trcGradient',
      available: false,
    },
    {
      id: 6,
      icon: 'fa-route',
      title: 'Item Route',
      description: 'Создай путь покупок для своего города',
      gradient: 'itemRouteGradient',
      available: false,
    },
  ];

  useEffect(() => {
    if (!hasNext || loading) return;
    const el = infiniteSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: '240px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNext, loading, loadMore, products.length]);

  const scrollServices = (direction) => {
    if (servicesScrollRef.current) {
      servicesScrollRef.current.scrollBy({
        left: direction === 'next' ? 300 : -300,
        behavior: 'smooth'
      });
    }
  };


  return (
    <div className={styles.mainPage}>
      <Helmet>
        <title>Axione - Все в одном месте: товары, еда и бизнесы</title>
        <meta name="description" content="Откройте для себя лучшие товары, рестораны и бизнес-платформы в одном удобном месте. Быстро, просто и эффективно." />
        <meta name="keywords" content="маркетплейс, товары, рестораны, бизнесы, покупки, доставка, онлайн магазин" />
        <meta name="author" content="Axione" />
        <meta property="og:title" content="Axione - Все в одном месте" />
        <meta property="og:description" content="Откройте для себя лучшие товары, рестораны и бизнес-платформы в одном удобном месте." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Axione - Все в одном месте" />
        <meta name="twitter:description" content="Откройте для себя лучшие товары, рестораны и бизнес-платформы в одном удобном месте." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={currentUrl} />
      </Helmet>

      {/*
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>...</h1>
          <form className={styles.searchBar}>...</form>
        </div>
      </section>
      */}

      <section className={styles.advertisementLogosSection}>
        <LogoLoop
          logos={[
            {
              src: 'https://placehold.co/250x400/',
              alt: 'Advertisement 1',
              href: '#'
            },
            {
              src: 'https://placehold.co/250x400/',
              alt: 'Advertisement 2',
              href: '#'
            },
            {
              src: 'https://placehold.co/250x400/',
              alt: 'Advertisement 3',
              href: '#'
            },
            {
              src: 'https://placehold.co/250x400/',
              alt: 'Advertisement 4',
              href: '#'
            },
            {
              src: 'https://placehold.co/250x400/',
              alt: 'Advertisement 5',
              href: '#'
            },
            {
              src: 'https://placehold.co/250x400/',
              alt: 'Advertisement 6',
              href: '#'
            }
          ]}
          speed={80}
          direction="left"
          logoHeight={200}
          logoWidth={300}
          gap={16}
          pauseOnHover={true}
          fadeOut={false}
          scaleOnHover={true}
          ariaLabel="Рекламные партнеры"
        />
      </section>

      <section className={styles.servicesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionTitleIcon}>
              <i className="fas fa-store"></i>
            </span>
            Наши сервисы
          </h2>
        </div>
        <div className={styles.servicesCarouselWrapper}>
          <button 
            className={`${styles.navBtn} ${styles.navBtnLeft}`}
            onClick={() => scrollServices('prev')}
            aria-label="Предыдущий слайд"
          >
            <FaChevronLeft />
          </button>
          <div 
            className={styles.servicesScroll}
            ref={servicesScrollRef}
          >
            <div className={styles.servicesGrid}>
              {services.map((service) => (
                <Link
                  key={service.id}
                  to={service.available ? service.link : '#'}
                  className={`${styles.serviceCard} ${styles[service.gradient]}`}
                  onClick={(e) => {
                    if (!service.available) {
                      e.preventDefault();
                    }
                  }}
                >
                  <div className={styles.serviceCardBackground}></div>
                  <div className={styles.serviceCardContent}>
                    <div className={styles.serviceIcon}>
                      <i className={`fas ${service.icon}`}></i>
                    </div>
                    <h3 className={styles.serviceTitle}>{service.title}</h3>
                    <p className={styles.serviceDescription}>{service.description}</p>
                    {service.available ? (
                      <div className={styles.serviceLink}>
                        Перейти
                        <i className="fas fa-arrow-right"></i>
                      </div>
                    ) : (
                      <div className={`${styles.serviceLink} ${styles.serviceLinkComingSoon}`}>
                        Скоро
                        <i className="fas fa-clock"></i>
                      </div>
                    )}
                  </div>
                  <div className={styles.serviceCardOverlay}></div>
                </Link>
              ))}
            </div>
          </div>
          <button 
            className={`${styles.navBtn} ${styles.navBtnRight}`}
            onClick={() => scrollServices('next')}
            aria-label="Следующий слайд"
          >
            <FaChevronRight />
          </button>
        </div>
      </section>

      <section className={styles.marketplaceSection} aria-label="Товары">
        <div className={styles.heroCtaBlock}>
          <Link to="/business-contact" className={styles.heroBusinessCta}>
            Подключить бизнес к Axione
          </Link>
          <p className={styles.heroCtaHint}>
            Связь для магазинов и партнёров
          </p>
        </div>

        {loading && products.length === 0 ? (
          <div className={styles.loaderContainer} style={{ minHeight: 200 }}>
            <Loader />
          </div>
        ) : error ? (
          <div className={styles.errorMessage}>
            <i className="fas fa-exclamation-circle"></i>
            <p>{error}</p>
          </div>
        ) : products.length > 0 ? (
          <>
            <div className={styles.productsGrid}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {hasNext ? (
              <div
                ref={infiniteSentinelRef}
                className={styles.infiniteSentinel}
                aria-hidden
              />
            ) : null}
            {loadingMore ? (
              <div className={styles.infiniteLoadingMore}>
                <Loader />
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.noProducts}>
            <i className="fas fa-box-open"></i>
            <p>Товары пока не добавлены</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default MainMobile;
