import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from "../../api/axiosDefault.js";

export const useProductsPage = () => {
  const { pk } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('-id');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [expandedFilters, setExpandedFilters] = useState({});
  const [tempFilters, setTempFilters] = useState({});
  const [visibleFiltersCount, setVisibleFiltersCount] = useState(2);
  const [showAllSubcategories, setShowAllSubcategories] = useState(false);

  // Инициализация параметров из URL
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    setSearchQuery(queryParams.get('search') || '');
    setSortOption(queryParams.get('sort') || '-id');
    setPriceMin(queryParams.get('price_min') || '');
    setPriceMax(queryParams.get('price_max') || '');

    const initialFilters = {};
    queryParams.forEach((value, key) => {
      if (key.startsWith('attr_')) {
        initialFilters[key] = initialFilters[key] || [];
        initialFilters[key].push(value);
      }
    });
    setTempFilters(initialFilters);
  }, [location.search]);

  // Загрузка товаров с учетом фильтров
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams(location.search);
  
        if (!queryParams.has('sort')) {
          queryParams.set('sort', '-id');
        }
  
        const response = await axios.get(
          `marketplace/api/categories/${pk}/products/?${queryParams.toString()}`
        );
  
        setData(response.data.oldData);
        
        const filtersData = Array.isArray(response.data.filters?.filters) 
          ? response.data.filters.filters 
          : [];
        setFilters(filtersData);
  
        const initialExpanded = {};
        filtersData.forEach(filter => {
          initialExpanded[filter.id] = true;
        });
        setExpandedFilters(initialExpanded);
  
      } catch (err) {
        console.error('Ошибка загрузки:', err);
        setError(err.message || 'Произошла ошибка при загрузке данных');
      } finally {
        setLoading(false);
        setFiltersLoading(false);
      }
    };
  
    fetchData();
  }, [pk, location.search]);

  // Обработчик выбора атрибута
  const handleAttributeSelect = (filterId, value) => {
    setTempFilters(prev => {
      const newFilters = { ...prev };
      const attrKey = `attr_${filterId}`;

      if (!newFilters[attrKey]) {
        newFilters[attrKey] = [];
      }

      const valueStr = value.toString();
      const index = newFilters[attrKey].indexOf(valueStr);

      if (index === -1) {
        newFilters[attrKey] = [...newFilters[attrKey], valueStr];
      } else {
        newFilters[attrKey] = newFilters[attrKey].filter(v => v !== valueStr);
        if (newFilters[attrKey].length === 0) {
          delete newFilters[attrKey];
        }
      }

      return newFilters;
    });
  };

  // Функция проверки, выбран ли атрибут
  const isAttributeSelected = (filterId, value) => {
    const attrKey = `attr_${filterId}`;
    return tempFilters[attrKey]?.includes(value.toString()) || false;
  };

  // Применение всех фильтров
  const applyFilters = () => {
    const queryParams = new URLSearchParams();

    if (searchQuery) queryParams.set('search', searchQuery);
    if (priceMin) queryParams.set('price_min', priceMin);
    if (priceMax) queryParams.set('price_max', priceMax);
    queryParams.set('sort', sortOption);
    queryParams.set('page', 1);

    Object.entries(tempFilters).forEach(([key, values]) => {
      values.forEach(value => {
        queryParams.append(key, value);
      });
    });

    navigate(`?${queryParams.toString()}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    applyFilters();
  };

  const handlePageChange = (page) => {
    const queryParams = new URLSearchParams(location.search);
    queryParams.set('page', page);
    navigate(`?${queryParams.toString()}`);
    window.scrollTo(0, 0);
  };

  const handleSortChange = (e) => {
    const newSortOption = e.target.value;
    setSortOption(newSortOption);
    const queryParams = new URLSearchParams(location.search);
    queryParams.set('sort', newSortOption);
    queryParams.set('page', 1);
    navigate(`?${queryParams.toString()}`);
  };

  const toggleFilter = (filterId) => {
    setExpandedFilters(prev => ({
      ...prev,
      [filterId]: !prev[filterId]
    }));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setPriceMin('');
    setPriceMax('');
    setSortOption('-id');
    setTempFilters({});
    navigate(`/marketplace/categories/${pk}/products/`);
  };

  const resetFilterCategory = (filterId) => {
    setTempFilters(prev => {
      const newFilters = { ...prev };
      const attrKey = `attr_${filterId}`;
      delete newFilters[attrKey];
      return newFilters;
    });
  };

  const generatePaginationItems = (currentPage, totalPages) => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return {
    data,
    filters,
    loading,
    filtersLoading,
    error,
    searchQuery,
    setSearchQuery,
    sortOption,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    expandedFilters,
    setExpandedFilters,
    tempFilters,
    visibleFiltersCount,
    setVisibleFiltersCount,
    showAllSubcategories,
    setShowAllSubcategories,
    handleAttributeSelect,
    isAttributeSelected,
    applyFilters,
    handleSearch,
    handlePageChange,
    handleSortChange,
    toggleFilter,
    resetFilters,
    resetFilterCategory,
    generatePaginationItems,
    pk,
    navigate,
    location
  };
};

