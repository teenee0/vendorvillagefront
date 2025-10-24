# MobileDock Component

Мобильная док-панель для навигации в приложении VendorVillage с полной совместимостью с обычным Dock компонентом.

## Использование

### Базовое использование

```jsx
import MobileDock from './components/MobileDock/MobileDock';

function App() {
  return (
    <div className="App">
      {/* Ваш контент */}
      <MobileDock />
    </div>
  );
}
```

### Кастомизация конфигурации

```jsx
import MobileDock from './components/MobileDock/MobileDock';

const customItems = [
  { 
    icon: <div>🏠</div>, 
    label: 'Главная', 
    onClick: () => navigate('/main'),
    isActive: true 
  },
  { 
    icon: <div>📦</div>, 
    label: 'Товары', 
    onClick: () => navigate('/products'),
    isActive: false 
  }
];

function App() {
  return (
    <div className="App">
      <MobileDock 
        items={customItems}
        topBoxText="📍 По всем точкам\nВсе локации"
        onNavigate={(item) => console.log('Навигация к:', item.label)}
      />
    </div>
  );
}
```

## Props

| Prop | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `items` | Array | Предустановленная конфигурация | Массив объектов с конфигурацией иконок |
| `topBoxText` | String | "📍 По всем точкам\nВсе локации" | Текст в верхнем блоке |
| `onNavigate` | Function | null | Кастомная функция навигации |
| `className` | String | "" | Дополнительные CSS классы |
| `spring` | Object | { mass: 0.1, stiffness: 150, damping: 12 } | Настройки анимации |
| `magnification` | Number | 70 | Увеличение при наведении |
| `distance` | Number | 200 | Дистанция для эффектов |
| `panelHeight` | Number | 68 | Высота панели |
| `dockHeight` | Number | 256 | Высота док-панели |
| `baseItemSize` | Number | 50 | Базовый размер элементов |

## Структура items

```javascript
{
  icon: <div>🏠</div>,  // JSX элемент или строка
  label: 'Главная',     // Подпись
  onClick: () => {},    // Функция клика
  isActive: false       // Активна ли иконка
}
```

## API методы

Компонент предоставляет следующие методы через ref:

- `updateDockConfig(newConfig)` - Обновить всю конфигурацию
- `addDockItem(item)` - Добавить новую иконку
- `removeDockItem(route)` - Удалить иконку по маршруту
- `setActiveDockItem(route)` - Установить активную иконку
- `handleNavigate(item)` - Программная навигация

## Совместимость с Dock

MobileDock полностью совместим с обычным Dock компонентом и принимает те же props:

```jsx
// Оба компонента работают с одинаковыми props
<Dock items={items} panelHeight={68} baseItemSize={50} magnification={70} />
<MobileDock items={items} panelHeight={68} baseItemSize={50} magnification={70} />
```

## Стили

Компонент использует CSS модули для изоляции стилей. Все классы имеют префикс компонента.

## Анимации

- Плавное появление док-панели
- Эффекты при наведении
- Анимация клика
- Пульсация для уведомлений (класс `.notification`)

## Мобильная оптимизация

Компонент автоматически адаптируется под мобильные устройства с помощью медиа-запросов.

## Интеграция с BusinessFooter

MobileDock автоматически используется в BusinessFooter на мобильных устройствах:

```jsx
// BusinessFooter автоматически выбирает MobileDock на мобильных устройствах
<BusinessFooter /> // На мобильных покажет MobileDock, на десктопе - Dock
```