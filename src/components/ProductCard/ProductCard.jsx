import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../../utils/getImageUrl';
import { useEnvironment } from '../../hooks/useEnvironment';
import './ProductCard.css';

const ProductCard = ({ product }) => {
    const navigate = useNavigate();
    const { logger } = useEnvironment();

    const goToProductPage = () => navigate(`/marketplace/products/${product.id}`);
    
    const handleAddToFavorites = (e) => {
        e.stopPropagation();
        logger.debug('Add to favorites', product.id);
    };

    const handleAddToCart = (e) => {
        e.stopPropagation();
        logger.debug('Add to cart', product.id);
    };

    const variant = product.default_variant;
    const mainImage = product.main_image;
    
    const hasDiscount = variant && parseFloat(variant.discount) > 0;
    const currentPrice = variant?.current_price || product.min_price;
    const originalPrice = parseFloat(variant?.price || product.min_price);
    const priceRange = product.min_price !== product.max_price 
        ? `${product.min_price.toLocaleString('ru-RU')} - ${product.max_price.toLocaleString('ru-RU')} ₸`
        : null;

    return (
        <div className="product-card" onClick={goToProductPage}>
            <div className="product-image">
                {mainImage?.image ? (
                    <img
                        src={getImageUrl(mainImage.image)}
                        alt={product.name}
                        loading="lazy"
                        className="product-img"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/200x200?text=No+Image';
                        }}
                    />
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
                    {product.business_name}
                </div>
                
                <button
                    className="add-to-cart-button"
                    onClick={handleAddToCart}
                    aria-label="Добавить в корзину"
                >
                    В корзину
                </button>
            </div>
        </div>
    );
};

export default ProductCard;