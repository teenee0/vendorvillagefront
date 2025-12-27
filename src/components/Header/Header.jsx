import React, { useState, useEffect } from 'react';
import styles from './Header.module.css';
import logoIcon from '../../assets/logo.svg';
import { Link } from 'react-router-dom';
import CitySelector from '../CitySelector/CitySelector';
import { useCity } from '../../hooks/useCity';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import SnowfallToggle from '../SnowfallToggle/SnowfallToggle';
import { FaTimes } from 'react-icons/fa';

function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { selectedCity, setSelectedCity } = useCity();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <nav className={styles.navbar}>
        <div className={styles.container}>
          {/* Desktop layout */}
          <div className={styles.desktopLayout}>
            <Link to="/" className={styles.brand}>
              <img src={logoIcon} alt="A" className={styles.logoIcon} />
              <span>xione</span>
            </Link>

            <div className={`${styles.navbarCollapse} ${isMobileMenuOpen ? styles.open : ''}`}>
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
            <button
              className={`${styles.navbarToggler} ${isMobileMenuOpen ? styles.open : ''}`}
              onClick={toggleMobileMenu}
              aria-label="Toggle navigation"
            >
              <i className="fas fa-bars"></i>
            </button>

            <form className={styles.mobileSearchForm} role="search">
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

            <Link to="/" className={styles.mobileBrand}>
              <img src={logoIcon} alt="A" className={styles.logoIcon} />
              <span>xione</span>
            </Link>
          </div>

          {/* Mobile overlay */}
          {isMobileMenuOpen && (
            <div className={styles.mobileOverlay} onClick={closeMobileMenu}></div>
          )}

          {/* Mobile dropdown menu */}
          <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
            <div className={styles.mobileMenuHeader}>
              <h2 className={styles.mobileMenuTitle}>Меню</h2>
              <button
                className={styles.mobileMenuClose}
                onClick={closeMobileMenu}
                aria-label="Закрыть меню"
              >
                <FaTimes />
              </button>
            </div>
            <ul className={styles.mobileNavList}>
              <li className={styles.mobileNavItem}>
                <Link to="/business-categories" className={styles.mobileNavLink} onClick={closeMobileMenu}>
                  <i className="fas fa-th-large"></i> Категории
                </Link>
              </li>
              <li className={styles.mobileNavItem}>
                <Link to="/sites" className={styles.mobileNavLink} onClick={closeMobileMenu}>
                  <i className="fas fa-store"></i> Магазины
                </Link>
              </li>
              <li className={styles.mobileNavItem}>
                <Link to="/cart" className={styles.mobileNavLink} onClick={closeMobileMenu}>
                  <i className="fas fa-shopping-cart"></i> Корзина
                </Link>
              </li>
              <li className={styles.mobileNavItem}>
                <Link to="/account" className={styles.mobileNavLink} onClick={closeMobileMenu}>
                  <i className="fas fa-user"></i> Аккаунт
                </Link>
              </li>
              <li className={styles.mobileNavItem}>
                <div className={styles.mobileNavLink}>
                  <CitySelector selectedCity={selectedCity} onSelectCity={setSelectedCity} />
                </div>
              </li>
              <li className={styles.mobileNavItem}>
                <div className={styles.mobileNavLink}>
                  <ThemeToggle />
                </div>
              </li>
              <li className={styles.mobileNavItem}>
                <div className={styles.mobileNavLink}>
                  <SnowfallToggle />
                </div>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Header;