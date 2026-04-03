import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styles from './ProductAddPageMobile.module.css';
import { FaPlusCircle, FaImages, FaInfoCircle, FaListUl, FaCloudUploadAlt, FaStar, FaTimes, FaTrash, FaPlus, FaCopy, FaSave, FaArrowLeft, FaMagic, FaImage } from 'react-icons/fa';
import axios from "../../api/axiosDefault.js";
import { ENV_CONFIG } from '../../config/environment.js';
import { pollAiTaskResult } from '../../utils/aiTaskPoll.js';
import {
  splitBaseAndRightAttrs,
  emptyValuesMapForAttrs,
  defaultSelectedRightPredefinedIds,
  cartesianRightCombinationsFromSelection,
  cartesianProductSizeFromSelection,
} from '../../utils/variantMatrixUtils.js';
import DraggableImageList from '../../components/DraggableThumbnail/DraggableImageList.jsx';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useParams, useNavigate } from 'react-router-dom';
import ImageCropper from '../../components/ImageCropper/ImageCropper.jsx';
import PreviewableImage from '../../components/PreviewableImage/PreviewableImage.jsx';
import Loader from '../../components/Loader';
import AiQuotaBar from '../../components/AiQuotaBar/AiQuotaBar.jsx';
import AiActionCard from '../../components/AiActionCard/AiActionCard.jsx';
import AiBackgroundPromptField from '../../components/AiBackgroundPromptField/AiBackgroundPromptField.jsx';
import {
  AttributeValueSelect,
  PAGE_SIZE,
  AI_BACKGROUND_PROMPT_MAX,
  AI_BACKGROUND_MAX_IMAGES,
  resolveImageFileForAi,
} from './ProductAddPage.jsx';

const CategoryPicker = ({
  categories = [],
  value,
  onChange,
  disabled,
  placeholder = 'Выберите категорию или начните ввод...'
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);

  // Найдём выбранную категорию
  const selected = categories.find(c => String(c.id) === String(value)) || null;

  // Фильтрация: и по name, и по full_path
  const q = query.trim().toLowerCase();
  const filtered = q
    ? categories.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.full_path || '').toLowerCase().includes(q)
    )
    : categories;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    // при открытии сбрасываем подсветку
    if (open) setHighlight(0);
  }, [open, q]);

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = filtered[highlight];
      if (pick) {
        onChange(String(pick.id));
        setQuery('');
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const pickItem = (cat) => {
    onChange(String(cat.id));
    setQuery('');
    setOpen(false);
  };

  return (
    <div className={styles.catPicker} ref={rootRef}>
      <div className={styles.catPickerControl} onClick={() => !disabled && setOpen(o => !o)}>
        <div className={styles.catPickerValue}>
          {selected ? (
            <>
              <div className={styles.catName}>{selected.name}</div>
              <div className={styles.catPath} title={selected.full_path}>
                {selected.full_path}
              </div>
            </>
          ) : (
            <div className={styles.catPlaceholder}>{placeholder}</div>
          )}
        </div>
        <div className={styles.catCaret} />
      </div>

      {open && (
        <div className={styles.catDropdown} onKeyDown={handleKeyDown}>
          <input
            autoFocus
            className={styles.catSearch}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по названию или пути..."
          />
          <div className={styles.catList} role="listbox" tabIndex={0}>
            {filtered.length === 0 ? (
              <div className={styles.catEmpty}>Ничего не найдено</div>
            ) : (
              filtered.slice(0, 300).map((cat, idx) => (
                <div
                  key={cat.id}
                  role="option"
                  aria-selected={String(cat.id) === String(value)}
                  className={`${styles.catItem} ${idx === highlight ? styles.catItemActive : ''}`}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => pickItem(cat)}
                >
                  <div className={styles.catItemName}>{cat.name}</div>
                  <div className={styles.catItemPath}>{cat.full_path}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ProductAddPageMobile = () => {
  const { business_slug, product_id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(product_id);

  // Основная информация
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [unitOfMeasureId, setUnitOfMeasureId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isVisibleOnMarketplace, setIsVisibleOnMarketplace] = useState(true);
  const [isVisibleOnOwnSite, setIsVisibleOnOwnSite] = useState(true);

  // Категории и атрибуты
  const [categoryAttributes, setCategoryAttributes] = useState([]);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [attributesError, setAttributesError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState(null);
  
  // Единицы измерения
  const [unitsOfMeasure, setUnitsOfMeasure] = useState([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);

  // Локации (склады)
  const [locations, setLocations] = useState([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState(null);

  // Изображения
  const [images, setImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const fileInputRef = useRef(null);
  const cropSessionRef = useRef({ mode: 'add', orderedIds: [], filesLength: 0 });
  const [croppingData, setCroppingData] = useState({
    files: [],
    currentIndex: 0,
    croppedImages: []
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiBgReview, setAiBgReview] = useState(null);
  const aiBgReviewRef = useRef(null);

  // Варианты товара (attributes — только at_right)
  const [variants, setVariants] = useState([]);
  const [sharedBaseAttributes, setSharedBaseAttributes] = useState({});
  const [selectedRightPredefinedIds, setSelectedRightPredefinedIds] = useState({});

  // Состояние отправки формы
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiFillLoading, setIsAiFillLoading] = useState(false);
  const [aiBackgroundPrompt, setAiBackgroundPrompt] = useState('');
  const [isAiBackgroundLoading, setIsAiBackgroundLoading] = useState(false);
  const [aiQuota, setAiQuota] = useState(null);
  const [aiQuotaLoading, setAiQuotaLoading] = useState(true);
  const [aiQuotaFetchFailed, setAiQuotaFetchFailed] = useState(false);
  const [isAiFillOverlayDemo, setIsAiFillOverlayDemo] = useState(false);
  const aiFillFieldsLocked = isAiFillLoading || isAiFillOverlayDemo;

  const [isLoadingProduct, setIsLoadingProduct] = useState(isEditMode);
  const [productLoadError, setProductLoadError] = useState(null);

  useEffect(() => {
    if (!isEditMode || !product_id) return;

    const fetchProductData = async () => {
      try {
        setIsLoadingProduct(true);
        setProductLoadError(null);
        setImagesToDelete([]);

        const productResponse = await axios.get(`/api/business/${business_slug}/products/${product_id}/`);
        const productData = productResponse.data;

        setProductName(productData.name);
        setProductDescription(productData.description);
        setCategoryId(productData.category);
        setCategoryName(productData.category_name || '');
        setUnitOfMeasureId(productData.unit_of_measure?.id || '');
        setIsActive(productData.is_active);
        setIsVisibleOnMarketplace(productData.is_visible_on_marketplace);
        setIsVisibleOnOwnSite(productData.is_visible_on_own_site);

        setImages(
          (productData.images || []).map((img) => ({
            id: img.id,
            preview: img.image,
            isMain: img.is_main,
            isExisting: true,
          }))
        );

        const attributesResponse = await axios.get(
          `/api/business/${business_slug}/categories/${productData.category}/attributes/`
        );
        const formattedAttributes = attributesResponse.data.map((attr) => ({
          ...attr,
          values: attr.values || [],
          has_predefined_values: attr.has_predefined_values || false,
          allow_multiple: !!attr.allow_multiple,
          show_attribute_at_right: !!attr.show_attribute_at_right,
          display_order: attr.display_order ?? 0,
        }));
        setCategoryAttributes(formattedAttributes);

        const { baseAttrs: loadedBaseAttrs, rightAttrs: loadedRightAttrs } =
          splitBaseAndRightAttrs(formattedAttributes);
        const rightIdSet = new Set(loadedRightAttrs.map((a) => String(a.id)));

        if (productData.variants && productData.variants.length > 0) {
          const loadedVariants = productData.variants.map((variant, index) => {
            const attributesObj = {};
            const attributesWithIds = {};
            const attrMeta = formattedAttributes;

            (variant.attributes || []).forEach((attrRow) => {
              const attrId = String(attrRow.category_attribute);
              const meta = attrMeta.find((a) => String(a.id) === attrId);
              const isMulti = meta?.allow_multiple;

              if (!attributesWithIds[attrId]) {
                attributesWithIds[attrId] = { id: attrRow.id };
              }
              const pvId = attrRow.predefined_value;
              const customVal = attrRow.custom_value;

              if (isMulti) {
                if (!Array.isArray(attributesObj[attrId])) attributesObj[attrId] = [];
                if (pvId != null) attributesObj[attrId].push(String(pvId));
              } else {
                attributesObj[attrId] =
                  pvId != null ? String(pvId) : (customVal ?? '');
              }
            });

            return {
              id: index + 1,
              existing_id: variant.id,
              attributes: attributesObj,
              attributesWithIds,
              barcode: variant.barcode || '',
              is_barcode_auto_generated: variant.is_barcode_auto_generated || false,
              generateBarcode: false,
            };
          });

          const first = loadedVariants[0];
          const shared = emptyValuesMapForAttrs(loadedBaseAttrs);
          Object.keys(shared).forEach((k) => {
            if (first.attributes[k] !== undefined) shared[k] = first.attributes[k];
          });
          setSharedBaseAttributes(shared);

          const trimmed = loadedVariants.map((v) => ({
            ...v,
            attributes: Object.fromEntries(
              Object.entries(v.attributes).filter(([k]) => rightIdSet.has(String(k)))
            ),
          }));
          const rightPredefined = loadedRightAttrs.filter((r) => r.has_predefined_values);
          const sel = {};
          rightPredefined.forEach((a) => {
            const vals = new Set();
            trimmed.forEach((v) => {
              const x = v.attributes[String(a.id)];
              if (x != null && x !== '') {
                if (Array.isArray(x)) x.forEach((id) => vals.add(String(id)));
                else vals.add(String(x));
              }
            });
            const allowed = new Set((a.values || []).map((val) => String(val.id)));
            const picked = [...vals].filter((id) => allowed.has(id));
            sel[String(a.id)] =
              picked.length > 0
                ? picked
                : (a.values || []).map((val) => String(val.id));
          });
          setSelectedRightPredefinedIds(sel);
          setVariants(trimmed);
        } else {
          setSharedBaseAttributes(emptyValuesMapForAttrs(loadedBaseAttrs));
          setVariants([]);
          const rightPredefined = loadedRightAttrs.filter((r) => r.has_predefined_values);
          setSelectedRightPredefinedIds(
            rightPredefined.length
              ? defaultSelectedRightPredefinedIds(rightPredefined)
              : {}
          );
        }

        setIsLoadingProduct(false);
      } catch (err) {
        setProductLoadError(err.message || 'Ошибка загрузки');
        setIsLoadingProduct(false);
        console.error('Ошибка при загрузке данных товара:', err);
        alert(
          'Ошибка при загрузке товара: ' + (err.response?.data?.detail || err.message)
        );
      }
    };

    fetchProductData();
  }, [business_slug, product_id, isEditMode]);

  // Загрузка данных при монтировании
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const categoriesResponse = await axios.get(`/api/business/${business_slug}/categories/`);
        setCategories(categoriesResponse.data.results || categoriesResponse.data);

        const locationsResponse = await axios.get(`/api/business/${business_slug}/locations/`);
        setLocations(locationsResponse.data.results || locationsResponse.data);

        const unitsResponse = await axios.get(`/api/units-of-measure/`);
        setUnitsOfMeasure(unitsResponse.data);

        setIsLoadingCategories(false);
        setIsLoadingLocations(false);
        setIsLoadingUnits(false);
      } catch (err) {
        setError(err.message);
        setIsLoadingCategories(false);
        setIsLoadingLocations(false);
        setIsLoadingUnits(false);
        console.error('Ошибка при загрузке данных:', err);
      }
    };

    fetchInitialData();
  }, [business_slug]);

  const refreshAiQuota = useCallback(async () => {
    try {
      const res = await axios.get(`/api/business/${business_slug}/ai/quota/`);
      setAiQuota({ remaining: res.data.remaining, limit: res.data.limit });
      setAiQuotaFetchFailed(false);
    } catch {
      /* при фоновом обновлении не сбрасываем квоту */
    }
  }, [business_slug]);

  useEffect(() => {
    let cancelled = false;
    setAiQuotaLoading(true);
    (async () => {
      try {
        const res = await axios.get(`/api/business/${business_slug}/ai/quota/`);
        if (!cancelled) {
          setAiQuota({ remaining: res.data.remaining, limit: res.data.limit });
          setAiQuotaFetchFailed(false);
        }
      } catch {
        if (!cancelled) {
          setAiQuota(null);
          setAiQuotaFetchFailed(true);
        }
      } finally {
        if (!cancelled) setAiQuotaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [business_slug]);

  useEffect(() => {
    aiBgReviewRef.current = aiBgReview;
  }, [aiBgReview]);

  useEffect(() => {
    return () => {
      const r = aiBgReviewRef.current;
      if (r?.revokeUrls?.length) {
        r.revokeUrls.forEach((u) => URL.revokeObjectURL(u));
      }
    };
  }, []);

  const aiSuggestPhotoCost = useMemo(
    () => Math.min(images.length, 5),
    [images.length]
  );
  const aiBackgroundPhotoCost = useMemo(() => images.length, [images.length]);
  const aiBlockSuggestByQuota =
    aiQuota != null && !aiQuotaLoading && aiQuota.remaining < aiSuggestPhotoCost;
  const aiBlockBackgroundByQuota =
    aiQuota != null && !aiQuotaLoading && aiQuota.remaining < aiBackgroundPhotoCost;

  const rebuildVariantsFromCategory = useCallback((attrs) => {
    const { baseAttrs, rightAttrs } = splitBaseAndRightAttrs(attrs);
    setSharedBaseAttributes(emptyValuesMapForAttrs(baseAttrs));
    if (rightAttrs.length === 0) {
      setSelectedRightPredefinedIds({});
      setVariants([
        {
          id: 1,
          barcode: '',
          attributes: {},
          attributesWithIds: {},
          is_barcode_auto_generated: false,
          generateBarcode: false,
        },
      ]);
      return;
    }
    const allPredefined = rightAttrs.every((r) => r.has_predefined_values);
    if (allPredefined) {
      const sel = defaultSelectedRightPredefinedIds(rightAttrs);
      setSelectedRightPredefinedIds(sel);
      const n = cartesianProductSizeFromSelection(rightAttrs, sel);
      if (rightAttrs.some((a) => !(sel[String(a.id)]?.length))) {
        setVariants([]);
        return;
      }
      if (n > ENV_CONFIG.PRODUCT_ADD_MAX_VARIANTS_MATRIX) {
        alert(
          `Нельзя создать больше ${ENV_CONFIG.PRODUCT_ADD_MAX_VARIANTS_MATRIX} вариантов. Снимите лишние значения в комплектации или выберите другую категорию.`
        );
        setVariants([]);
        return;
      }
      const combos = cartesianRightCombinationsFromSelection(rightAttrs, sel);
      if (combos.length === 0) {
        alert(
          'Для атрибутов варианта не заданы значения в справочнике. Обратитесь к администратору.'
        );
        setVariants([]);
        return;
      }
      setVariants(
        combos.map((combo, idx) => ({
          id: idx + 1,
          barcode: '',
          attributes: Object.fromEntries(
            combo.map((cell) => [String(cell.attrId), cell.valueId])
          ),
          attributesWithIds: {},
          is_barcode_auto_generated: false,
          generateBarcode: false,
        }))
      );
      return;
    }
    setSelectedRightPredefinedIds({});
    const emptyR = emptyValuesMapForAttrs(rightAttrs);
    setVariants([
      {
        id: 1,
        barcode: '',
        attributes: emptyR,
        attributesWithIds: {},
        is_barcode_auto_generated: false,
        generateBarcode: false,
      },
    ]);
  }, []);

  // Загрузка атрибутов при изменении категории
  const fetchCategoryAttributes = async (categoryId) => {
    try {
      setIsLoadingAttributes(true);
      setAttributesError(null);
      const response = await axios.get(`/api/business/${business_slug}/categories/${categoryId}/attributes/`);
      const formattedAttributes = response.data.map((attr) => ({
        ...attr,
        values: attr.values || [],
        has_predefined_values: attr.has_predefined_values || false,
        allow_multiple: !!attr.allow_multiple,
        show_attribute_at_right: !!attr.show_attribute_at_right,
        display_order: attr.display_order ?? 0,
      }));
      setCategoryAttributes(formattedAttributes);
      rebuildVariantsFromCategory(formattedAttributes);
    } catch (err) {
      setAttributesError(err.message);
      console.error('Ошибка при загрузке атрибутов категории:', err);
    } finally {
      setIsLoadingAttributes(false);
    }
  };

  const { baseAttrs, rightAttrs } = useMemo(
    () => splitBaseAndRightAttrs(categoryAttributes),
    [categoryAttributes]
  );
  const rightPredefinedAttrs = useMemo(
    () => rightAttrs.filter((r) => r.has_predefined_values),
    [rightAttrs]
  );
  const allRightPredefined =
    rightAttrs.length > 0 && rightAttrs.every((r) => r.has_predefined_values);
  const variantMatrixMode =
    rightAttrs.length === 0 ? 'none' : allRightPredefined ? 'cartesian' : 'free';
  const allowRemoveVariant = variantMatrixMode === 'free' && variants.length > 1;

  const rightComboKey = (attrs, predefinedList) =>
    predefinedList.map((a) => `${a.id}:${attrs[String(a.id)] ?? ''}`).join('|');

  const toggleRightPredefinedValue = (attrId, valueId) => {
    setSelectedRightPredefinedIds((prev) => {
      const k = String(attrId);
      const v = String(valueId);
      const cur = new Set(prev[k] ?? []);
      if (cur.has(v)) cur.delete(v);
      else cur.add(v);
      const next = { ...prev, [k]: Array.from(cur) };
      const { rightAttrs: ra } = splitBaseAndRightAttrs(categoryAttributes);
      const predefined = ra.filter((r) => r.has_predefined_values);
      if (predefined.some((a) => !(next[String(a.id)]?.length))) {
        setVariants([]);
        return next;
      }
      const n = cartesianProductSizeFromSelection(predefined, next);
      if (n > ENV_CONFIG.PRODUCT_ADD_MAX_VARIANTS_MATRIX) {
        alert(
          `Нельзя создать больше ${ENV_CONFIG.PRODUCT_ADD_MAX_VARIANTS_MATRIX} вариантов. Снимите часть значений в комплектации.`
        );
        return prev;
      }
      const combos = cartesianRightCombinationsFromSelection(predefined, next);
      setVariants((prevVariants) => {
        const map = new Map();
        prevVariants.forEach((pv) => {
          map.set(rightComboKey(pv.attributes, predefined), pv);
        });
        let maxId = prevVariants.reduce((m, x) => Math.max(m, x.id), 0);
        return combos.map((combo) => {
          const attributes = Object.fromEntries(
            combo.map((c) => [String(c.attrId), c.valueId])
          );
          const old = map.get(rightComboKey(attributes, predefined));
          if (old) return { ...old, attributes };
          maxId += 1;
          return {
            id: maxId,
            attributes,
            attributesWithIds: {},
            barcode: '',
            is_barcode_auto_generated: false,
            generateBarcode: false,
          };
        });
      });
      return next;
    });
  };

  const handleSharedBaseChange = (attributeId, value) => {
    const normalized = Array.isArray(value)
      ? value
      : typeof value === 'number'
        ? String(value)
        : value;
    setSharedBaseAttributes((prev) => ({
      ...prev,
      [String(attributeId)]: normalized,
    }));
  };

  const handleAddVariant = () => {
    if (variantMatrixMode !== 'free') return;
    if (variants.length >= ENV_CONFIG.PRODUCT_ADD_MAX_VARIANTS_FREE_RIGHT_ATTR) {
      alert(
        `Нельзя создать больше ${ENV_CONFIG.PRODUCT_ADD_MAX_VARIANTS_FREE_RIGHT_ATTR} вариантов.`
      );
      return;
    }
    const emptyR = emptyValuesMapForAttrs(rightAttrs);
    setVariants((prev) => {
      const nextId = prev.reduce((m, v) => Math.max(m, v.id), 0) + 1;
      return [
        ...prev,
        {
          id: nextId,
          barcode: '',
          attributes: emptyR,
          attributesWithIds: {},
          is_barcode_auto_generated: false,
          generateBarcode: false,
        },
      ];
    });
  };

  // Изменение варианта (value для атрибута с предустановленными значениями — массив id)
  const handleVariantChange = (id, field, value, attributeId = null) => {
    setVariants(variants.map(variant => {
      if (variant.id === id) {
        if (field === 'barcode') {
          return { ...variant, [field]: value, generateBarcode: false };
        }
        if (attributeId !== null) {
          const normalized = Array.isArray(value) ? value : (typeof value === 'number' ? String(value) : value);
          return {
            ...variant,
            attributes: {
              ...variant.attributes,
              [String(attributeId)]: normalized
            }
          };
        } else {
          return { ...variant, [field]: value };
        }
      }
      return variant;
    }));
  };

  const handleGenerateBarcodeChange = (variantId, checked) => {
    setVariants(variants.map(variant => {
      if (variant.id === variantId) {
        return {
          ...variant,
          generateBarcode: checked,
          barcode: checked ? '' : variant.barcode
        };
      }
      return variant;
    }));
  };

  const handleCopyLastVariant = () => {
    if (variantMatrixMode !== 'free') return;
    if (variants.length === 0) return;
    if (variants.length >= ENV_CONFIG.PRODUCT_ADD_MAX_VARIANTS_FREE_RIGHT_ATTR) {
      alert(
        `Нельзя создать больше ${ENV_CONFIG.PRODUCT_ADD_MAX_VARIANTS_FREE_RIGHT_ATTR} вариантов.`
      );
      return;
    }
    setVariants((prev) => {
      if (prev.length === 0) return prev;
      const lastVariant = prev[prev.length - 1];
      const copiedAttributes = {};
      Object.entries(lastVariant.attributes || {}).forEach(([key, val]) => {
        copiedAttributes[String(key)] = Array.isArray(val)
          ? [...val]
          : typeof val === 'number'
            ? String(val)
            : val;
      });
      const nextId = prev.reduce((m, v) => Math.max(m, v.id), 0) + 1;
      return [
        ...prev,
        {
          id: nextId,
          barcode: lastVariant.barcode || '',
          attributes: copiedAttributes,
          attributesWithIds: {},
          is_barcode_auto_generated: false,
          generateBarcode: false,
        },
      ];
    });
  };

  const handleRemoveVariant = (id) => {
    if (!allowRemoveVariant) return;
    setVariants((prev) => prev.filter((variant) => variant.id !== id));
  };

  // Изображения
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      cropSessionRef.current = { mode: 'add', orderedIds: [], filesLength: 0 };
      setCroppingData({
        files: Array.from(files),
        currentIndex: 0,
        croppedImages: []
      });
      setIsModalOpen(true);
      document.body.classList.add(styles.bodyNoScroll);
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedFile, index) => {
    const session = cropSessionRef.current;
    if (session.mode === 'replace_ai' && session.orderedIds.length > 0) {
      const slotId = session.orderedIds[index];
      setImages((prev) =>
        prev.map((img) => {
          if (img.id !== slotId) return img;
          if (img.preview && img.preview.startsWith('blob:')) {
            URL.revokeObjectURL(img.preview);
          }
          return {
            ...img,
            file: croppedFile,
            preview: URL.createObjectURL(croppedFile),
          };
        })
      );
      if (index === session.filesLength - 1) {
        cropSessionRef.current = { mode: 'add', orderedIds: [], filesLength: 0 };
        setIsModalOpen(false);
        document.body.classList.remove(styles.bodyNoScroll);
        setCroppingData({
          files: [],
          currentIndex: 0,
          croppedImages: [],
        });
      }
      return;
    }

    setImages((prev) => {
      const newImage = {
        id: Date.now() + index,
        file: croppedFile,
        preview: URL.createObjectURL(croppedFile),
        isMain: prev.length === 0 && index === 0,
      };
      return [...prev, newImage];
    });

    setCroppingData((cd) => {
      if (index === cd.files.length - 1) {
        cropSessionRef.current = { mode: 'add', orderedIds: [], filesLength: 0 };
        setIsModalOpen(false);
        document.body.classList.remove(styles.bodyNoScroll);
        return {
          files: [],
          currentIndex: 0,
          croppedImages: [],
        };
      }
      return cd;
    });
  };

  const handleNextImage = () => {
    setCroppingData(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1
    }));
  };

  const handleCancelCropping = () => {
    cropSessionRef.current = { mode: 'add', orderedIds: [], filesLength: 0 };
    setIsModalOpen(false);
    document.body.classList.remove(styles.bodyNoScroll);
    setCroppingData({
      files: [],
      currentIndex: 0,
      croppedImages: []
    });
  };

  const handlePreviousImage = () => {
    setCroppingData(prev => ({
      ...prev,
      currentIndex: prev.currentIndex - 1
    }));
  };

  const handleAiBgReviewReject = () => {
    if (!aiBgReview) return;
    aiBgReview.revokeUrls.forEach((u) => URL.revokeObjectURL(u));
    setAiBgReview(null);
    document.body.classList.remove(styles.bodyNoScroll);
  };

  const handleAiBgReviewAccept = () => {
    if (!aiBgReview) return;
    const review = aiBgReview;
    setImages((prev) =>
      prev.map((img, idx) => {
        const item = review.items[idx];
        if (!item?.hadAi) return img;
        if (img.preview && img.preview.startsWith('blob:') && img.preview !== item.preview) {
          URL.revokeObjectURL(img.preview);
        }
        return {
          ...img,
          file: item.file,
          preview: item.preview,
        };
      })
    );
    cropSessionRef.current = {
      mode: 'replace_ai',
      orderedIds: review.orderedIds,
      filesLength: review.filesForCropper.length,
    };
    setCroppingData({
      files: review.filesForCropper,
      currentIndex: 0,
      croppedImages: [],
    });
    setIsModalOpen(true);
    setAiBgReview(null);
    document.body.classList.add(styles.bodyNoScroll);
  };

  const handleSetMainImage = (id) => {
    setImages(prevImages => {
      const currentMain = prevImages.find(img => img.isMain);
      if (currentMain?.id === id) return prevImages;

      const newImages = [...prevImages];
      const newMainIndex = newImages.findIndex(img => img.id === id);
      if (newMainIndex === -1) return prevImages;

      const updatedImages = newImages.map(img => ({
        ...img,
        isMain: img.id === id
      }));

      const [newMainImage] = updatedImages.splice(newMainIndex, 1);
      return [newMainImage, ...updatedImages];
    });
  };

  const handleRemoveImage = (id) => {
    setImages(prevImages => {
      const imageToRemove = prevImages.find(img => img.id === id);
      if (imageToRemove?.isMain && prevImages.length > 1) {
        if (!window.confirm('Вы удаляете главное изображение. Продолжить?')) {
          return prevImages;
        }
      }
      if (!imageToRemove) return prevImages;

      if (imageToRemove.isExisting) {
        setImagesToDelete((del) => [...del, imageToRemove.id]);
      }

      const newImages = prevImages.filter(img => img.id !== id);
      if (imageToRemove.isMain && newImages.length > 0) {
        newImages[0].isMain = true;
      }
      return newImages;
    });
  };

  const handleImagesReorder = (newImages) => {
    setImages(newImages);
  };

  const handleAiFill = async () => {
    if (!categoryId || images.length === 0 || isLoadingAttributes) return;
    setIsAiFillLoading(true);
    try {
      const resolved = [];
      for (const img of images.slice(0, 5)) {
        const file = await resolveImageFileForAi(img);
        if (file) resolved.push(file);
      }
      if (resolved.length === 0) {
        alert(
          'Не удалось подготовить фото для ИИ. Добавьте новые снимки с устройства или попробуйте позже.'
        );
        return;
      }
      const formData = new FormData();
      formData.append('category_id', String(categoryId));
      resolved.forEach((file) => {
        formData.append('images', file, file.name || 'photo.jpg');
      });
      const response = await axios.post(
        `/api/business/${business_slug}/ai/product-suggest-from-images/`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: ENV_CONFIG.AI_VISION_SUGGEST_TIMEOUT_MS,
        }
      );
      if (response.status !== 202 || !response.data?.task_id) {
        alert('Некорректный ответ сервера: ожидался идентификатор задачи ИИ.');
        return;
      }
      const data = await pollAiTaskResult(response.data.task_id, {
        deadlineMs: ENV_CONFIG.AI_VISION_SUGGEST_TIMEOUT_MS,
      });
      if (data.name) setProductName(data.name);
      if (data.description) setProductDescription(data.description);

      const attrsFromApi =
        data.attributes && typeof data.attributes === 'object' ? data.attributes : {};
      const { rightAttrs: rightAttrsAi } = splitBaseAndRightAttrs(categoryAttributes);
      const rightIdSet = new Set(rightAttrsAi.map((a) => String(a.id)));

      const applyAttrValue = (attr, rawVal) => {
        if (attr.has_predefined_values) {
          if (attr.allow_multiple) {
            return Array.isArray(rawVal)
              ? rawVal.map(String)
              : rawVal != null && rawVal !== ''
                ? [String(rawVal)]
                : [];
          }
          return rawVal != null && rawVal !== '' ? String(rawVal) : '';
        }
        return rawVal != null ? String(rawVal) : '';
      };

      setSharedBaseAttributes((prev) => {
        const next = { ...prev };
        Object.entries(attrsFromApi).forEach(([attrId, val]) => {
          if (rightIdSet.has(String(attrId))) return;
          const attr = categoryAttributes.find((a) => String(a.id) === String(attrId));
          if (!attr) return;
          next[String(attrId)] = applyAttrValue(attr, val);
        });
        return next;
      });

      const cartesianAi =
        rightAttrsAi.length > 0 && rightAttrsAi.every((r) => r.has_predefined_values);

      setVariants((prev) => {
        if (categoryAttributes.length === 0) return prev;
        if (cartesianAi) return prev;
        if (prev.length === 0) {
          const emptyR = emptyValuesMapForAttrs(rightAttrsAi);
          const attrs = { ...emptyR };
          Object.entries(attrsFromApi).forEach(([attrId, val]) => {
            if (!rightIdSet.has(String(attrId))) return;
            const attr = categoryAttributes.find((a) => String(a.id) === String(attrId));
            if (!attr) return;
            attrs[String(attrId)] = applyAttrValue(attr, val);
          });
          return [
            {
              id: 1,
              barcode: '',
              attributes: attrs,
              attributesWithIds: {},
              is_barcode_auto_generated: false,
              generateBarcode: false,
            },
          ];
        }
        const first = { ...prev[0], attributes: { ...prev[0].attributes } };
        Object.entries(attrsFromApi).forEach(([attrId, val]) => {
          if (!rightIdSet.has(String(attrId))) return;
          const attr = categoryAttributes.find((a) => String(a.id) === String(attrId));
          if (!attr) return;
          first.attributes[String(attrId)] = applyAttrValue(attr, val);
        });
        return [first, ...prev.slice(1)];
      });

      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        alert('ИИ: часть полей нужно проверить вручную:\n' + data.warnings.join('\n'));
      }
      await refreshAiQuota();
    } catch (err) {
      if (err.response?.status === 403) {
        await refreshAiQuota();
      }
      const msg = err.response?.data?.detail || err.message || 'Ошибка запроса к ИИ';
      alert(msg);
      console.error('AI fill:', err.response?.data || err);
    } finally {
      setIsAiFillLoading(false);
    }
  };

  const handleAiBackgroundImages = async () => {
    if (images.length === 0) return;
    if (aiBgReview) return;
    const trimmedPrompt = aiBackgroundPrompt.trim();
    if (!trimmedPrompt) {
      alert(
        'Введите описание фона: без него запрос к ИИ не отправляется (до 100 символов).'
      );
      return;
    }
    if (aiBackgroundPrompt.length > AI_BACKGROUND_PROMPT_MAX) {
      alert(`Описание фона не длиннее ${AI_BACKGROUND_PROMPT_MAX} символов.`);
      return;
    }
    if (images.length > AI_BACKGROUND_MAX_IMAGES) {
      alert(
        `За один запрос обрабатывается не более ${AI_BACKGROUND_MAX_IMAGES} фото. Удалите лишние или разбейте на несколько запросов.`
      );
      return;
    }
    handleCancelCropping();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsAiBackgroundLoading(true);
    try {
      const resolved = [];
      for (const img of images) {
        const file = await resolveImageFileForAi(img);
        if (file) resolved.push(file);
      }
      if (resolved.length !== images.length || resolved.length === 0) {
        alert(
          'Не все фото удалось подготовить для ИИ. Добавьте снимки заново или проверьте доступ к изображениям.'
        );
        return;
      }
      const formData = new FormData();
      formData.append('background_prompt', trimmedPrompt);
      resolved.forEach((file) => {
        formData.append('images', file, file.name || 'photo.jpg');
      });
      const response = await axios.post(
        `/api/business/${business_slug}/ai/product-background-images/`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: ENV_CONFIG.AI_VISION_SUGGEST_TIMEOUT_MS,
        }
      );
      if (response.status !== 202 || !response.data?.task_id) {
        alert('Некорректный ответ сервера: ожидался идентификатор задачи ИИ.');
        return;
      }
      const data = await pollAiTaskResult(response.data.task_id, {
        deadlineMs: ENV_CONFIG.AI_VISION_SUGGEST_TIMEOUT_MS,
      });
      const b64List = data.images_base64;
      if (!Array.isArray(b64List) || b64List.length !== images.length) {
        alert('Некорректный ответ сервера: число изображений не совпало.');
        return;
      }
      const orderedIds = images.map((img) => img.id);
      const filesForCropper = [];
      const items = [];
      const revokeUrls = [];

      images.forEach((img, idx) => {
        const b64 = b64List[idx];
        if (!b64 || typeof b64 !== 'string') {
          filesForCropper[idx] = img.file;
          items.push({ hadAi: false, file: img.file, preview: img.preview });
          return;
        }
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        const file = new File([blob], `catalog-${img.id}.jpg`, { type: 'image/jpeg' });
        const preview = URL.createObjectURL(blob);
        revokeUrls.push(preview);
        filesForCropper[idx] = file;
        items.push({ hadAi: true, file, preview });
      });

      setAiBgReview({
        orderedIds,
        filesForCropper,
        items,
        revokeUrls,
      });
      document.body.classList.add(styles.bodyNoScroll);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (data.user_message) {
        alert(data.user_message);
      }
      await refreshAiQuota();
    } catch (err) {
      if (err.response?.status === 403) {
        await refreshAiQuota();
      }
      const msg = err.response?.data?.detail || err.message || 'Ошибка обработки фото';
      alert(msg);
      console.error('AI background:', err.response?.data || err);
    } finally {
      setIsAiBackgroundLoading(false);
    }
  };

  // Валидация формы
  const validateForm = () => {
    if (!productName.trim()) {
      return { valid: false, message: "Заполните название товара." };
    }

    if (!categoryId) {
      return {
        valid: false,
        message: isEditMode
          ? 'Категория товара не определена.'
          : 'Выберите категорию товара.',
      };
    }

    if (!productDescription.trim()) {
      return { valid: false, message: "Добавьте описание товара." };
    }

    if (!String(unitOfMeasureId || '').trim()) {
      return { valid: false, message: 'Выберите единицу измерения.' };
    }

    if (images.length === 0) {
      return { valid: false, message: "Добавьте хотя бы одно изображение." };
    }

    if (!images.some(img => img.isMain)) {
      return { valid: false, message: "Выберите главное изображение." };
    }

    if (variants.length === 0) {
      return { valid: false, message: "Добавьте хотя бы один вариант товара." };
    }

    if (variantMatrixMode === 'cartesian' && variants.length > ENV_CONFIG.PRODUCT_ADD_MAX_VARIANTS_MATRIX) {
      return {
        valid: false,
        message: `Нельзя создать больше ${ENV_CONFIG.PRODUCT_ADD_MAX_VARIANTS_MATRIX} вариантов. Уменьшите число комбинаций в комплектации.`,
      };
    }

    if (variantMatrixMode === 'free' && variants.length > ENV_CONFIG.PRODUCT_ADD_MAX_VARIANTS_FREE_RIGHT_ATTR) {
      return {
        valid: false,
        message: `Нельзя создать больше ${ENV_CONFIG.PRODUCT_ADD_MAX_VARIANTS_FREE_RIGHT_ATTR} вариантов.`,
      };
    }

    for (let [index, variant] of variants.entries()) {
      const merged = { ...sharedBaseAttributes, ...variant.attributes };
      for (let attr of categoryAttributes) {
        const val = merged[attr.id];
        const isEmpty = attr.has_predefined_values
          ? (attr.allow_multiple
              ? (!Array.isArray(val) || val.length === 0)
              : (val === undefined || val === null || val === ''))
          : (val === undefined || val === null || String(val).trim() === '');
        if (isEmpty) {
          const scope = attr.show_attribute_at_right
            ? `Вариант ${index + 1}`
            : 'Общие атрибуты';
          return {
            valid: false,
            message: `${scope}: заполните атрибут «${attr.name}».`
          };
        }
      }
    }

    return { valid: true, message: "" };
  };

  // Подготовка данных для отправки
  const prepareProductData = () => {
    const formData = new FormData();

    const mergedAttributesToPayloadCreate = (mergedMap) =>
      Object.entries(mergedMap).map(([attrId, value]) => {
        const attribute = categoryAttributes.find((a) => String(a.id) === String(attrId));
        const isPredefined = attribute?.has_predefined_values;
        if (isPredefined) {
          const ids = Array.isArray(value) ? value : (value !== '' && value != null ? [value] : []);
          return attribute?.allow_multiple
            ? {
                category_attribute: Number(attrId),
                predefined_value: null,
                predefined_values: ids.map(Number),
                custom_value: '',
              }
            : {
                category_attribute: Number(attrId),
                predefined_value: ids[0] != null ? Number(ids[0]) : null,
                custom_value: '',
              };
        }
        return {
          category_attribute: Number(attrId),
          predefined_value: null,
          custom_value: String(value ?? ''),
        };
      });

    if (isEditMode) {
      const jsonData = {
        name: productName,
        description: productDescription,
        category: categoryId,
        unit_of_measure: unitOfMeasureId || null,
        is_active: isActive,
        is_visible_on_marketplace: isVisibleOnMarketplace,
        is_visible_on_own_site: isVisibleOnOwnSite,
        images_to_delete: imagesToDelete,
        variants: variants.map((variant) => {
          const merged = { ...sharedBaseAttributes, ...variant.attributes };
          return {
            id: variant.existing_id,
            barcode: variant.generateBarcode ? '' : (variant.barcode || ''),
            generate_barcode: variant.generateBarcode || false,
            attributes: Object.entries(merged).map(([attrId, value]) => {
              const attribute = categoryAttributes.find((a) => String(a.id) === String(attrId));
              const isPredefined = attribute?.has_predefined_values;
              if (isPredefined) {
                const ids = Array.isArray(value) ? value : (value !== '' && value != null ? [value] : []);
                return attribute?.allow_multiple
                  ? {
                      id: variant.attributesWithIds?.[attrId]?.id,
                      category_attribute: Number(attrId),
                      predefined_value: null,
                      predefined_values: ids.map(Number),
                      custom_value: '',
                    }
                  : {
                      id: variant.attributesWithIds?.[attrId]?.id,
                      category_attribute: Number(attrId),
                      predefined_value: ids[0] != null ? Number(ids[0]) : null,
                      custom_value: '',
                    };
              }
              return {
                id: variant.attributesWithIds?.[attrId]?.id,
                category_attribute: Number(attrId),
                predefined_value: null,
                custom_value: String(value ?? ''),
              };
            }),
          };
        }),
      };
      formData.append('data', JSON.stringify(jsonData));

      images.forEach((image, index) => {
        if (!image.isExisting && image.file) {
          formData.append(`images[${index}][image]`, image.file);
          formData.append(`images[${index}][is_main]`, image.isMain ? 'true' : 'false');
          formData.append(`images[${index}][display_order]`, String(index));
        }
      });

      images.forEach((image, index) => {
        if (image.isExisting) {
          formData.append(`existing_images[${index}][id]`, String(image.id));
          formData.append(`existing_images[${index}][is_main]`, image.isMain ? 'true' : 'false');
          formData.append(`existing_images[${index}][display_order]`, String(index));
        }
      });

      return formData;
    }

    const jsonPayload = {
      name: productName,
      description: productDescription,
      category: categoryId,
      unit_of_measure: unitOfMeasureId || null,
      is_active: isActive,
      is_visible_on_marketplace: isVisibleOnMarketplace,
      is_visible_on_own_site: isVisibleOnOwnSite,
      variants: variants.map((variant) => {
        const merged = { ...sharedBaseAttributes, ...variant.attributes };
        return {
          barcode: variant.barcode || '',
          attributes: mergedAttributesToPayloadCreate(merged),
        };
      }),
    };

    formData.append('data', JSON.stringify(jsonPayload));

    images.forEach((image, index) => {
      formData.append(`images[${index}][image]`, image.file);
      formData.append(`images[${index}][is_main]`, image.isMain ? 'true' : 'false');
      formData.append(`images[${index}][display_order]`, String(index));
    });

    return formData;
  };

  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isAiFillLoading || isAiBackgroundLoading) {
      return;
    }

    if (aiBgReview) {
      alert('Сначала примите или отклоните новые фото от ИИ.');
      return;
    }

    if (isSubmitting) {
      return;
    }

    const validation = validateForm();
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const productData = prepareProductData();
      const url = isEditMode
        ? `/api/business/${business_slug}/products/${product_id}/edit`
        : `/api/business/${business_slug}/products/create/`;

      await axios.post(url, productData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (isEditMode) {
        alert('Товар успешно обновлён');
      } else {
        alert('Товар успешно сохранён');
      }
      navigate(`/business/${business_slug}/products/`);
    } catch (error) {
      console.error(
        isEditMode ? 'Ошибка при обновлении товара:' : 'Ошибка при создании товара:',
        error.response?.data || error.message
      );
      alert(
        (isEditMode ? 'Ошибка при обновлении товара: ' : 'Ошибка при создании товара: ') +
          (error.response?.data?.detail || error.message)
      );
      setIsSubmitting(false);
    }
  };

  const aiBackgroundAction = useMemo(() => {
    if (isAiBackgroundLoading) {
      return {
        visual: 'busy',
        hint: 'Идёт обработка фотографий…',
        disabled: true,
        label: 'Обработка фото…',
      };
    }
    if (aiBlockBackgroundByQuota) {
      return {
        visual: 'quota',
        hint: 'Месячный лимит запросов к ИИ исчерпан. Докупите запросы в блоке квоты выше.',
        disabled: true,
        label: 'Лимит ИИ исчерпан',
      };
    }
    if (aiBgReview) {
      return {
        visual: 'waiting',
        hint: 'Сначала примите или отмените результат обработки фона в окне предпросмотра.',
        disabled: true,
        label: 'Нормализовать фото для витрины',
      };
    }
    if (images.length === 0) {
      return {
        visual: 'waiting',
        hint: 'Сначала добавьте хотя бы одно фото в блок выше.',
        disabled: true,
        label: 'Нормализовать фото для витрины',
      };
    }
    if (!aiBackgroundPrompt.trim()) {
      return {
        visual: 'waiting',
        hint: 'Введите описание желаемого фона — без текста запрос к ИИ не уходит.',
        disabled: true,
        label: 'Нормализовать фото для витрины',
      };
    }
    return {
      visual: 'ready',
      hint: null,
      disabled: false,
      label: 'Нормализовать фото для витрины',
    };
  }, [
    isAiBackgroundLoading,
    aiBlockBackgroundByQuota,
    aiBgReview,
    images.length,
    aiBackgroundPrompt,
  ]);

  const aiSuggestAction = useMemo(() => {
    if (isAiFillLoading) {
      return {
        visual: 'busy',
        hint: 'ИИ заполняет поля карточки, подождите…',
        disabled: true,
        label: 'ИИ обрабатывает…',
      };
    }
    if (aiBlockSuggestByQuota) {
      return {
        visual: 'quota',
        hint: 'Месячный лимит запросов к ИИ исчерпан. Докупите запросы в блоке квоты выше.',
        disabled: true,
        label: 'Лимит ИИ исчерпан',
      };
    }
    if (attributesError) {
      return {
        visual: 'waiting',
        hint: `Ошибка загрузки атрибутов: ${attributesError}`,
        disabled: true,
        label: 'Заполнить с ИИ',
      };
    }
    if (isLoadingAttributes && categoryId) {
      return {
        visual: 'busy',
        hint: 'Загружаются атрибуты выбранной категории…',
        disabled: true,
        label: 'Заполнить с ИИ',
      };
    }
    if (!categoryId && images.length === 0) {
      return {
        visual: 'waiting',
        hint:
          'Укажите категорию товара в блоке ниже и добавьте хотя бы одно фото.',
        disabled: true,
        label: 'Заполнить с ИИ',
      };
    }
    if (!categoryId) {
      return {
        visual: 'waiting',
        hint: 'Выберите категорию товара в блоке ниже.',
        disabled: true,
        label: 'Заполнить с ИИ',
      };
    }
    if (images.length === 0) {
      return {
        visual: 'waiting',
        hint: 'Добавьте хотя бы одно фото в блок выше.',
        disabled: true,
        label: 'Заполнить с ИИ',
      };
    }
    return {
      visual: 'ready',
      hint: null,
      disabled: false,
      label: 'Заполнить с ИИ',
    };
  }, [
    isAiFillLoading,
    aiBlockSuggestByQuota,
    attributesError,
    isLoadingAttributes,
    categoryId,
    images.length,
  ]);

  if (isEditMode && isLoadingProduct) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Loader size="large" />
      </div>
    );
  }

  if (isEditMode && productLoadError) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: '1rem',
          padding: '1rem',
        }}
      >
        <h2>Ошибка загрузки товара</h2>
        <p>{productLoadError}</p>
        <button
          type="button"
          onClick={() => navigate(`/business/${business_slug}/products/`)}
        >
          Вернуться к списку товаров
        </button>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.container}>
        {aiBgReview && (
          <div
            className={styles.aiBgReviewModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-bg-review-title-m"
          >
            <div className={styles.aiBgReviewPanel}>
              <h3 id="ai-bg-review-title-m" className={styles.aiBgReviewTitle}>
                Результат смены фона
              </h3>
              <p className={styles.aiBgReviewHint}>
                Если фото не подходят, останутся прежние изображения. Если всё устраивает — откроется обрезка под формат витрины.
                Просмотр крупным планом — как у чека в онлайн-заказе (маска «Просмотр», листание по стрелкам).
              </p>
              <PreviewableImage.PreviewGroup preview={{ zIndex: 3500, mask: 'Просмотр' }}>
                <div className={styles.aiBgReviewGrid}>
                  {aiBgReview.items.map((item, i) => (
                    <div key={i} className={styles.aiBgReviewCell}>
                      <PreviewableImage
                        src={item.preview}
                        alt={`Фото ${i + 1}`}
                        className={styles.aiBgReviewThumb}
                        rootClassName={styles.aiBgReviewThumbRoot}
                      />
                    </div>
                  ))}
                </div>
              </PreviewableImage.PreviewGroup>
              <div className={styles.aiBgReviewActions}>
                <button
                  type="button"
                  className={styles.aiBgReviewReject}
                  onClick={handleAiBgReviewReject}
                >
                  Не подходит
                </button>
                <button
                  type="button"
                  className={styles.aiBgReviewAccept}
                  onClick={handleAiBgReviewAccept}
                >
                  Принять и обрезать
                </button>
              </div>
            </div>
          </div>
        )}
        {croppingData.files.length > 0 && (
          <div className={styles.cropModal}>
            <ImageCropper
              files={croppingData.files}
              currentIndex={croppingData.currentIndex}
              onCropComplete={handleCropComplete}
              onCancel={handleCancelCropping}
              onNext={handleNextImage}
              onPrevious={handlePreviousImage}
            />
          </div>
        )}
        
        {/* Sticky Header */}
        <div className={styles.header}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate(`/business/${business_slug}/products/`)}
            aria-label="Назад"
          >
            <FaArrowLeft />
          </button>
          <h1 className={styles.pageTitle}>
            {isEditMode ? 'Редактирование товара' : 'Добавление товара'}
          </h1>
        </div>

        <div className={styles.content}>

          <form id="product-form" onSubmit={handleSubmit} className={styles.productForm}>
            <div className={styles.addProductLayout}>
              <div className={styles.addProductColLeft}>
            {/* Секция фотографий */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h5><FaImages className={styles.sectionIcon} /> Фотографии товара</h5>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.uploadRow}>
                  <div className={styles.uploadColumn}>
                    <div
                      className={styles.uploadArea}
                      onClick={handleUploadClick}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleFileChange({ target: { files: e.dataTransfer.files } });
                      }}
                    >
                      <div className={styles.uploadIcon}>
                        <FaCloudUploadAlt />
                      </div>
                      <h5>Перетащите сюда фотографии</h5>
                      <p className={styles.uploadHint}>или нажмите для выбора файлов</p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className={styles.fileInput}
                      aria-hidden="true"
                    />
                  </div>
                  <div className={styles.infoColumn}>
                    <div className={styles.infoAlert}>
                      <h6><FaInfoCircle className={styles.infoIcon} /> Советы по фотографиям:</h6>
                      <ul>
                        <li>Используйте качественные изображения</li>
                        <li>Первое фото будет главным</li>
                        <li>Минимум 3 фото для лучшего эффекта</li>
                        <li>Формат JPG или PNG</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className={styles.thumbnailsSection}>
                  <h6 className={styles.thumbnailsTitle}>
                    Загруженные фотографии ({images.length}):
                  </h6>
                  <DraggableImageList
                    images={images}
                    onImagesReorder={handleImagesReorder}
                    onSetMainImage={handleSetMainImage}
                    onRemoveImage={handleRemoveImage}
                  />
                </div>
                <div className={styles.aiFillRow}>
                    <AiQuotaBar
                      businessSlug={business_slug}
                      loading={aiQuotaLoading}
                      fetchFailed={aiQuotaFetchFailed}
                      quota={aiQuota}
                      neededCount={
                        images.length > 0
                          ? Math.max(
                              aiBackgroundPhotoCost,
                              aiSuggestPhotoCost
                            )
                          : undefined
                      }
                    />
                    <AiBackgroundPromptField
                      textareaId="ai-background-prompt-m"
                      businessSlug={business_slug}
                      value={aiBackgroundPrompt}
                      onValueChange={setAiBackgroundPrompt}
                      disabled={
                        images.length === 0 ||
                        isAiBackgroundLoading ||
                        !!aiBgReview
                      }
                      maxLength={AI_BACKGROUND_PROMPT_MAX}
                      hint={
                        <p className={styles.aiFillHint} style={{ marginTop: '0.35rem' }}>
                          Обязательно: xAI меняет фон по описанию (до {AI_BACKGROUND_PROMPT_MAX} символов). До{' '}
                          {AI_BACKGROUND_MAX_IMAGES} фото, по очереди; при нескольких файлах долго.
                        </p>
                      }
                    />
                    <div className={styles.aiActionCardWrap}>
                      <AiActionCard
                        shellIcon={<FaImage />}
                        visualState={aiBackgroundAction.visual}
                        prereqHint={aiBackgroundAction.hint}
                        disabled={aiBackgroundAction.disabled}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAiBackgroundImages();
                        }}
                      >
                        {aiBackgroundAction.label}
                      </AiActionCard>
                    </div>
                  </div>
                <div className={styles.aiFillRow}>
                    <AiActionCard
                      shellIcon={<FaMagic />}
                      visualState={aiSuggestAction.visual}
                      prereqHint={aiSuggestAction.hint}
                      disabled={aiSuggestAction.disabled}
                      onClick={handleAiFill}
                    >
                      {aiSuggestAction.label}
                    </AiActionCard>
                    <p className={styles.aiFillHint}>
                      Название, описание, атрибуты и комплектация первой строки. При сетке вариантов — только общие поля. Сначала выберите категорию в блоке ниже.
                    </p>
                    {aiFillFieldsLocked && (
                      <p className={styles.aiFillFieldsLockedHint} role="status">
                        {isAiFillLoading
                          ? 'Временно недоступны: название, описание, общие атрибуты и первая строка комплектации (в ручном режиме). Остальное можно менять.'
                          : 'Тест: заблокированы те же поля, что и при запросе к ИИ.'}
                      </p>
                    )}
                  </div>
                {import.meta.env.DEV && (
                  <div className={styles.aiFillDemoRow}>
                    <button
                      type="button"
                      className={styles.aiFillDemoButton}
                      onClick={() => setIsAiFillOverlayDemo((v) => !v)}
                    >
                      {isAiFillOverlayDemo
                        ? 'Снять тест блокировки'
                        : 'Тест: блокировка полей как при ИИ'}
                    </button>
                    <span className={styles.aiFillDemoNote}>только в dev</span>
                  </div>
                )}
              </div>
            </div>

            {/* Секция основной информации */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h5><FaInfoCircle className={styles.sectionIcon} /> Основная информация</h5>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="product-name" className={styles.formLabel}>Название товара *</label>
                    <input
                      type="text"
                      id="product-name"
                      className={styles.formControl}
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      required
                      disabled={aiFillFieldsLocked}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="product-category" className={styles.formLabel}>
                      Категория *{isEditMode ? ' (нельзя изменить)' : ''}
                    </label>
                    {isEditMode ? (
                      <>
                        <input
                          type="text"
                          id="product-category"
                          className={styles.formControl}
                          value={categoryName}
                          readOnly
                          disabled
                        />
                        <input type="hidden" value={categoryId} readOnly aria-hidden="true" />
                      </>
                    ) : isLoadingCategories ? (
                      <div className={styles.categoriesLoadingWrap}>
                        <div className={styles.categoriesLoadingSkeleton} />
                        <div className={styles.categoriesLoadingSpinner} aria-hidden="true" />
                        <span className={styles.categoriesLoadingText}>Загрузка категорий...</span>
                      </div>
                    ) : (
                      <CategoryPicker
                        categories={categories}
                        value={categoryId}
                        onChange={(newId) => {
                          setCategoryId(newId);
                          setCategoryName('');
                          if (newId) {
                            fetchCategoryAttributes(newId);
                          } else {
                            setCategoryAttributes([]);
                            setVariants([]);
                            setSharedBaseAttributes({});
                            setSelectedRightPredefinedIds({});
                          }
                        }}
                        disabled={!!error}
                      />
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="product-unit" className={styles.formLabel}>Единица измерения *</label>
                    <select
                      id="product-unit"
                      className={styles.formControl}
                      value={unitOfMeasureId}
                      onChange={(e) => setUnitOfMeasureId(e.target.value)}
                      disabled={isLoadingUnits}
                      required
                    >
                      <option value="">Выберите единицу измерения</option>
                      {unitsOfMeasure.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name} ({unit.short_name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="product-description" className={styles.formLabel}>Описание товара *</label>
                  <textarea
                    id="product-description"
                    className={styles.formControl}
                    rows="5"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    required
                    disabled={aiFillFieldsLocked}
                  />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="visible-on-marketplace"
                      className={styles.formCheckbox}
                      checked={isVisibleOnMarketplace}
                      onChange={(e) => setIsVisibleOnMarketplace(e.target.checked)}
                    />
                    <label htmlFor="visible-on-marketplace" className={styles.checkboxLabel}>
                      Виден на маркетплейсе
                    </label>
                  </div>
                  <div className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="visible-on-own-site"
                      className={styles.formCheckbox}
                      checked={isVisibleOnOwnSite}
                      onChange={(e) => setIsVisibleOnOwnSite(e.target.checked)}
                    />
                    <label htmlFor="visible-on-own-site" className={styles.checkboxLabel}>
                      Виден на собственном сайте
                    </label>
                  </div>
                  <div className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="is-active"
                      className={styles.formCheckbox}
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <label htmlFor="is-active" className={styles.checkboxLabel}>
                      Товар активен (доступен для покупки)
                    </label>
                  </div>
                </div>
              </div>
            </div>
            </div>
            <div className={styles.addProductColRight}>
            {/* Секция атрибутов и вариантов */}
            {categoryId ? (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h5><FaListUl className={styles.sectionIcon} /> Варианты товара</h5>
                </div>
                <div className={styles.sectionBody}>
                  <div className={styles.infoAlert}>
                    {variantMatrixMode === 'none' && (
                      <>У этой категории нет атрибутов комплектации «справа» — один вариант товара.</>
                    )}
                    {variantMatrixMode === 'cartesian' && (
                      <>Отметьте комплектацию сверху — строки из отмеченных комбинаций. Нельзя больше {ENV_CONFIG.PRODUCT_ADD_MAX_VARIANTS_MATRIX} вариантов. Общие атрибуты — один раз.</>
                    )}
                    {variantMatrixMode === 'free' && (
                      <>До {ENV_CONFIG.PRODUCT_ADD_MAX_VARIANTS_FREE_RIGHT_ATTR} вариантов вручную; общие атрибуты общие для всех.</>
                    )}
                  </div>

                  {isLoadingAttributes ? (
                    <div>Загрузка атрибутов категории...</div>
                  ) : attributesError ? (
                    <div className={styles.errorAlert}>Ошибка загрузки атрибутов: {attributesError}</div>
                  ) : (
                    <>
                      {variantMatrixMode === 'cartesian' && rightPredefinedAttrs.length > 0 && (
                        <div className={styles.attributeSection}>
                          <div className={styles.attributeSectionTitle}>Комплектация (что продаём)</div>
                          <p className={styles.attributeSectionHint}>
                            Отметьте значения по каждому атрибуту — например только M и L. Комбинации считаются из отмеченных.
                          </p>
                          {rightPredefinedAttrs.map((attr) => (
                            <div key={attr.id} style={{ marginBottom: '1rem' }}>
                              <div className={styles.variantFieldLabel} style={{ marginBottom: '0.5rem' }}>
                                {attr.name}
                                {attr.required && <span className={styles.requiredStar}> *</span>}
                              </div>
                              <div className={styles.variantsGrid}>
                                {(attr.values || []).map((v) => {
                                  const idStr = String(v.id);
                                  const checked = (selectedRightPredefinedIds[String(attr.id)] || []).includes(
                                    idStr
                                  );
                                  return (
                                    <label key={v.id} className={styles.variantCheck}>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleRightPredefinedValue(attr.id, v.id)}
                                      />
                                      <span>{v.value}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {baseAttrs.length > 0 && (
                        <div className={styles.variantCard} style={{ marginBottom: '1rem' }}>
                          <div className={styles.variantCardHeader}>
                            <span className={styles.variantCardTitle}>Общие атрибуты</span>
                          </div>
                          <div className={styles.variantCardBody}>
                            {baseAttrs.map((attr) => (
                              <div key={attr.id} className={styles.variantField}>
                                <label className={styles.variantFieldLabel}>
                                  {attr.name}
                                  {attr.required && <span className={styles.requiredStar}> *</span>}
                                </label>
                                {attr.has_predefined_values ? (
                                  <AttributeValueSelect
                                    attr={attr}
                                    multiple={!!attr.allow_multiple}
                                    value={
                                      attr.allow_multiple
                                        ? (Array.isArray(sharedBaseAttributes[attr.id])
                                            ? sharedBaseAttributes[attr.id]
                                            : (sharedBaseAttributes[attr.id] ?? []))
                                        : (sharedBaseAttributes[attr.id] ?? '')
                                    }
                                    onChange={(val) => handleSharedBaseChange(attr.id, val)}
                                    required={attr.required}
                                    businessSlug={business_slug}
                                    disabled={aiFillFieldsLocked}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    className={styles.formControltd}
                                    value={sharedBaseAttributes[attr.id] || ''}
                                    onChange={(e) => handleSharedBaseChange(attr.id, e.target.value)}
                                    placeholder={`Введите ${attr.name}`}
                                    required={attr.required}
                                    disabled={aiFillFieldsLocked}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className={styles.variantStack}>
                        {variants.length === 0 ? (
                          <div className={styles.noVariants}>
                            Нет вариантов (слишком много комбинаций или пустые справочники). Смените категорию.
                          </div>
                        ) : (
                          variants.map((variant, index) => {
                            const aiLockThisVariantRow =
                              aiFillFieldsLocked &&
                              variantMatrixMode === 'free' &&
                              index === 0 &&
                              rightAttrs.length > 0;
                            return (
                            <div key={variant.id} className={styles.variantCard}>
                              <div className={styles.variantCardHeader}>
                                <span className={styles.variantCardTitle}>
                                  {rightAttrs.length === 0 ? 'Вариант' : `Вариант ${index + 1}`}
                                </span>
                                {allowRemoveVariant && (
                                  <button
                                    type="button"
                                    className={styles.variantButton}
                                    onClick={() => handleRemoveVariant(variant.id)}
                                    title="Удалить вариант"
                                  >
                                    <FaTrash /> Удалить
                                  </button>
                                )}
                              </div>
                              <div className={styles.variantCardBody}>
                                {rightAttrs.length === 0 ? null : (
                                  rightAttrs.map((attr) => (
                                    <div key={attr.id} className={styles.variantField}>
                                      <label className={styles.variantFieldLabel}>
                                        {attr.name}
                                        {attr.required && <span className={styles.requiredStar}> *</span>}
                                      </label>
                                      {attr.has_predefined_values ? (
                                        <AttributeValueSelect
                                          attr={attr}
                                          multiple={!!attr.allow_multiple}
                                          disabled={
                                            variantMatrixMode === 'cartesian' || aiLockThisVariantRow
                                          }
                                          value={
                                            attr.allow_multiple
                                              ? (Array.isArray(variant.attributes[attr.id])
                                                  ? variant.attributes[attr.id]
                                                  : (variant.attributes[attr.id] ?? []))
                                              : (variant.attributes[attr.id] ?? '')
                                          }
                                          onChange={(val) =>
                                            handleVariantChange(variant.id, null, val, attr.id)
                                          }
                                          required={attr.required}
                                          businessSlug={business_slug}
                                        />
                                      ) : (
                                        <input
                                          type="text"
                                          className={styles.formControltd}
                                          value={variant.attributes[attr.id] || ''}
                                          onChange={(e) =>
                                            handleVariantChange(
                                              variant.id,
                                              null,
                                              e.target.value,
                                              attr.id
                                            )
                                          }
                                          placeholder={`Введите ${attr.name}`}
                                          required={attr.required}
                                          disabled={aiLockThisVariantRow}
                                        />
                                      )}
                                    </div>
                                  ))
                                )}
                                <div className={styles.variantField}>
                                  <label className={styles.variantFieldLabel}>
                                    Штрих-код{isEditMode ? '' : ' (опционально)'}
                                  </label>
                                  {isEditMode ? (
                                    <div className={styles.barcodeCell}>
                                      <div className={styles.barcodeInputWrapper}>
                                        <input
                                          type="text"
                                          className={styles.formControltd}
                                          value={variant.barcode || ''}
                                          onChange={(e) =>
                                            handleVariantChange(
                                              variant.id,
                                              'barcode',
                                              e.target.value
                                            )
                                          }
                                          placeholder={
                                            variant.generateBarcode
                                              ? 'Будет сгенерирован автоматически'
                                              : 'EAN-13 (13 цифр)'
                                          }
                                          maxLength={13}
                                          pattern="[0-9]{13}"
                                          title={
                                            variant.is_barcode_auto_generated
                                              ? 'Штрих-код сгенерирован автоматически и не может быть изменен'
                                              : 'Введите 13-значный EAN-13 штрих-код'
                                          }
                                          disabled={
                                            variant.is_barcode_auto_generated ||
                                            variant.generateBarcode ||
                                            aiLockThisVariantRow
                                          }
                                          readOnly={variant.is_barcode_auto_generated}
                                        />
                                      </div>
                                      {variant.is_barcode_auto_generated ? (
                                        <div className={styles.autoGeneratedBadge}>
                                          <span>Сгенерирован автоматически</span>
                                        </div>
                                      ) : (
                                        <label className={styles.generateBarcodeLabel}>
                                          <input
                                            type="checkbox"
                                            checked={variant.generateBarcode || false}
                                            onChange={(e) =>
                                              handleGenerateBarcodeChange(
                                                variant.id,
                                                e.target.checked
                                              )
                                            }
                                            className={styles.generateBarcodeCheckbox}
                                            disabled={aiLockThisVariantRow}
                                          />
                                          <span>Сгенерировать автоматически</span>
                                        </label>
                                      )}
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      className={styles.formControltd}
                                      value={variant.barcode || ''}
                                      onChange={(e) =>
                                        handleVariantChange(
                                          variant.id,
                                          'barcode',
                                          e.target.value
                                        )
                                      }
                                      placeholder="EAN-13 (13 цифр)"
                                      maxLength={13}
                                      pattern="[0-9]{13}"
                                      title="Введите 13-значный EAN-13 штрих-код"
                                      disabled={aiLockThisVariantRow}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                            );
                          })
                        )}
                      </div>
                      <div className={styles.variantControls}>
                        <div>
                          <button
                            type="button"
                            className={styles.variantAddButton}
                            onClick={handleAddVariant}
                            disabled={variantMatrixMode !== 'free'}
                          >
                            <FaPlus className={styles.buttonIcon} /> Добавить вариант
                          </button>
                          <button
                            type="button"
                            className={styles.variantCopyButton}
                            onClick={handleCopyLastVariant}
                            disabled={variantMatrixMode !== 'free' || variants.length === 0}
                          >
                            <FaCopy className={styles.buttonIcon} /> Копировать последний
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h5><FaListUl className={styles.sectionIcon} /> Варианты товара</h5>
                </div>
                <div className={styles.sectionBody}>
                  <p className={styles.addProductVariantsPlaceholder}>
                    Выберите категорию в «Основная информация», чтобы настроить варианты.
                  </p>
                </div>
              </div>
            )}
            </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => navigate(`/business/${business_slug}/products/`)}
                className={styles.cancelButton}
              >
                <FaTimes className={styles.buttonIcon} /> Отменить
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={
                  isSubmitting ||
                  isAiFillLoading ||
                  isAiBackgroundLoading ||
                  !!aiBgReview
                }
                style={{
                  opacity:
                    isSubmitting || isAiFillLoading || isAiBackgroundLoading || !!aiBgReview
                      ? 0.6
                      : 1,
                  cursor:
                    isSubmitting || isAiFillLoading || isAiBackgroundLoading || !!aiBgReview
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {isSubmitting ? (
                  <>
                    <span style={{ marginRight: '8px' }}>⏳</span> Сохранение...
                  </>
                ) : (
                  <>
                    <FaSave className={styles.buttonIcon} />{' '}
                    {isEditMode ? 'Сохранить изменения' : 'Сохранить товар'}
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </DndProvider>
  );
};

export default ProductAddPageMobile;