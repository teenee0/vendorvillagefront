import { useState, useEffect, useRef, useCallback } from 'react';
import axios from '../api/axiosDefault';
import {
  buildMainPageProductsUrl,
  MAIN_PAGE_PRODUCTS_PAGE_SIZE,
} from '../config/mainPage';

/**
 * Товары главной маркетплейса с пагинацией по API (page, has_next).
 */
export function useMainPageProductsInfinite() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasNext, setHasNext] = useState(true);

  const pageRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const hasNextRef = useRef(true);

  const loadPage = useCallback(async (page, append) => {
    if (append) {
      if (loadingMoreRef.current || !hasNextRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const res = await axios.get(buildMainPageProductsUrl(page));
      const list = res.data.products || [];
      let next = res.data.has_next;
      if (next === undefined || next === null) {
        next = list.length >= MAIN_PAGE_PRODUCTS_PAGE_SIZE;
      } else {
        next = Boolean(next);
      }

      pageRef.current = page;
      hasNextRef.current = next;
      setHasNext(next);

      setProducts((prev) => {
        if (!append) return list;
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...list.filter((p) => !ids.has(p.id))];
      });
    } catch (err) {
      console.error('Ошибка загрузки товаров:', err);
      setError(err.message || 'Произошла ошибка при загрузке товаров');
      if (!append) {
        setProducts([]);
        hasNextRef.current = false;
        setHasNext(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, []);

  useEffect(() => {
    pageRef.current = 0;
    hasNextRef.current = true;
    setHasNext(true);
    loadPage(1, false);
  }, [loadPage]);

  const loadMore = useCallback(() => {
    loadPage(pageRef.current + 1, true);
  }, [loadPage]);

  return {
    products,
    loading,
    loadingMore,
    error,
    hasNext,
    loadMore,
  };
}
