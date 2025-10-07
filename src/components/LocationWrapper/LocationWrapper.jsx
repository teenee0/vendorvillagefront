import React, { useState, useEffect } from 'react';
import { useParams, Outlet, useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import LocationSwitcher from '../LocationSwitcher/LocationSwitcher';
import styles from './LocationWrapper.module.css';

const LocationWrapper = () => {
  const { business_slug } = useParams();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const savedLocation = localStorage.getItem(`business_${business_slug}_location`);
    setSelectedLocation(savedLocation);
    
    // Если мы не на странице выбора локации и локация не выбрана, перенаправляем
    if (!savedLocation && !routerLocation.pathname.includes('/location-select')) {
      navigate(`/business/${business_slug}/location-select`);
    }
    
    setIsChecking(false);
  }, [business_slug, routerLocation.pathname, navigate]);

  const handleChangeLocation = () => {
    navigate(`/business/${business_slug}/location-select`);
  };

  // Показываем загрузку пока проверяем локацию
  if (isChecking) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loading}>Проверка локации...</div>
      </div>
    );
  }

  // Если на странице выбора локации, просто рендерим Outlet
  if (routerLocation.pathname.includes('/location-select')) {
    return <Outlet />;
  }

  // Если локация выбрана, показываем контент с переключателем
  return (
    <div className={styles.container}>
      <Outlet />
      <LocationSwitcher 
        businessSlug={business_slug}
        selectedLocation={selectedLocation}
        onLocationChange={handleChangeLocation}
      />
    </div>
  );
};

export default LocationWrapper;
