import React from 'react';
import { useSnowfall } from '../../contexts/SnowfallContext';
import './SnowfallToggle.css';

const SnowfallToggle = () => {
  const { snowfallEnabled, toggleSnowfall, isPeriodActive } = useSnowfall();

  // Скрываем переключатель, если период не активен
  if (!isPeriodActive) {
    return null;
  }

  return (
    <button
      className="snowfall-toggle"
      onClick={toggleSnowfall}
      aria-label={snowfallEnabled ? 'Выключить снег' : 'Включить снег'}
      title={snowfallEnabled ? 'Выключить снег' : 'Включить снег'}
    >
      {snowfallEnabled ? (
        <i className="fas fa-snowflake" />
      ) : (
        <i className="far fa-snowflake" />
      )}
    </button>
  );
};

export default SnowfallToggle;

