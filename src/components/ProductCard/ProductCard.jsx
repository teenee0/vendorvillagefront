import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductCard.css';

const ProductCard = ({ product }) => {
    const navigate = useNavigate();

    const goToProductPage = () => navigate(`/marketplace/products/${product.id}`);
    
    const handleAddToFavorites = (e) => {
        e.stopPropagation();
        console.log('Add to favorites', product.id);
    };

    const handleAddToCart = (e) => {
        e.stopPropagation();
        console.log('Add to cart', product.id);
    };

    const getImageUrl = (imagePath) => {
        // Если URL уже абсолютный (начинается с http:// или https://)
        if (/^https?:\/\//i.test(imagePath)) {
          return imagePath;
        }
        
        // Если URL начинается с /media/ (Django media files)
        if (imagePath.startsWith('/media/')) {
          return `http://localhost:8000${imagePath}`;
        }
        
        // Если это просто путь без слеша в начале
        if (!imagePath.startsWith('/')) {
          return `http://localhost:8000/media/${imagePath}`;
        }
        
        // По умолчанию добавляем базовый URL
        return `http://localhost:8000${imagePath}`;
      };

    const hasDiscount = product.discount && parseFloat(product.discount) > 0;
    const originalPrice = parseFloat(product.price);
    const discountPrice = hasDiscount 
        ? originalPrice * (1 - parseFloat(product.discount) / 100)
        : originalPrice;

    return (
        <div className="product-card" onClick={goToProductPage}>
            <div className="product-image">
                {product.images?.[0]?.image ? (
                    <img
                        src={getImageUrl(product.images[0].image)}
                        alt={product.name}
                        loading="lazy"
                        className="product-img"
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
                        -{Math.round(parseFloat(product.discount))}%
                    </div>
                )}
            </div>
            <div className="product-list-info">
                <h3 className="product-name">{product.name}</h3>
                <div className="product-price">
                    <span className="current-price">
                        {discountPrice.toLocaleString('ru-RU')} ₽
                    </span>
                    {hasDiscount && (
                        <span className="old-price">
                            {originalPrice.toLocaleString('ru-RU')} ₽
                        </span>
                    )}
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