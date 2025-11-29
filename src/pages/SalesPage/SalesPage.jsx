import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import { useFileUtils } from '../../hooks/useFileUtils';
import {
    FaSearch,
    FaBarcode,
    FaTrashAlt,
    FaCashRegister,
    FaBoxOpen,
    FaShoppingCart,
    FaCamera,
    FaCheck,
    FaPrint,
    FaTimes,
    FaPlus,
    FaMinus,
    FaChevronLeft,
    FaChevronRight,
    FaPercentage
} from 'react-icons/fa';
import { openReceiptPdf, printReceiptPdf } from '../../utils/printUtils';
import styles from './SalesPage.module.css';
import Loader from '../../components/Loader';

// Компонент поиска для селектора
const SearchableSelect = ({
    options = [],
    value,
    onChange,
    disabled,
    placeholder = 'Выберите опцию или начните ввод...',
    icon: Icon,
    label,
    getOptionLabel,
    getOptionSubLabel,
    required = false
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlight, setHighlight] = useState(0);
    const rootRef = useRef(null);

    // Найдём выбранную опцию
    const selected = options.find(opt => String(opt.id) === String(value)) || null;

    // Фильтрация
    const q = query.trim().toLowerCase();
    const filtered = q
        ? options.filter(opt =>
            getOptionLabel(opt).toLowerCase().includes(q) ||
            (getOptionSubLabel && getOptionSubLabel(opt).toLowerCase().includes(q))
        )
        : options;

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    useEffect(() => {
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
                onChange(pick.id);
                setQuery('');
                setOpen(false);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            setQuery('');
        }
    };

    const pickItem = (opt) => {
        onChange(opt.id);
        setQuery('');
        setOpen(false);
    };

    return (
        <div className={styles.searchableSelectWrapper}>
            {label && (
                <label className={styles.searchableLabel}>
                    {Icon && <Icon />} {label}
                    {required && <span className={styles.requiredMark}> *</span>}
                </label>
            )}
            <div className={styles.searchableSelect} ref={rootRef}>
                <div
                    className={`${styles.searchableControl} ${disabled ? styles.disabled : ''}`}
                    onClick={() => !disabled && setOpen(o => !o)}
                    onKeyDown={handleKeyDown}
                    tabIndex={disabled ? -1 : 0}
                >
                    <div className={styles.searchableValue}>
                        {selected ? (
                            <>
                                <div className={styles.selectedName}>{getOptionLabel(selected)}</div>
                                {getOptionSubLabel && (
                                    <div className={styles.selectedSubLabel}>
                                        {getOptionSubLabel(selected)}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className={styles.searchablePlaceholder}>{placeholder}</div>
                        )}
                    </div>
                    <div className={styles.searchableCaret} />
                </div>

                {open && (
                    <div className={styles.searchableDropdown} onKeyDown={handleKeyDown}>
                        <input
                            autoFocus
                            className={styles.searchableSearch}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Поиск..."
                        />
                        <div className={styles.searchableList} role="listbox" tabIndex={0}>
                            {filtered.length === 0 ? (
                                <div className={styles.searchableEmpty}>Ничего не найдено</div>
                            ) : (
                                filtered.map((opt, idx) => (
                                    <div
                                        key={opt.id}
                                        role="option"
                                        aria-selected={String(opt.id) === String(value)}
                                        className={`${styles.searchableItem} ${idx === highlight ? styles.searchableItemActive : ''}`}
                                        onMouseEnter={() => setHighlight(idx)}
                                        onClick={() => pickItem(opt)}
                                    >
                                        <div className={styles.searchableItemName}>{getOptionLabel(opt)}</div>
                                        {getOptionSubLabel && (
                                            <div className={styles.searchableItemSubLabel}>
                                                {getOptionSubLabel(opt)}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SalesPage = () => {
    const { business_slug } = useParams();
    const { getFileUrl } = useFileUtils();
    const [cart, setCart] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [inStockOnly, setInStockOnly] = useState(true); // Фильтр "Есть в наличии"
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [discountType, setDiscountType] = useState('percent');
    const [discountValue, setDiscountValue] = useState(0);
    const [showItemDiscountModal, setShowItemDiscountModal] = useState(false);
    const [currentItemForDiscount, setCurrentItemForDiscount] = useState(null);
    const [itemDiscountType, setItemDiscountType] = useState('percent');
    const [itemDiscountValue, setItemDiscountValue] = useState(0);
    const [saleCompleted, setSaleCompleted] = useState(false);
    const [salePosting, setSalePosting] = useState(false);
    const [receiptData, setReceiptData] = useState(null);
    const [scannerActive, setScannerActive] = useState(false); // подсветка режима
    const searchInputRef = useRef(null); // ссылка на поле ввода
    
    // Состояния для локаций
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [locationsLoading, setLocationsLoading] = useState(true);
    
    // Состояния для партий и FIFO - теперь для каждого товара
    const [itemFifoStates, setItemFifoStates] = useState({}); // {variantId: boolean}
    const [showFifoTooltip, setShowFifoTooltip] = useState(null); // variantId товара для которого показываем тултип

    // Fetch locations
    const fetchLocations = useCallback(async () => {
        try {
            setLocationsLoading(true);
            const response = await axios.get(`/api/business/${business_slug}/locations/`);
            // API возвращает массив локаций напрямую
            const locationsList = Array.isArray(response.data) ? response.data : response.data.locations || [];
            setLocations(locationsList);
            // Автоматически выбираем первую локацию или основную
            if (locationsList.length > 0) {
                const primaryLocation = locationsList.find(loc => loc.is_primary);
                setSelectedLocation(primaryLocation?.id || locationsList[0].id);
            }
            setLocationsLoading(false);
        } catch (err) {
            console.error('Failed to fetch locations:', err);
            setError('Не удалось загрузить локации');
            setLocationsLoading(false);
        }
    }, [business_slug]);

    // Fetch products from API
    const fetchProducts = useCallback(async () => {
        if (!selectedLocation) {
            return; // Не загружаем товары без выбранной локации
        }
        
        try {
            setLoading(true);
            const params = {
                location: selectedLocation // Обязательный параметр
            };
            if (searchQuery) params.search = searchQuery;
            if (selectedCategory) params.category = selectedCategory;
            if (inStockOnly) params.in_stock = 'true'; // Фильтр "Есть в наличии"

            const response = await axios.get(`/api/business/${business_slug}/sales-products/`, { params });
            setProducts(response.data.products);
            setLoading(false);
            if (scannerActive) setSearchQuery('');
        } catch (err) {
            if (err.response?.data?.error === 'location_required') {
                setError('Пожалуйста, выберите локацию');
            } else {
                setError(err.message);
            }
            setLoading(false);
        }
    }, [business_slug, searchQuery, selectedCategory, selectedLocation, scannerActive, inStockOnly]);

    const handleSearch = async () => {
        await fetchProducts();
        if (scannerActive && searchInputRef.current) {
            searchInputRef.current.focus();
        }
        setSearchQuery('');
    };

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            const response = await axios.get(`/api/business/${business_slug}/categories/`);
            setCategories(response.data);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    }, [business_slug]);

    // Calculate item price with discounts
    const calculateItemPrice = (item) => {
        let price = item.originalPrice;

        // Применяем оригинальную скидку (если есть)
        if (item.hasOriginalDiscount) {
            price = price * (1 - item.discount / 100);
        }

        // Применяем дополнительную скидку (если есть)
        if (item.itemDiscountPercent > 0) {
            price = price * (1 - item.itemDiscountPercent / 100);
        } else if (item.itemDiscountAmount > 0) {
            price = price - item.itemDiscountAmount;
        }

        // Округляем до целого числа
        return Math.round(price);
    };

    // Fetch payment methods
    const fetchPaymentMethods = useCallback(async () => {
        try {
            const response = await axios.get(`/api/business/payment-methods/`);
            setPaymentMethods(response.data);
            if (response.data.length > 0) {
                setPaymentMethod(response.data[0].code);
            }
        } catch (err) {
            console.error('Failed to fetch payment methods:', err);
        }
    }, []);

    useEffect(() => {
        fetchLocations();
        fetchCategories();
        fetchPaymentMethods();
    }, [fetchLocations, fetchCategories, fetchPaymentMethods]);

    // Загружаем товары когда выбрана локация
    useEffect(() => {
        if (selectedLocation) {
            fetchProducts();
        }
    }, [selectedLocation, fetchProducts]);


    const handleActivateScanner = () => {
        setScannerActive(true);
        setTimeout(() => {
            searchInputRef.current && searchInputRef.current.focus();
        }, 100);
    };

    // Add to cart function
    const addToCart = (product, variant) => {
        // Используем доступное количество в выбранной локации
        // Используем ?? вместо || чтобы 0 не считался falsy значением
        const availableQty = variant.available_quantity_in_location ?? 0;
        if (availableQty <= 0) {
            alert('Товар отсутствует в выбранной локации');
            return;
        }

        // Проверяем наличие цены для выбранной локации
        if (!variant.price && variant.price !== 0) {
            alert('Цена товара не установлена для выбранной локации');
            return;
        }

        setCart(prevCart => {
            const existingItem = prevCart.find(
                item => item.variantId === variant.id && item.productId === product.id
            );

            // Получаем единицу измерения товара
            const unitDisplay = product.unit_display || 'шт.';
            const isPieces = unitDisplay === 'шт.';
            const initialQuantity = isPieces ? 1 : 0.1;
            const incrementStep = isPieces ? 1 : 0.1;

            if (existingItem) {
                const newQuantity = existingItem.quantity + incrementStep;
                if (newQuantity <= availableQty) {
                    // Нормализуем количество в зависимости от единицы измерения
                    const normalizedQuantity = isPieces 
                        ? Math.floor(newQuantity)
                        : parseFloat(newQuantity.toFixed(3));
                    
                    return prevCart.map(cartItem =>
                        cartItem.variantId === variant.id && cartItem.productId === product.id
                            ? { ...cartItem, quantity: normalizedQuantity, unitDisplay: unitDisplay }
                            : cartItem
                    );
                } else {
                    alert('Недостаточно товара в выбранной локации');
                    return prevCart;
                }
            } else {
                const hasOriginalDiscount = variant.discount > 0;
                const originalPrice = parseFloat(variant.price); // Цена уже для выбранной локации
                const price = hasOriginalDiscount
                    ? Math.round(originalPrice * (1 - variant.discount / 100))
                    : originalPrice;

                const selectedLocationData = locations.find(loc => loc.id === selectedLocation);

                // Инициализируем FIFO для нового товара как true (по умолчанию)
                setItemFifoStates(prev => ({
                    ...prev,
                    [variant.id]: true
                }));

                return [
                    ...prevCart,
                    {
                        productId: product.id,
                        productName: product.name,
                        variantId: variant.id,
                        sku: variant.sku,
                        attributes: variant.attributes,
                        price,
                        originalPrice,
                        discount: variant.discount || 0,
                        quantity: initialQuantity,
                        stock: availableQty,
                        unitDisplay: unitDisplay,
                        image: product.images.find(img => img.is_main)?.image || product.images[0]?.image,
                        itemDiscountAmount: 0,
                        itemDiscountPercent: 0,
                        location: selectedLocation,
                        locationName: selectedLocationData?.name || 'Выбранная локация',
                        hasOriginalDiscount,
                        useFifo: true, // По умолчанию FIFO включен
                        batchId: null, // Партия не выбрана
                        batchInfo: null
                    }
                ];
            }
        });
    };

    // Remove from cart
    const removeFromCart = (variantId, batchId = null) => {
        setCart(prevCart => prevCart.filter(item => 
            !(item.variantId === variantId && (batchId === null || item.batchId === batchId))
        ));
        // Очищаем состояния FIFO для удаленного товара
        setItemFifoStates(prev => {
            const newState = { ...prev };
            delete newState[variantId];
            return newState;
        });
    };

    // Update quantity
    const updateQuantity = (variantId, newQuantity) => {
        setCart(prevCart => {
            const item = prevCart.find(item => item.variantId === variantId);
            if (!item) return prevCart;

            const unitDisplay = item.unitDisplay || 'шт.';
            const isPieces = unitDisplay === 'шт.';
            
            // Разрешаем пустое значение для возможности очистки поля
            if (newQuantity === '' || newQuantity === null || newQuantity === undefined) {
                return prevCart.map(cartItem =>
                    cartItem.variantId === variantId
                        ? { ...cartItem, quantity: '' }
                        : cartItem
                );
            }
            
            // Нормализуем количество в зависимости от единицы измерения
            let normalizedQuantity;
            if (isPieces) {
                // Для штук - только целые числа
                normalizedQuantity = Math.max(1, Math.floor(parseFloat(newQuantity) || 1));
            } else {
                // Для других единиц - может быть дробным
                normalizedQuantity = Math.max(0.001, parseFloat(newQuantity) || 0.001);
            }

            if (normalizedQuantity > item.stock) {
                alert('Недостаточно товара на складе');
                return prevCart.map(cartItem =>
                    cartItem.variantId === variantId
                        ? { ...cartItem, quantity: item.stock }
                        : cartItem
                );
            }

            return prevCart.map(cartItem =>
                cartItem.variantId === variantId
                    ? { ...cartItem, quantity: normalizedQuantity }
                    : cartItem
            );
        });
    };

    // Calculate subtotal (without discounts)
    const calculateSubtotal = () => {
        return cart.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
    };

    // Calculate total with discounts
    const calculateTotal = () => {
        // Сначала считаем сумму с учетом всех скидок на товары
        const itemsTotal = cart.reduce((sum, item) => {
            return sum + (calculateItemPrice(item) * item.quantity);
        }, 0);

        // Затем применяем общую скидку на чек (если есть)
        let total = itemsTotal;
        if (discountType === 'percent' && discountValue > 0) {
            total = total * (1 - discountValue / 100);
        } else if (discountType === 'amount' && discountValue > 0) {
            total = Math.max(0, total - discountValue);
        }

        return Math.round(total);
    };
    // Calculate total discount amount
    const calculateTotalDiscount = () => {
        const subtotal = calculateSubtotal();
        return subtotal - calculateTotal();
    };

    // Complete sale
    const completeSale = async () => {
        if (salePosting) return;        // уже жмут второй раз
        
        // Проверяем, что для всех товаров с выключенным FIFO выбрана партия
        const itemsWithoutBatch = cart.filter(item => item.useFifo === false && !item.batchId);
        if (itemsWithoutBatch.length > 0) {
            alert('Для товаров с выключенным FIFO необходимо выбрать партию');
            return;
        }
        
        setSalePosting(true);
        try {
            const saleData = {
                items: cart.map(item => {
                    const unitDisplay = item.unitDisplay || 'шт.';
                    const isPieces = unitDisplay === 'шт.';
                    
                    // Нормализуем quantity перед отправкой
                    let normalizedQuantity = item.quantity;
                    if (isPieces) {
                        normalizedQuantity = Math.floor(item.quantity);
                    } else {
                        normalizedQuantity = parseFloat(item.quantity.toFixed(3));
                    }
                    
                    const itemData = {
                        variant: item.variantId,
                        location: item.location,
                        quantity: normalizedQuantity,
                        discount_amount: item.itemDiscountAmount || 0,
                        discount_percent: item.itemDiscountPercent || 0,
                        use_fifo: item.useFifo !== false
                    };
                    // Добавляем batch_id только если FIFO выключен и партия выбрана
                    if (item.useFifo === false && item.batchId) {
                        itemData.batch_id = item.batchId;
                    }
                    return itemData;
                }),
                payment_method: paymentMethod,
                customer: null,
                customer_name: customerName || null,
                customer_phone: customerPhone || null,
                discount_amount: discountType === 'amount' ? discountValue : 0,
                discount_percent: discountType === 'percent' ? discountValue : 0
            };

            console.log('Отправка данных продажи:', saleData); // Логируем отправляемые данные

            const response = await axios.post(`/api/business/${business_slug}/create-receipt/`, saleData);

            console.log('Ответ сервера:', response.data); // Логируем ответ сервера
            console.log('receipt_preview_image:', response.data?.receipt_preview_image); // Логируем путь к превью
            console.log('receipt_pdf_file:', response.data?.receipt_pdf_file); // Логируем путь к PDF

            setReceiptData(response.data);
            setSaleCompleted(true);
            await fetchProducts();
            setCart([]);
            setItemFifoStates({}); // Очищаем состояния FIFO
        } catch (err) {
            console.error('Sale error:', err.response?.data || err.message); // Улучшенное логирование ошибок
            alert('Ошибка при оформлении продажи: ' + (err.response?.data?.message || err.message));
        } finally {
            setSalePosting(false);      // разблокируем кнопку в любом случае
        }
    };

    // Handle image navigation
    const handleNextImage = () => {
        if (selectedProduct && selectedProduct.images.length > 0) {
            setCurrentImageIndex((prevIndex) =>
                prevIndex === selectedProduct.images.length - 1 ? 0 : prevIndex + 1
            );
        }
    };

    const handlePrevImage = () => {
        if (selectedProduct && selectedProduct.images.length > 0) {
            setCurrentImageIndex((prevIndex) =>
                prevIndex === 0 ? selectedProduct.images.length - 1 : prevIndex - 1
            );
        }
    };

    // Print receipt
    const printReceipt = async () => {
        try {
            await axios.post(`/api/business/${business_slug}/create-receipt/`, {
                payment_method: paymentMethod,
                customer_name: customerName || null,
                customer_phone: customerPhone || null,
                discount_amount: discountType === 'amount' ? discountValue : 0,
                discount_percent: discountType === 'percent' ? discountValue : 0,
                sales: cart.map(item => ({
                    variant: item.variantId,
                    location: item.location,
                    quantity: item.quantity,
                    discount_amount: item.itemDiscountAmount || 0,
                    discount_percent: item.itemDiscountPercent || 0
                }))
            });

            // Clear cart and close modal
            setCart([]);
            setShowPaymentModal(false);
            setCustomerName('');
            setCustomerPhone('');
            setDiscountValue(0);
            setDiscountType('percent');
            setSaleCompleted(false);
            setReceiptData(null);

            alert('Чек успешно отправлен на печать!');
        } catch (err) {
            console.error('Print error:', err);
            alert('Ошибка при печати чека');
        }
    };

    // Apply cart discount
    const applyCartDiscount = () => {
        setShowDiscountModal(false);
    };

    // Apply item discount
    const applyItemDiscount = () => {
        setCart(prevCart =>
            prevCart.map(item =>
                item.variantId === currentItemForDiscount
                    ? {
                        ...item,
                        itemDiscountAmount: itemDiscountType === 'amount' ? parseFloat(itemDiscountValue) : 0,
                        itemDiscountPercent: itemDiscountType === 'percent' ? parseFloat(itemDiscountValue) : 0,
                        price: calculateItemPrice(item)
                    }
                    : item
            )
        );
        setShowItemDiscountModal(false);
        setItemDiscountValue(0);
    };

    const handlePrintReceipt = async () => {
        if (!receiptData?.receipt_pdf_file) {
            console.error('PDF файл чека не найден');
            return;
        }

        await printReceiptPdf(receiptData.receipt_pdf_file);
    };

    const handleDownloadPdf = async () => {
        if (!receiptData?.receipt_pdf_file) return;

        await openReceiptPdf(receiptData.receipt_pdf_file);
    };
    // Используем централизованную утилиту из хука

    // Render product cards
    const renderProductCards = () => {
        if (loading) return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Loader size="medium" />
            </div>
        );
        if (error) return <div className={styles.error}>Ошибка: {error}</div>;
        if (products.length === 0) return <div className={styles.empty}>Товары не найдены</div>;

        // Создаем массив всех вариантов с их продуктами для сортировки
        const allVariants = products.flatMap(product => 
            product.variants.map(variant => ({
                product,
                variant,
                availableQty: variant.available_quantity_in_location ?? 0
            }))
        );

        // Сортируем: сначала товары в наличии (по убыванию количества), потом остальные
        allVariants.sort((a, b) => {
            if (a.availableQty > 0 && b.availableQty === 0) return -1;
            if (a.availableQty === 0 && b.availableQty > 0) return 1;
            // Если оба в наличии - сортируем по количеству (больше первыми)
            if (a.availableQty > 0 && b.availableQty > 0) {
                return b.availableQty - a.availableQty;
            }
            return 0; // Если оба отсутствуют - оставляем как есть
        });

        return (

            <div className={styles.productsGrid}>
                {allVariants.map(({ product, variant }) => {
                        // Используем количество в выбранной локации
                        // Используем ?? вместо || чтобы 0 не считался falsy значением
                        const availableQty = variant.available_quantity_in_location ?? 0;
                        const mainImage = product.images.find(img => img.is_main)?.image || product.images[0]?.image;
                        const hasPrice = variant.price !== null && variant.price !== undefined;

                        return (
                            <div
                                key={`${product.id}-${variant.id}`}
                                className={`${styles.productCard} ${selectedProduct?.id === product.id && selectedVariant?.id === variant.id ? styles.selected : ''}`}
                                onClick={() => {
                                    setSelectedProduct(product);
                                    setSelectedVariant(variant);
                                    setCurrentImageIndex(0);
                                }}
                            >
                                <div className={styles.productImage}>
                                    <img
                                        src={mainImage}
                                        alt={product.name}
                                        onError={(e) => {
                                            e.target.src = 'https://via.placeholder.com/300x400?text=No+Image';
                                        }}
                                    />
                                </div>
                                <div className={styles.productInfo}>
                                    <h4>{product.name}</h4>
                                    <div className={styles.attributes}>
                                        {variant.attributes.map(attr => (
                                            <span key={attr.id} className={styles.attributeBadge}>
                                                {attr.custom_value || attr.predefined_value_name}
                                            </span>
                                        ))}
                                    </div>
                                    <div className={styles.priceSection}>
                                        {hasPrice ? (
                                            variant.discount > 0 ? (
                                                <>
                                                    <span className={styles.discountedPrice}>
                                                        {Math.round(variant.price * (1 - variant.discount / 100)).toLocaleString()} ₸
                                                    </span>
                                                    <span className={styles.originalPrice}>
                                                        {parseFloat(variant.price).toLocaleString()} ₸
                                                    </span>
                                                    <span className={styles.discountBadge}>-{variant.discount}%</span>
                                                </>
                                            ) : (
                                                <span>{parseFloat(variant.price).toLocaleString()} ₸</span>
                                            )
                                        ) : (
                                            <span className={styles.noPrice}>Цена не установлена</span>
                                        )}
                                    </div>
                                    <div className={styles.stockInfo}>
                                        <span className={`${styles.stockBadge} ${availableQty > 0 ? styles.inStock : styles.outOfStock}`}>
                                            {availableQty > 0 ? `В наличии: ${availableQty} ${product?.unit_display || 'шт.'}` : 'Нет в наличии'}
                                        </span>
                                    </div>
                                    <button
                                        className={styles.addToCartButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addToCart(product, variant);
                                        }}
                                        disabled={availableQty <= 0 || !hasPrice}
                                    >
                                        <FaPlus /> В корзину
                                    </button>
                                </div>
                            </div>
                        );
                    })}
            </div>
        );
    };

    // Render cart items
    const renderCartItems = () => {
        if (cart.length === 0) {
            return (
                <div className={styles.emptyCart}>
                    <FaShoppingCart size="2em" />
                    <p>Добавьте товары из списка</p>
                </div>
            );
        }

        return (
            <div className={styles.cartItems}>
                {cart.map(item => {
                    const finalPrice = calculateItemPrice(item);
                    const priceAfterOriginalDiscount = item.hasOriginalDiscount
                        ? Math.round(item.originalPrice * (1 - item.discount / 100))
                        : item.originalPrice;
                    const hasAdditionalDiscount = item.itemDiscountPercent > 0 || item.itemDiscountAmount > 0;
                    const selectedProduct = products.find(p => p.id === item.productId);
                    const selectedVariant = selectedProduct?.variants.find(v => v.id === item.variantId);

                    return (
                        <div key={item.variantId} className={styles.cartItem}>
                            <div className={styles.cartItemImage}>
                                <img
                                    src={item.image}
                                    alt={item.productName}
                                    onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                                    }}
                                />
                            </div>
                            <div className={styles.cartItemInfo}>
                                <h5>{item.productName}</h5>
                                <div className={styles.cartItemAttributes}>
                                    {item.attributes.map(attr => (
                                        <small key={attr.id}>
                                            {attr.custom_value || attr.predefined_value_name}
                                        </small>
                                    ))}
                                </div>
                                <small className={styles.cartItemSku}>Артикул: {item.sku}</small>

                                {/* FIFO и выбор партии для товара */}
                                {selectedVariant?.stocks_data?.stocks && (
                                    <div className={styles.itemBatchSelection}>
                                        <div className={styles.fifoCheckboxGroup}>
                                            <label className={styles.fifoCheckboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={item.useFifo !== false}
                                                    onChange={(e) => {
                                                        const useFifo = e.target.checked;
                                                        setCart(prevCart =>
                                                            prevCart.map(cartItem =>
                                                                cartItem.variantId === item.variantId
                                                                    ? {
                                                                        ...cartItem,
                                                                        useFifo: useFifo,
                                                                        batchId: useFifo ? null : cartItem.batchId,
                                                                        batchInfo: useFifo ? null : cartItem.batchInfo
                                                                    }
                                                                    : cartItem
                                                            )
                                                        );
                                                    }}
                                                    className={styles.fifoCheckbox}
                                                />
                                                <span className={styles.fifoLabel}>
                                                    FIFO 
                                                    <span className={styles.availableQtyBadge}>
                                                        (в наличии: {selectedVariant?.available_quantity_in_location ?? item.stock ?? 0} {item.unitDisplay || selectedProduct?.unit_display || 'шт.'})
                                                    </span>
                                                </span>
                                                <div 
                                                    className={styles.fifoTooltipIcon}
                                                    onMouseEnter={() => setShowFifoTooltip(item.variantId)}
                                                    onMouseLeave={() => setShowFifoTooltip(null)}
                                                >
                                                    ?
                                                    {showFifoTooltip === item.variantId && (
                                                        <div className={styles.fifoTooltip}>
                                                            FIFO (First In, First Out) — метод списания товара, при котором 
                                                            товары из более ранних партий продаются в первую очередь. 
                                                            Это помогает избежать просрочки и устаревания товара.
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        </div>

                                        {item.useFifo === false && (
                                            <div className={styles.batchSelectWrapper}>
                                                <label className={styles.batchSelectLabel}>Партия:</label>
                                                <select
                                                    value={item.batchId || ''}
                                                    onChange={(e) => {
                                                        const batchId = e.target.value ? parseInt(e.target.value) : null;
                                                        const stock = selectedVariant.stocks_data.stocks.find(s => s.batch_info?.id === batchId);
                                                        const batchInfo = stock?.batch_info ? {
                                                            id: stock.batch_info.id,
                                                            batch_number: stock.batch_info.batch_number,
                                                            received_date: stock.batch_info.received_date
                                                        } : null;

                                                        setCart(prevCart =>
                                                            prevCart.map(cartItem =>
                                                                cartItem.variantId === item.variantId
                                                                    ? { ...cartItem, batchId, batchInfo }
                                                                    : cartItem
                                                            )
                                                        );
                                                    }}
                                                    className={styles.batchSelect}
                                                >
                                                    <option value="">-- Выберите партию --</option>
                                                    {selectedVariant.stocks_data.stocks
                                                        .filter(stock => stock.batch_info)
                                                        .map(stock => {
                                                            const batch = stock.batch_info;
                                                            const date = new Date(batch.received_date);
                                                            const formattedDate = date.toLocaleString('ru-RU', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            });
                                                            return (
                                                                <option key={batch.id} value={batch.id}>
                                                                    {batch.batch_number} - {formattedDate} (доступно: {stock.available_quantity} {stock.unit_display || item.unitDisplay || selectedProduct?.unit_display || 'шт.'})
                                                                </option>
                                                            );
                                                        })}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className={styles.cartItemControls}>
                                <button
                                    className={styles.removeItemButton}
                                    onClick={() => removeFromCart(item.variantId)}
                                >
                                    <FaTimes />
                                </button>
                                <div className={styles.quantityControl}>
                                    {(() => {
                                        const unitDisplay = item.unitDisplay || 'шт.';
                                        const isPieces = unitDisplay === 'шт.';
                                        const step = isPieces ? 1 : 0.5;
                                        const inputStep = isPieces ? 1 : 0.1;
                                        const minValue = isPieces ? 1 : 0.1;
                                        
                                        return (
                                            <>
                                                <button
                                                    className={styles.quantityButton}
                                                    onClick={() => {
                                                        const newQty = item.quantity - step;
                                                        updateQuantity(item.variantId, newQty);
                                                    }}
                                                >
                                                    <FaMinus />
                                                </button>
                                                <div className={styles.quantityInputWrapper}>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            // Разрешаем пустое значение для возможности очистки поля
                                                            if (value === '' || value === null) {
                                                                setCart(prevCart => 
                                                                    prevCart.map(cartItem =>
                                                                        cartItem.variantId === item.variantId
                                                                            ? { ...cartItem, quantity: '' }
                                                                            : cartItem
                                                                    )
                                                                );
                                                                return;
                                                            }
                                                            const numValue = parseFloat(value);
                                                            if (isNaN(numValue)) return;
                                                            updateQuantity(item.variantId, numValue);
                                                        }}
                                                        onBlur={(e) => {
                                                            const value = e.target.value;
                                                            // Если поле пустое или значение меньше минимума, устанавливаем минимальное значение
                                                            if (value === '' || value === null || parseFloat(value) < minValue) {
                                                                updateQuantity(item.variantId, minValue);
                                                            } else {
                                                                // Нормализуем значение при потере фокуса
                                                                const numValue = parseFloat(value);
                                                                if (!isNaN(numValue)) {
                                                                    const normalizedValue = isPieces 
                                                                        ? Math.floor(numValue)
                                                                        : parseFloat(numValue.toFixed(3));
                                                                    updateQuantity(item.variantId, normalizedValue);
                                                                }
                                                            }
                                                        }}
                                                        step={inputStep}
                                                        min={minValue}
                                                        max={item.stock}
                                                        className={styles.quantityInput}
                                                    />
                                                    <span className={styles.quantityUnit}>{unitDisplay}</span>
                                                </div>
                                                <button
                                                    className={styles.quantityButton}
                                                    onClick={() => {
                                                        const newQty = item.quantity + step;
                                                        if (newQty <= item.stock) {
                                                            updateQuantity(item.variantId, newQty);
                                                        }
                                                    }}
                                                    disabled={item.quantity >= item.stock}
                                                >
                                                    <FaPlus />
                                                </button>
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className={styles.cartItemPrice}>
                                    <div className={styles.priceContainer}>
                                        {/* Всегда показываем оригинальную цену */}
                                        <div className={styles.priceRow}>
                                            <span className={item.hasOriginalDiscount || hasAdditionalDiscount ? styles.originalPrice : styles.basePrice}>
                                                {(item.originalPrice * item.quantity).toLocaleString()} ₸
                                            </span>
                                        </div>

                                        {/* Показываем промежуточную цену, если есть оригинальная скидка */}
                                        {item.hasOriginalDiscount && (
                                            <div className={styles.priceRow}>
                                                <span className={styles.intermediatePrice}>
                                                    {(priceAfterOriginalDiscount * item.quantity).toLocaleString()} ₸
                                                </span>
                                                <span>
                                                    -{item.discount}%
                                                </span>
                                            </div>
                                        )}

                                        {/* Показываем финальную цену, если есть дополнительные скидки */}
                                        {(hasAdditionalDiscount || item.hasOriginalDiscount) && (
                                            <div className={styles.priceRow}>
                                                <span className={styles.discountedPrice}>
                                                    {(finalPrice * item.quantity).toLocaleString()} ₸
                                                </span>
                                                {hasAdditionalDiscount && (
                                                    <span>
                                                        {item.itemDiscountPercent > 0
                                                            ? `-${item.itemDiscountPercent}%`
                                                            : `-${item.itemDiscountAmount} ₸`}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Общая информация о скидках */}
                                    {(item.hasOriginalDiscount || hasAdditionalDiscount) && (
                                        <div className={styles.discountInfo}>
                                            <small>Итоговая скидка: {(item.originalPrice * item.quantity - finalPrice * item.quantity).toLocaleString()} ₸</small>
                                        </div>
                                    )}
                                </div>
                                <button
                                    className={styles.discountButton}
                                    onClick={() => {
                                        setCurrentItemForDiscount(item.variantId);
                                        setItemDiscountType(item.itemDiscountPercent > 0 ? 'percent' : 'amount');
                                        setItemDiscountValue(
                                            item.itemDiscountPercent > 0
                                                ? item.itemDiscountPercent
                                                : item.itemDiscountAmount
                                        );
                                        setShowItemDiscountModal(true);
                                    }}
                                >
                                    <FaPercentage />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };
    // Render product details
    const renderProductDetails = () => {
        if (!selectedProduct || !selectedVariant) {
            return (
                <div className={styles.emptyProductDetails}>
                    <FaBoxOpen size="3em" />
                    <p>Выберите товар для просмотра деталей</p>

                    <div className={styles.skeletonContainer}>
                        <div className={styles.skeletonGallery}>
                            <div className={styles.skeletonMainImage}>
                                <div className={styles.skeletonShimmer}></div>
                            </div>
                            <div className={styles.skeletonThumbnails}>
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className={styles.skeletonThumbnail}>
                                        <div className={styles.skeletonShimmer}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.skeletonInfo}>
                            <div className={styles.skeletonTitle}>
                                <div className={styles.skeletonShimmer}></div>
                            </div>
                            <div className={styles.skeletonCategory}>
                                <div className={styles.skeletonShimmer}></div>
                            </div>
                            <div className={styles.skeletonPriceRow}>
                                <div className={styles.skeletonPrice}>
                                    <div className={styles.skeletonShimmer}></div>
                                </div>
                                <div className={styles.skeletonOldPrice}>
                                    <div className={styles.skeletonShimmer}></div>
                                </div>
                                <div className={styles.skeletonDiscount}>
                                    <div className={styles.skeletonShimmer}></div>
                                </div>
                            </div>
                            <div className={styles.skeletonStock}>
                                <div className={styles.skeletonShimmer}></div>
                            </div>
                            <div className={styles.skeletonSku}>
                                <div className={styles.skeletonShimmer}></div>
                            </div>
                            <div className={styles.skeletonButton}>
                                <div className={styles.skeletonShimmer}></div>
                            </div>
                            <div className={styles.skeletonDescriptionTitle}>
                                <div className={styles.skeletonShimmer}></div>
                            </div>
                            <div className={styles.skeletonDescription}>
                                <div className={styles.skeletonShimmer}></div>
                            </div>
                            <div className={styles.skeletonAttributesTitle}>
                                <div className={styles.skeletonShimmer}></div>
                            </div>
                            <div className={styles.skeletonAttributes}>
                                <div className={styles.skeletonShimmer}></div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Используем ?? вместо || чтобы 0 не считался falsy значением
        const availableQty = selectedVariant.available_quantity_in_location ?? 0;
        const currentImage = selectedProduct.images[currentImageIndex]?.image;
        const hasPrice = selectedVariant.price !== null && selectedVariant.price !== undefined;

        return (
            <div className={styles.productDetails}>
                <div className={styles.productGallery}>
                    <div className={styles.mainImage}>
                        <img
                            src={currentImage || 'https://via.placeholder.com/500x700?text=No+Image'}
                            alt={selectedProduct.name}
                            onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/500x700?text=No+Image';
                            }}
                        />
                        {selectedProduct.images.length > 1 && (
                            <>
                                <button
                                    className={styles.navButton}
                                    onClick={handlePrevImage}
                                    style={{ left: '10px' }}
                                >
                                    <FaChevronLeft />
                                </button>
                                <button
                                    className={styles.navButton}
                                    onClick={handleNextImage}
                                    style={{ right: '10px' }}
                                >
                                    <FaChevronRight />
                                </button>
                            </>
                        )}
                    </div>
                    <div className={styles.thumbnailContainer}>
                        {selectedProduct.images.map((image, index) => (
                            <div
                                key={index}
                                className={`${styles.thumbnail} ${index === currentImageIndex ? styles.activeThumbnail : ''}`}
                                onClick={() => setCurrentImageIndex(index)}
                            >
                                <img
                                    src={image.image}
                                    alt={selectedProduct.name}
                                    onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <div className={styles.productInfo}>
                    <h3>{selectedProduct.name}</h3>
                    <div className={styles.categoryBadge}>
                        {selectedProduct.category_name}
                    </div>

                    <div className={styles.priceSection}>
                        {hasPrice ? (
                            selectedVariant.discount > 0 ? (
                                <>
                                    <h4 className={styles.discountedPrice}>
                                        {Math.round(selectedVariant.price * (1 - selectedVariant.discount / 100)).toLocaleString()} ₸
                                    </h4>
                                    <div className={styles.originalPriceWrapper}>
                                        <span className={styles.originalPrice}>
                                            {parseFloat(selectedVariant.price).toLocaleString()} ₸
                                        </span>
                                        <span className={styles.discountBadge}>-{selectedVariant.discount}%</span>
                                    </div>
                                </>
                            ) : (
                                <h4>{parseFloat(selectedVariant.price).toLocaleString()} ₸</h4>
                            )
                        ) : (
                            <h4 className={styles.noPrice}>Цена не установлена</h4>
                        )}
                    </div>

                    <div className={styles.stockInfo}>
                        <span className={`${styles.stockBadge} ${availableQty > 0 ? styles.inStock : styles.outOfStock}`}>
                            {availableQty > 0 ? `В наличии: ${availableQty} ${selectedProduct?.unit_display || 'шт.'}` : 'Нет в наличии'}
                        </span>
                    </div>

                    <div className={styles.skuInfo}>
                        <small>Артикул: {selectedVariant.sku}</small>
                    </div>

                    <button
                        className={styles.addToCartButton}
                        onClick={() => addToCart(selectedProduct, selectedVariant)}
                        disabled={availableQty <= 0 || !hasPrice}
                    >
                        <FaPlus /> В корзину
                    </button>

                    <div className={styles.description}>
                        <h5>Описание</h5>
                        <p>{selectedProduct.description || 'Нет описания'}</p>
                    </div>

                    <div className={styles.attributesTable}>
                        <h5>Характеристики</h5>
                        <table>
                            <tbody>
                                {selectedVariant.attributes.map(attr => (
                                    <tr key={attr.id}>
                                        <td><strong>{attr.category_attribute_name}:</strong></td>
                                        <td>{attr.custom_value || attr.predefined_value_name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>
                    <FaCashRegister /> Система продаж
                </h1>
                <div className={styles.businessInfo}>
                    <span>{business_slug}</span>
                </div>
            </div>

            <div className={styles.content}>
                {/* Left column - Search and products */}
                <div className={styles.leftColumn}>
                    <div className={styles.searchCard}>
                        {/* Фильтры - локация и категория */}
                        <div className={styles.filtersSection}>
                            <div className={styles.filtersSectionHeader}>
                                <h4>Фильтры</h4>
                            </div>
                            <div className={styles.filterRow}>
                                <SearchableSelect
                                    options={locations}
                                    value={selectedLocation}
                                    onChange={(locationId) => {
                                        setSelectedLocation(locationId);
                                        setCart([]); // Очищаем корзину при смене локации
                                        setItemFifoStates({}); // Очищаем состояния FIFO
                                    }}
                                    disabled={locationsLoading}
                                    placeholder={locationsLoading ? "Загрузка..." : "Выберите локацию..."}
                                    icon={FaBoxOpen}
                                    label="Локация"
                                    required={true}
                                    getOptionLabel={(loc) => loc.name + (loc.is_primary ? ' ⭐' : '')}
                                    getOptionSubLabel={(loc) => 
                                        loc.location_type_detail?.name || 
                                        (loc.address ? loc.address : '')
                                    }
                                />

                                <SearchableSelect
                                    options={[{ id: '', name: 'Все категории' }, ...categories]}
                                    value={selectedCategory}
                                    onChange={setSelectedCategory}
                                    disabled={!selectedLocation}
                                    placeholder="Выберите категорию..."
                                    icon={FaShoppingCart}
                                    label="Категория"
                                    getOptionLabel={(cat) => cat.name}
                                    getOptionSubLabel={(cat) => cat.full_path || ''}
                                />
                            </div>
                        </div>

                        {/* Поиск товаров */}
                        <div className={styles.searchSection}>
                            <div className={styles.searchHeader}>
                                <h4>Поиск товаров</h4>
                                <button
                                    className={`${styles.scannerButton} ${scannerActive ? styles.scannerActive : ''}`}
                                    onClick={() => {
                                        setScannerActive((prev) => !prev); // ← меняем на toggle
                                        setTimeout(() => {
                                            searchInputRef.current && searchInputRef.current.focus();
                                        }, 100);
                                    }}
                                    type="button"
                                >
                                    {scannerActive ? <FaCheck /> : <FaBarcode />} Сканер штрих-кода
                                </button>
                            </div>

                            <div className={styles.searchInputGroup}>
                                <FaSearch className={styles.searchIcon} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Поиск по названию, артикулу или штрих-коду..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSearch();
                                    }}
                                    disabled={!selectedLocation}
                                    className={styles.searchInput}
                                />
                                <button
                                    className={styles.searchButton}
                                    onClick={handleSearch}
                                    disabled={!selectedLocation}
                                >
                                    Поиск
                                </button>
                            </div>

                            {/* Фильтр "Есть в наличии" */}
                            <div className={styles.filterCheckbox}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={inStockOnly}
                                        onChange={(e) => setInStockOnly(e.target.checked)}
                                        disabled={!selectedLocation}
                                    />
                                    <span>Только товары в наличии</span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.searchResults}>
                            {renderProductCards()}
                        </div>
                    </div>

                    <div className={styles.cartCard}>
                        <div className={styles.cartHeader}>
                            <h4>Выбранные товары</h4>
                        </div>

                        <div className={styles.cartBody}>
                            {renderCartItems()}

                            <div className={styles.cartFooter}>
                                <div className={styles.cartTotals}>
                                    {/* Сумма без скидок */}
                                    <div className={styles.totalRow}>
                                        <span>Сумма без скидок:</span>
                                        <span>{calculateSubtotal().toLocaleString()} ₸</span>
                                    </div>

                                    {/* Оригинальные Изначальная скидка */}
                                    {cart.some(item => item.hasOriginalDiscount) && (
                                        <div className={styles.totalRow}>
                                            <span>Изначальная скидка:</span>
                                            <span className={styles.discountValue}>
                                                -{cart.reduce((sum, item) => {
                                                    if (!item.hasOriginalDiscount) return sum;
                                                    return sum + (item.originalPrice - Math.round(item.originalPrice * (1 - item.discount / 100))) * item.quantity;
                                                }, 0).toLocaleString()} ₸
                                            </span>
                                        </div>
                                    )}

                                    {/* Скидки на товары */}
                                    {cart.some(item => item.itemDiscountPercent > 0 || item.itemDiscountAmount > 0) && (
                                        <div className={styles.totalRow}>
                                            <span>Дополнительные скидки:</span>
                                            <span className={styles.discountValue}>
                                                -{cart.reduce((sum, item) => {
                                                    const priceAfterOriginalDiscount = item.hasOriginalDiscount
                                                        ? Math.round(item.originalPrice * (1 - item.discount / 100))
                                                        : item.originalPrice;
                                                    const finalPrice = calculateItemPrice(item);
                                                    return sum + (priceAfterOriginalDiscount - finalPrice) * item.quantity;
                                                }, 0).toLocaleString()} ₸
                                            </span>
                                        </div>
                                    )}

                                    {/* Общая скидка на чек */}
                                    {(discountValue > 0) && (
                                        <div className={styles.totalRow}>
                                            <span>Общая скидка на чек:</span>
                                            <span className={styles.discountValue}>
                                                -{(
                                                    discountType === 'percent'
                                                        ? (calculateSubtotal() -
                                                            cart.reduce((sum, item) => {
                                                                if (item.hasOriginalDiscount) {
                                                                    sum += (item.originalPrice - Math.round(item.originalPrice * (1 - item.discount / 100))) * item.quantity;
                                                                }
                                                                const priceAfterOriginal = item.hasOriginalDiscount
                                                                    ? Math.round(item.originalPrice * (1 - item.discount / 100))
                                                                    : item.originalPrice;
                                                                const finalPrice = calculateItemPrice(item);
                                                                sum += (priceAfterOriginal - finalPrice) * item.quantity;
                                                                return sum;
                                                            }, 0)) * discountValue / 100
                                                        : discountValue
                                                ).toLocaleString()} ₸
                                            </span>
                                        </div>
                                    )}

                                    {/* Итоговая сумма */}
                                    <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                                        <span>Итого к оплате:</span>
                                        <span>{calculateTotal().toLocaleString()} ₸</span>
                                    </div>
                                </div>

                                <div className={styles.cartActions}>
                                    <button
                                        className={styles.discountButton}
                                        onClick={() => setShowDiscountModal(true)}
                                        disabled={cart.length === 0}
                                    >
                                        <FaPercentage /> Скидка
                                    </button>
                                    <button
                                        className={styles.clearCartButton}
                                        onClick={() => {
                                            setCart([]);
                                            setItemFifoStates({});
                                        }}
                                        disabled={cart.length === 0}
                                    >
                                        <FaTrashAlt /> Очистить
                                    </button>
                                    <button
                                        className={styles.checkoutButton}
                                        onClick={() => setShowPaymentModal(true)}
                                        disabled={cart.length === 0}
                                    >
                                        <FaCashRegister /> Продать
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right column - Product details and recent sales */}
                <div className={styles.rightColumn}>
                    <div className={styles.detailsCard}>
                        <div className={styles.detailsHeader}>
                            <h4>Информация о товаре</h4>
                        </div>
                        <div className={styles.detailsBody}>
                            {renderProductDetails()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Discount Modal */}
            {/* Cart Discount Modal */}
            {showDiscountModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} tabIndex={-1} aria-modal="true" role="dialog">
                        <div className={styles.modalHeader}>
                            <h4>Скидка на весь чек</h4>
                            <button
                                className={styles.closeButton}
                                onClick={() => setShowDiscountModal(false)}
                                aria-label="Закрыть"
                            >
                                &times;
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.discountControls}>
                                <div className={styles.discountType} role="radiogroup" aria-label="Тип скидки">
                                    <label className={styles.radioLabel}>
                                        <input
                                            type="radio"
                                            checked={discountType === 'percent'}
                                            onChange={() => setDiscountType('percent')}
                                        />
                                        <span>Процентная</span>
                                    </label>
                                    <label className={styles.radioLabel}>
                                        <input
                                            type="radio"
                                            checked={discountType === 'amount'}
                                            onChange={() => setDiscountType('amount')}
                                        />
                                        <span>Фиксированная</span>
                                    </label>
                                </div>
                                <div className={styles.discountInput}>
                                    {discountType === 'percent' ? (
                                        <>
                                            <input
                                                type="number"
                                                value={discountValue}
                                                autoFocus
                                                onChange={(e) => setDiscountValue(Math.min(100, Math.max(0, Number(e.target.value))))}
                                                min="0"
                                                max="100"
                                                placeholder="0"
                                            />
                                            <span className={styles.inputUnit}>%</span>
                                        </>
                                    ) : (
                                        <>
                                            <input
                                                type="number"
                                                value={discountValue}
                                                autoFocus
                                                onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value)))}
                                                min="0"
                                                placeholder="0"
                                            />
                                            <span className={styles.inputUnit}>₸</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.secondaryButton}
                                onClick={() => setShowDiscountModal(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className={styles.primaryButton}
                                onClick={applyCartDiscount}
                            >
                                Применить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Item Discount Modal */}
            {showItemDiscountModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} tabIndex={-1} aria-modal="true" role="dialog">
                        <div className={styles.modalHeader}>
                            <h4>Скидка на товар</h4>
                            <button
                                className={styles.closeButton}
                                onClick={() => setShowItemDiscountModal(false)}
                                aria-label="Закрыть"
                            >
                                &times;
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.discountControls}>
                                <div className={styles.discountType} role="radiogroup" aria-label="Тип скидки">
                                    <label className={styles.radioLabel}>
                                        <input
                                            type="radio"
                                            checked={itemDiscountType === 'percent'}
                                            onChange={() => setItemDiscountType('percent')}
                                        />
                                        <span>Процентная</span>
                                    </label>
                                    <label className={styles.radioLabel}>
                                        <input
                                            type="radio"
                                            checked={itemDiscountType === 'amount'}
                                            onChange={() => setItemDiscountType('amount')}
                                        />
                                        <span>Фиксированная</span>
                                    </label>
                                </div>
                                <div className={styles.discountInput}>
                                    {itemDiscountType === 'percent' ? (
                                        <>
                                            <input
                                                type="number"
                                                value={itemDiscountValue}
                                                autoFocus
                                                onChange={(e) => setItemDiscountValue(Math.min(100, Math.max(0, Number(e.target.value))))}
                                                min="0"
                                                max="100"
                                                placeholder="0"
                                            />
                                            <span className={styles.inputUnit}>%</span>
                                        </>
                                    ) : (
                                        <>
                                            <input
                                                type="number"
                                                value={itemDiscountValue}
                                                autoFocus
                                                onChange={(e) => setItemDiscountValue(Math.max(0, Number(e.target.value)))}
                                                min="0"
                                                placeholder="0"
                                            />
                                            <span className={styles.inputUnit}>₸</span>
                                        </>
                                    )}
                                </div>
                                {currentItemForDiscount && (
                                    <div className={styles.currentDiscountInfo}>
                                        <p>
                                            <span>Текущая цена:&nbsp;</span>
                                            <span className={styles.nowPrice}>
                                                {cart.find(i => i.variantId === currentItemForDiscount)?.price.toLocaleString()} ₸
                                            </span>
                                        </p>
                                        <p>
                                            <span>Оригинальная цена:&nbsp;</span>
                                            <span className={styles.oldPrice}>
                                                {cart.find(i => i.variantId === currentItemForDiscount)?.originalPrice.toLocaleString()} ₸
                                            </span>
                                        </p>
                                        {cart.find(i => i.variantId === currentItemForDiscount)?.hasOriginalDiscount && (
                                            <p>
                                                <span>Оригинальная скидка:&nbsp;</span>
                                                <span className={styles.discountValueAccent}>
                                                    {cart.find(i => i.variantId === currentItemForDiscount)?.discount}%
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.secondaryButton}
                                onClick={() => setShowItemDiscountModal(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className={styles.primaryButton}
                                onClick={applyItemDiscount}
                            >
                                Применить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h4>{saleCompleted ? 'Чек продажи' : 'Оформление продажи'}</h4>
                            <button
                                className={styles.closeButton}
                                onClick={() => {
                                    // Сначала сбрасываем состояние продажи
                                    if (saleCompleted) {
                                        setSaleCompleted(false);
                                        setReceiptData(null);
                                        setCart([]);
                                        setCustomerName('');
                                        setCustomerPhone('');
                                        setDiscountValue(0);
                                    }
                                    // Затем закрываем модальное окно
                                    setShowPaymentModal(false);
                                }}
                            >
                                &times;
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            {!saleCompleted ? (
                                <>
                                    <div className={styles.receiptPreview}>
                                        <div className={styles.receiptHeader}>
                                            <h5>Чек #{new Date().getTime().toString().slice(-6)}</h5>
                                            <p>{new Date().toLocaleString('ru-RU')}</p>
                                        </div>

                                        <div className={styles.receiptItems}>
                                            {cart.map(item => {
                                                const itemPrice = calculateItemPrice(item);
                                                const originalPrice = item.originalPrice;
                                                const hasDiscount = item.itemDiscountPercent > 0 || item.itemDiscountAmount > 0;
                                                const hasOriginalDiscount = item.hasOriginalDiscount;
                                                const priceAfterOriginalDiscount = hasOriginalDiscount
                                                    ? Math.round(originalPrice * (1 - item.discount / 100))
                                                    : originalPrice;

                                                return (
                                                    <div key={item.variantId} className={styles.receiptItem}>
                                                        <div className={styles.receiptItemMain}>
                                                            <div className={styles.receiptItemName}>
                                                                {item.productName}
                                                                <div className={styles.receiptItemDetails}>
                                                                    {item.attributes.map(a => (
                                                                        <span key={a.id} className={styles.receiptItemAttribute}>
                                                                            <span className={styles.attributeName}>{a.category_attribute_name}:</span>
                                                                            <span className={styles.attributeValue}>{a.custom_value || a.predefined_value_name}</span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className={styles.receiptItemPrices}>
                                                                <div className={styles.receiptPriceRow}>
                                                                    <span className={styles.priceLabel}>{item.quantity} × {originalPrice.toLocaleString()} ₸</span>
                                                                    <span className={styles.priceValue}>{(originalPrice * item.quantity).toLocaleString()} ₸</span>
                                                                </div>

                                                                {hasOriginalDiscount && (
                                                                    <div className={styles.receiptDiscountRow}>
                                                                        <span className={styles.discountLabel}>
                                                                            <FaPercentage size={12} /> Скидка {item.discount}%
                                                                        </span>
                                                                        <span className={styles.discountValue}>
                                                                            -{Math.round(originalPrice * item.discount / 100 * item.quantity).toLocaleString()} ₸
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {hasDiscount && (
                                                                    <div className={styles.receiptDiscountRow}>
                                                                        <span className={styles.discountLabel}>
                                                                            <FaPercentage size={12} /> {item.itemDiscountPercent > 0
                                                                                ? `Доп. скидка ${item.itemDiscountPercent}%`
                                                                                : `Скидка ${item.itemDiscountAmount} ₸`}
                                                                        </span>
                                                                        <span className={styles.discountValue}>
                                                                            -{item.itemDiscountPercent > 0
                                                                                ? Math.round(priceAfterOriginalDiscount * item.itemDiscountPercent / 100 * item.quantity).toLocaleString()
                                                                                : (item.itemDiscountAmount * item.quantity).toLocaleString()} ₸
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                <div className={styles.receiptTotalRow}>
                                                                    <span className={styles.totalLabel}>Итого за товар:</span>
                                                                    <span className={styles.totalValue}>{(itemPrice * item.quantity).toLocaleString()} ₸</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className={styles.receiptSummary}>
                                            <div className={styles.receiptSummarySection}>
                                                <div className={styles.receiptSummaryRow}>
                                                    <span>Товары:</span>
                                                    <span>{calculateSubtotal().toLocaleString()} ₸</span>
                                                </div>

                                                {cart.some(item => item.hasOriginalDiscount) && (
                                                    <div className={styles.receiptSummaryRow}>
                                                        <span>Изначальная скидка:</span>
                                                        <span className={styles.summaryDiscount}>
                                                            -{cart.reduce((sum, item) => {
                                                                if (!item.hasOriginalDiscount) return sum;
                                                                return sum + (item.originalPrice - Math.round(item.originalPrice * (1 - item.discount / 100))) * item.quantity;
                                                            }, 0).toLocaleString()} ₸
                                                        </span>
                                                    </div>
                                                )}

                                                {cart.some(item => item.itemDiscountPercent > 0 || item.itemDiscountAmount > 0) && (
                                                    <div className={styles.receiptSummaryRow}>
                                                        <span>Ваши скидки:</span>
                                                        <span className={styles.summaryDiscount}>
                                                            -{cart.reduce((sum, item) => {
                                                                const priceAfterOriginal = item.hasOriginalDiscount
                                                                    ? Math.round(item.originalPrice * (1 - item.discount / 100))
                                                                    : item.originalPrice;
                                                                const finalPrice = calculateItemPrice(item);
                                                                return sum + (priceAfterOriginal - finalPrice) * item.quantity;
                                                            }, 0).toLocaleString()} ₸
                                                        </span>
                                                    </div>
                                                )}

                                                {discountValue > 0 && (
                                                    <div className={styles.receiptSummaryRow}>
                                                        <span>Общая скидка на чек:</span>
                                                        <span className={styles.summaryDiscount}>
                                                            -{(discountType === 'percent'
                                                                ? (calculateSubtotal() -
                                                                    cart.reduce((sum, item) => {
                                                                        if (item.hasOriginalDiscount) {
                                                                            sum += (item.originalPrice - Math.round(item.originalPrice * (1 - item.discount / 100))) * item.quantity;
                                                                        }
                                                                        const priceAfterOriginal = item.hasOriginalDiscount
                                                                            ? Math.round(item.originalPrice * (1 - item.discount / 100))
                                                                            : item.originalPrice;
                                                                        const finalPrice = calculateItemPrice(item);
                                                                        sum += (priceAfterOriginal - finalPrice) * item.quantity;
                                                                        return sum;
                                                                    }, 0)) * discountValue / 100
                                                                : discountValue
                                                            ).toLocaleString()} ₸
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.receiptSummarySaleRow}>
                                                <span>Конечная сумма скидки:</span>
                                                <span className={styles.summaryDiscount}>-{calculateTotalDiscount().toLocaleString()} ₸</span>
                                            </div>

                                            <div className={styles.receiptTotalSection}>
                                                <div className={styles.receiptTotalRow}>
                                                    <span>Итого к оплате:</span>
                                                    <span className={styles.receiptGrandTotal}>{calculateTotal().toLocaleString()} ₸</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.paymentForm}>
                                        <div className={styles.formGroup}>
                                            <label>Способ оплаты</label>
                                            <select
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                            >
                                                {paymentMethods.map(method => (
                                                    <option key={method.id} value={method.code}>
                                                        {method.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label>Клиент (необязательно)</label>
                                            <input
                                                type="text"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder="Имя клиента"
                                            />
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label>Телефон (необязательно)</label>
                                            <input
                                                type="tel"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                placeholder="+7 (XXX) XXX-XXXX"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : receiptData ? (
                                <div className={styles.receiptCompleted}>
                                    {receiptData.receipt_preview_image ? (
                                    <div className={styles.receiptImageContainer}>
                                        <img
                                                src={receiptData.receipt_preview_image || getFileUrl(receiptData.receipt_preview_image)}
                                            alt={`Чек ${receiptData.number}`}
                                            className={styles.receiptImage}
                                            onError={(e) => {
                                                    console.error('Ошибка загрузки изображения чека:', receiptData.receipt_preview_image);
                                                    const imageUrl = receiptData.receipt_preview_image || getFileUrl(receiptData.receipt_preview_image);
                                                    console.error('Полный URL:', imageUrl);
                                                e.target.src = 'https://via.placeholder.com/300x400?text=No+Image';
                                            }}
                                                onLoad={() => {
                                                    const imageUrl = receiptData.receipt_preview_image || getFileUrl(receiptData.receipt_preview_image);
                                                    console.log('Изображение чека успешно загружено:', imageUrl);
                                                }}
                                        />
                                    </div>
                                    ) : (
                                        <div className={styles.receiptImageContainer}>
                                            <div className={styles.receiptImagePlaceholder}>
                                                <p>Превью чека недоступно</p>
                                                <small>PDF файл: {receiptData.receipt_pdf_file ? 'Доступен' : 'Недоступен'}</small>
                                            </div>
                                        </div>
                                    )}

                                    <div className={styles.receiptInfo}>
                                        <h5>Чек #{receiptData.number}</h5>
                                        <p><strong>Дата:</strong> {new Date(receiptData.created_at).toLocaleString()}</p>
                                        <p><strong>Сумма:</strong> {parseFloat(receiptData.total_amount).toLocaleString()} ₸</p>
                                        <p><strong>Способ оплаты:</strong> {receiptData.payment_method}</p>
                                        {receiptData.customer_name && (
                                            <p><strong>Клиент:</strong> {receiptData.customer_name}</p>
                                        )}
                                        {receiptData.customer_phone && (
                                            <p><strong>Телефон:</strong> {receiptData.customer_phone}</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.receiptLoading}>
                                    <p>Формирование чека...</p>
                                </div>
                            )}
                        </div>

                        <div className={styles.modalFooter}>
                            {!saleCompleted ? (
                                <>
                                    <button
                                        className={styles.secondaryButton}
                                        onClick={() => setShowPaymentModal(false)}
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        className={styles.successButton}
                                        onClick={completeSale}
                                        disabled={saleCompleted || salePosting}
                                    >
                                        <FaCheck /> {salePosting ? 'Сохраняю…' : 'Подтвердить продажу'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        className={styles.primaryButton}
                                        onClick={handleDownloadPdf}
                                    >
                                        Скачать PDF
                                    </button>
                                    <button
                                        className={styles.primaryButton}
                                        onClick={handlePrintReceipt}
                                    >
                                        <FaPrint /> Печать чека
                                    </button>
                                    <button
                                        className={styles.secondaryButton}
                                        onClick={() => {
                                            setShowPaymentModal(false);
                                            setSaleCompleted(false);
                                            setCart([]);
                                            setCustomerName('');
                                            setCustomerPhone('');
                                            setDiscountValue(0);
                                        }}
                                    >
                                        Закрыть
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesPage;