import React, { useState, useEffect } from 'react';
import axios from '../../api/axiosDefault';
import styles from './LocationSelector.module.css';

const LocationSelector = ({ businessSlug, onLocationSelect, currentLocation }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(currentLocation || 'all');

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/business/${businessSlug}/locations/`);
        setLocations(response.data);
        
        // Устанавливаем выбранную локацию
        const locationToSelect = currentLocation || 'all';
        setSelectedLocation(locationToSelect);
        
      } catch (err) {
        console.error('Ошибка при загрузке локаций:', err);
        setError('Не удалось загрузить список локаций');
      } finally {
        setLoading(false);
      }
    };

    if (businessSlug) {
      fetchLocations();
    }
  }, [businessSlug]);

  // Обновляем выбранную локацию при изменении currentLocation
  useEffect(() => {
    const locationToSelect = currentLocation || 'all';
    setSelectedLocation(locationToSelect);
  }, [currentLocation]);

  const handleLocationChange = (locationId) => {
    setSelectedLocation(locationId);
    onLocationSelect(locationId);
  };

  const getLocationName = (locationId) => {
    if (String(locationId) === 'all') {
      return 'По всем точкам';
    }
    const location = locations.find(loc => String(loc.id) === String(locationId));
    return location ? location.name : 'Неизвестная локация';
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка локаций...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Выберите локацию</h3>
        <p>Выберите локацию для работы с данными</p>
      </div>

      <div className={styles.locationList}>
        {/* Опция "По всем точкам" */}
        <div 
          className={`${styles.locationItem} ${String(selectedLocation) === 'all' ? styles.selected : ''}`}
          onClick={() => handleLocationChange('all')}
        >
          <div className={styles.locationInfo}>
            <div className={styles.locationName}>По всем точкам</div>
            <div className={styles.locationDescription}>
              Данные по всем локациям бизнеса
            </div>
          </div>
          <div className={styles.radioButton}>
            {String(selectedLocation) === 'all' && <div className={styles.radioSelected} />}
          </div>
        </div>

        {/* Список локаций */}
        {locations.map((location) => (
          <div 
            key={location.id}
            className={`${styles.locationItem} ${String(selectedLocation) === String(location.id) ? styles.selected : ''}`}
            onClick={() => handleLocationChange(location.id)}
          >
            <div className={styles.locationInfo}>
              <div className={styles.locationName}>
                {location.name}
                {location.is_primary && <span className={styles.primaryBadge}>Основная</span>}
              </div>
              <div className={styles.locationDescription}>
                {location.address}
                {location.contact_phone && ` • ${location.contact_phone}`}
              </div>
              <div className={styles.locationType}>
                {location.location_type?.name}
              </div>
            </div>
            <div className={styles.radioButton}>
              {String(selectedLocation) === String(location.id) && <div className={styles.radioSelected} />}
            </div>
          </div>
        ))}
      </div>

      {selectedLocation && (
        <div className={styles.selectedInfo}>
          <span>Выбрано: </span>
          <strong>{getLocationName(selectedLocation)}</strong>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
