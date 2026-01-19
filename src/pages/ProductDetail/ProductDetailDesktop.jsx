import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import { useFileUtils } from '../../hooks/useFileUtils';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import ProductCard from '../../components/ProductCard/ProductCard';
import Loader from '../../components/Loader';
import { FaChevronLeft, FaChevronRight, FaChevronUp, FaChevronDown, FaMapMarkerAlt, FaPhone, FaShoppingCart, FaHeart, FaBolt, FaTags, FaStore, FaExternalLinkAlt } from 'react-icons/fa';
import styles from './ProductDetailDesktop.module.css';

const ProductDetailDesktop = () => {
  const { pk } = useParams();
  const navigate = useNavigate();
  const { getFileUrl } = useFileUtils();
  
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [activeTab, setActiveTab] = useState('specs');
  const [slideDirection, setSlideDirection] = useState(null);
  const [previousImageIndex, setPreviousImageIndex] = useState(null);
  const thumbnailGalleryRef = useRef(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`marketplace/api/products/${pk}/`);
        setProductData(response.data);
        
        // Устанавливаем вариант по умолчанию
        if (response.data.product.default_variant) {
          const defaultVariant = response.data.product.default_variant;
          setSelectedVariant(defaultVariant);
          
          // Находим атрибут "Размер" для установки выбранного размера
          const sizeAttribute = defaultVariant.attributes.find(
            attr => attr.attribute_name === 'Размер'
          );
          if (sizeAttribute) {
            setSelectedSize(sizeAttribute.display_value);
          }
          
          // Устанавливаем первую доступную локацию
          if (defaultVariant.locations && defaultVariant.locations.length > 0) {
            setSelectedLocation(defaultVariant.locations[0]);
          }
        }
      } catch (err) {
        setError(err.message || 'Произошла ошибка при загрузке товара');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [pk]);

  // Получаем все доступные размеры из вариантов
  const getAvailableSizes = () => {
    if (!productData) return [];
    
    const sizes = new Map();
    productData.product.variants.forEach(variant => {
      const sizeAttr = variant.attributes.find(attr => attr.attribute_name === 'Размер');
      if (sizeAttr && variant.is_in_stock && variant.locations && variant.locations.length > 0) {
        const sizeValue = sizeAttr.display_value;
        
        // Если размер уже есть, объединяем локации и пересчитываем цены
        if (!sizes.has(sizeValue)) {
          // Вычисляем min и max цены из всех локаций варианта
          const prices = variant.locations.map(loc => parseFloat(loc.price));
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          
          sizes.set(sizeValue, {
            size: sizeValue,
            variant: variant,
            minPrice: minPrice,
            maxPrice: maxPrice,
            locations: variant.locations || []
          });
        } else {
          // Если есть несколько вариантов одного размера, объединяем локации
          const existing = sizes.get(sizeValue);
          const allLocations = [...existing.locations, ...(variant.locations || [])];
          const allPrices = allLocations.map(loc => parseFloat(loc.price));
          const minPrice = Math.min(...allPrices);
          const maxPrice = Math.max(...allPrices);
          
          // Выбираем вариант с большим количеством локаций или лучшей ценой
          if (variant.locations.length > existing.locations.length || 
              Math.min(...variant.locations.map(loc => parseFloat(loc.price))) < existing.minPrice) {
            sizes.set(sizeValue, {
              size: sizeValue,
              variant: variant,
              minPrice: minPrice,
              maxPrice: maxPrice,
              locations: allLocations
            });
          } else {
            sizes.set(sizeValue, {
              ...existing,
              minPrice: minPrice,
              maxPrice: maxPrice,
              locations: allLocations
            });
          }
        }
      }
    });
    
    return Array.from(sizes.values()).sort((a, b) => {
      // Сортируем размеры по порядку (если это числа)
      const aNum = parseFloat(a.size);
      const bNum = parseFloat(b.size);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      // Для буквенных размеров (S, M, L, XL и т.д.)
      return a.size.localeCompare(b.size);
    });
  };

  const handleSizeSelect = (sizeData) => {
    setSelectedSize(sizeData.size);
    setSelectedVariant(sizeData.variant);
    
    // Устанавливаем первую доступную локацию для выбранного размера
    if (sizeData.locations && sizeData.locations.length > 0) {
      setSelectedLocation(sizeData.locations[0]);
    } else {
      setSelectedLocation(null);
    }
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
  };

  const handlePrevImage = () => {
    if (!productData || slideDirection !== null) return;
    const currentIdx = selectedImageIndex;
    const newIdx = currentIdx === 0 ? productData.product.images.length - 1 : currentIdx - 1;
    setPreviousImageIndex(currentIdx);
    setSlideDirection('right');
    setTimeout(() => {
      setSelectedImageIndex(newIdx);
      setTimeout(() => {
        setSlideDirection(null);
        setPreviousImageIndex(null);
      }, 300);
    }, 10);
  };

  const handleNextImage = () => {
    if (!productData || slideDirection !== null) return;
    const currentIdx = selectedImageIndex;
    const newIdx = currentIdx === productData.product.images.length - 1 ? 0 : currentIdx + 1;
    setPreviousImageIndex(currentIdx);
    setSlideDirection('left');
    setTimeout(() => {
      setSelectedImageIndex(newIdx);
      setTimeout(() => {
        setSlideDirection(null);
        setPreviousImageIndex(null);
      }, 300);
    }, 10);
  };

  const scrollThumbnailsUp = () => {
    if (thumbnailGalleryRef.current) {
      thumbnailGalleryRef.current.scrollBy({
        top: -120,
        behavior: 'smooth'
      });
    }
  };

  const scrollThumbnailsDown = () => {
    if (thumbnailGalleryRef.current) {
      thumbnailGalleryRef.current.scrollBy({
        top: 120,
        behavior: 'smooth'
      });
    }
  };

  // Автоматическая прокрутка миниатюр при изменении основного изображения
  useEffect(() => {
    if (thumbnailGalleryRef.current && productData && productData.product.images.length > 1) {
      const thumbnailContainer = thumbnailGalleryRef.current;
      const activeThumbnail = thumbnailContainer.children[selectedImageIndex];
      
      if (activeThumbnail) {
        const containerRect = thumbnailContainer.getBoundingClientRect();
        const thumbnailRect = activeThumbnail.getBoundingClientRect();
        
        // Проверяем, видна ли миниатюра
        const isAboveViewport = thumbnailRect.top < containerRect.top;
        const isBelowViewport = thumbnailRect.bottom > containerRect.bottom;
        
        if (isAboveViewport) {
          // Прокручиваем вверх, чтобы миниатюра была видна
          activeThumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (isBelowViewport) {
          // Прокручиваем вниз, чтобы миниатюра была видна
          activeThumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  }, [selectedImageIndex, productData]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader />
      </div>
    );
  }

  if (error || !productData) {
    return (
      <div className={styles.errorContainer}>
        <p>{error || 'Товар не найден'}</p>
        <button onClick={() => navigate('/marketplace/categories')} className={styles.backButton}>
          Вернуться к каталогу
        </button>
      </div>
    );
  }

  const { product, breadcrumbs, same_products } = productData;
  const availableSizes = getAvailableSizes();
  const currentVariant = selectedVariant || product.default_variant;
  const currentLocations = currentVariant?.locations || [];
  const currentImage = product.images[selectedImageIndex] || product.images[0];

  return (
    <div className={styles.container}>
      <Breadcrumbs breadcrumbs={breadcrumbs} productName={product.name} />
      
      <div className={styles.productLayout}>
        {/* Левая колонка - Галерея */}
        <div className={styles.productGallery}>
          {product.images.length > 1 && (
            <div className={styles.thumbnailContainer}>
              <button 
                className={styles.thumbnailNavButton}
                onClick={scrollThumbnailsUp}
                aria-label="Прокрутить вверх"
              >
                <FaChevronUp />
              </button>
              <div 
                className={styles.thumbnailGallery}
                ref={thumbnailGalleryRef}
              >
                {product.images.map((img, index) => (
                  <div
                    key={img.id}
                    className={`${styles.thumbnail} ${selectedImageIndex === index ? styles.thumbnailActive : ''}`}
                    onClick={() => {
                      if (slideDirection !== null || index === selectedImageIndex) return;
                      const currentIdx = selectedImageIndex;
                      const direction = index > currentIdx ? 'left' : 'right';
                      setPreviousImageIndex(currentIdx);
                      setSlideDirection(direction);
                      setTimeout(() => {
                        setSelectedImageIndex(index);
                        setTimeout(() => {
                          setSlideDirection(null);
                          setPreviousImageIndex(null);
                        }, 300);
                      }, 10);
                    }}
                  >
                    <img 
                      src={getFileUrl(img.image)} 
                      alt={`${product.name} ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
              <button 
                className={styles.thumbnailNavButton}
                onClick={scrollThumbnailsDown}
                aria-label="Прокрутить вниз"
              >
                <FaChevronDown />
              </button>
            </div>
          )}
          
          <div className={styles.mainImage}>
            {product.images.map((img, index) => {
              const isActive = index === selectedImageIndex;
              const isPrevious = index === previousImageIndex;
              const shouldShow = isActive || isPrevious;
              
              if (!shouldShow) return null;
              
              let animationClass = styles.visible;
              if (slideDirection && isPrevious !== null) {
                if (isActive) {
                  // Новое изображение входит
                  animationClass = slideDirection === 'left' ? styles.slideInFromRight : styles.slideInFromLeft;
                } else if (isPrevious) {
                  // Старое изображение выходит
                  animationClass = slideDirection === 'left' ? styles.slideOutToLeft : styles.slideOutToRight;
                }
              }
              
              return (
                <img 
                  key={img.id}
                  src={getFileUrl(img.image)} 
                  alt={product.name}
                  className={`${styles.mainImageImg} ${animationClass}`}
                />
              );
            })}
            {product.images.length > 1 && (
              <div className={styles.galleryControls}>
                <button id="prevImage" onClick={handlePrevImage}>
                  <FaChevronLeft />
                </button>
                <button id="nextImage" onClick={handleNextImage}>
                  <FaChevronRight />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Правая колонка - Информация */}
        <div className={styles.productInfo}>
          <div className={styles.productHeader}>
            <div className={styles.productBrand}>{product.business_name}</div>
            <h1 className={styles.productTitle}>{product.name}</h1>
            {currentVariant?.is_in_stock && (
              <div className={styles.productRating}>
                <span className={styles.inStock}>В наличии ✓</span>
              </div>
            )}
          </div>

          {product.description && (
            <p className={styles.productDescription}>
              {product.description}
            </p>
          )}

          {/* Выбор размера */}
          {availableSizes.length > 0 && (
            <div className={styles.sizesSection}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-ruler"></i> Выберите размер
              </h2>
              <div className={styles.sizeOptions}>
                {availableSizes.map((sizeData) => (
                  <div key={sizeData.size} className={styles.sizeOption}>
                    <input
                      type="radio"
                      name="size"
                      id={`size-${sizeData.size}`}
                      className={styles.sizeRadio}
                      checked={selectedSize === sizeData.size}
                      onChange={() => handleSizeSelect(sizeData)}
                    />
                    <label htmlFor={`size-${sizeData.size}`} className={styles.sizeLabel}>
                      {sizeData.size}
                    </label>
                    <span className={styles.sizePrice}>
                      {sizeData.minPrice === sizeData.maxPrice 
                        ? `${formatPrice(sizeData.minPrice)} ₸`
                        : `${formatPrice(Math.min(sizeData.minPrice, sizeData.maxPrice))} - ${formatPrice(Math.max(sizeData.minPrice, sizeData.maxPrice))} ₸`
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Наличие в магазинах */}
          {currentLocations.length > 0 && (
            <div className={styles.storesSection}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-store"></i> Наличие в магазинах
              </h2>
              <div className={styles.storeList}>
                {currentLocations.map((location) => (
                  <div
                    key={location.id}
                    className={`${styles.storeItem} ${selectedLocation?.id === location.id ? styles.storeItemActive : ''}`}
                    onClick={() => handleLocationSelect(location)}
                  >
                    <div className={styles.storeInfo}>
                      <div className={styles.storeIcon}>
                        {product.business_logo ? (
                          <img 
                            src={getFileUrl(product.business_logo)} 
                            alt={product.business_name}
                            className={styles.storeIconImg}
                          />
                        ) : (
                          location.name.charAt(0)
                        )}
                      </div>
                      <div className={styles.storeDetails}>
                        <h4>{location.name}</h4>
                        <p>
                          <FaMapMarkerAlt className={styles.storeIconSmall} />
                          {location.address}
                        </p>
                        {location.contact_phone && (
                          <p>
                            <FaPhone className={styles.storeIconSmall} />
                            {location.contact_phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={styles.storeActions}>
                      <div className={styles.storePrice}>
                        {formatPrice(location.price)} ₸
                      </div>
                      <button 
                        className={`${styles.selectStoreBtn} ${selectedLocation?.id === location.id ? styles.selectStoreBtnActive : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLocationSelect(location);
                        }}
                      >
                        {selectedLocation?.id === location.id ? '✓ Выбран' : 'Выбрать'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Панель покупки */}
      {selectedVariant && selectedLocation && (
        <div className={styles.purchaseSection}>
          <div className={styles.selectedInfo}>
            <div className={styles.selectedSize}>
              <span>Размер:</span>
              <strong>{selectedSize}</strong>
            </div>
            <div className={styles.selectedStore}>
              <span>Магазин:</span>
              <span>{selectedLocation.name}</span>
            </div>
          </div>
          
          <div className={styles.selectedPrice}>
            {formatPrice(selectedLocation.price)} ₸
          </div>
          
          <div className={styles.actionButtons}>
            <button className={styles.btnPrimary}>
              <FaShoppingCart /> Добавить в корзину
            </button>
            <button className={styles.btnSecondary}>
              <FaBolt /> Купить сейчас
            </button>
          </div>
        </div>
      )}

      {/* Секция магазина */}
      <div className={styles.businessSection}>
        <div className={styles.businessHeader}>
          {product.business_logo && (
            <img 
              src={getFileUrl(product.business_logo)} 
              alt={product.business_name}
              className={styles.businessLogo}
            />
          )}
          <div className={styles.businessInfo}>
            <h3 className={styles.businessName}>{product.business_name}</h3>
            {product.business_description && (
              <p className={styles.businessDescription}>{product.business_description}</p>
            )}
          </div>
        </div>
        
        <div className={styles.businessLinks}>
          <Link 
            to={`/marketplace/categories/${product.category}/products?business=${product.business}`}
            className={styles.businessLink}
          >
            <FaTags /> Товары в этой категории
          </Link>
          {product.business_slug && (
            <Link 
              to={`/business/${product.business_slug}`}
              className={styles.businessLink}
            >
              <FaStore /> Все товары магазина
            </Link>
          )}
          {product.business_slug && (
            <a 
              href={`/business/${product.business_slug}/site`}
              className={styles.businessLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaExternalLinkAlt /> Сайт магазина
            </a>
          )}
        </div>
      </div>

      {/* Табы с дополнительной информацией */}
      <div className={styles.tabsSection}>
        <div className={styles.tabsHeader}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'specs' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('specs')}
          >
            Характеристики
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'reviews' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Отзывы
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'delivery' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('delivery')}
          >
            Доставка и возврат
          </button>
        </div>
        
        <div className={`${styles.tabContent} ${activeTab === 'specs' ? styles.tabContentActive : ''}`}>
          {currentVariant && currentVariant.attributes.length > 0 ? (
            <table className={styles.specsTable}>
              <tbody>
                {currentVariant.attributes.map((attr) => (
                  <tr key={attr.id}>
                    <td>{attr.attribute_name}</td>
                    <td>{attr.display_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Характеристики не указаны</p>
          )}
        </div>
        
        <div className={`${styles.tabContent} ${activeTab === 'reviews' ? styles.tabContentActive : ''}`}>
          <div className={styles.reviews}>
            <p>Отзывов пока нет. Будьте первым!</p>
          </div>
        </div>
        
        <div className={`${styles.tabContent} ${activeTab === 'delivery' ? styles.tabContentActive : ''}`}>
          <p><strong>Доставка:</strong> Доставка осуществляется в течение 1-3 рабочих дней. Бесплатная доставка при заказе от 5000 ₸.</p>
          <p><strong>Самовывоз:</strong> Доступен из пунктов выдачи по всему городу.</p>
          <p><strong>Возврат:</strong> Возврат в течение 14 дней при сохранении товарного вида и упаковки.</p>
        </div>
      </div>

      {/* Похожие товары */}
      {same_products && same_products.length > 0 && (
        <div className={styles.similarProductsSection}>
          <h2 className={styles.similarTitle}>Похожие товары</h2>
          <div className={styles.similarProductsGrid}>
            {same_products.map((similarProduct) => (
              <ProductCard key={similarProduct.id} product={similarProduct} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailDesktop;
