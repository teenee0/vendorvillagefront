import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFileUtils } from '../../hooks/useFileUtils';
import { useEnvironment } from '../../hooks/useEnvironment';
import { useCart } from '../../contexts/CartContext';
import { notification } from 'antd';
import AuthRequiredForCartModal from '../AuthRequiredForCartModal/AuthRequiredForCartModal';
import './ProductCard.css';

const ProductCard = ({ product }) => {
    const navigate = useNavigate();
    const { getImageUrl } = useFileUtils();
    const { logger } = useEnvironment();
    const { addToCart } = useCart();
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [cartAdded, setCartAdded] = useState(false);
    const [cartLoading, setCartLoading] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(false);

    const goToProductPage = () => navigate(`/marketplace/products/${product.id}`);
    
    const handleAddToFavorites = (e) => {
        e.stopPropagation();
        logger.debug('Add to favorites', product.id);
    };

    const handleAddToCart = async (e) => {
        e.stopPropagation();
        const variant = product.default_variant;
        if (!variant) {
            navigate(`/marketplace/products/${product.id}`);
            return;
        }

        // Ищем первую доступную локацию с location_price_id
        const locations = variant.locations || [];
        const available = locations.find(loc => loc.quantity > 0 && loc.location_price_id);

        // Если нет доступных локаций или нет location_price_id — идём на страницу товара
        if (!available) {
            navigate(`/marketplace/products/${product.id}`);
            return;
        }

        setCartLoading(true);
        const result = await addToCart(variant.id, available.location_price_id, 1);
        setCartLoading(false);

        if (result.success) {
            setCartAdded(true);
            notification.success({ message: 'Товар добавлен в корзину', duration: 2 });
            setTimeout(() => setCartAdded(false), 2500);
        } else if (result.error?.includes('401') || result.error?.includes('403') || result.error?.includes('авториз')) {
            setAuthModalOpen(true);
        } else {
            // Ошибка — переходим на страницу товара для выбора
            navigate(`/marketplace/products/${product.id}`);
        }
    };

    const variant = product.default_variant;
    const mainImage = product.main_image;

    // Сбрасываем состояние загрузки при смене изображения
    useEffect(() => {
        if (mainImage?.image) {
            const imageUrl = getImageUrl(mainImage.image);
            const img = new Image();
            
            // Проверяем, загружено ли изображение уже в кэше браузера
            img.onload = () => {
                setImageLoading(false);
                setImageError(false);
            };
            
            img.onerror = () => {
                setImageError(true);
                setImageLoading(false);
            };
            
            // Устанавливаем src - если изображение в кэше, complete будет true сразу
            img.src = imageUrl;
            
            // Если изображение уже загружено в кэше, сразу скрываем скелетон
            if (img.complete) {
                setImageLoading(false);
                setImageError(false);
            } else {
                // Иначе показываем скелетон пока загружается
                setImageLoading(true);
                setImageError(false);
            }
        } else {
            setImageLoading(false);
            setImageError(false);
        }
    }, [mainImage?.image, getImageUrl]);
    
    const hasDiscount = variant && parseFloat(variant.discount) > 0;
    const minP = Number(product.min_price);
    const maxP = Number(product.max_price);
    const currentPrice = variant?.current_price ?? minP;
    const hasPriceRange =
        Number.isFinite(minP) &&
        Number.isFinite(maxP) &&
        Math.abs(minP - maxP) > 0.0001;
    const priceRange = hasPriceRange
        ? `${minP.toLocaleString('ru-RU')} - ${maxP.toLocaleString('ru-RU')} ₸`
        : null;

    return (
        <Fragment>
        <div className="product-card" onClick={goToProductPage}>
            <div className="product-image">
                {mainImage?.image && !imageError ? (
                    <>
                        {imageLoading && (
                            <div className="image-skeleton">
                                <div className="skeleton-shimmer"></div>
                            </div>
                        )}
                        <img
                            src={getImageUrl(mainImage.image)}
                            alt={product.name}
                            loading="lazy"
                            className={`product-img ${imageLoading ? 'image-hidden' : 'image-visible'}`}
                            onLoad={() => setImageLoading(false)}
                            onError={(e) => {
                                e.target.onerror = null;
                                setImageError(true);
                                setImageLoading(false);
                            }}
                        />
                    </>
                ) : (
                    <div className="no-image" aria-hidden="true">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M4 16L8.5 10.5L11 13.5L14.5 9L20 16M4 16H20M4 16V4H20V16" strokeWidth="1.5" />
                        </svg>
                    </div>
                )}
                <button
                    className="favorite-button"
                    onClick={handleAddToFavorites}
                    aria-label="Добавить в избранное"
                >
                    ♡
                </button>
                {hasDiscount && (
                    <div className="discount-badge">
                        -{Math.round(parseFloat(variant.discount))}%
                    </div>
                )}
            </div>
            <div className="product-list-info">
                <div className="price-section">
                    <div className="current-price">
                        {parseFloat(currentPrice).toLocaleString('ru-RU')} ₸
                    </div>
                    {priceRange && (
                        <div className="price-range">
                            {priceRange}
                        </div>
                    )}
                </div>
                
                <h3 className="product-name">{product.name}</h3>
                
                <div className="business-name">
                    <span>{product.business_name}</span>
                    {product.business_logo && (
                        <img
                            src={getImageUrl(product.business_logo)}
                            alt=""
                            aria-hidden="true"
                            className="business-logo"
                        />
                    )}
                </div>
                
                <button
                    className={`add-to-cart-button${cartAdded ? ' add-to-cart-button--added' : ''}`}
                    onClick={handleAddToCart}
                    disabled={cartLoading}
                    aria-label="Добавить в корзину"
                >
                    {cartLoading ? '...' : cartAdded ? '✓ Добавлено' : 'В корзину'}
                </button>
            </div>
        </div>
        <AuthRequiredForCartModal
            open={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            redirectPath={`/marketplace/products/${product.id}`}
        />
        </Fragment>
    );
};

export default ProductCard;