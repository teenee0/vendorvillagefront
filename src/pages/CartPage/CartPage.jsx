import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import CartPageDesktop from './CartPageDesktop';
import CartPageMobile from './CartPageMobile';

function CartPage() {
  const isMobile = useIsMobile();
  return isMobile ? <CartPageMobile /> : <CartPageDesktop />;
}

export default CartPage;
