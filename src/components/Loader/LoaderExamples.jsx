import React, { useState } from 'react';
import Loader from './Loader';
import styles from './Loader.module.css';

const LoaderExamples = () => {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showInline, setShowInline] = useState(false);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Примеры использования компонента Loader</h2>
      
      {/* Базовые размеры */}
      <div style={{ marginBottom: '40px' }}>
        <h3>Размеры лоадера:</h3>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <Loader size="small" />
            <p>Маленький (80px)</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Loader size="medium" />
            <p>Средний (140px)</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Loader size="large" />
            <p>Большой (200px)</p>
          </div>
        </div>
      </div>

      {/* Инлайн использование */}
      <div style={{ marginBottom: '40px' }}>
        <h3>Инлайн использование:</h3>
        <p style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          Загрузка данных
          {showInline && <Loader size="small" className={styles.inline} />}
        </p>
        <button 
          onClick={() => setShowInline(!showInline)}
          style={{ marginTop: '10px', padding: '8px 16px' }}
        >
          {showInline ? 'Скрыть' : 'Показать'} инлайн лоадер
        </button>
      </div>

      {/* Центрированный лоадер */}
      <div style={{ marginBottom: '40px' }}>
        <h3>Центрированный в контейнере:</h3>
        <div style={{ 
          position: 'relative', 
          height: '300px', 
          border: '2px dashed #ccc',
          borderRadius: '8px'
        }}>
          <Loader size="medium" className={styles.center} />
        </div>
      </div>

      {/* Полноэкранный лоадер */}
      <div style={{ marginBottom: '40px' }}>
        <h3>Полноэкранный лоадер:</h3>
        <button 
          onClick={() => setShowFullscreen(!showFullscreen)}
          style={{ padding: '8px 16px' }}
        >
          {showFullscreen ? 'Скрыть' : 'Показать'} полноэкранный лоадер
        </button>
        {showFullscreen && (
          <Loader size="large" className={styles.fullscreen} />
        )}
      </div>

      {/* Код примеров */}
      <div style={{ marginTop: '40px' }}>
        <h3>Примеры кода:</h3>
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px',
          overflow: 'auto'
        }}>
{`// Базовое использование
import Loader from './components/Loader';

<Loader />

// С настройкой размера
<Loader size="small" />   // 80px
<Loader size="medium" />  // 140px (по умолчанию)
<Loader size="large" />   // 200px

// С дополнительными CSS классами
<Loader className="custom-class" />

// Полноэкранный лоадер
<Loader size="large" className={styles.fullscreen} />

// Центрированный в контейнере
<Loader size="medium" className={styles.center} />

// Инлайн лоадер
<Loader size="small" className={styles.inline} />`}
        </pre>
      </div>
    </div>
  );
};

export default LoaderExamples;
