import React, { useState, useEffect } from 'react';
import axios from '../../api/axiosDefault';
import './CitySelectModal.css';

const CitySelectModal = ({ onSelectCity, selectedCity, onClose }) => {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setError('Ошибка загрузки городов');
        setLoading(false);
      }
    };

    loadCities();
  }, []);


  const handleSelectCity = (city) => {
    onSelectCity(city);
  };

  if (loading) {
    return (
      <div className="city-modal-overlay" onClick={onClose ? (e) => e.target === e.currentTarget && onClose() : undefined}>
        <div className="city-modal" onClick={(e) => e.stopPropagation()}>
          <div className="city-modal-header">
            <h2>Выберите город</h2>
            {onClose && (
              <button className="city-modal-close" onClick={onClose} aria-label="Закрыть">
                &times;
              </button>
            )}
          </div>
          <div className="city-modal-content">
            <p>Загрузка городов...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="city-modal-overlay" onClick={onClose ? (e) => e.target === e.currentTarget && onClose() : undefined}>
        <div className="city-modal" onClick={(e) => e.stopPropagation()}>
          <div className="city-modal-header">
            <h2>Выберите город</h2>
            {onClose && (
              <button className="city-modal-close" onClick={onClose} aria-label="Закрыть">
                &times;
              </button>
            )}
          </div>
          <div className="city-modal-content">
            <p className="error">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div className="city-modal-overlay" onClick={handleOverlayClick}>
      <div className="city-modal" onClick={(e) => e.stopPropagation()}>
        <div className="city-modal-header">
          <h2>Выберите город</h2>
          {onClose && (
            <button className="city-modal-close" onClick={onClose} aria-label="Закрыть">
              &times;
            </button>
          )}
        </div>
        <div className="city-modal-content">
          <p className="city-modal-description">
            Пожалуйста, выберите город для отображения товаров в вашем регионе
          </p>
          <div className="city-list">
            {cities.map(city => (
              <button
                key={city.id}
                className={`city-item ${selectedCity?.id === city.id ? 'selected' : ''}`}
                onClick={() => handleSelectCity(city)}
              >
                <span className="city-name">{city.name}</span>
                {city.is_capital && <span className="city-badge">Столица</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitySelectModal;

