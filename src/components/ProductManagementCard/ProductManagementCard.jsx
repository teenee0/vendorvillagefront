import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ProductManagementCard.module.css';
import { getImageUrl } from '../../utils/getImageUrl';
// import '../ProductCard/ProductCard.css';

const ProductManagementCard = ({ product, businessSlug, onToggleStatus, onDelete }) => {
    const navigate = useNavigate();
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    const mainImage = product.main_image;

    // Сбрасываем состояние загрузки при смене изображения
    useEffect(() => {
        if (mainImage?.image) {
            setImageLoading(true);
            setImageError(false);
        }
    }, [mainImage?.image]);

    const handleCardClick = () => {
        navigate(`/business/${businessSlug}/products/${product.id}/`);
    };
    
    const handleButtonClick = (e, action) => {
        e.stopPropagation();
        action();
    };

    const variant = product.default_variant;
    const currentPrice = variant?.min_price || product.min_price;
    const priceRange = product.min_price !== product.max_price 
        ? `${product.min_price.toLocaleString('ru-RU')} - ${product.max_price.toLocaleString('ru-RU')} ₸`
        : null;
    const totalAvailable =
        product.total_available_quantity ??
        product.stock_info?.total_available ??
        0;

    return (
        <div className={`product-card ${styles.card}`} onClick={handleCardClick}>
            <div className={styles.imageContainer}>
                {mainImage?.image && !imageError ? (
                    <>
                        {imageLoading && (
                            <div className={styles.imageSkeleton}>
                                <div className={styles.skeletonShimmer}></div>
                            </div>
                        )}
                    <img
                        src={getImageUrl(mainImage.image)}
                        alt={product.name}
                        loading="lazy"
                            className={`product-img ${styles.image} ${imageLoading ? styles.imageHidden : styles.imageVisible}`}
                            onLoad={() => setImageLoading(false)}
                        onError={(e) => {
                            e.target.onerror = null;
                                setImageError(true);
                                setImageLoading(false);
                        }}
                    />
                    </>
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
                {product.is_bound_to_locations === false && (
                    <div className={styles.unboundBadge}>
                        Не привязан к локациям
                    </div>
                )}
            </div>
            
            <div className={`product-list-info ${styles.infoContainer}`}>
                <div className={`price-section ${styles.priceSection}`}>
                    {currentPrice ? (
                        <>
                            <div className={`current-price ${styles.currentPrice}`}>
                                {parseFloat(currentPrice).toLocaleString('ru-RU')} ₸
                            </div>
                            {priceRange && (
                                <div className={`price-range ${styles.priceRange}`}>
                                    {priceRange}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={styles.noPrice}>
                            Цена не установлена
                        </div>
                    )}
                </div>
                
                <h3 className={`product-name ${styles.productName}`}>{product.name}</h3>
                {product.is_bound_to_locations === false && (
                    <div className={styles.unboundLabel}>
                        Не привязан к локациям
                    </div>
                )}
                
                <div className={`business-name ${styles.businessName}`}>
                    {product.business_name}
                </div>
                
                {/* Available stock quantity */}
                <div className={`${styles.stockInfo} ${totalAvailable > 0 ? styles.inStock : styles.noStock}`}>
                    <span className={styles.stockLabel}>В наличии:</span>
                    <span className={styles.stockValue}>
                        {totalAvailable} {product.unit_display || 'шт.'}
                    </span>
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
