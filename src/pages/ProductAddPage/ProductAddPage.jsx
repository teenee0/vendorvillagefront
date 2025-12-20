import { useState, useRef, useEffect } from 'react';
import styles from './ProductAddPage.module.css';
import { FaPlusCircle, FaImages, FaInfoCircle, FaListUl, FaCloudUploadAlt, FaStar, FaTimes, FaTrash, FaPlus, FaCopy, FaSave } from 'react-icons/fa';
import axios from "../../api/axiosDefault.js";
import DraggableImageList from '../../components/DraggableThumbnail/DraggableImageList.jsx';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useParams, useNavigate } from 'react-router-dom';
import ImageCropper from '../../components/ImageCropper/ImageCropper.jsx';

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

const ProductAddPage = () => {
  const { business_slug } = useParams();
  const navigate = useNavigate();

  // Основная информация
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
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
  const fileInputRef = useRef(null);
  const [croppingData, setCroppingData] = useState({
    files: [],
    currentIndex: 0,
    croppedImages: []
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Варианты товара
  const [variants, setVariants] = useState([]);
  const [variantCounter, setVariantCounter] = useState(1);
  
  // Состояние отправки формы
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Загрузка атрибутов при изменении категории
  const fetchCategoryAttributes = async (categoryId) => {
    try {
      setIsLoadingAttributes(true);
      setAttributesError(null);
      const response = await axios.get(`/api/categories/${categoryId}/attributes/`);
      const formattedAttributes = response.data.map(attr => ({
        ...attr,
        values: attr.values || [],
        has_predefined_values: attr.has_predefined_values || false
      }));
      setCategoryAttributes(formattedAttributes);
      setVariants([]);
      setVariantCounter(1);
    } catch (err) {
      setAttributesError(err.message);
      console.error('Ошибка при загрузке атрибутов категории:', err);
    } finally {
      setIsLoadingAttributes(false);
    }
  };

  const handleCategoryChange = (e) => {
    const selectedCategoryId = e.target.value;
    setCategoryId(selectedCategoryId);

    if (selectedCategoryId) {
      fetchCategoryAttributes(selectedCategoryId);
    } else {
      setCategoryAttributes([]);
      setVariants([]);
    }
  };

  // Добавление нового варианта
  const handleAddVariant = () => {
    const newVariant = {
      id: variantCounter,
      attributes: categoryAttributes.reduce((acc, attr) => {
        acc[String(attr.id)] = attr.values.length > 0 ?
          (attr.values[0].id ? String(attr.values[0].id) : String(attr.values[0])) : '';
        return acc;
      }, {})
    };

    setVariants([...variants, newVariant]);
    setVariantCounter(variantCounter + 1);
  };

  // Изменение варианта
  const handleVariantChange = (id, field, value, attributeId = null) => {
    setVariants(variants.map(variant => {
      if (variant.id === id) {
        if (attributeId !== null) {
          return {
            ...variant,
            attributes: {
              ...variant.attributes,
              [String(attributeId)]: typeof value === 'number' ? String(value) : value
            }
          };
        } else {
          return { ...variant, [field]: value };
        }
      }
      return variant;
    }));
  };

  // Копирование последнего варианта
  const handleCopyLastVariant = () => {
    if (variants.length === 0) return;

    const lastVariant = variants[variants.length - 1];
    const copiedAttributes = {};
    Object.entries(lastVariant.attributes || {}).forEach(([key, value]) => {
      copiedAttributes[String(key)] = typeof value === 'number' ? String(value) : value;
    });

    const newVariant = {
      id: variantCounter,
      attributes: copiedAttributes
    };

    setVariants([...variants, newVariant]);
    setVariantCounter(variantCounter + 1);
  };

  // Удаление варианта
  const handleRemoveVariant = (id) => {
    setVariants(variants.filter(variant => variant.id !== id));
  };

  // Изображения
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
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
    const newImage = {
      id: Date.now() + index,
      file: croppedFile,
      preview: URL.createObjectURL(croppedFile),
      isMain: images.length === 0 && index === 0
    };

    setImages(prev => [...prev, newImage]);

    if (index === croppingData.files.length - 1) {
      setIsModalOpen(false);
      document.body.classList.remove(styles.bodyNoScroll);
      setCroppingData({
        files: [],
        currentIndex: 0,
        croppedImages: []
      });
    }
  };

  const handleNextImage = () => {
    setCroppingData(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1
    }));
  };

  const handleCancelCropping = () => {
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

  // Валидация формы
  const validateForm = () => {
    if (!productName.trim()) {
      return { valid: false, message: "Заполните название товара." };
    }

    if (!categoryId) {
      return { valid: false, message: "Выберите категорию товара." };
    }

    if (!productDescription.trim()) {
      return { valid: false, message: "Добавьте описание товара." };
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

    for (let [index, variant] of variants.entries()) {
      for (let attr of categoryAttributes) {
        if (attr.required) {
          const val = variant.attributes[attr.id];
          if (val === undefined || val === null || val === '') {
            return {
              valid: false,
              message: `Вариант ${index + 1}: заполните обязательный атрибут "${attr.name}".`
            };
          }
        }
      }
    }

    return { valid: true, message: "" };
  };

  // Подготовка данных для отправки
  const prepareProductData = () => {
    const formData = new FormData();

    const jsonPayload = {
      name: productName,
      description: productDescription,
      category: categoryId,
      unit_of_measure: unitOfMeasureId || null,
      is_active: isActive,
      is_visible_on_marketplace: isVisibleOnMarketplace,
      is_visible_on_own_site: isVisibleOnOwnSite,
      variants: variants.map(variant => ({
        barcode: variant.barcode || '',
        attributes: Object.entries(variant.attributes || {}).map(([attrId, value]) => {
          const attribute = categoryAttributes.find(a => String(a.id) === String(attrId));
          return {
            category_attribute: Number(attrId),
            predefined_value: attribute?.has_predefined_values ? Number(value) : null,
            custom_value: attribute?.has_predefined_values ? '' : String(value)
          };
        })
      }))
    };

    formData.append("data", JSON.stringify(jsonPayload));

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

    // Проверяем, не идет ли уже отправка
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
      for (let pair of productData.entries()) {
        console.log(pair[0], pair[1]);
      }

      const response = await axios.post(
        `/api/business/${business_slug}/products/create/`,
        productData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      console.log('Товар успешно создан:', response.data);
      alert('Товар успешно сохранён');
      navigate(`/business/${business_slug}/products/`);
    } catch (error) {
      console.error('Ошибка при создании товара:', error.response?.data || error.message);
      alert('Ошибка при создании товара: ' + (error.response?.data?.detail || error.message));
      setIsSubmitting(false); // Разблокируем кнопку только при ошибке
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.container}>
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
        <div className={styles.content}>
          <h2 className={styles.pageTitle}>
            <FaPlusCircle className={styles.titleIcon} /> Добавление нового товара
          </h2>

          <form onSubmit={handleSubmit} className={styles.productForm}>
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
                      <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        className={styles.fileInput}
                      />
                    </div>
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
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="product-category" className={styles.formLabel}>Категория *</label>
                    <CategoryPicker
                      categories={categories}
                      value={categoryId}
                      onChange={(newId) => {
                        // сохраняем и подтягиваем атрибуты
                        setCategoryId(newId);
                        if (newId) {
                          fetchCategoryAttributes(newId);
                        } else {
                          setCategoryAttributes([]);
                          setVariants([]);
                        }
                      }}
                      disabled={isLoadingCategories || !!error}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="product-unit" className={styles.formLabel}>Единица измерения</label>
                    <select
                      id="product-unit"
                      className={styles.formControl}
                      value={unitOfMeasureId}
                      onChange={(e) => setUnitOfMeasureId(e.target.value)}
                      disabled={isLoadingUnits}
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

            {/* Секция атрибутов и вариантов */}
            {categoryId && (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h5><FaListUl className={styles.sectionIcon} /> Варианты товара</h5>
                </div>
                <div className={styles.sectionBody}>
                  <div className={styles.infoAlert}>
                    Создайте варианты товара с разными комбинациями атрибутов. Цены и остатки вы сможете добавить позже при работе с товаром.
                  </div>

                  {isLoadingAttributes ? (
                    <div>Загрузка атрибутов категории...</div>
                  ) : attributesError ? (
                    <div className={styles.errorAlert}>Ошибка загрузки атрибутов: {attributesError}</div>
                  ) : (
                    <>
                      <div className={styles.tableWrapper}>
                        <div className={styles.horizontalScroll}>
                          <table className={styles.variantTable}>
                            <thead>
                              <tr>
                                <th className={styles.stickyColumn}>№</th>
                                {categoryAttributes.map(attr => (
                                  <th key={attr.id}>
                                    {attr.name}
                                    {attr.required && <span className={styles.requiredStar}>*</span>}
                                  </th>
                                ))}
                                <th className={styles.stickyColumn}>Штрих-код (опционально)</th>
                                <th className={styles.stickyColumn}>Действия</th>
                              </tr>
                            </thead>
                            <tbody>
                              {variants.length === 0 ? (
                                <tr>
                                  <td colSpan={categoryAttributes.length + 3} className={styles.noVariants}>
                                    Нет вариантов. Нажмите "Добавить вариант" чтобы создать первый.
                                  </td>
                                </tr>
                              ) : (
                                variants.map((variant, index) => (
                                  <tr key={variant.id}>
                                    <td className={styles.stickyColumn}>{index + 1}</td>
                                    {categoryAttributes.map(attr => (
                                      <td key={attr.id}>
                                        {attr.has_predefined_values ? (
                                          <select
                                            className={styles.formSelect}
                                            value={variant.attributes[attr.id] || ''}
                                            onChange={(e) => handleVariantChange(
                                              variant.id,
                                              null,
                                              e.target.value,
                                              attr.id
                                            )}
                                            required={attr.required}
                                          >
                                            {!attr.required && <option value="">Не выбрано</option>}
                                            {attr.values.map(value => (
                                              <option key={value.id} value={String(value.id)}>
                                                {value.value}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <input
                                            type="text"
                                            className={styles.formControltd}
                                            value={variant.attributes[attr.id] || ''}
                                            onChange={(e) => handleVariantChange(
                                              variant.id,
                                              null,
                                              e.target.value,
                                              attr.id
                                            )}
                                            placeholder={`Введите ${attr.name}`}
                                            required={attr.required}
                                          />
                                        )}
                                      </td>
                                    ))}
                                    <td className={styles.stickyColumn}>
                                      <input
                                        type="text"
                                        className={styles.formControltd}
                                        value={variant.barcode || ''}
                                        onChange={(e) => handleVariantChange(
                                          variant.id,
                                          'barcode',
                                          e.target.value
                                        )}
                                        placeholder="EAN-13 (13 цифр)"
                                        maxLength={13}
                                        pattern="[0-9]{13}"
                                        title="Введите 13-значный EAN-13 штрих-код"
                                      />
                                    </td>
                                    <td className={`${styles.stickyColumn} ${styles.variantActions}`}>
                                      <button
                                        type="button"
                                        className={styles.variantButton}
                                        onClick={() => handleRemoveVariant(variant.id)}
                                        title="Удалить вариант"
                                      >
                                        <FaTrash />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className={styles.variantControls}>
                          <div>
                            <button
                              type="button"
                              className={styles.variantAddButton}
                              onClick={handleAddVariant}
                              disabled={categoryAttributes.length === 0}
                            >
                              <FaPlus className={styles.buttonIcon} /> Добавить вариант
                            </button>
                            <button
                              type="button"
                              className={styles.variantCopyButton}
                              onClick={handleCopyLastVariant}
                              disabled={variants.length === 0}
                            >
                              <FaCopy className={styles.buttonIcon} /> Копировать последний
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

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
                disabled={isSubmitting}
                style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? (
                  <>
                    <span style={{ marginRight: '8px' }}>⏳</span> Сохранение...
                  </>
                ) : (
                  <>
                    <FaSave className={styles.buttonIcon} /> Сохранить товар
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

export default ProductAddPage;