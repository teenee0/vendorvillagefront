import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const PAGE_SIZE = 12;

/** Собирает params для search API из searchParams.
 *  attr_* параметры передаются напрямую — бэкенд умеет их разбирать через _build_attribute_filters_from_request.
 *  Это гарантирует корректный запрос даже при первой загрузке страницы (когда data ещё null).
 */
export function buildSearchParams(searchParams, filters = []) {
  const q = searchParams.get('q') || '';
  const categoryId = searchParams.get('category_id');
  const priceMin = searchParams.get('price_min');
  const priceMax = searchParams.get('price_max');
  const page = searchParams.get('page') || '1';

  const sort = searchParams.get('sort') || '';
  const params = { q: q.trim(), page, page_size: PAGE_SIZE };
  if (sort) params.sort = sort;
  if (categoryId) params.category_id = categoryId;
  if (priceMin) params.price_min = priceMin;
  if (priceMax) params.price_max = priceMax;

  // Передаём attr_* напрямую (backend обрабатывает через _build_attribute_filters_from_request)
  const attrArrays = {};
  searchParams.forEach((value, key) => {
    if (!key.startsWith('attr_')) return;
    if (!attrArrays[key]) attrArrays[key] = [];
    attrArrays[key].push(value);
  });
  Object.assign(params, attrArrays);

  return params;
}

/** Парсит tempFilters из URL (attr_* ) */
export function getTempFiltersFromSearchParams(searchParams) {
  const temp = {};
  searchParams.forEach((value, key) => {
    if (!key.startsWith('attr_')) return;
    const attrKey = key;
    if (!temp[attrKey]) temp[attrKey] = [];
    temp[attrKey].push(value);
  });
  return temp;
}

export function useSearchFilters() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const q = searchParams.get('q') || '';
  const categoryIdParam = searchParams.get('category_id');
  const priceMinParam = searchParams.get('price_min');
  const priceMaxParam = searchParams.get('price_max');

  const [tempFilters, setTempFilters] = useState(() => getTempFiltersFromSearchParams(searchParams));
  const [priceMin, setPriceMin] = useState(priceMinParam || '');
  const [priceMax, setPriceMax] = useState(priceMaxParam || '');
  const [expandedFilters, setExpandedFilters] = useState({});
  const [visibleFiltersCount, setVisibleFiltersCount] = useState(2);

  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const sortOption = searchParams.get('sort') || '';

  useEffect(() => {
    setPriceMin(priceMinParam || '');
    setPriceMax(priceMaxParam || '');
    setTempFilters(getTempFiltersFromSearchParams(searchParams));
  }, [searchParams.toString()]);

  const handleAttributeSelect = (filterId, value) => {
    const attrKey = `attr_${filterId}`;
    const valueStr = value.toString();

    const next = { ...tempFilters };
    if (!next[attrKey]) next[attrKey] = [];
    const idx = next[attrKey].indexOf(valueStr);
    if (idx === -1) next[attrKey] = [...next[attrKey], valueStr];
    else {
      next[attrKey] = next[attrKey].filter((v) => v !== valueStr);
      if (next[attrKey].length === 0) delete next[attrKey];
    }

    // Немедленно применяем через navigate
    const params = new URLSearchParams(searchParams);
    if (categoryIdParam) params.set('category_id', categoryIdParam);
    if (priceMin) params.set('price_min', priceMin);
    else params.delete('price_min');
    if (priceMax) params.set('price_max', priceMax);
    else params.delete('price_max');
    params.set('page', '1');
    params.forEach((_, key) => {
      if (key.startsWith('attr_')) params.delete(key);
    });
    Object.entries(next).forEach(([key, values]) => {
      (values || []).forEach((v) => params.append(key, v));
    });
    navigate({ pathname: '/marketplace/search', search: params.toString() });
  };

  const isAttributeSelected = (filterId, value) => {
    const attrKey = `attr_${filterId}`;
    const arr = tempFilters[attrKey];
    return arr ? arr.includes(value.toString()) : false;
  };

  const toggleFilter = (filterId) => {
    setExpandedFilters((prev) => ({ ...prev, [filterId]: !prev[filterId] }));
  };

  const resetFilterCategory = (filterId) => {
    setTempFilters((prev) => {
      const next = { ...prev };
      delete next[`attr_${filterId}`];
      return next;
    });
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams);
    if (categoryIdParam) params.set('category_id', categoryIdParam);
    if (priceMin) params.set('price_min', priceMin);
    else params.delete('price_min');
    if (priceMax) params.set('price_max', priceMax);
    else params.delete('price_max');
    if (sortOption) params.set('sort', sortOption);
    params.set('page', '1');
    params.forEach((_, key) => {
      if (key.startsWith('attr_')) params.delete(key);
    });
    Object.entries(tempFilters).forEach(([key, values]) => {
      (values || []).forEach((v) => params.append(key, v));
    });
    navigate({ pathname: '/marketplace/search', search: params.toString() });
  };

  const handleSortChange = (newSort) => {
    const params = new URLSearchParams(searchParams);
    if (newSort) params.set('sort', newSort);
    else params.delete('sort');
    params.set('page', '1');
    navigate({ pathname: '/marketplace/search', search: params.toString() });
  };

  const resetFilters = () => {
    setPriceMin('');
    setPriceMax('');
    setTempFilters({});
    const params = new URLSearchParams(searchParams);
    params.delete('category_id');
    params.delete('price_min');
    params.delete('price_max');
    params.delete('sort');
    params.set('page', '1');
    params.forEach((_, key) => {
      if (key.startsWith('attr_')) params.delete(key);
    });
    navigate({ pathname: '/marketplace/search', search: params.toString() });
  };

  return {
    q,
    page,
    sortOption,
    handleSortChange,
    categoryId: categoryIdParam,
    tempFilters,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    expandedFilters,
    visibleFiltersCount,
    setVisibleFiltersCount,
    handleAttributeSelect,
    isAttributeSelected,
    toggleFilter,
    resetFilterCategory,
    applyFilters,
    resetFilters,
    buildSearchParams,
  };
}
