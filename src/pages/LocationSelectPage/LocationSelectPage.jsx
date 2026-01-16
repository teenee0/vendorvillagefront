import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LocationSelector from '../../components/LocationSelector/LocationSelector';
import styles from './LocationSelectPage.module.css';

const LocationSelectPage = () => {
  const { business_slug } = useParams();
  const navigate = useNavigate();
  
  // Читаем сохраненную локацию сразу при инициализации
  const getInitialLocation = () => {
    const savedLocation = localStorage.getItem(`business_${business_slug}_location`);
    return savedLocation || 'all';
  };
  
  const [selectedLocation, setSelectedLocation] = useState(getInitialLocation);

  // Обновляем локацию при изменении business_slug
  useEffect(() => {
    const savedLocation = localStorage.getItem(`business_${business_slug}_location`);
    const locationToSet = savedLocation || 'all';
    setSelectedLocation(locationToSet);
  }, [business_slug]);

  const handleLocationChange = (locationId) => {
    setSelectedLocation(locationId);
  };

  const handleLocationSelect = (locationId) => {
    setSelectedLocation(locationId);
    // Сохраняем в localStorage
    localStorage.setItem(`business_${business_slug}_location`, locationId);
    
    // Отправляем событие об изменении локации
    window.dispatchEvent(new Event('locationChanged'));
    
    // Перенаправляем на главную страницу бизнеса
    navigate(`/business/${business_slug}/main`);
  };

  const handleContinue = () => {
    if (selectedLocation) {
      handleLocationSelect(selectedLocation);
    }
  };

  const handleSkip = () => {
    // Пропускаем выбор локации (выбираем "По всем точкам")
    handleLocationSelect('all');
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <h1>📍 Выбор локации</h1>
            <p>Выберите локацию для работы с данными бизнеса</p>
          </div>
        </div>

        <div className={styles.content}>
          <LocationSelector 
            businessSlug={business_slug}
            onLocationSelect={handleLocationChange}
            currentLocation={selectedLocation}
          />

          <div className={styles.actions}>
            <button 
              className={styles.skipButton}
              onClick={handleSkip}
            >
              Пропустить (все локации)
            </button>
            
            <button 
              className={`${styles.continueButton} ${!selectedLocation ? styles.disabled : ''}`}
              onClick={handleContinue}
              disabled={!selectedLocation}
            >
              Продолжить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSelectPage;
