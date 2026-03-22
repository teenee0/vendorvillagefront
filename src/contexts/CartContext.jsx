import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from '../api/axiosDefault';

const CartContext = createContext(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      const res = await axios.get('/api/cart/');
      setCart(res.data);
    } catch {
      // не авторизован — корзина пустая
      setCart(null);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = useCallback(async (variantId, locationPriceId, quantity = 1) => {
    setLoading(true);
    try {
      const res = await axios.post('/api/cart/items/', {
        variant_id: variantId,
        location_price_id: locationPriceId,
        quantity,
      });
      await fetchCart();
      return { success: true, data: res.data };
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        return { success: false, error: '401', status };
      }
      const msg = err.response?.data?.detail || err.response?.data?.location_price_id?.[0] || 'Ошибка добавления в корзину';
      return { success: false, error: msg, status };
    } finally {
      setLoading(false);
    }
  }, [fetchCart]);

  const updateItem = useCallback(async (itemId, quantity) => {
    try {
      await axios.patch(`/api/cart/items/${itemId}/`, { quantity });
      await fetchCart();
    } catch {
      // ignore
    }
  }, [fetchCart]);

  const removeItem = useCallback(async (itemId) => {
    try {
      await axios.delete(`/api/cart/items/${itemId}/delete/`);
      await fetchCart();
    } catch {
      // ignore
    }
  }, [fetchCart]);

  const clearCart = useCallback(async () => {
    try {
      await axios.delete('/api/cart/clear/');
      await fetchCart();
    } catch {
      // ignore
    }
  }, [fetchCart]);

  const itemsCount = cart?.items?.length ?? 0;

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      itemsCount,
      fetchCart,
      addToCart,
      updateItem,
      removeItem,
      clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};
