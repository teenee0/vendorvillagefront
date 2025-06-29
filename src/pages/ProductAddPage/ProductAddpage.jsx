// ProductAddPage.jsx
import { useState, useRef, useEffect } from 'react';
import styles from './ProductAddPage.module.css';
import { FaPlusCircle, FaImages, FaInfoCircle, FaListUl, FaCloudUploadAlt, FaStar, FaTimes, FaTrash, FaPlus, FaCopy, FaSave } from 'react-icons/fa';
import axios from "../../api/axiosDefault.js";
import DraggableImageList from '../../components/DraggableThumbnail/DraggableImageList.jsx';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useParams } from 'react-router-dom';
import ImageCropper from '../../components/ImageCropper/ImageCropper.jsx';

const ProductAddPage = () => {
  // Основная информация
  const { business_slug } = useParams();
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showOnMain, setShowOnMain] = useState(false);

  // Категории и атрибуты
  const [categoryAttributes, setCategoryAttributes] = useState([]);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [attributesError, setAttributesError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState(null);

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

  // Загрузка данных при монтировании
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Загрузка категорий
        const categoriesResponse = await axios.get(`/api/business/${business_slug}/categories/`);
        setCategories(categoriesResponse.data);

        // Загрузка локаций
        const locationsResponse = await axios.get(`/api/business/${business_slug}/locations/`);
        setLocations(locationsResponse.data);

        setIsLoadingCategories(false);
        setIsLoadingLocations(false);
      } catch (err) {
        setError(err.message);
        setIsLoadingCategories(false);
        setIsLoadingLocations(false);
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
      setCategoryAttributes(response.data);

      // Сбрасываем варианты при смене категории
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
      sku: `PROD-${variantCounter}`,
      price: '',
      discount: '0',
      quantity: '0',
      description: '',
      showThis: true,
      reserved_quantity: '0',
      is_available_for_sale: true,
      location_id: locations.length > 0 ? locations[0].id : '',
      attributes: categoryAttributes.reduce((acc, attr) => {
        acc[attr.id] = attr.values.length > 0 ? attr.values[0].id || attr.values[0] : '';
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
          // Изменение атрибута
          return {
            ...variant,
            attributes: {
              ...variant.attributes,
              [attributeId]: value
            }
          };
        } else {
          // Изменение обычного поля
          return {
            ...variant,
            [field]: value
          };
        }
      }
      return variant;
    }));
  };

  // Копирование последнего варианта
  const handleCopyLastVariant = () => {
    if (variants.length === 0) return;

    const lastVariant = variants[variants.length - 1];

    // Создаем полностью независимую копию варианта
    const newVariant = {
      id: variantCounter,
      sku: `${lastVariant.sku}-COPY-${variantCounter}`,
      price: lastVariant.price,
      discount: lastVariant.discount,
      quantity: lastVariant.quantity,
      description: lastVariant.description,
      showThis: lastVariant.showThis,
      reserved_quantity: lastVariant.reserved_quantity,
      is_available_for_sale: lastVariant.is_available_for_sale,
      location_id: lastVariant.location_id,
      // Глубокая копия атрибутов
      attributes: { ...lastVariant.attributes }
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
    
    // Если это последнее изображение, закрываем модальное окно
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
      // Если пытаемся сделать главным уже главное изображение
      const currentMain = prevImages.find(img => img.isMain);
      if (currentMain?.id === id) return prevImages;
      
      return prevImages.map(img => ({
        ...img,
        isMain: img.id === id
      }));
    });
  };

  const handleRemoveImage = (id) => {
    setImages(prevImages => {
      // Находим удаляемое изображение
      const imageToRemove = prevImages.find(img => img.id === id);
      if (imageToRemove?.isMain && images.length > 1) {
        if (!window.confirm('Вы удаляете главное изображение. Продолжить?')) {
          return;
        }
      }
      if (!imageToRemove) return prevImages;
      
      // Фильтруем массив без удаленного изображения
      const newImages = prevImages.filter(img => img.id !== id);
      
      // Если удалили главное изображение и остались другие изображения
      if (imageToRemove.isMain && newImages.length > 0) {
        // Делаем первое изображение главным
        newImages[0].isMain = true;
      }
      
      return newImages;
    });
  };

  const handleImagesReorder = (newImages) => {
    setImages(newImages);
  };

  // Расчет цены со скидкой
  const calculateDiscountedPrice = (price, discount) => {
    const priceNum = parseFloat(price) || 0;
    const discountNum = parseFloat(discount) || 0;
    return (priceNum * (1 - discountNum / 100)).toFixed(2);
  };

  // Валидация формы
  const validateForm = () => {
    // Проверка основной информации
    if (!productName.trim() || !categoryId || !productDescription.trim()) {
      return false;
    }

    if (images.length === 0) {
      return false;
    }
  
    // Проверка что есть главное изображение
    if (!images.some(img => img.isMain)) {
      return false;
    }

    // Проверка вариантов
    if (variants.length === 0) return false;

    return variants.every(variant => {
      // Проверка обязательных полей варианта
      if (!variant.sku.trim() || !variant.price || !variant.quantity || !variant.location_id) {
        return false;
      }

      // Проверка обязательных атрибутов
      return categoryAttributes.every(attr => {
        if (attr.required) {
          return variant.attributes[attr.id] !== undefined &&
            variant.attributes[attr.id] !== null &&
            variant.attributes[attr.id] !== '';
        }
        return true;
      });
    });
  };

  // Подготовка данных для отправки
  const prepareProductData = () => {
    const formData = new FormData();

    // Основная информация
    formData.append('name', productName);
    formData.append('description', productDescription);
    formData.append('category', categoryId);
    formData.append('is_active', isActive);
    formData.append('on_the_main', showOnMain);

    // Изображения
    images.forEach((image, index) => {
      formData.append(`images[${index}][image]`, image.file);
      formData.append(`images[${index}][is_main]`, image.isMain);
      formData.append(`images[${index}][display_order]`, index);
    });

    // Варианты
    variants.forEach((variant, vIndex) => {
      formData.append(`variants[${vIndex}][sku]`, variant.sku);
      formData.append(`variants[${vIndex}][price]`, variant.price);
      formData.append(`variants[${vIndex}][discount]`, variant.discount);
      formData.append(`variants[${vIndex}][show_this]`, variant.showThis);
      formData.append(`variants[${vIndex}][description]`, variant.description || '');

      // Атрибуты варианта
      Object.entries(variant.attributes || {}).forEach(([attrId, value], aIndex) => {
        const attribute = categoryAttributes.find(a => a.id === parseInt(attrId));
        const isPredefined = attribute?.has_predefined_values;

        formData.append(`variants[${vIndex}][attributes][${aIndex}][category_attribute]`, attrId);

        if (isPredefined) {
          formData.append(`variants[${vIndex}][attributes][${aIndex}][predefined_value]`, value);
          formData.append(`variants[${vIndex}][attributes][${aIndex}][custom_value]`, '');
        } else {
          formData.append(`variants[${vIndex}][attributes][${aIndex}][predefined_value]`, '');
          formData.append(`variants[${vIndex}][attributes][${aIndex}][custom_value]`, value);
        }
      });

      // Остатки на складах (с проверкой на существование stocks)
      formData.append(`variants[${vIndex}][stocks][0][location_id]`, variant.location_id);
      formData.append(`variants[${vIndex}][stocks][0][quantity]`, variant.quantity);
    });

    return formData;
  };

  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      console.error('Пожалуйста, заполните все обязательные поля');
      return;
    }

    try {
      const productData = prepareProductData();

      // Для отладки: преобразуем FormData в обычный объект для вывода в консоль
      const debugData = {
        name: productName,
        description: productDescription,
        category: categoryId,
        is_active: isActive,
        on_the_main: showOnMain,
        images: images.map((img, index) => ({
          image: img.file.name,
          is_main: img.isMain,
          display_order: index
        })),
        variants: variants.map(variant => ({
          sku: variant.sku,
          price: variant.price,
          discount: variant.discount,
          show_this: variant.showThis,
          description: variant.description,
          attributes: Object.entries(variant.attributes || {}).map(([attrId, value]) => {
            const attribute = categoryAttributes.find(a => a.id === parseInt(attrId));
            return {
              category_attribute: attrId,
              predefined_value: attribute?.has_predefined_values ? value : null,
              custom_value: !attribute?.has_predefined_values ? value : null
            };
          }),
          stocks: [{
            location_id: variant.location_id,
            quantity: variant.quantity,
            reserved_quantity: variant.reserved_quantity
          }]
        }))
      };

      console.log('Подготовленные данные для API:', debugData);

      // Для реальной отправки раскомментируйте:
      /*
      const response = await axios.post(
        `/api/business/${business_slug}/products/`, 
        productData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      console.log('Товар успешно создан:', response.data);
      */
    } catch (error) {
      console.error('Ошибка при подготовке данных:', error);
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

                {/* Секция с превью изображений */}
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
                    <select
                      id="product-category"
                      className={styles.formControl}
                      value={categoryId}
                      onChange={handleCategoryChange}
                      required
                      disabled={isLoadingCategories}
                    >
                      <option value="" disabled>Выберите категорию</option>
                      {isLoadingCategories ? (
                        <option>Загрузка категорий...</option>
                      ) : error ? (
                        <option>Ошибка загрузки категорий</option>
                      ) : (
                        categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.full_path}
                          </option>
                        ))
                      )}
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
                      id="on-main-page"
                      className={styles.formCheckbox}
                      checked={showOnMain}
                      onChange={(e) => setShowOnMain(e.target.checked)}
                    />
                    <label htmlFor="on-main-page" className={styles.checkboxLabel}>
                      Показывать на главной странице
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
                    Создайте варианты товара с разными комбинациями атрибутов, ценами и количеством.
                    Новые атрибуты будут автоматически добавляться как колонки в таблицу.
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
                                <th>Активность</th>
                                {/* Динамические заголовки для атрибутов */}
                                {categoryAttributes.map(attr => (
                                  <th key={attr.id}>
                                    {attr.name}
                                    {attr.required && <span className={styles.requiredStar}>*</span>}
                                  </th>
                                ))}
                                <th>Артикул*</th>
                                <th>Цена*</th>
                                <th>Скидка %</th>
                                <th>Цена со скидкой</th>
                                <th>Количество*</th>
                                <th>Зарезервировано</th>
                                {/* <th>Доступность для продажи</th> */}
                                <th>Склад*</th>
                                <th className={styles.stickyColumn}>Действия</th>
                              </tr>
                            </thead>
                            <tbody>
                              {variants.length === 0 ? (
                                <tr>
                                  <td colSpan={categoryAttributes.length + 9} className={styles.noVariants}>
                                    Нет вариантов. Нажмите "Добавить вариант" чтобы создать первый.
                                  </td>
                                </tr>
                              ) : (
                                variants.map((variant, index) => (
                                  <tr key={variant.id}>
                                    <td className={styles.stickyColumn}>{index + 1}</td>
                                    <td>
                                      <input
                                        type="checkbox"
                                        className={styles.formControltd}
                                        checked={variant.showThis}  // Изменено с value на checked
                                        onChange={(e) => handleVariantChange(
                                          variant.id,
                                          'showThis',
                                          e.target.checked  // Убедитесь, что передаёте e.target.checked
                                        )}
                                      />
                                    </td>

                                    {/* Поля для атрибутов */}
                                    {categoryAttributes.map(attr => (
                                      <td key={attr.id}>
                                        {attr.values.length > 0 ? (
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
                                              <option
                                                key={value.id}
                                                value={value.id}
                                              >
                                                {value.value} {/* Исправлено с value.name на value.value */}
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

                                    <td>
                                      <input
                                        type="text"
                                        className={styles.formControltd}
                                        value={variant.sku}
                                        onChange={(e) => handleVariantChange(
                                          variant.id,
                                          'sku',
                                          e.target.value
                                        )}
                                        required
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        className={styles.formControltd}
                                        value={variant.price}
                                        onChange={(e) => handleVariantChange(
                                          variant.id,
                                          'price',
                                          e.target.value
                                        )}
                                        step="0.01"
                                        min="0"
                                        required
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        className={styles.formControltd}
                                        value={variant.discount}
                                        onChange={(e) => handleVariantChange(
                                          variant.id,
                                          'discount',
                                          e.target.value
                                        )}
                                        min="0"
                                        max="100"
                                      />
                                    </td>
                                    <td>
                                      {calculateDiscountedPrice(variant.price, variant.discount)} ₽
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        className={styles.formControltd}
                                        value={variant.quantity}
                                        onChange={(e) => handleVariantChange(
                                          variant.id,
                                          'quantity',
                                          e.target.value
                                        )}
                                        min="0"
                                        required
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        className={styles.formControltd}
                                        value={variant.reserved_quantity}
                                        onChange={(e) => handleVariantChange(
                                          variant.id,
                                          'reserved_quantity',
                                          e.target.value
                                        )}
                                        min="0"
                                        required
                                      />
                                    </td>
                                    {/* доступноть для продажи из таблицы Stock (пока что не нужно, потому чтор логика пока что, что у одного варианата - один склад) */}
                                    {/* <td>
                                    <input
                                      type="checkbox"
                                      className={styles.formControl}
                                      value={variant.is_available_for_sale}
                                      onChange={(e) => handleVariantChange(
                                        variant.id,
                                        'is_available_for_sale',
                                        e.target.value
                                      )}
                                      min="0"
                                      required
                                    />
                                  </td> */}
                                    <td>
                                      <select
                                        className={styles.formSelect}
                                        value={variant.location_id}
                                        onChange={(e) => handleVariantChange(
                                          variant.id,
                                          'location_id',
                                          e.target.value
                                        )}
                                        required
                                        disabled={isLoadingLocations || locations.length === 0}
                                      >
                                        {isLoadingLocations ? (
                                          <option>Загрузка складов...</option>
                                        ) : locationsError ? (
                                          <option>Ошибка загрузки складов</option>
                                        ) : locations.length === 0 ? (
                                          <option>Нет доступных складов</option>
                                        ) : (
                                          locations.map(location => (
                                            <option key={location.id} value={location.id}>
                                              {location.name}
                                            </option>
                                          ))
                                        )}
                                      </select>
                                    </td>
                                    {/* если нужно буцлет добавить свое названи/ описание */}
                                    {/* <td>
                                    <textarea
                                      className={styles.formControl}
                                      rows="1"
                                      value={variant.description}
                                      onChange={(e) => handleVariantChange(
                                        variant.id,
                                        'description',
                                        e.target.value
                                      )}
                                      placeholder="Описание варианта"
                                    />
                                  </td> */}
                                    <td className={`${styles.stickyColumn} ${styles.variantActions}`}>
                                      <button
                                        type="button"
                                        className={styles.variantButton}
                                        onClick={() => handleRemoveVariant(variant.id)}
                                        title="Удалить"
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

            {/* Кнопки отправки формы */}
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelButton}>
                <FaTimes className={styles.buttonIcon} /> Отменить
              </button>
              <button
                type="submit"
                className={styles.submitButton}
              >
                <FaSave className={styles.buttonIcon} /> Сохранить товар
              </button>
            </div>
          </form>
        </div>
      </div>
    </DndProvider>
  );
};

export default ProductAddPage;