import React, { useState, useEffect, useRef } from 'react';
import styles from './Header.module.css';
import logoIcon from '../../assets/logo.svg';
import { Link } from 'react-router-dom';
import CitySelector from '../CitySelector/CitySelector';
import { useCity } from '../../hooks/useCity';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import SnowfallToggle from '../SnowfallToggle/SnowfallToggle';

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { selectedCity, setSelectedCity } = useCity();
  const citySelectorRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          setScrolled(currentScrollY > 10);
          
          // Скрываем header при скролле вниз, показываем при скролле вверх
          if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setIsVisible(false);
          } else if (currentScrollY < lastScrollY || currentScrollY <= 100) {
            setIsVisible(true);
          }
          
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);


  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      {/* Mobile city bar */}
      <div className={`${styles.mobileCityBar} ${!isVisible ? styles.hidden : ''}`}>
        <button 
          className={styles.mobileCityButton}
          onClick={() => {
            // Открываем CitySelector при клике
            // Ищем кнопку CitySelector внутри wrapper
            const wrapper = citySelectorRef.current;
            if (wrapper) {
              // Ищем первый button внутри wrapper (это кнопка CitySelector)
              const citySelectorButton = wrapper.querySelector('button');
              if (citySelectorButton) {
                citySelectorButton.click();
              }
            }
          }}
        >
          <span className={styles.mobileCityText}>
            {selectedCity ? selectedCity.name : 'Выберите город'}
          </span>
          <i className="fas fa-chevron-down"></i>
        </button>
        <div className={styles.mobileCitySelectorWrapper} ref={citySelectorRef}>
          <CitySelector selectedCity={selectedCity} onSelectCity={setSelectedCity} />
        </div>
      </div>
      <nav className={styles.navbar}>
        <div className={styles.container}>
          {/* Desktop layout */}
          <div className={styles.desktopLayout}>
            <Link to="/" className={styles.brand}>
              <img src={logoIcon} alt="A" className={styles.logoIcon} />
              <span>xione</span>
            </Link>

            <div className={styles.navbarCollapse}>
              <ul className={styles.navbarNav}>
                <li className={styles.navItem}>
                  <Link to="/business-categories" className={styles.navLink}>Категории</Link>
                </li>
                <li className={styles.navItem}>
                  <Link to="/sites" className={styles.navLink}>Магазины</Link>
                </li>
              </ul>

              <form className={styles.searchForm} role="search">
                <input 
                  className={styles.searchInput} 
                  type="text"
                  placeholder="Поиск"
                  aria-label="Search" 
                />
                <button className={styles.searchButton} type="submit">
                  <i className="fas fa-search"></i> 
                </button>
              </form>

              <ul className={styles.navbarNav}>
                <li className={styles.navItem}>
                  <Link to="/cart" className={styles.navLink}>
                    <i className="fas fa-shopping-cart"></i> Корзина
                  </Link>
                </li>
                
                <li className={styles.navItem}>
                  <Link to="/account" className={styles.navLink}>
                    <i className="fas fa-user"></i> Аккаунт
                  </Link>
                </li>
                <li className={styles.navItem}>
                  <CitySelector selectedCity={selectedCity} onSelectCity={setSelectedCity} />
                </li>
                <li className={styles.navItem}>
                  <ThemeToggle />
                </li>
                <li className={styles.navItem}>
                  <SnowfallToggle />
                </li>
              </ul>
            </div>
          </div>

          {/* Mobile layout */}
          <div className={styles.mobileLayout}>
            <Link to="/" className={`${styles.mobileBrand} ${!isVisible ? styles.hidden : ''}`}>
              <img src={logoIcon} alt="A" className={styles.logoIcon} />
              <span>xione</span>
            </Link>

            <form className={`${styles.mobileSearchForm} ${!isVisible ? styles.scrolled : ''}`} role="search">
              <input 
                className={styles.mobileSearchInput} 
                type="text"
                placeholder="Поиск"
                aria-label="Search" 
              />
              <button className={styles.mobileSearchButton} type="submit">
                <i className="fas fa-search"></i> 
              </button>
            </form>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Header;