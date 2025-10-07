import React, { useState, useEffect } from 'react';
import axios from '../../api/axiosDefault';
import styles from './LocationSwitcher.module.css';

const LocationSwitcher = ({ businessSlug, selectedLocation, onLocationChange }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/business/${businessSlug}/locations/`);
        setLocations(response.data);
      } catch (err) {
        console.error('Ошибка при загрузке локаций:', err);
      } finally {
        setLoading(false);
      }
    };

    if (businessSlug) {
      fetchLocations();
    }
  }, [businessSlug]);

  const getLocationName = (locationId) => {
    if (locationId === 'all') {
      return 'По всем точкам';
    }
    const location = locations.find(loc => loc.id === parseInt(locationId));
    return location ? location.name : `Локация #${locationId}`;
  };

  const getLocationDetails = (locationId) => {
    if (locationId === 'all') {
      return 'Все локации';
    }
    const location = locations.find(loc => loc.id === parseInt(locationId));
    return location ? location.location_type?.name || 'Локация' : 'Неизвестная';
  };

  return (
    <div className={styles.switcher}>
      <button 
        className={styles.switchButton}
        onClick={onLocationChange}
        disabled={loading}
        title="Изменить локацию"
      >
        <div className={styles.locationInfo}>
          <span className={styles.locationIcon}>📍</span>
          <div className={styles.locationDetails}>
            <span className={styles.locationName}>
              {getLocationName(selectedLocation)}
            </span>
            <span className={styles.locationType}>
              {getLocationDetails(selectedLocation)}
            </span>
          </div>
        </div>
        <span className={styles.switchIcon}>🔄</span>
      </button>
    </div>
  );
};

export default LocationSwitcher;
