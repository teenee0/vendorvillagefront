import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import { useFileUtils } from '../../hooks/useFileUtils';
import { useCart } from '../../contexts/CartContext';
import { notification } from 'antd';
import AuthRequiredForCartModal from '../AuthRequiredForCartModal/AuthRequiredForCartModal';
import Loader from '../Loader/Loader';
import {
  buildVariantCombinationGroups,
  buildDefaultRightSelection,
  buildMergedGroupFromRightSelection,
  combinationSectionTitle,
  getOptionsForRightSpec,
  rightSelectionAfterPick,
} from '../../utils/buildVariantCombinationGroups';
import styles from './ProductQuickAddToCartModal.module.css';

function pickFirstInStock(locations) {
  if (!locations?.length) return null;
  return (
    locations.find(
      (loc) =>
        loc != null &&
        loc.quantity != null &&
        Number(loc.quantity) > 0 &&
        loc.location_price_id
    ) || null
  );
}

function hasStockAtLocation(loc) {
  return (
    loc != null &&
    loc.quantity != null &&
    Number(loc.quantity) > 0 &&
    loc.location_price_id
  );
}

function formatPrice(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('ru-RU');
}

/**
 * Быстрое добавление в корзину из карточки каталога: загрузка деталей товара,
 * выбор комплектации (attributes_at_right / размер) и магазина.
 * На узком экране — панель снизу, на широком — по центру.
 */
export default function ProductQuickAddToCartModal({
  open,
  onClose,
  productId,
  previewProduct,
  onAdded,
}) {
  const navigate = useNavigate();
  const { getImageUrl } = useFileUtils();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedCombination, setSelectedCombination] = useState(null);
  const [rightDimSelection, setRightDimSelection] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const applyProductToSelection = useCallback((prod) => {
    if (!prod) return;
    const specs = prod.attributes_at_right;
    const groups = buildVariantCombinationGroups(prod);
    if (specs?.length >= 2 && groups.length > 0) {
      const sel = buildDefaultRightSelection(prod, specs);
      setRightDimSelection(sel);
      const group = buildMergedGroupFromRightSelection(prod, specs, sel);
      setSelectedCombination(group || null);
      setSelectedLocation(pickFirstInStock(group?.locations));
      return;
    }
    setRightDimSelection(null);
    if (groups.length > 0) {
      const g = groups[0];
      setSelectedCombination(g);
      setSelectedLocation(pickFirstInStock(g.locations));
      return;
    }
    setSelectedCombination(null);
    const v = prod.variants?.[0];
    setSelectedLocation(pickFirstInStock(v?.locations));
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !productId) {
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProduct(null);
    setSelectedCombination(null);
    setRightDimSelection(null);
    setSelectedLocation(null);

    axios
      .get(`marketplace/api/products/${productId}/`)
      .then((res) => {
        if (cancelled) return;
        const prod = res.data?.product;
        if (!prod) {
          setError('Товар не найден');
          return;
        }
        setProduct(prod);
        applyProductToSelection(prod);
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить товар');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, productId, applyProductToSelection]);

  const combinationGroups = product ? buildVariantCombinationGroups(product) : [];
  const specsAtRight = product?.attributes_at_right;
  const useRightDimensions =
    (specsAtRight?.length ?? 0) >= 2 && combinationGroups.length > 0;

  const activeVariant =
    selectedCombination?.variant ??
    (product?.variants?.length === 1 ? product.variants[0] : null);

  const storeLocations = selectedCombination?.locations?.length
    ? selectedCombination.locations
    : activeVariant?.locations ?? [];

  const handleCombinationSelect = (group) => {
    setSelectedCombination(group);
    setSelectedLocation(pickFirstInStock(group.locations));
  };

  const handleRightDimPick = (attributeId, value) => {
    if (!product || !specsAtRight?.length) return;
    const prev = rightDimSelection || buildDefaultRightSelection(product, specsAtRight);
    const nextSel = rightSelectionAfterPick(product, specsAtRight, prev, attributeId, value);
    setRightDimSelection(nextSel);
    const group = buildMergedGroupFromRightSelection(product, specsAtRight, nextSel);
    if (group) {
      setSelectedCombination(group);
      setSelectedLocation(pickFirstInStock(group.locations));
    }
  };

  const handleConfirmAdd = async () => {
    if (!activeVariant?.id || !selectedLocation?.location_price_id) return;
    setSubmitting(true);
    const result = await addToCart(activeVariant.id, selectedLocation.location_price_id, 1);
    setSubmitting(false);
    if (result.success) {
      notification.success({ message: 'Товар добавлен в корзину', duration: 2 });
      onAdded?.();
      onClose();
    } else if (
      result.status === 401 ||
      result.status === 403 ||
      String(result.error || '').includes('401') ||
      String(result.error || '').includes('403') ||
      String(result.error || '').toLowerCase().includes('авториз')
    ) {
      setAuthModalOpen(true);
    } else {
      notification.error({
        message: result.error || 'Не удалось добавить в корзину',
        duration: 3,
      });
    }
  };

  const goToProduct = () => {
    onClose();
    navigate(`/marketplace/products/${productId}`);
  };

  if (!open) return null;

  const previewImg =
    previewProduct?.main_image?.image ||
    product?.images?.[0]?.image ||
    product?.main_image?.image;
  const title = product?.name || previewProduct?.name || 'Товар';
  const business = product?.business_name || previewProduct?.business_name || '';

  const thumbUrl = previewImg ? getImageUrl(previewImg) : null;

  const canAdd = Boolean(
    activeVariant?.id && selectedLocation?.location_price_id && hasStockAtLocation(selectedLocation)
  );

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} role="presentation" aria-hidden="true" />
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.handle} aria-hidden="true" />
        <div className={styles.header}>
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className={styles.thumb} />
          ) : (
            <div className={styles.thumb} aria-hidden="true" />
          )}
          <div className={styles.headerText}>
            <h2 id="quick-add-title" className={styles.title}>
              {title}
            </h2>
            {business ? <p className={styles.subtitle}>{business}</p> : null}
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          {loading && (
            <div className={styles.loading}>
              <Loader size="medium" />
            </div>
          )}

          {!loading && error && (
            <div className={styles.errorBox}>
              <p>{error}</p>
              <button type="button" className={styles.errorBtn} onClick={goToProduct}>
                Открыть страницу товара
              </button>
            </div>
          )}

          {!loading && !error && product && (
            <>
              {useRightDimensions &&
                specsAtRight.map((spec, specIdx) => (
                  <div key={spec.attribute_id}>
                    <span className={styles.sectionLabel}>{spec.name}</span>
                    <div className={styles.chips}>
                      {getOptionsForRightSpec(
                        product,
                        specsAtRight,
                        specIdx,
                        rightDimSelection || {}
                      ).map(({ value, selectable }) => {
                        const sel = rightDimSelection || {};
                        const selected = sel[spec.attribute_id] === value;
                        return (
                          <button
                            key={`${spec.attribute_id}-${value}`}
                            type="button"
                            disabled={!selectable}
                            className={`${styles.chip} ${selected ? styles.chipSelected : ''} ${!selectable ? styles.chipDisabled : ''}`}
                            onClick={() => selectable && handleRightDimPick(spec.attribute_id, value)}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {!useRightDimensions && combinationGroups.length > 0 && (
                <div>
                  <span className={styles.sectionLabel}>
                    {combinationSectionTitle(product)}
                  </span>
                  <div className={styles.chips}>
                    {combinationGroups.map((group) => {
                      const selected = selectedCombination?.key === group.key;
                      const priceLabel =
                        group.minPrice === group.maxPrice
                          ? `${formatPrice(group.minPrice)} ₸`
                          : `${formatPrice(Math.min(group.minPrice, group.maxPrice))} – ${formatPrice(Math.max(group.minPrice, group.maxPrice))} ₸`;
                      return (
                        <button
                          key={group.key}
                          type="button"
                          className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
                          onClick={() => handleCombinationSelect(group)}
                        >
                          {group.label}
                          <span className={styles.chipPrice}>{priceLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!useRightDimensions &&
                combinationGroups.length === 0 &&
                product.variants?.length > 1 && (
                  <div className={styles.errorBox}>
                    <p>Выберите вариант на странице товара</p>
                    <button type="button" className={styles.errorBtn} onClick={goToProduct}>
                      Перейти
                    </button>
                  </div>
                )}

              {storeLocations.length > 0 && (
                <div>
                  <span className={styles.sectionLabel}>Магазин</span>
                  {storeLocations.map((loc) => {
                    const ok = hasStockAtLocation(loc);
                    const selected = selectedLocation?.id === loc.id;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        disabled={!ok}
                        className={`${styles.locRow} ${selected ? styles.locRowSelected : ''} ${!ok ? styles.locRowDisabled : ''}`}
                        onClick={() => ok && setSelectedLocation(loc)}
                      >
                        <div>
                          <div className={styles.locName}>{loc.name}</div>
                          <div className={styles.locMeta}>
                            {ok
                              ? `В наличии: ${loc.quantity} ${loc.unit_display || 'шт.'}`
                              : 'Нет в наличии'}
                          </div>
                        </div>
                        <div className={styles.locPrice}>{formatPrice(loc.price)} ₸</div>
                      </button>
                    );
                  })}
                </div>
              )}

              {!loading && !error && product && storeLocations.length === 0 && (
                <div className={styles.errorBox}>
                  <p>Сейчас нет доступных точек продаж</p>
                  <button type="button" className={styles.errorBtn} onClick={goToProduct}>
                    Страница товара
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={!canAdd || submitting || loading || !!error}
            onClick={handleConfirmAdd}
          >
            {submitting ? 'Добавляем…' : 'Добавить в корзину'}
          </button>
        </div>
      </div>

      <AuthRequiredForCartModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        redirectPath={`/marketplace/products/${productId}`}
      />
    </>,
    document.body
  );
}
