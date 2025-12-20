import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from '../../api/axiosDefault';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FaMapMarkerAlt, FaChevronDown, FaChevronUp, FaCheck, FaTimes, FaSearch } from 'react-icons/fa';
import styles from './CitySelector.module.css';

const CitySelector = ({ selectedCity, onSelectCity }) => {
  const isMobile = useIsMobile(768);
  const [isOpen, setIsOpen] = useState(false);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dropdownRef = useRef(null);
  const modalRef = useRef(null);
  const dragStartY = useRef(0);

  useEffect(() => {
    const loadCities = async () => {
      try {
        setLoading(true);
        // Получаем первую страну
        const countriesRes = await axios.get('api/countries/');
        if (countriesRes.data && countriesRes.data.length > 0) {
          const firstCountry = countriesRes.data[0];
          // Получаем города этой страны
          const citiesRes = await axios.get(`api/cities/?country=${firstCountry.id}`);
          setCities(citiesRes.data || []);
        }
        setLoading(false);
      } catch (err) {
        console.error('Ошибка загрузки городов:', err);
        setLoading(false);
      }
    };

    if (isOpen) {
      loadCities();
    }
  }, [isOpen]);

  // Обработка drag для закрытия модального окна
  const handleDragStart = (e) => {
    if (!isMobile || !isOpen) return;
    // Проверяем, что клик был на drag handle или header
    const target = e.target;
    const isDragHandle = target.classList.contains(styles.mobileModalDragHandle) ||
                         target.closest(`.${styles.mobileModalDragHandle}`) ||
                         target.closest(`.${styles.mobileModalHeader}`);
    if (!isDragHandle) return;
    
    setIsDragging(true);
    dragStartY.current = e.touches ? e.touches[0].clientY : e.clientY;
    e.preventDefault();
  };


  // Обработка глобальных событий для drag
  useEffect(() => {
    if (!isMobile || !isOpen || !isDragging) return;

    const handleGlobalMove = (e) => {
      const currentY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaY = currentY - dragStartY.current;
      if (deltaY > 0) {
        setDragY(deltaY);
        e.preventDefault();
      }
    };

    const handleGlobalEnd = () => {
      if (dragY > 100) {
        setIsOpen(false);
        setSearchQuery('');
      }
      setDragY(0);
      setIsDragging(false);
    };

    document.addEventListener('touchmove', handleGlobalMove, { passive: false });
    document.addEventListener('touchend', handleGlobalEnd);
    document.addEventListener('mousemove', handleGlobalMove);
    document.addEventListener('mouseup', handleGlobalEnd);

    return () => {
      document.removeEventListener('touchmove', handleGlobalMove);
      document.removeEventListener('touchend', handleGlobalEnd);
      document.removeEventListener('mousemove', handleGlobalMove);
      document.removeEventListener('mouseup', handleGlobalEnd);
    };
  }, [isMobile, isOpen, isDragging, dragY]);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile) {
        // Для мобильных проверяем клик по overlay
        if (modalRef.current && !modalRef.current.contains(event.target)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      } else {
        // Для десктопа проверяем клик вне dropdown
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen && !isDragging) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, isMobile, isDragging]);

  // Блокировка скролла при открытом модальном окне
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen]);

  const handleSelectCity = (city) => {
    onSelectCity(city);
    setIsOpen(false);
    setSearchQuery('');
  };

  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Модальное окно для мобильных устройств рендерится через Portal
  const mobileModalContent = isMobile && isOpen ? (
    <>
      <div 
        className={styles.mobileOverlay} 
        onClick={() => {
          setIsOpen(false);
          setSearchQuery('');
        }}
      ></div>
      <div 
        className={styles.mobileModal} 
        ref={modalRef}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : 'translateY(0)',
          opacity: dragY > 0 ? Math.max(0.3, 1 - dragY / 300) : 1
        }}
      >
        <div 
          className={styles.mobileModalDragHandle}
          onTouchStart={handleDragStart}
          onMouseDown={handleDragStart}
        ></div>
        <div 
          className={styles.mobileModalHeader}
          onTouchStart={handleDragStart}
          onMouseDown={handleDragStart}
        >
          <h2 className={styles.mobileModalTitle}>Выберите город</h2>
          <button
            className={styles.mobileModalClose}
            onClick={() => {
              setIsOpen(false);
              setSearchQuery('');
            }}
            aria-label="Закрыть"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className={styles.mobileModalSearch}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Поиск города..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
        </div>

        <div className={styles.mobileModalContent}>
          {loading ? (
            <div className={styles.citySelectorLoading}>
              <p>Загрузка...</p>
            </div>
          ) : filteredCities.length === 0 ? (
            <div className={styles.emptyState}>
              <FaMapMarkerAlt className={styles.emptyStateIcon} />
              <p>Города не найдены</p>
              {searchQuery && (
                <p className={styles.emptyStateHint}>Попробуйте изменить запрос</p>
              )}
            </div>
          ) : (
            <div className={styles.mobileCityList}>
              {filteredCities.map(city => (
                <button
                  key={city.id}
                  className={`${styles.mobileCityItem} ${selectedCity?.id === city.id ? styles.selected : ''}`}
                  onClick={() => handleSelectCity(city)}
                >
                  <div className={styles.mobileCityInfo}>
                    <FaMapMarkerAlt className={styles.mobileCityIcon} />
                    <div className={styles.mobileCityText}>
                      <span className={styles.mobileCityName}>{city.name}</span>
                      {city.is_capital && (
                        <span className={styles.mobileCityBadge}>Столица</span>
                      )}
                    </div>
                  </div>
                  {selectedCity?.id === city.id && (
                    <FaCheck className={styles.mobileCheckIcon} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      <div className={styles.citySelector} ref={dropdownRef}>
        <button
          className={styles.citySelectorButton}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Выбрать город"
        >
          <FaMapMarkerAlt className={styles.cityIcon} />
          <span className={styles.citySelectorText}>
            {selectedCity ? selectedCity.name : 'Выберите город'}
          </span>
          {isOpen ? <FaChevronUp className={styles.chevronIcon} /> : <FaChevronDown className={styles.chevronIcon} />}
        </button>

        {!isMobile && isOpen && (
          <div className={styles.citySelectorDropdown}>
            {loading ? (
              <div className={styles.citySelectorLoading}>
                <p>Загрузка...</p>
              </div>
            ) : (
              <div className={styles.citySelectorList}>
                {cities.map(city => (
                  <button
                    key={city.id}
                    className={`${styles.citySelectorItem} ${selectedCity?.id === city.id ? styles.selected : ''}`}
                    onClick={() => handleSelectCity(city)}
                  >
                    <span className={styles.citySelectorItemName}>{city.name}</span>
                    {city.is_capital && (
                      <span className={styles.citySelectorBadge}>Столица</span>
                    )}
                    {selectedCity?.id === city.id && (
                      <FaCheck className={styles.checkIcon} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Modal через Portal */}
      {typeof document !== 'undefined' && mobileModalContent && createPortal(
        mobileModalContent,
        document.body
      )}
    </>
  );
};

export default CitySelector;

