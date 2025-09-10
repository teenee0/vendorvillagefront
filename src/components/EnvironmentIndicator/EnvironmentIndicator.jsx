import React from 'react';
import { ENV_CONFIG } from '../../config/environment';
import './EnvironmentIndicator.css';

const EnvironmentIndicator = () => {
  // Показываем только в development режиме
  if (ENV_CONFIG.IS_PRODUCTION) {
    return null;
  }

  return (
    <div className="environment-indicator">
      <div className={`env-badge env-${ENV_CONFIG.ENVIRONMENT}`}>
        {ENV_CONFIG.ENVIRONMENT.toUpperCase()}
      </div>
      <div className="env-info">
        <div>API: {ENV_CONFIG.API_BASE_URL}</div>
        <div>Media: {ENV_CONFIG.MEDIA_BASE_URL}</div>
      </div>
    </div>
  );
};

export default EnvironmentIndicator;
