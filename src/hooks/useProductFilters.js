import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useProductFilters = (initialFilters = {}) => {
  const location = useLocation();
  const [filters, setFilters] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [expandedFilters, setExpandedFilters] = useState({});
  const [tempFilters, setTempFilters] = useState(initialFilters);
  const [visibleFiltersCount, setVisibleFiltersCount] = useState(2);

  // Синхронизация с URL при монтировании
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const newFilters = {};
    
    queryParams.forEach((value, key) => {
      if (key.startsWith('attr_')) {
        newFilters[key] = newFilters[key] || [];
        newFilters[key].push(value);
      }
    });
    
    setTempFilters(newFilters);
  }, [location.search]);

  const handleAttributeSelect = (filterId, value) => {
    setTempFilters(prev => {
      const attrKey = `attr_${filterId}`;
      const newFilters = { ...prev };
      
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

  const isAttributeSelected = (filterId, value) => {
    const attrKey = `attr_${filterId}`;
    return tempFilters[attrKey]?.includes(value.toString()) || false;
  };

  const toggleFilter = (filterId) => {
    setExpandedFilters(prev => ({
      ...prev,
      [filterId]: !prev[filterId]
    }));
  };

  const resetFilters = () => {
    setTempFilters({});
  };

  return {
    filters,
    setFilters,
    filtersLoading,
    setFiltersLoading,
    expandedFilters,
    tempFilters,
    setTempFilters,
    visibleFiltersCount,
    setVisibleFiltersCount,
    handleAttributeSelect,
    isAttributeSelected,
    toggleFilter,
    resetFilters
  };
};