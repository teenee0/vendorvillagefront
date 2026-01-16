// src/components/BusinessHeader.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';
import axios from '../../api/axiosDefault';
import styles from './BusinessHeader.module.css';
import logoIcon from '../../assets/logo.svg';

export const BusinessHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [locations, setLocations] = useState([]);
  
  // Достаём `business_slug` из URL
  const business_slug = location.pathname.split('/')[2];

  // Загружаем локации и текущую выбранную локацию
  useEffect(() => {
    if (!business_slug) return;

    const fetchLocations = async () => {
      try {
        const response = await axios.get(`/api/business/${business_slug}/locations/`);
        setLocations(response.data);
      } catch (err) {
        console.error('Ошибка при загрузке локаций:', err);
      }
    };

    fetchLocations();

    // Получаем сохраненную локацию
    const updateLocation = () => {
      const savedLocation = localStorage.getItem(`business_${business_slug}_location`);
      setSelectedLocation(savedLocation || 'all');
    };

    updateLocation();

    // Слушаем изменения в localStorage
    const handleStorageChange = (e) => {
      if (e.key === `business_${business_slug}_location`) {
        updateLocation();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Также слушаем события на этой же вкладке через кастомное событие
    const handleLocationChange = () => {
      updateLocation();
    };
    
    window.addEventListener('locationChanged', handleLocationChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('locationChanged', handleLocationChange);
    };
  }, [business_slug]);

  // Логика скрытия при скролле (только для мобильной версии)
  useEffect(() => {
    if (!isMobile) return;

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
  }, [lastScrollY, isMobile]);

  // Получаем название локации
  const getLocationName = () => {
    if (selectedLocation === 'all') {
      return 'По всем точкам';
    }
    const loc = locations.find(l => String(l.id) === String(selectedLocation));
    return loc ? loc.name : 'Выберите локацию';
  };

  // Обработчик клика по кнопке локации
  const handleLocationClick = () => {
    navigate(`/business/${business_slug}/location-select`);
  };

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      {/* Mobile location bar */}
      {isMobile && (
        <div className={`${styles.mobileLocationBar} ${!isVisible ? styles.hidden : ''}`}>
          <button 
            className={styles.mobileLocationButton}
            onClick={handleLocationClick}
          >
            <span className={styles.mobileLocationText}>
              {getLocationName()}
            </span>
            <i className="fas fa-chevron-down"></i>
          </button>
        </div>
      )}
      <div className={styles.container}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <Link to="/" className={styles.logoLink}>
              <img src={logoIcon} alt="A" className={styles.logoIcon} />
              <span className={styles.logoText}>xione & Business</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default BusinessHeader;