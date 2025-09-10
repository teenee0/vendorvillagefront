# Настройка окружений для VendorVillage Frontend

## Обзор

Система конфигурации позволяет легко переключаться между режимами разработки и продакшена без изменения кода.

## Структура конфигурации

### Основной файл конфигурации
`src/config/environment.js` - содержит настройки для всех окружений.

### Текущие настройки

#### Development (разработка)
- API URL: `http://127.0.0.1:8000`
- Media URL: `http://127.0.0.1:8000`
- Debug: включен
- Логирование: подробное

#### Production (продакшен)
- API URL: `https://yourdomain.com`
- Media URL: `https://yourdomain.com`
- Debug: отключен
- Логирование: только ошибки

## Команды для запуска

### Разработка
```bash
# Обычная разработка (development режим)
npm run dev

# Разработка с production настройками
npm run dev:prod
```

### Сборка
```bash
# Сборка для продакшена
npm run build

# Сборка для разработки (с debug информацией)
npm run build:dev
```

### Предварительный просмотр
```bash
# Просмотр production сборки
npm run preview

# Просмотр development сборки
npm run preview:dev
```

## Использование в коде

### Импорт конфигурации
```javascript
import { ENV_CONFIG, logger } from '../config/environment';
```

### Использование хука
```javascript
import { useEnvironment } from '../hooks/useEnvironment';

function MyComponent() {
  const { getApiUrl, getMediaUrl, isDevelopment, logger } = useEnvironment();
  
  // Получение URL для API
  const apiUrl = getApiUrl('/api/products/');
  
  // Получение URL для медиа файлов
  const imageUrl = getMediaUrl('/products/image.jpg');
  
  // Логирование (работает только в development)
  logger.debug('Component rendered');
  
  return <div>...</div>;
}
```

### Прямое использование утилит
```javascript
import { getImageUrl, getFileUrl } from '../utils/getImageUrl';
import { getFileUrl } from '../utils/getFullFileUrl';

// Автоматически использует правильный базовый URL
const imageUrl = getImageUrl('products/photo.jpg');
const fileUrl = getFileUrl('documents/file.pdf');
```

## Индикатор окружения

В development режиме в правом верхнем углу отображается индикатор с информацией о текущем окружении.

## Настройка для продакшена

1. Отредактируйте `src/config/environment.js`
2. Измените URL в секции `production`:
   ```javascript
   production: {
     API_BASE_URL: 'https://yourdomain.com',
     MEDIA_BASE_URL: 'https://yourdomain.com',
     // ...
   }
   ```

## Переменные окружения (опционально)

Если нужно использовать .env файлы, создайте:

### .env.development
```
VITE_APP_ENV=development
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_MEDIA_BASE_URL=http://127.0.0.1:8000
```

### .env.production
```
VITE_APP_ENV=production
VITE_API_BASE_URL=https://yourdomain.com
VITE_MEDIA_BASE_URL=https://yourdomain.com
```

## Логирование

Система логирования автоматически отключается в production режиме:

```javascript
import { logger } from '../config/environment';

logger.debug('Это сообщение видно только в development');
logger.info('Это сообщение видно всегда');
logger.error('Это сообщение видно всегда');
```

## Проверка окружения

```javascript
import { ENV_CONFIG } from '../config/environment';

if (ENV_CONFIG.IS_DEVELOPMENT) {
  console.log('Работаем в режиме разработки');
}

if (ENV_CONFIG.IS_PRODUCTION) {
  console.log('Работаем в продакшене');
}
```
