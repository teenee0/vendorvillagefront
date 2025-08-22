import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X, Tag, Loader2 } from 'lucide-react';

const CascadedCategoryPicker = ({ categories, categoryTree, categoryLookup, onCategoryChange, isLoading, error }) => {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchQueries, setSearchQueries] = useState([]);
  const [openDropdowns, setOpenDropdowns] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const dropdownRefs = useRef([]);

  // Обновляем текущий уровень категорий при изменении categoryTree
  useEffect(() => {
    updateFilteredOptions();
  }, [categoryTree, searchQueries, selectedCategories]);

  // Обновляем отфильтрованные опции
  const updateFilteredOptions = () => {
    const newFilteredOptions = [];
    let currentCategories = categoryTree;

    // Для каждого уровня создаем отфильтрованный список
    selectedCategories.forEach((catId, index) => {
      const query = searchQueries[index] || '';
      const filtered = currentCategories.filter(cat =>
        cat.name.toLowerCase().includes(query.toLowerCase())
      );
      newFilteredOptions[index] = filtered;
      
      const category = categoryLookup[catId];
      currentCategories = category ? category.children || [] : [];
    });

    // Добавляем следующий уровень если есть категории
    if (currentCategories.length > 0) {
      const nextIndex = selectedCategories.length;
      const query = searchQueries[nextIndex] || '';
      const filtered = currentCategories.filter(cat =>
        cat.name.toLowerCase().includes(query.toLowerCase())
      );
      newFilteredOptions[nextIndex] = filtered;
    }

    setFilteredOptions(newFilteredOptions);
  };

  // Обработка выбора категории
  const handleCategorySelect = (level, categoryId) => {
    const newSelectedCategories = selectedCategories.slice(0, level);
    if (categoryId) {
      newSelectedCategories.push(categoryId);
    }
    
    setSelectedCategories(newSelectedCategories);
    
    // Очищаем поисковые запросы для следующих уровней
    const newSearchQueries = searchQueries.slice(0, level + 1);
    setSearchQueries(newSearchQueries);
    
    // Закрываем dropdown
    const newOpenDropdowns = openDropdowns.filter(index => index !== level);
    setOpenDropdowns(newOpenDropdowns);
    
    // Вызываем колбэк
    onCategoryChange(categoryId || '');
  };

  // Обработка поискового запроса
  const handleSearchChange = (level, query) => {
    const newSearchQueries = [...searchQueries];
    newSearchQueries[level] = query;
    setSearchQueries(newSearchQueries);
  };

  // Переключение dropdown
  const toggleDropdown = (level) => {
    const isOpen = openDropdowns.includes(level);
    if (isOpen) {
      setOpenDropdowns(prev => prev.filter(index => index !== level));
    } else {
      setOpenDropdowns(prev => [...prev, level]);
    }
  };

  // Очистка выбора с определенного уровня
  const clearFromLevel = (level) => {
    const newSelectedCategories = selectedCategories.slice(0, level);
    setSelectedCategories(newSelectedCategories);
    
    const newSearchQueries = searchQueries.slice(0, level);
    setSearchQueries(newSearchQueries);
    
    onCategoryChange(newSelectedCategories[newSelectedCategories.length - 1] || '');
  };

  // Получение пути категории
  const getCategoryPath = () => {
    return selectedCategories.map(catId => categoryLookup[catId]).filter(Boolean);
  };

  // Рендер dropdown для уровня
  const renderDropdown = (level) => {
    const currentOptions = filteredOptions[level] || [];
    const selectedCategoryId = selectedCategories[level];
    const selectedCategory = selectedCategoryId ? categoryLookup[selectedCategoryId] : null;
    const searchQuery = searchQueries[level] || '';
    const isOpen = openDropdowns.includes(level);
    const placeholder = level === 0 ? 'Выберите категорию' : 'Выберите подкategорию';

    return (
      <div key={level} className="relative">
        {/* Кнопка выбора */}
        <button
          onClick={() => toggleDropdown(level)}
          className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:border-blue-300 focus:border-blue-500 focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <span className={selectedCategory ? 'text-gray-900 font-medium' : 'text-gray-500'}>
            {selectedCategory ? selectedCategory.name : placeholder}
          </span>
          <div className="flex items-center gap-2">
            {selectedCategory && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFromLevel(level);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
            )}
            <ChevronDown 
              size={20} 
              className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* Dropdown меню */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-80 overflow-hidden">
            {/* Поиск */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск категорий..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(level, e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange(level, '')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Список категорий */}
            <div className="max-h-60 overflow-y-auto">
              {currentOptions.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchQuery ? 'Ничего не найдено' : 'Нет доступных категорий'}
                </div>
              ) : (
                currentOptions.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(level, category.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                      category.id === selectedCategoryId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-gray-400" />
                      <span>{category.name}</span>
                      {category.children && category.children.length > 0 && (
                        <span className="text-xs text-gray-400 ml-auto">
                          ({category.children.length})
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Определяем количество уровней для отображения
  const getDropdownLevels = () => {
    const levels = [];
    let currentCategories = categoryTree;

    // Добавляем уровни для выбранных категорий
    selectedCategories.forEach((catId, index) => {
      levels.push(index);
      const category = categoryLookup[catId];
      currentCategories = category ? category.children || [] : [];
    });

    // Добавляем следующий уровень если есть категории
    if (currentCategories.length > 0) {
      levels.push(selectedCategories.length);
    }

    return levels;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={24} className="animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Загрузка категорий...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Ошибка загрузки категорий: {error}</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600">Нет доступных категорий</p>
      </div>
    );
  }

  const categoryPath = getCategoryPath();
  const dropdownLevels = getDropdownLevels();

  return (
    <div className="space-y-6">
      {/* Хлебные крошки */}
      {categoryPath.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
          <Tag size={16} className="text-gray-400" />
          <span>Путь:</span>
          {categoryPath.map((category, index) => (
            <span key={category.id} className="flex items-center gap-2">
              {index > 0 && <span className="text-gray-400">→</span>}
              <span className="font-medium text-blue-600">{category.name}</span>
            </span>
          ))}
        </div>
      )}

      {/* Dropdowns */}
      <div className="space-y-4">
        {dropdownLevels.map(level => renderDropdown(level))}
      </div>

      {/* Информация о выбранной категории */}
      {selectedCategories.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Tag size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">
                Выбранная категория
              </h4>
              <p className="text-blue-700">
                {categoryPath[categoryPath.length - 1]?.name}
              </p>
              {categoryPath.length > 1 && (
                <p className="text-sm text-blue-600 mt-1">
                  в категории: {categoryPath.slice(0, -1).map(cat => cat.name).join(' → ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CascadedCategoryPicker;