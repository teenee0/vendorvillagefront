# ResponsiveRoute - Система адаптивных маршрутов

## Описание
Компонент `ResponsiveRoute` автоматически выбирает мобильную или десктопную версию компонента в зависимости от размера экрана.

## Использование

### Базовое использование
```jsx
<Route 
  path="/business/:business_slug/products" 
  element={
    <ResponsiveRoute 
      desktopComponent={ProductManagement}
      mobileComponent={ProductManagementMobile}
    />
  } 
/>
```

### С кастомным breakpoint
```jsx
<Route 
  path="/business/:business_slug/products" 
  element={
    <ResponsiveRoute 
      desktopComponent={ProductManagement}
      mobileComponent={ProductManagementMobile}
      breakpoint={1024} // Кастомная точка разрыва
    />
  } 
/>
```

### Только десктопная версия (без мобильной)
```jsx
<Route 
  path="/business/:business_slug/settings" 
  element={
    <ResponsiveRoute 
      desktopComponent={SettingsPage}
      // mobileComponent не указан - будет использована десктопная версия
    />
  } 
/>
```

## Параметры

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|--------------|--------------|----------|
| `desktopComponent` | React.Component | Да | - | Компонент для десктопной версии |
| `mobileComponent` | React.Component | Нет | - | Компонент для мобильной версии |
| `breakpoint` | number | Нет | 768 | Точка разрыва в пикселях |
| `...props` | object | Нет | - | Пропсы, передаваемые в выбранный компонент |

## Как создать мобильную версию компонента

1. Создайте новый файл с суффиксом `Mobile.jsx`:
   ```
   ProductManagement.jsx → ProductManagementMobile.jsx
   ```

2. Импортируйте оба компонента в App.jsx:
   ```jsx
   import ProductManagement from './pages/ProductManagement/ProductManagement';
   import ProductManagementMobile from './pages/ProductManagement/ProductManagementMobile';
   ```

3. Используйте ResponsiveRoute в роуте:
   ```jsx
   <Route 
     path="/business/:business_slug/products" 
     element={
       <ResponsiveRoute 
         desktopComponent={ProductManagement}
         mobileComponent={ProductManagementMobile}
       />
     } 
   />
   ```

## Хук useIsMobile

Хук `useIsMobile` можно использовать напрямую в компонентах:

```jsx
import { useIsMobile } from '../hooks/useIsMobile';

const MyComponent = () => {
  const isMobile = useIsMobile(768);
  
  return (
    <div>
      {isMobile ? (
        <div>Мобильная версия</div>
      ) : (
        <div>Десктопная версия</div>
      )}
    </div>
  );
};
```

## Примеры

### Полный пример роута с адаптивностью
```jsx
// App.jsx
import ProductManagement from './pages/ProductManagement/ProductManagement';
import ProductManagementMobile from './pages/ProductManagement/ProductManagementMobile';
import ResponsiveRoute from './components/ResponsiveRoute/ResponsiveRoute';

// В Routes
<Route 
  path="/business/:business_slug/products" 
  element={
    <ResponsiveRoute 
      desktopComponent={ProductManagement}
      mobileComponent={ProductManagementMobile}
    />
  } 
/>
```

### Использование с разными breakpoint'ами
```jsx
// Для планшетов
<ResponsiveRoute 
  desktopComponent={ProductManagement}
  mobileComponent={ProductManagementMobile}
  breakpoint={1024}
/>

// Для больших экранов
<ResponsiveRoute 
  desktopComponent={ProductManagement}
  mobileComponent={ProductManagementMobile}
  breakpoint={1200}
/>
```

