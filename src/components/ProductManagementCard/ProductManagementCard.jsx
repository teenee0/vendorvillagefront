import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ProductManagementCard.module.css';
// import '../ProductCard/ProductCard.css';

const ProductManagementCard = ({ product, businessSlug, onToggleStatus, onDelete }) => {
    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(`/business/${businessSlug}/products/${product.id}/edit`);
    };
    
    const handleButtonClick = (e, action) => {
        e.stopPropagation();
        action();
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return '';
        if (/^https?:\/\//i.test(imagePath)) return imagePath;
        if (imagePath.startsWith('/media/')) return `http://localhost:8000${imagePath}`;
        if (!imagePath.startsWith('/')) return `http://localhost:8000/media/${imagePath}`;
        return `http://localhost:8000${imagePath}`;
    };

    const variant = product.default_variant;
    const mainImage = product.main_image;
    const hasDiscount = variant && parseFloat(variant.discount) > 0;
    const currentPrice = variant?.current_price || product.min_price;
    const priceRange = product.min_price !== product.max_price 
        ? `${product.min_price.toLocaleString('ru-RU')} - ${product.max_price.toLocaleString('ru-RU')} ₽`
        : null;

    return (
        <div className={`product-card ${styles.card}`} onClick={handleCardClick}>
            <div className={`product-image ${styles.imageContainer}`}>
                {mainImage?.image ? (
                    <img
                        src={getImageUrl(mainImage.image)}
                        alt={product.name}
                        loading="lazy"
                        className={`product-img ${styles.image}`}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/200x200?text=No+Image';
                        }}
                    />
                ) : (
                    <div className={`no-image ${styles.noImage}`} aria-hidden="true">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M4 16L8.5 10.5L11 13.5L14.5 9L20 16M4 16H20M4 16V4H20V16" strokeWidth="1.5" />
                        </svg>
                    </div>
                )}
                
                <div className={`${styles.statusBadge} ${product.is_active ? styles.active : styles.inactive}`}>
                    {product.is_active ? 'Активен' : 'Неактивен'}
                </div>
                
                {hasDiscount && (
                    <div className={`discount-badge ${styles.discountBadge}`}>
                        -{Math.round(parseFloat(variant.discount))}%
                    </div>
                )}
            </div>
            
            <div className={`product-list-info ${styles.infoContainer}`}>
                <div className={`price-section ${styles.priceSection}`}>
                    <div className={`current-price ${styles.currentPrice}`}>
                        {parseFloat(currentPrice).toLocaleString('ru-RU')} ₽
                    </div>
                    {priceRange && (
                        <div className={`price-range ${styles.priceRange}`}>
                            {priceRange}
                        </div>
                    )}
                </div>
                
                <h3 className={`product-name ${styles.productName}`}>{product.name}</h3>
                
                <div className={`business-name ${styles.businessName}`}>
                    {product.business_name}
                </div>
                
                <div className={styles.actionButtons}>
                    <button
                        className={styles.editButton}
                        onClick={(e) => handleButtonClick(e, () => 
                            navigate(`/business/${businessSlug}/products/${product.id}/edit`))
                        }
                        title="Редактировать"
                        aria-label="Редактировать товар"
                    >
                        <i className="fas fa-edit"></i>
                        <span className={styles.tooltip}>Редактировать</span>
                    </button>
                    
                    <button
                        className={`${styles.statusButton} ${product.is_active ? styles.deactivate : styles.activate}`}
                        onClick={(e) => handleButtonClick(e, () => 
                            onToggleStatus(product.id, product.is_active))
                        }
                        title={product.is_active ? 'Деактивировать' : 'Активировать'}
                        aria-label={product.is_active ? 'Деактивировать товар' : 'Активировать товар'}
                    >
                        <i className={product.is_active ? 'fas fa-pause' : 'fas fa-play'}></i>
                        <span className={styles.tooltip}>
                            {product.is_active ? 'Деактивировать' : 'Активировать'}
                        </span>
                    </button>
                    
                    <button
                        className={styles.deleteButton}
                        onClick={(e) => handleButtonClick(e, () => onDelete(product.id))}
                        title="Удалить"
                        aria-label="Удалить товар"
                    >
                        <i className="fas fa-trash"></i>
                        <span className={styles.tooltip}>Удалить</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductManagementCard;
