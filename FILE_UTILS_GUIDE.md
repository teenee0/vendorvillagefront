# 📁 Руководство по работе с файлами и изображениями

## Обзор

Создана централизованная система для работы с файлами и изображениями, которая автоматически использует правильные URL в зависимости от окружения (development/production).

## Основные утилиты

### 1. getImageUrl(imagePath)
Получает полный URL для изображения.

```javascript
import { getImageUrl } from '../utils/fileUtils';

const imageUrl = getImageUrl('products/photo.jpg');
// В development: http://127.0.0.1:8000/media/products/photo.jpg
// В production: https://api.vendorvillage.store/media/products/photo.jpg
```

### 2. getFileUrl(filePath)
Получает полный URL для любого файла.

```javascript
import { getFileUrl } from '../utils/fileUtils';

const fileUrl = getFileUrl('documents/file.pdf');
// В development: http://127.0.0.1:8000/media/documents/file.pdf
// В production: https://api.vendorvillage.store/media/documents/file.pdf
```

### 3. getBackgroundImageUrl(imagePath)
Получает URL для CSS background-image.

```javascript
import { getBackgroundImageUrl } from '../utils/fileUtils';

const style = {
  backgroundImage: getBackgroundImageUrl('categories/bg.jpg')
};
// Результат: backgroundImage: 'url(https://api.vendorvillage.store/media/categories/bg.jpg)'
```

### 4. getApiUrl(endpoint)
Получает полный URL для API запросов.

```javascript
import { getApiUrl } from '../utils/fileUtils';

const apiUrl = getApiUrl('/api/products/');
// В development: http://127.0.0.1:8000/api/products/
// В production: https://api.vendorvillage.store/api/products/
```

## Использование с хуком

### useFileUtils()
Хук предоставляет все утилиты в удобном формате:

```javascript
import { useFileUtils } from '../hooks/useFileUtils';

function MyComponent() {
  const { 
    getImageUrl, 
    getFileUrl, 
    getBackgroundImageUrl,
    getApiUrl,
    isExternalUrl,
    getFileName,
    getFileExtension,
    isImageFile,
    formatFileSize,
    createBackgroundImageStyle,
    getThumbnailUrl
  } = useFileUtils();

  return (
    <div>
      <img src={getImageUrl(product.image)} alt="Product" />
      <div style={createBackgroundImageStyle(category.bgImage)}>
        Content
      </div>
    </div>
  );
}
```

## Дополнительные утилиты

### Проверка типов файлов
```javascript
const { isImageFile, getFileExtension } = useFileUtils();

if (isImageFile('photo.jpg')) {
  console.log('Это изображение');
}

const extension = getFileExtension('document.pdf'); // 'pdf'
```

### Работа с внешними URL
```javascript
const { isExternalUrl } = useFileUtils();

if (isExternalUrl('https://example.com/image.jpg')) {
  console.log('Внешний URL');
}
```

### Форматирование размера файла
```javascript
const { formatFileSize } = useFileUtils();

const size = formatFileSize(1024000); // '1000 KB'
```

### Создание стилей для фонового изображения
```javascript
const { createBackgroundImageStyle } = useFileUtils();

const style = createBackgroundImageStyle('bg.jpg', {
  backgroundSize: 'cover',
  backgroundPosition: 'center'
});
```

## Миграция существующего кода

### Было:
```javascript
const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  if (imagePath.startsWith('/media/')) return `http://localhost:8000${imagePath}`;
  if (!imagePath.startsWith('/')) return `http://localhost:8000/media/${imagePath}`;
  return `http://localhost:8000${imagePath}`;
};
```

### Стало:
```javascript
import { useFileUtils } from '../hooks/useFileUtils';

function MyComponent() {
  const { getImageUrl } = useFileUtils();
  // Используем getImageUrl напрямую
}
```

## Преимущества

1. **Централизация** - вся логика работы с файлами в одном месте
2. **Автоматическое переключение окружений** - не нужно менять код при деплое
3. **Типизация** - все функции имеют четкие типы параметров
4. **Переиспользование** - один раз написал, используй везде
5. **Легкость тестирования** - можно легко мокать утилиты
6. **Производительность** - мемоизация в хуке

## Примеры использования

### В компонентах
```javascript
import { useFileUtils } from '../hooks/useFileUtils';

function ProductCard({ product }) {
  const { getImageUrl, getBackgroundImageUrl } = useFileUtils();
  
  return (
    <div style={{ backgroundImage: getBackgroundImageUrl(product.bgImage) }}>
      <img src={getImageUrl(product.mainImage)} alt={product.name} />
    </div>
  );
}
```

### Прямой импорт
```javascript
import { getImageUrl, getFileUrl } from '../utils/fileUtils';

const imageUrl = getImageUrl('path/to/image.jpg');
const fileUrl = getFileUrl('path/to/file.pdf');
```

### С переэкспортом
```javascript
// Старые импорты продолжают работать
import { getImageUrl } from '../utils/getImageUrl';
import { getFileUrl } from '../utils/getFullFileUrl';
```

## Обновленные файлы

- ✅ `src/utils/fileUtils.js` - основные утилиты
- ✅ `src/hooks/useFileUtils.js` - хук для удобного использования
- ✅ `src/utils/getImageUrl.js` - переэкспорт
- ✅ `src/utils/getFullFileUrl.js` - переэкспорт
- ✅ Все компоненты обновлены для использования новых утилит

Теперь вся работа с файлами централизована и автоматически адаптируется под окружение! 🎉
