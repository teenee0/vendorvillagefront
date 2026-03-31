import React, { useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import CartPageDesktop from './CartPageDesktop';
import CartPageMobile from './CartPageMobile';

function CartPage() {
  const { fetchCart } = useCart();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return isMobile ? <CartPageMobile /> : <CartPageDesktop />;
}

export default CartPage;
