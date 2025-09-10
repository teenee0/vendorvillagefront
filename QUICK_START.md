# 🚀 Быстрый старт - Система окружений VendorVillage

## Что было сделано

✅ Создана система конфигурации для переключения между разработкой и продакшеном  
✅ Обновлены все утилиты для работы с URL и изображениями  
✅ Добавлен индикатор окружения в интерфейс  
✅ Настроены скрипты для разных режимов работы  
✅ Создан хук для удобного использования конфигурации  

## 🎯 Основные команды

### Разработка
```bash
# Обычная разработка (localhost:8000)
npm run dev

# Разработка с production настройками
npm run dev:prod
```

### Сборка
```bash
# Сборка для продакшена
npm run build

# Сборка для разработки (с debug)
npm run build:dev
```

### Переключение окружения
```bash
# Переключиться на development
npm run env:dev

# Переключиться на production  
npm run env:prod
```

## 🔧 Настройка для продакшена

1. Откройте `src/config/environment.js`
2. Измените URL в секции `production`:
   ```javascript
   production: {
     API_BASE_URL: 'https://yourdomain.com',
     MEDIA_BASE_URL: 'https://yourdomain.com',
     // ...
   }
   ```

## 📱 Использование в компонентах

### Простое использование
```javascript
import { getImageUrl } from '../utils/getImageUrl';

// Автоматически использует правильный базовый URL
const imageUrl = getImageUrl('products/photo.jpg');
```

### С хуком
```javascript
import { useEnvironment } from '../hooks/useEnvironment';

function MyComponent() {
  const { getApiUrl, getMediaUrl, isDevelopment, logger } = useEnvironment();
  
  // Логирование (работает только в development)
  logger.debug('Component rendered');
  
  return <div>...</div>;
}
```

### Прямой импорт конфигурации
```javascript
import { ENV_CONFIG, logger } from '../config/environment';

if (ENV_CONFIG.IS_DEVELOPMENT) {
  logger.debug('Development mode');
}
```

## 🎨 Индикатор окружения

В development режиме в правом верхнем углу отображается индикатор с информацией о:
- Текущем окружении
- API URL
- Media URL

## 🔍 Что изменилось

### Обновленные файлы:
- `src/config/environment.js` - основная конфигурация
- `src/utils/getImageUrl.js` - использует конфигурацию
- `src/utils/getFullFileUrl.js` - использует конфигурацию  
- `src/api/axiosDefault.js` - использует конфигурацию
- `src/App.jsx` - добавлен индикатор окружения
- `vite.config.js` - поддержка режимов
- `package.json` - новые скрипты

### Новые файлы:
- `src/components/EnvironmentIndicator/` - индикатор окружения
- `src/hooks/useEnvironment.js` - хук для конфигурации
- `scripts/switch-env.js` - скрипт переключения
- `ENVIRONMENT_SETUP.md` - подробная документация

## 🎉 Готово к использованию!

Теперь вы можете:
1. Запустить `npm run dev` для разработки
2. Запустить `npm run build` для продакшена
3. Видеть текущее окружение в интерфейсе
4. Легко переключаться между режимами
5. Использовать правильные URL автоматически

Все изображения и API запросы будут автоматически использовать правильные URL в зависимости от окружения!
