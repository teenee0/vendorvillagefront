import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import axios from "../../api/axiosDefault.js";
import { FiShoppingCart, FiHeart, FiShare2, FiChevronLeft } from 'react-icons/fi';
import { FaRegStar, FaStar, FaMapMarkerAlt, FaPhone, FaTags, FaStore, FaExternalLinkAlt } from 'react-icons/fa';
import { useFileUtils } from '../../hooks/useFileUtils';
import { useCart } from '../../contexts/CartContext';
import ProductCard from '/src/components/ProductCard/ProductCard.jsx';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Loader from '../../components/Loader';
import AuthRequiredForCartModal from '../../components/AuthRequiredForCartModal/AuthRequiredForCartModal';
import { notification } from 'antd';
import {
  buildVariantCombinationGroups,
  buildDefaultRightSelection,
  buildMergedGroupFromRightSelection,
  combinationSectionTitle,
  getOptionsForRightSpec,
  rightSelectionAfterPick,
} from '../../utils/buildVariantCombinationGroups';
import styles from './ProductDetailMobile.module.css';

const ProductDetail = () => {
  const { pk } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getFileUrl } = useFileUtils();
  const { addToCart } = useCart();
  const [productData, setProductData] = useState(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('specs');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showAllStores, setShowAllStores] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  /** Группа по attributes_at_right или legacy «Размер» */
  const [selectedCombination, setSelectedCombination] = useState(null);
  const [rightDimSelection, setRightDimSelection] = useState(null);

  useEffect(() => {
    // Убираем padding у .page-content для этой страницы
    const pageContent = document.querySelector('.page-content');
    if (pageContent) {
      pageContent.classList.add('product-detail-page');
    }
    
    return () => {
      // Восстанавливаем при размонтировании
      if (pageContent) {
        pageContent.classList.remove('product-detail-page');
      }
    };
  }, []);

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
            setSelectedVariant(group.variant.id);
            const defaultAttrs = {};
            group.variant.attributes.forEach((attr) => {
              if (defaultAttrs[attr.attribute_id] === undefined) {
                defaultAttrs[attr.attribute_id] = attr.display_value;
              }
            });
            setSelectedAttributes(defaultAttrs);
            if (group.locations?.length > 0) {
              const firstInStock = group.locations.find(
                (loc) => loc != null && loc.quantity != null && Number(loc.quantity) > 0
              );
              setSelectedLocation(firstInStock || null);
            }
          } else {
            setRightDimSelection(null);
            setSelectedCombination(null);
            setSelectedVariant(prod.variants?.[0]?.id ?? null);
            setSelectedLocation(null);
          }
        } else {
          setRightDimSelection(null);
          if (groups.length > 0) {
            const g = groups[0];
            setSelectedCombination(g);
            setSelectedVariant(g.variant.id);
            const defaultAttrs = {};
            g.variant.attributes.forEach((attr) => {
              if (defaultAttrs[attr.attribute_id] === undefined) {
                defaultAttrs[attr.attribute_id] = attr.display_value;
              }
            });
            setSelectedAttributes(defaultAttrs);
            if (g.locations?.length > 0) {
              const firstInStock = g.locations.find(
                (loc) => loc != null && loc.quantity != null && Number(loc.quantity) > 0
              );
              setSelectedLocation(firstInStock || null);
            }
          } else {
            setSelectedCombination(null);
            const firstVariant = prod.variants?.[0];
            if (firstVariant) {
              setSelectedVariant(firstVariant.id);
              const defaultAttrs = {};
              firstVariant.attributes.forEach((attr) => {
                if (defaultAttrs[attr.attribute_id] === undefined) {
                  defaultAttrs[attr.attribute_id] = attr.display_value;
                }
              });
              setSelectedAttributes(defaultAttrs);
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

  const getCurrentVariant = () => {
    if (!productData) return null;
    if (selectedVariant) {
      return productData.product.variants.find(v => v.id === selectedVariant);
    }
    return productData.product.variants?.[0] ?? null;
  };

  const hasStockAtLocation = (loc) =>
    loc != null && loc.quantity != null && Number(loc.quantity) > 0;

  const handleLocationSelect = (location) => {
    if (!hasStockAtLocation(location)) return;
    setSelectedLocation(location);
  };

  const variantMatchesAttributes = (variant, attrMap) => {
    const attrs = variant.attributes || [];
    return Object.entries(attrMap).every(([id, val]) =>
      attrs.some(
        (a) => a.attribute_id === Number(id) && a.display_value === val
      )
    );
  };

  const handleCombinationSelect = (group) => {
    setSelectedCombination(group);
    setSelectedVariant(group.variant.id);
    setShowAllStores(false);
    const updatedAttrs = {};
    group.variant.attributes.forEach((attr) => {
      if (updatedAttrs[attr.attribute_id] === undefined) {
        updatedAttrs[attr.attribute_id] = attr.display_value;
      }
    });
    setSelectedAttributes(updatedAttrs);
    if (group.locations?.length > 0) {
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
      setSelectedVariant(group.variant.id);
      const updatedAttrs = {};
      group.variant.attributes.forEach((attr) => {
        if (updatedAttrs[attr.attribute_id] === undefined) {
          updatedAttrs[attr.attribute_id] = attr.display_value;
        }
      });
      setSelectedAttributes(updatedAttrs);
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

  const handleAttributeSelect = (attributeId, value) => {
    if (!productData?.product) return;
    const { product } = productData;
    const newAttributes = { ...selectedAttributes, [attributeId]: value };
    const matchingVariant = product.variants.find((variant) =>
      variantMatchesAttributes(variant, newAttributes)
    );
    setShowAllStores(false);
    if (matchingVariant) {
      setSelectedVariant(matchingVariant.id);
      const groups = buildVariantCombinationGroups(product);
      let nextCombo = null;
      const specs = product.attributes_at_right;
      if (specs?.length) {
        const ids = specs.map((s) => s.attribute_id);
        const valueById = {};
        for (const att of matchingVariant.attributes || []) {
          if (ids.includes(att.attribute_id)) {
            valueById[att.attribute_id] = att.display_value;
          }
        }
        if (ids.every((id) => valueById[id] != null && valueById[id] !== '')) {
          const key = ids.map((id) => `${id}=${valueById[id]}`).join('|');
          nextCombo = groups.find((g) => g.key === key) || null;
        }
      } else {
        nextCombo = groups.find((g) => g.variant.id === matchingVariant.id) || null;
      }
      setSelectedCombination(nextCombo);
      const locs =
        nextCombo?.locations?.length > 0
          ? nextCombo.locations
          : matchingVariant.locations;
      if (locs?.length) {
        const firstInStock = locs.find(
          (loc) => loc != null && loc.quantity != null && Number(loc.quantity) > 0
        );
        setSelectedLocation(firstInStock || null);
      } else {
        setSelectedLocation(null);
      }
      const updatedAttrs = {};
      matchingVariant.attributes.forEach((attr) => {
        if (updatedAttrs[attr.attribute_id] === undefined) {
          updatedAttrs[attr.attribute_id] = attr.display_value;
        }
      });
      setSelectedAttributes(updatedAttrs);
    } else {
      setSelectedAttributes(newAttributes);
    }
  };

  const isAttributeValueAvailable = (attributeId, value) => {
    if (!productData || !productData.product || !productData.product.variants) {
      return false;
    }
    const testAttrs = { ...selectedAttributes, [attributeId]: value };
    return productData.product.variants.some((variant) =>
      variantMatchesAttributes(variant, testAttrs)
    );
  };

  const handleAddToCart = async () => {
    const variant = getCurrentVariant();
    if (!variant || !selectedLocation) return;
    if (!selectedLocation.location_price_id) {
      notification.warning({ message: 'Нет данных о локации. Попробуйте перезагрузить страницу.', duration: 3 });
      return;
    }
    setCartLoading(true);
    const result = await addToCart(variant.id, selectedLocation.location_price_id, 1);
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
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  if (loading) return (
    <div className={styles.loadingContainer}>
      <Loader size="large" />
    </div>
  );
  
  if (error) return <div className={styles.errorContainer}>{error}</div>;
  if (!productData) return <div className={styles.errorContainer}>Товар не найден</div>;

  const { product, same_products } = productData;
  const currentVariant = getCurrentVariant();
  const combinationGroups = buildVariantCombinationGroups(product);
  const specsAtRight = product.attributes_at_right;
  const useRightDimensions =
    (specsAtRight?.length ?? 0) >= 2 && combinationGroups.length > 0;
  const storeLocations =
    selectedCombination?.locations?.length > 0
      ? selectedCombination.locations
      : currentVariant?.locations || [];
  const sectionCombinationTitle = combinationSectionTitle(product);

  const availableAttributes = {};
  if (product.available_attributes) {
    Object.entries(product.available_attributes).forEach(([attrName, attrData]) => {
      availableAttributes[attrData.attribute_id] = {
        name: attrName,
        values: attrData.values,
        required: attrData.required
      };
    });
  }

  // Получаем размеры для отображения
  const sizeAttribute = Object.entries(availableAttributes).find(([, attr]) =>
    attr.name.toLowerCase().includes('размер') || attr.name.toLowerCase().includes('size')
  );

  // Получаем цвета для отображения
  const colorAttribute = Object.entries(availableAttributes).find(([, attr]) =>
    attr.name.toLowerCase().includes('цвет') || attr.name.toLowerCase().includes('color')
  );

  const imageSliderSettings = {
    dots: true,
    infinite: product.images.length > 1,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    swipe: true,
    touchMove: true,
  };

  const similarProductsSettings = {
    dots: false,
    infinite: same_products && same_products.length > 3,
    speed: 500,
    slidesToShow: 2,
    slidesToScroll: 1,
    arrows: false,
    swipe: true,
    responsive: [
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1.5,
          slidesToScroll: 1
        }
      }
    ]
  };

  return (
    <>
    <div className={styles.container}>
      {/* Галерея изображений */}
      <div className={styles.imageSection}>
        <button 
          className={styles.backButton}
          onClick={() => navigate(-1)}
          aria-label="Назад"
        >
          <FiChevronLeft />
        </button>
        
        <Slider {...imageSliderSettings} className={styles.imageSlider}>
          {product.images && product.images.length > 0 ? (
            product.images.map((img, index) => (
              <div key={img.id || index} className={styles.imageSlide}>
                <img 
                  src={getFileUrl(img.image)} 
                  alt={img.alt_text || `${product.name} ${index + 1}`}
                  className={styles.productImage}
                />
              </div>
            ))
          ) : (
            <div className={styles.imageSlide}>
              <div className={styles.noImagePlaceholder}>Нет изображения</div>
            </div>
          )}
        </Slider>

        <button 
          className={styles.favoriteButton}
          onClick={() => setIsFavorite(!isFavorite)}
          aria-label="Добавить в избранное"
        >
          <FiHeart className={isFavorite ? styles.favoriteActive : ''} />
        </button>
      </div>

      {/* Информация о товаре */}
      <div className={styles.productInfo}>
        {/* Рейтинг */}
        <div className={styles.ratingSection}>
          <div className={styles.stars}>
            {[...Array(5)].map((_, i) => (
              <FaStar 
                key={i} 
                className={`${styles.star} ${i < 4 ? styles.starFilled : ''}`} 
              />
            ))}
          </div>
          <span className={styles.reviewsCount}>16 отзывов</span>
        </div>

        {/* Бренд и название */}
        <div className={styles.brandName}>{product.business_name || 'Бренд'}</div>
        <h1 className={styles.productTitle}>{product.name}</h1>

        {/* 2+ атрибута справа — отдельный блок на каждый; недоступные значения disabled */}
        {useRightDimensions &&
          specsAtRight.map((spec, specIdx) => (
            <div key={spec.attribute_id} className={styles.sizeSection}>
              <div className={styles.sizeHeader}>
                <span className={styles.sizeLabel}>{spec.name}</span>
              </div>
              <div className={styles.sizeOptions}>
                {getOptionsForRightSpec(
                  product,
                  specsAtRight,
                  specIdx,
                  rightDimSelection || {}
                ).map(({ value, selectable }) => {
                  const sel = rightDimSelection || {};
                  const isSelected = sel[spec.attribute_id] === value;
                  return (
                    <button
                      key={`${spec.attribute_id}-${value}`}
                      type="button"
                      disabled={!selectable}
                      className={`${styles.sizeButton} ${isSelected ? styles.sizeButtonSelected : ''} ${!selectable ? styles.sizeButtonDisabled : ''}`}
                      onClick={() => selectable && handleRightDimPick(spec.attribute_id, value)}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

        {!useRightDimensions && combinationGroups.length > 0 ? (
          <div className={styles.sizeSection}>
            <div className={styles.sizeHeader}>
              <span className={styles.sizeLabel}>{sectionCombinationTitle}</span>
            </div>
            <div className={styles.sizeOptions}>
              {combinationGroups.map((group) => {
                const isSelected = selectedCombination?.key === group.key;
                const priceLabel =
                  group.minPrice === group.maxPrice
                    ? `${formatPrice(group.minPrice)} ₸`
                    : `${formatPrice(Math.min(group.minPrice, group.maxPrice))} - ${formatPrice(Math.max(group.minPrice, group.maxPrice))} ₸`;
                return (
                  <button
                    key={group.key}
                    type="button"
                    className={`${styles.sizeButton} ${isSelected ? styles.sizeButtonSelected : ''}`}
                    onClick={() => handleCombinationSelect(group)}
                  >
                    {group.label}
                    <span className={styles.sizePrice}>{priceLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : !useRightDimensions ? (
          sizeAttribute && (
            <div className={styles.sizeSection}>
              <div className={styles.sizeHeader}>
                <span className={styles.sizeLabel}>{sizeAttribute[1].name}</span>
              </div>
              <div className={styles.sizeOptions}>
                {sizeAttribute[1].values.map((size) => {
                  const isAvailable = isAttributeValueAvailable(Number(sizeAttribute[0]), size);
                  const isSelected = selectedAttributes[Number(sizeAttribute[0])] === size;
                  const sizeVariant = product.variants?.find((v) =>
                    variantMatchesAttributes(v, {
                      ...selectedAttributes,
                      [Number(sizeAttribute[0])]: size,
                    })
                  );
                  let sizePrice = null;
                  if (sizeVariant?.locations && sizeVariant.locations.length > 0) {
                    const prices = sizeVariant.locations.map((loc) => parseFloat(loc.price));
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    sizePrice = minPrice === maxPrice ? minPrice : { min: minPrice, max: maxPrice };
                  }
                  return (
                    <button
                      key={size}
                      className={`${styles.sizeButton} ${isSelected ? styles.sizeButtonSelected : ''} ${!isAvailable ? styles.sizeButtonDisabled : ''}`}
                      onClick={() => isAvailable && handleAttributeSelect(Number(sizeAttribute[0]), size)}
                      disabled={!isAvailable}
                    >
                      {size}
                      {isAvailable && sizePrice && (
                        <span className={styles.sizePrice}>
                          {typeof sizePrice === 'object'
                            ? `${formatPrice(sizePrice.min)} - ${formatPrice(sizePrice.max)} ₸`
                            : `${formatPrice(sizePrice)} ₸`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )
        ) : null}

        {/* Наличие в магазинах */}
        {currentVariant && storeLocations.length > 0 && (
          <div className={styles.storesSection}>
            <h3 className={styles.storesTitle}>Наличие в магазинах</h3>
            <div className={styles.storeList}>
              {(showAllStores ? storeLocations : storeLocations.slice(0, 3)).map((location) => {
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
                        <span className={styles.storeIconText}>{location.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className={styles.storeDetails}>
                      <h4 className={styles.storeName}>{location.name}</h4>
                      {inStock ? (
                        <p className={styles.storeQuantity}>
                          В наличии: {location.quantity} {location.unit_display || 'шт.'}
                        </p>
                      ) : (
                        <p className={styles.storeQuantityUnavailable}>
                          В данное время на этой локации нет товара
                        </p>
                      )}
                      {location.address && (
                        <p className={styles.storeAddress}>
                          <FaMapMarkerAlt className={styles.storeIconSmall} />
                          {location.address}
                        </p>
                      )}
                      {location.contact_phone && (
                        <p className={styles.storePhone}>
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
            {storeLocations.length > 3 && (
              <button 
                className={styles.showMoreStoresBtn}
                onClick={() => setShowAllStores(!showAllStores)}
              >
                {showAllStores ? 'Свернуть' : 'Показать больше'}
              </button>
            )}
          </div>
        )}

        {/* Кнопка добавления в корзину */}
        <button
          className={`${styles.addToCartButton}${cartAdded ? ` ${styles.addToCartButtonAdded}` : ''}`}
          onClick={handleAddToCart}
          disabled={!currentVariant || !selectedLocation || cartLoading}
        >
          <FiShoppingCart />
          {cartLoading ? 'Добавляем...' : cartAdded ? '✓ Добавлено в корзину' : 'Добавить в корзину'}
        </button>

        {/* Действия */}
        <div className={styles.actionButtons}>
          <button className={styles.actionButton}>
            <FiHeart />
            <span>В избранное</span>
          </button>
          <button className={styles.actionButton}>
            <FiShare2 />
            <span>Поделиться</span>
          </button>
        </div>

        {/* Другие цвета */}
        {colorAttribute && colorAttribute[1].values.length > 1 && (
          <div className={styles.colorsSection}>
            <h3 className={styles.colorsTitle}>В другом цвете</h3>
            <div className={styles.colorsGrid}>
              {colorAttribute[1].values.slice(0, 4).map((color) => {
                const colorVariant = product.variants?.find((v) =>
                  variantMatchesAttributes(v, {
                    ...selectedAttributes,
                    [Number(colorAttribute[0])]: color,
                  })
                );
                const colorImage = colorVariant?.images?.[0] || (product.images && product.images[0]);
                const isSelected = selectedAttributes[Number(colorAttribute[0])] === color;
                const imageUrl = colorImage?.image || (product.images && product.images[0]?.image);
                return (
                  <div 
                    key={color}
                    className={`${styles.colorItem} ${isSelected ? styles.colorItemSelected : ''}`}
                    onClick={() => handleAttributeSelect(Number(colorAttribute[0]), color)}
                  >
                    {imageUrl ? (
                      <img 
                        src={getFileUrl(imageUrl)} 
                        alt={color}
                        className={styles.colorImage}
                      />
                    ) : (
                      <div className={styles.colorImagePlaceholder}>{color}</div>
                    )}
                    <span className={styles.colorName}>{color}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Отзывы и вопросы */}
        <div className={styles.reviewsSection}>
          <div className={styles.reviewsHeader}>
            <h3 className={styles.reviewsTitle}>Отзывы</h3>
            <div className={styles.reviewsRating}>
              {[...Array(5)].map((_, i) => (
                <FaStar 
                  key={i} 
                  className={`${styles.star} ${styles.starFilled}`} 
                />
              ))}
              <span className={styles.reviewsNumber}>16</span>
            </div>
          </div>
          <div className={styles.photoReviews}>
            <h4 className={styles.photoReviewsTitle}>Фотоотзывы</h4>
            <div className={styles.photoReviewsGrid}>
              {/* Здесь можно добавить фотоотзывы */}
            </div>
          </div>
          <button className={styles.askQuestionButton}>Задать вопрос</button>
        </div>

        {/* Табы */}
        <div className={styles.tabsSection}>
          <div className={styles.tabsHeader}>
            <button
              className={`${styles.tab} ${activeTab === 'specs' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('specs')}
            >
              Характеристики
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'about' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('about')}
            >
              О товаре
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'delivery' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('delivery')}
            >
              Доставка
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'about' && (
              <div className={styles.descriptionContent}>
                <p>{product.description || 'Описание отсутствует.'}</p>
              </div>
            )}
            {activeTab === 'specs' && (
              <div className={styles.specsContent}>
                {currentVariant && currentVariant.attributes.length > 0 ? (
                  <div className={styles.specsList}>
                    {(() => {
                      const grouped = (currentVariant.attributes || []).reduce((acc, attr) => {
                        const key = attr.attribute_id;
                        if (!acc[key]) acc[key] = { attribute_name: attr.attribute_name, values: [] };
                        acc[key].values.push(attr.display_value);
                        return acc;
                      }, {});
                      return Object.entries(grouped).map(([id, { attribute_name, values }]) => (
                        <div key={id} className={styles.specItem}>
                          <span className={styles.specLabel}>{attribute_name}:</span>
                          <span className={styles.specValue}>{values.join(', ')}</span>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <p>Характеристики не указаны</p>
                )}
              </div>
            )}
            {activeTab === 'delivery' && (
              <div className={styles.deliveryContent}>
                <p><strong>Доставка:</strong> Доставка осуществляется в течение 1-3 рабочих дней. Бесплатная доставка при заказе от 5000 ₸.</p>
                <p><strong>Самовывоз:</strong> Доступен из пунктов выдачи по всему городу.</p>
                <p><strong>Возврат:</strong> Возврат в течение 14 дней при сохранении товарного вида и упаковки.</p>
              </div>
            )}
          </div>
        </div>

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

        {/* Похожие товары */}
        {same_products && same_products.length > 0 && (
          <div className={styles.similarSection}>
            <h2 className={styles.similarTitle}>Похожие</h2>
            <div className={styles.similarProducts}>
              <Slider {...similarProductsSettings}>
                {same_products.map((similarProduct) => (
                  <div key={similarProduct.id} className={styles.similarProductItem}>
                    <ProductCard product={similarProduct} />
                  </div>
                ))}
              </Slider>
            </div>
          </div>
        )}
      </div>
    </div>
    <AuthRequiredForCartModal
      open={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      redirectPath={`${location.pathname}${location.search}`}
    />
    </>
  );
};

export default ProductDetail;
