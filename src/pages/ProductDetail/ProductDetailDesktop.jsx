import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import { useFileUtils } from '../../hooks/useFileUtils';
import { useCart } from '../../contexts/CartContext';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';
import ProductCard from '../../components/ProductCard/ProductCard';
import Loader from '../../components/Loader';
import AuthRequiredForCartModal from '../../components/AuthRequiredForCartModal/AuthRequiredForCartModal';
import { notification } from 'antd';
import { FaChevronLeft, FaChevronRight, FaChevronUp, FaChevronDown, FaMapMarkerAlt, FaPhone, FaShoppingCart, FaHeart, FaBolt, FaTags, FaStore, FaExternalLinkAlt } from 'react-icons/fa';
import {
  buildVariantCombinationGroups,
  buildDefaultRightSelection,
  buildMergedGroupFromRightSelection,
  combinationSectionTitle,
  getOptionsForRightSpec,
  rightSelectionAfterPick,
} from '../../utils/buildVariantCombinationGroups';
import styles from './ProductDetailDesktop.module.css';

const ProductDetailDesktop = () => {
  const { pk } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getFileUrl } = useFileUtils();
  const { addToCart } = useCart();
  
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  /** Выбранная комплектация (несколько атрибутов справа или legacy-размер) */
  const [selectedCombination, setSelectedCombination] = useState(null);
  /** Пошаговый выбор при 2+ attributes_at_right: attribute_id -> значение */
  const [rightDimSelection, setRightDimSelection] = useState(null);
  const [activeTab, setActiveTab] = useState('specs');
  const [slideDirection, setSlideDirection] = useState(null);
  const [previousImageIndex, setPreviousImageIndex] = useState(null);
  const [showAllStores, setShowAllStores] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const thumbnailGalleryRef = useRef(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`marketplace/api/products/${pk}/`);
        setProductData(response.data);
        
        const prod = response.data.product;
        const specs = prod.attributes_at_right;
        const groups = buildVariantCombinationGroups(prod);
        if (specs?.length >= 2 && groups.length > 0) {
          const sel = buildDefaultRightSelection(prod, specs);
          setRightDimSelection(sel);
          const group = buildMergedGroupFromRightSelection(prod, specs, sel);
          if (group) {
            setSelectedCombination(group);
            setSelectedVariant(group.variant);
            const firstInStock = group.locations?.find(
              (loc) => loc != null && loc.quantity != null && Number(loc.quantity) > 0
            );
            setSelectedLocation(firstInStock || null);
          } else {
            setRightDimSelection(null);
            setSelectedCombination(null);
            setSelectedVariant(prod.variants?.[0] || null);
            setSelectedLocation(null);
          }
        } else {
          setRightDimSelection(null);
          if (groups.length > 0) {
            const g = groups[0];
            setSelectedCombination(g);
            setSelectedVariant(g.variant);
            const firstInStock = g.locations?.find(
              (loc) => loc != null && loc.quantity != null && Number(loc.quantity) > 0
            );
            setSelectedLocation(firstInStock || null);
          } else {
            const firstVariant = prod.variants?.[0];
            setSelectedCombination(null);
            if (firstVariant) {
              setSelectedVariant(firstVariant);
              if (firstVariant.locations && firstVariant.locations.length > 0) {
                const firstInStock = firstVariant.locations.find(
                  (loc) => loc != null && loc.quantity != null && Number(loc.quantity) > 0
                );
                setSelectedLocation(firstInStock || null);
              }
            }
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

  const handleCombinationSelect = (group) => {
    setSelectedCombination(group);
    setSelectedVariant(group.variant);
    setShowAllStores(false);
    if (group.locations && group.locations.length > 0) {
      const firstInStock = group.locations.find(
        (loc) => loc != null && loc.quantity != null && Number(loc.quantity) > 0
      );
      setSelectedLocation(firstInStock || null);
    } else {
      setSelectedLocation(null);
    }
  };

  const handleRightDimPick = (attributeId, value) => {
    if (!productData?.product) return;
    const { product } = productData;
    const specs = product.attributes_at_right;
    if (!specs?.length) return;
    const prev = rightDimSelection || buildDefaultRightSelection(product, specs);
    const nextSel = rightSelectionAfterPick(product, specs, prev, attributeId, value);
    setRightDimSelection(nextSel);
    const group = buildMergedGroupFromRightSelection(product, specs, nextSel);
    setShowAllStores(false);
    if (group) {
      setSelectedCombination(group);
      setSelectedVariant(group.variant);
      if (group.locations?.length > 0) {
        const firstInStock = group.locations.find(
          (loc) => loc != null && loc.quantity != null && Number(loc.quantity) > 0
        );
        setSelectedLocation(firstInStock || null);
      } else {
        setSelectedLocation(null);
      }
    }
  };

  const hasStockAtLocation = (loc) =>
    loc != null && loc.quantity != null && Number(loc.quantity) > 0;

  const handleLocationSelect = (location) => {
    if (!hasStockAtLocation(location)) return;
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
  const combinationGroups = buildVariantCombinationGroups(product);
  const specsAtRight = product.attributes_at_right;
  const useRightDimensions = (specsAtRight?.length ?? 0) >= 2 && combinationGroups.length > 0;
  const currentVariant = selectedVariant || product.variants?.[0];
  const currentLocations =
    selectedCombination?.locations?.length > 0
      ? selectedCombination.locations
      : currentVariant?.locations || [];
  const sectionCombinationTitle = combinationSectionTitle(product);

  return (
    <>
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

          {/* Два и больше атрибутов «справа» — отдельная строка на атрибут, недоступные значения серые */}
          {useRightDimensions &&
            specsAtRight.map((spec, specIdx) => (
              <div key={spec.attribute_id} className={styles.sizesSection}>
                <h2 className={styles.sectionTitle}>
                  <i className="fas fa-sliders-h"></i> {spec.name}
                </h2>
                <div className={styles.sizeOptions}>
                  {getOptionsForRightSpec(
                    product,
                    specsAtRight,
                    specIdx,
                    rightDimSelection || {}
                  ).map(({ value, selectable }, optIdx) => {
                    const sel = rightDimSelection || {};
                    const checked = sel[spec.attribute_id] === value;
                    const inputId = `right-${spec.attribute_id}-${optIdx}`;
                    return (
                      <div
                        key={`${spec.attribute_id}-${value}`}
                        className={`${styles.sizeOption} ${!selectable ? styles.sizeOptionDisabled : ''}`}
                      >
                        <input
                          type="radio"
                          name={`right-attr-${spec.attribute_id}`}
                          id={inputId}
                          className={styles.sizeRadio}
                          checked={checked}
                          disabled={!selectable}
                          onChange={() => selectable && handleRightDimPick(spec.attribute_id, value)}
                        />
                        <label htmlFor={inputId} className={styles.sizeLabel}>
                          {value}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          {/* Одна строка: один атрибут справа или legacy «Размер» */}
          {!useRightDimensions && combinationGroups.length > 0 && (
            <div className={styles.sizesSection}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-ruler"></i> {sectionCombinationTitle}
              </h2>
              <div className={styles.sizeOptions}>
                {combinationGroups.map((group, idx) => (
                  <div key={group.key} className={styles.sizeOption}>
                    <input
                      type="radio"
                      name="variant-combination"
                      id={`combo-${idx}`}
                      className={styles.sizeRadio}
                      checked={selectedCombination?.key === group.key}
                      onChange={() => handleCombinationSelect(group)}
                    />
                    <label htmlFor={`combo-${idx}`} className={styles.sizeLabel}>
                      {group.label}
                    </label>
                    <span className={styles.sizePrice}>
                      {group.minPrice === group.maxPrice
                        ? `${formatPrice(group.minPrice)} ₸`
                        : `${formatPrice(Math.min(group.minPrice, group.maxPrice))} - ${formatPrice(Math.max(group.minPrice, group.maxPrice))} ₸`}
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
                {(showAllStores ? currentLocations : currentLocations.slice(0, 2)).map((location) => {
                  const inStock = hasStockAtLocation(location);
                  return (
                  <div
                    key={location.id}
                    className={`${styles.storeItem} ${selectedLocation?.id === location.id ? styles.storeItemActive : ''} ${!inStock ? styles.storeItemDisabled : ''}`}
                    onClick={() => inStock && handleLocationSelect(location)}
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
                        {inStock ? (
                          <p className={styles.storeQuantity}>
                            В наличии: {location.quantity} {location.unit_display || 'шт.'}
                          </p>
                        ) : (
                          <p className={styles.storeQuantityUnavailable}>
                            В данное время на этой локации нет товара
                          </p>
                        )}
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
                        disabled={!inStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (inStock) handleLocationSelect(location);
                        }}
                      >
                        {selectedLocation?.id === location.id ? '✓ Выбран' : inStock ? 'Выбрать' : 'Нет в наличии'}
                      </button>
                    </div>
                  </div>
                );
                })}
              </div>
              {currentLocations.length > 2 && (
                <button 
                  className={styles.showMoreStoresBtn}
                  onClick={() => setShowAllStores(!showAllStores)}
                >
                  {showAllStores ? 'Свернуть' : 'Показать больше'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Панель покупки */}
      {selectedVariant && selectedLocation && (
        <div className={styles.purchaseSection}>
          <div className={styles.selectedInfo}>
            <div className={styles.selectedSize}>
              <span>
                {product.attributes_at_right?.length >= 2
                  ? 'Комплектация:'
                  : product.attributes_at_right?.length === 1
                    ? 'Комплектация:'
                    : 'Размер:'}
              </span>
              <strong>
                {selectedCombination?.label ||
                  selectedVariant?.attributes?.find((a) => a.attribute_name === 'Размер')
                    ?.display_value ||
                  '—'}
              </strong>
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
            <button
              className={`${styles.btnPrimary}${cartAdded ? ` ${styles.btnPrimaryAdded}` : ''}`}
              disabled={cartLoading}
              onClick={async () => {
                if (!selectedVariant || !selectedLocation) return;
                if (!selectedLocation.location_price_id) {
                  notification.warning({ message: 'Нет данных о локации. Попробуйте перезагрузить страницу.', duration: 3 });
                  return;
                }
                setCartLoading(true);
                const result = await addToCart(selectedVariant.id, selectedLocation.location_price_id, 1);
                setCartLoading(false);
                if (result.success) {
                  setCartAdded(true);
                  notification.success({ message: 'Товар добавлен в корзину', duration: 2 });
                  setTimeout(() => setCartAdded(false), 2500);
                } else if (result.error?.includes('401') || result.error?.includes('403')) {
                  setAuthModalOpen(true);
                } else {
                  notification.error({ message: result.error || 'Ошибка при добавлении в корзину', duration: 3 });
                }
              }}
            >
              <FaShoppingCart /> {cartLoading ? 'Добавляем...' : cartAdded ? '✓ Добавлено' : 'Добавить в корзину'}
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
          {product.business_website && (
            <a 
              href={product.business_website}
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
                {(() => {
                  const grouped = (currentVariant.attributes || []).reduce((acc, attr) => {
                    const key = attr.attribute_id;
                    if (!acc[key]) acc[key] = { attribute_name: attr.attribute_name, values: [] };
                    acc[key].values.push(attr.display_value);
                    return acc;
                  }, {});
                  return Object.entries(grouped).map(([id, { attribute_name, values }]) => (
                    <tr key={id}>
                      <td>{attribute_name}</td>
                      <td>{values.join(', ')}</td>
                    </tr>
                  ));
                })()}
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
    <AuthRequiredForCartModal
      open={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      redirectPath={`${location.pathname}${location.search}`}
    />
    </>
  );
};

export default ProductDetailDesktop;
