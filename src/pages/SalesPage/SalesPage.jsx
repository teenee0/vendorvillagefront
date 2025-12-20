import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    FaPercentage,
    FaChevronDown,
    FaChevronUp,
    FaQrcode,
    FaGift
} from 'react-icons/fa';
import ModalCloseButton from '../../components/ModalCloseButton/ModalCloseButton';
import { openReceiptPdf, printReceiptPdf } from '../../utils/printUtils';
import styles from './SalesPage.module.css';
import Loader from '../../components/Loader';
import QRScanner from '../../components/QRScanner/QRScanner';

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
    const navigate = useNavigate();
    const { getFileUrl } = useFileUtils();
    const [cart, setCart] = useState([]);
    const [cart2, setCart2] = useState([]); // Вторая корзина
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [searchQuery, setSearchQuery] = useState(''); // Текущее значение в поле ввода
    const [activeSearchQuery, setActiveSearchQuery] = useState(''); // Активный поисковый запрос для API
    const [selectedCategory, setSelectedCategory] = useState('');
    const [inStockOnly, setInStockOnly] = useState(true); // Фильтр "Есть в наличии"
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [bonusSettings, setBonusSettings] = useState(null);
    const [bonusPercentOverride, setBonusPercentOverride] = useState(null);
    const [bonusAccrualMode, setBonusAccrualMode] = useState('tier'); // 'tier' или 'settings'
    const [bonusRedemptionPercent, setBonusRedemptionPercent] = useState(0);
    const [bonusRedemptionAmount, setBonusRedemptionAmount] = useState(0);
    const [bonusRedemptionType, setBonusRedemptionType] = useState('percent');
    const [showBonusRedemption, setShowBonusRedemption] = useState(false);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [discountModalCart, setDiscountModalCart] = useState(1); // В какую корзину применяется скидка
    const [discountType, setDiscountType] = useState('percent');
    const [discountValue, setDiscountValue] = useState(0);
    const [discountValue2, setDiscountValue2] = useState(0); // Скидка для второй корзины
    const [discountType2, setDiscountType2] = useState('percent');
    const [showItemDiscountModal, setShowItemDiscountModal] = useState(false);
    const [currentItemForDiscount, setCurrentItemForDiscount] = useState(null);
    const [currentItemCartNumber, setCurrentItemCartNumber] = useState(1); // В какой корзине товар для скидки
    const [itemDiscountType, setItemDiscountType] = useState('percent');
    const [itemDiscountValue, setItemDiscountValue] = useState(0);
    const [saleCompleted, setSaleCompleted] = useState(false);
    const [salePosting, setSalePosting] = useState(false);
    const [receiptData, setReceiptData] = useState(null);
    const [activeCartForSale, setActiveCartForSale] = useState(1); // Какая корзина используется для продажи
    const [scannerActive, setScannerActive] = useState(false); // подсветка режима
    const [isScanning, setIsScanning] = useState(false); // флаг активного сканирования
    const searchInputRef = useRef(null); // ссылка на поле ввода
    const scanTimeoutRef = useRef(null); // таймер для автоматического поиска при сканировании
    const skipNextFetchRef = useRef(false); // флаг для пропуска следующего запроса (при очистке после сканирования)
    
    // Состояния для локаций
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [locationsLoading, setLocationsLoading] = useState(true);
    
    // Состояния для партий и FIFO - теперь для каждого товара
    const [itemFifoStates, setItemFifoStates] = useState({}); // {variantId: boolean}
    const [showFifoTooltip, setShowFifoTooltip] = useState(null); // variantId товара для которого показываем тултип
    const [expandedAttributes, setExpandedAttributes] = useState(new Set()); // Set с ID вариантов, у которых раскрыты атрибуты

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

    // Fetch bonus settings for location
    const fetchBonusSettings = useCallback(async () => {
        if (!selectedLocation) return;
        try {
            const response = await axios.get(
                `api/business/${business_slug}/bonus-settings/?location=${selectedLocation}`
            );
            setBonusSettings(response.data);
        } catch (err) {
            console.error('Failed to fetch bonus settings:', err);
            setBonusSettings(null);
        }
    }, [business_slug, selectedLocation]);

    // Fetch products from API
    const fetchProducts = useCallback(async () => {
        if (!selectedLocation) {
            return; // Не загружаем товары без выбранной локации
        }
        
        // Пропускаем запрос только если это автоматическая очистка после сканирования
        // (когда activeSearchQuery становится пустым после успешного сканирования)
        if (skipNextFetchRef.current && scannerActive && !activeSearchQuery) {
            skipNextFetchRef.current = false;
            return;
        }
        // Сбрасываем флаг в любом случае после проверки
        skipNextFetchRef.current = false;
        
        try {
            setLoading(true);
            setError(null); // Сбрасываем предыдущие ошибки
            
            // Убеждаемся, что location передается как строка (API ожидает строку)
            const params = {
                location: String(selectedLocation) // Обязательный параметр, преобразуем в строку
            };
            if (activeSearchQuery) params.search = activeSearchQuery;
            if (selectedCategory) params.category = selectedCategory;
            if (inStockOnly) params.in_stock = 'true'; // Фильтр "Есть в наличии"

            console.log('Fetching products with params:', params); // Логирование для отладки
            
            const response = await axios.get(`/api/business/${business_slug}/sales-products/`, { params });
            
            console.log('Products response:', response.data); // Логирование для отладки
            
            setProducts(response.data.products || []);
            setLoading(false);
            
            // В режиме сканера после получения результатов очищаем поле и возвращаем фокус
            if (scannerActive) {
                // Устанавливаем флаг чтобы пропустить следующий запрос (который будет вызван при очистке activeSearchQuery)
                skipNextFetchRef.current = true;
                setSearchQuery('');
                setActiveSearchQuery('');
                setIsScanning(false);
                // Возвращаем фокус на поле ввода для следующего сканирования
                setTimeout(() => {
                    if (searchInputRef.current) {
                        searchInputRef.current.focus();
                    }
                }, 100);
            }
        } catch (err) {
            if (err.response?.data?.error === 'location_required') {
                setError('Пожалуйста, выберите локацию');
            } else {
                setError(err.message);
            }
            setLoading(false);
            // В режиме сканера даже при ошибке очищаем поле
            if (scannerActive) {
                skipNextFetchRef.current = true;
                setSearchQuery('');
                setActiveSearchQuery('');
                setIsScanning(false);
                setTimeout(() => {
                    if (searchInputRef.current) {
                        searchInputRef.current.focus();
                    }
                }, 100);
            }
        }
    }, [business_slug, activeSearchQuery, selectedCategory, selectedLocation, scannerActive, inStockOnly]);

    const handleSearch = async () => {
        // Сбрасываем флаг пропуска (пользователь явно нажал кнопку поиска)
        skipNextFetchRef.current = false;
        setActiveSearchQuery(searchQuery); // Устанавливаем активный запрос из поля ввода (может быть пустым)
        if (scannerActive) {
            setIsScanning(true);
        }
        // fetchProducts вызовется автоматически через useEffect
    };

    // Обработка ввода в режиме сканера
    const handleScannerInput = (e) => {
        const value = e.target.value;
        const previousLength = searchQuery.length;
        
        // Если в режиме сканера и длина текста значительно уменьшилась (начался новый ввод)
        // Это означает что пользователь начал сканировать новый штрих-код
        if (scannerActive && previousLength > 0 && value.length < previousLength && value.length < 5) {
            // Начался новый ввод - очищаем предыдущий запрос
            setActiveSearchQuery('');
            setIsScanning(false);
            // Очищаем таймер если был
            if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
                scanTimeoutRef.current = null;
            }
        }
        
        setSearchQuery(value);
        
        // В режиме сканера автоматически отправляем запрос при достижении длины штрих-кода (13 символов)
        if (scannerActive && value.length >= 13) {
            // Очищаем предыдущий таймер
            if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
            }
            // Автоматически отправляем запрос через небольшую задержку (на случай если сканер еще вводит)
            const barcodeValue = value; // Сохраняем значение для использования в таймере
            scanTimeoutRef.current = setTimeout(() => {
                // Проверяем что значение все еще актуально (не изменилось)
                if (searchInputRef.current && searchInputRef.current.value === barcodeValue && barcodeValue.length >= 13) {
                    setActiveSearchQuery(barcodeValue);
                    setIsScanning(true);
        }
            }, 150);
        }
    };

    // Обработка нажатия клавиш в режиме сканера
    const handleScannerKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchQuery.trim()) {
                handleSearch();
            }
        }
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

    // Загружаем товары когда выбрана локация или изменился активный поисковый запрос
    useEffect(() => {
        if (selectedLocation) {
            // Сбрасываем флаг пропуска при изменении локации или других фильтров
            skipNextFetchRef.current = false;
            fetchProducts();
        } else {
            // Если локация не выбрана, очищаем список товаров
            setProducts([]);
        }
    }, [selectedLocation, activeSearchQuery, selectedCategory, inStockOnly, fetchProducts]);

    // Загружаем настройки бонусов при изменении локации
    useEffect(() => {
        fetchBonusSettings();
    }, [fetchBonusSettings]);

    // При активации/деактивации сканера управляем фокусом
    useEffect(() => {
        if (scannerActive) {
            // При активации сканера очищаем поле и устанавливаем фокус
            skipNextFetchRef.current = true; // Пропускаем запрос при очистке
            setSearchQuery('');
            setActiveSearchQuery('');
            setIsScanning(false);
            setTimeout(() => {
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                }
            }, 100);
        } else {
            // При деактивации очищаем таймер
            if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
                scanTimeoutRef.current = null;
            }
            setIsScanning(false);
            skipNextFetchRef.current = false;
        }
    }, [scannerActive]);


    const handleActivateScanner = () => {
        setScannerActive(true);
        setTimeout(() => {
            searchInputRef.current && searchInputRef.current.focus();
        }, 100);
    };

    // Add to cart function
    const addToCart = (product, variant, targetCart = 1) => {
        const targetCartState = targetCart === 1 ? cart : cart2;
        const setTargetCart = targetCart === 1 ? setCart : setCart2;
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

        setTargetCart(prevCart => {
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

    // Calculate subtotal (without discounts) for specific cart
    const calculateSubtotal = (currentCart) => {
        return currentCart.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
    };

    // Calculate total with discounts for specific cart
    const calculateTotal = (currentCart, currentDiscountValue = discountValue, currentDiscountType = discountType) => {
        // Сначала считаем сумму с учетом всех скидок на товары
        const itemsTotal = currentCart.reduce((sum, item) => {
            return sum + (calculateItemPrice(item) * item.quantity);
        }, 0);

        // Затем применяем общую скидку на чек (если есть)
        let total = itemsTotal;
        if (currentDiscountType === 'percent' && currentDiscountValue > 0) {
            total = total * (1 - currentDiscountValue / 100);
        } else if (currentDiscountType === 'amount' && currentDiscountValue > 0) {
            total = Math.max(0, total - currentDiscountValue);
        }

        return Math.round(total);
    };

    // Calculate total with discounts and bonus redemption
    const calculateTotalWithBonuses = (currentCart, currentDiscountValue = discountValue, currentDiscountType = discountType) => {
        // Сначала получаем сумму после всех скидок
        let total = calculateTotal(currentCart, currentDiscountValue, currentDiscountType);
        
        // Вычитаем списанные бонусы (если есть)
        if (selectedCustomer && bonusRedemptionType && showBonusRedemption) {
            let bonusRedeemed = 0;
            const customerBalance = parseFloat(selectedCustomer.balance || 0);
            
            if (bonusRedemptionType === 'percent' && bonusRedemptionPercent > 0) {
                bonusRedeemed = customerBalance * bonusRedemptionPercent / 100;
            } else if (bonusRedemptionType === 'amount' && bonusRedemptionAmount > 0) {
                bonusRedeemed = bonusRedemptionAmount;
            }
            
            // Нельзя списать больше, чем итоговая сумма покупки
            bonusRedeemed = Math.min(bonusRedeemed, total);
            
            // Вычитаем бонусы из итоговой суммы
            total = total - bonusRedeemed;
        }
        
        // Итоговая сумма не может быть отрицательной
        return Math.max(0, Math.round(total));
    };
    // Calculate total discount amount for specific cart
    const calculateTotalDiscount = (currentCart, currentDiscountValue = discountValue, currentDiscountType = discountType) => {
        const subtotal = calculateSubtotal(currentCart);
        return subtotal - calculateTotal(currentCart, currentDiscountValue, currentDiscountType);
    };

    // Calculate bonus prediction
    const calculateBonusPrediction = (currentCart, currentDiscountValue = discountValue, currentDiscountType = discountType) => {
        if (!selectedCustomer || !bonusSettings || !bonusSettings.is_enabled) {
            return null;
        }

        const total = calculateTotal(currentCart, currentDiscountValue, currentDiscountType);
        
        // Проверяем минимальную сумму покупки
        if (total < parseFloat(bonusSettings.min_purchase_amount || 0)) {
            return null;
        }

        // Определяем процент начисления в зависимости от режима
        let bonusPercent = 0;
        
        // Если процент фиксированный, всегда используем настройки (если нет переопределения)
        if (bonusSettings.is_fixed_percent && bonusPercentOverride === null) {
            bonusPercent = parseFloat(bonusSettings.bonus_percent || 0);
        } else if (bonusPercentOverride !== null) {
            // Если вручную указан процент, используем его
            bonusPercent = parseFloat(bonusPercentOverride);
        } else if (bonusAccrualMode === 'tier' && selectedCustomer.tier?.bonus_percent) {
            // Используем процент из tier системы
            bonusPercent = parseFloat(selectedCustomer.tier.bonus_percent);
        } else if (bonusAccrualMode === 'settings') {
            // Явно используем процент из общих настроек
            bonusPercent = parseFloat(bonusSettings.bonus_percent || 0);
        } else {
            // Fallback: используем процент из общих настроек
            bonusPercent = parseFloat(bonusSettings.bonus_percent || 0);
        }

        // Рассчитываем начисление бонусов
        let bonusAccrual = total * bonusPercent / 100;

        // Применяем лимиты
        if (bonusSettings.max_bonus_percent) {
            const maxByPercent = total * parseFloat(bonusSettings.max_bonus_percent) / 100;
            bonusAccrual = Math.min(bonusAccrual, maxByPercent);
        }

        if (bonusSettings.max_bonus_amount) {
            bonusAccrual = Math.min(bonusAccrual, parseFloat(bonusSettings.max_bonus_amount));
        }

        return Math.max(0, bonusAccrual);
    };

    // Complete sale
    const completeSale = async () => {
        if (salePosting) return;        // уже жмут второй раз
        
        const currentCart = activeCartForSale === 1 ? cart : cart2;
        const currentDiscountValue = activeCartForSale === 1 ? discountValue : discountValue2;
        const currentDiscountType = activeCartForSale === 1 ? discountType : discountType2;
        
        // Проверяем, что для всех товаров с выключенным FIFO выбрана партия
        const itemsWithoutBatch = currentCart.filter(item => item.useFifo === false && !item.batchId);
        if (itemsWithoutBatch.length > 0) {
            alert('Для товаров с выключенным FIFO необходимо выбрать партию');
            return;
        }
        
        // Проверяем валидность списания бонусов перед отправкой
        if (selectedCustomer) {
            const customerBalance = parseFloat(selectedCustomer.balance || 0);
            if (bonusRedemptionType === 'amount' && bonusRedemptionAmount > customerBalance) {
                alert(`Недостаточно бонусов для списания. Доступно: ${customerBalance.toFixed(2)} баллов`);
                return;
            }
            if (bonusRedemptionType === 'percent' && bonusRedemptionPercent > 0) {
                const redemptionAmount = customerBalance * bonusRedemptionPercent / 100;
                if (redemptionAmount > customerBalance) {
                    alert(`Недостаточно бонусов для списания. Доступно: ${customerBalance.toFixed(2)} баллов`);
                    return;
                }
            }
        }
        
        setSalePosting(true);
        try {
            const saleData = {
                items: currentCart.map(item => {
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
                customer: selectedCustomer?.user?.id || null,
                customer_name: customerName || selectedCustomer?.user?.full_name || null,
                customer_phone: customerPhone || null,
                discount_amount: currentDiscountType === 'amount' ? currentDiscountValue : 0,
                discount_percent: currentDiscountType === 'percent' ? currentDiscountValue : 0,
                bonus_redemption_percent: bonusRedemptionType === 'percent' && bonusRedemptionPercent > 0 ? bonusRedemptionPercent : null,
                bonus_redemption_amount: bonusRedemptionType === 'amount' && bonusRedemptionAmount > 0 ? bonusRedemptionAmount : null,
                bonus_percent_override: bonusPercentOverride || null,
                bonus_accrual_mode: bonusAccrualMode // 'tier' или 'settings'
            };

            console.log('Отправка данных продажи:', saleData); // Логируем отправляемые данные

            const response = await axios.post(`/api/business/${business_slug}/create-receipt/`, saleData);

            console.log('Ответ сервера:', response.data); // Логируем ответ сервера
            console.log('receipt_preview_image:', response.data?.receipt_preview_image); // Логируем путь к превью
            console.log('receipt_pdf_file:', response.data?.receipt_pdf_file); // Логируем путь к PDF

            setReceiptData(response.data);
            setSaleCompleted(true);
            await fetchProducts();
            // Очищаем корзину, которая была использована для продажи
            if (activeCartForSale === 1) {
                setCart([]);
                setDiscountValue(0);
            } else {
                setCart2([]);
                setDiscountValue2(0);
            }
            setItemFifoStates({}); // Очищаем состояния FIFO
            // Очищаем состояния бонусов
            setSelectedCustomer(null);
            setBonusPercentOverride(null);
            setBonusAccrualMode('tier');
            setBonusRedemptionPercent(0);
            setBonusRedemptionAmount(0);
            setBonusRedemptionType('percent');
            setShowBonusRedemption(false);
            setCustomerName('');
            setCustomerPhone('');
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
            setSelectedCustomer(null);
            setBonusPercentOverride(null);
            setBonusRedemptionPercent(0);
            setBonusRedemptionAmount(0);
            setBonusRedemptionType('percent');
            setShowBonusRedemption(false);
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
        if (discountModalCart === 1) {
            // Скидка применяется к первой корзине - уже сохранена в discountValue и discountType
        } else {
            // Скидка применяется ко второй корзине
            setDiscountValue2(discountValue);
            setDiscountType2(discountType);
        }
        setShowDiscountModal(false);
    };

    // Apply item discount
    const applyItemDiscount = (targetCart, setTargetCart) => {
        setTargetCart(prevCart =>
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

    // Render cart footer
    const renderCartFooter = (currentCart, setCurrentCart, cartNumber) => {
        const currentDiscountValue = cartNumber === 1 ? discountValue : discountValue2;
        const currentDiscountType = cartNumber === 1 ? discountType : discountType2;
        const subtotal = calculateSubtotal(currentCart);
        const total = calculateTotal(currentCart, currentDiscountValue, currentDiscountType);
        const totalWithBonuses = calculateTotalWithBonuses(currentCart, currentDiscountValue, currentDiscountType);

        return (
            <div className={styles.cartFooter}>
                <div className={styles.cartTotals}>
                    {/* Сумма без скидок */}
                    <div className={styles.totalRow}>
                        <span>Сумма без скидок:</span>
                        <span>{subtotal.toLocaleString()} ₸</span>
                    </div>

                    {/* Оригинальные Изначальная скидка */}
                    {currentCart.some(item => item.hasOriginalDiscount) && (
                        <div className={styles.totalRow}>
                            <span>Изначальная скидка:</span>
                            <span className={styles.discountValue}>
                                -{currentCart.reduce((sum, item) => {
                                    if (!item.hasOriginalDiscount) return sum;
                                    return sum + (item.originalPrice - Math.round(item.originalPrice * (1 - item.discount / 100))) * item.quantity;
                                }, 0).toLocaleString()} ₸
                            </span>
                        </div>
                    )}

                    {/* Скидки на товары */}
                    {currentCart.some(item => item.itemDiscountPercent > 0 || item.itemDiscountAmount > 0) && (
                        <div className={styles.totalRow}>
                            <span>Дополнительные скидки:</span>
                            <span className={styles.discountValue}>
                                -{currentCart.reduce((sum, item) => {
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
                    {(currentDiscountValue > 0) && (
                        <div className={styles.totalRow}>
                            <span>Общая скидка на чек:</span>
                            <span className={styles.discountValue}>
                                -{(
                                    currentDiscountType === 'percent'
                                        ? (subtotal -
                                            currentCart.reduce((sum, item) => {
                                                if (item.hasOriginalDiscount) {
                                                    sum += (item.originalPrice - Math.round(item.originalPrice * (1 - item.discount / 100))) * item.quantity;
                                                }
                                                const priceAfterOriginal = item.hasOriginalDiscount
                                                    ? Math.round(item.originalPrice * (1 - item.discount / 100))
                                                    : item.originalPrice;
                                                const finalPrice = calculateItemPrice(item);
                                                sum += (priceAfterOriginal - finalPrice) * item.quantity;
                                                return sum;
                                            }, 0)) * currentDiscountValue / 100
                                        : currentDiscountValue
                                ).toLocaleString()} ₸
                            </span>
                        </div>
                    )}

                    {/* Итоговая сумма с учетом бонусов */}
                    <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                        <span>Итого к оплате:</span>
                        <span>{totalWithBonuses.toLocaleString()} ₸</span>
                    </div>
                    
                    {/* Информация о списанных бонусах */}
                    {selectedCustomer && bonusRedemptionType && showBonusRedemption && (() => {
                        const customerBalance = parseFloat(selectedCustomer.balance || 0);
                        let bonusRedeemed = 0;
                        if (bonusRedemptionType === 'percent' && bonusRedemptionPercent > 0) {
                            bonusRedeemed = Math.min(customerBalance * bonusRedemptionPercent / 100, total);
                        } else if (bonusRedemptionType === 'amount' && bonusRedemptionAmount > 0) {
                            bonusRedeemed = Math.min(bonusRedemptionAmount, total);
                        }
                        return bonusRedeemed > 0 ? (
                            <div className={styles.totalRow} style={{ color: 'var(--accent-green)', fontSize: '14px', marginTop: '4px' }}>
                                <span>Списано бонусов:</span>
                                <span>-{bonusRedeemed.toFixed(2)} баллов</span>
                            </div>
                        ) : null;
                    })()}
                </div>

                <div className={styles.cartActions}>
                    <button
                        className={styles.discountButton}
                        onClick={() => {
                            setDiscountModalCart(cartNumber);
                            setShowDiscountModal(true);
                        }}
                        disabled={currentCart.length === 0}
                    >
                        <FaPercentage /> Скидка
                    </button>
                    <button
                        className={styles.clearCartButton}
                        onClick={() => {
                            setCurrentCart([]);
                            if (cartNumber === 1) {
                                setItemFifoStates({});
                            }
                        }}
                        disabled={currentCart.length === 0}
                    >
                        <FaTrashAlt /> Очистить
                    </button>
                    <button
                        className={styles.checkoutButton}
                        onClick={() => {
                            setActiveCartForSale(cartNumber);
                            setShowPaymentModal(true);
                        }}
                        disabled={currentCart.length === 0}
                    >
                        <FaCashRegister /> Продать
                    </button>
                </div>
            </div>
        );
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

                        // Проверяем, раскрыты ли атрибуты для этого варианта
                        const variantKey = `${product.id}-${variant.id}`;
                        const isExpanded = expandedAttributes.has(variantKey);
                        const displayedAttributes = isExpanded 
                            ? variant.attributes 
                            : variant.attributes.slice(0, 2);
                        const hasMoreAttributes = variant.attributes.length > 2;
                        const finalPrice = hasPrice && variant.discount > 0 
                            ? Math.round(variant.price * (1 - variant.discount / 100))
                            : (hasPrice ? parseFloat(variant.price) : null);
                        const originalPrice = hasPrice ? parseFloat(variant.price) : null;
                        
                        // Функция для переключения раскрытия атрибутов
                        const toggleAttributes = (e) => {
                            e.stopPropagation(); // Предотвращаем клик по карточке
                            setExpandedAttributes(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(variantKey)) {
                                    newSet.delete(variantKey);
                                } else {
                                    newSet.add(variantKey);
                                }
                                return newSet;
                            });
                        };

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
                                <div className={styles.productImageWrapper}>
                                    <div className={styles.productImage}>
                                        <img
                                            src={mainImage}
                                            alt={product.name}
                                            onError={(e) => {
                                                e.target.src = 'https://via.placeholder.com/300x400?text=No+Image';
                                            }}
                                        />
                                    </div>
                                    {variant.discount > 0 && hasPrice && (
                                        <div className={styles.discountBadgeOverlay}>
                                            -{variant.discount}%
                                        </div>
                                    )}
                                </div>
                                
                                <div className={styles.productInfo}>
                                    <div className={styles.productHeader}>
                                        <h4 className={styles.productTitle} title={product.name}>
                                            {product.name}
                                        </h4>
                                        {variant.sku && (
                                            <span className={styles.productSku} title={`Артикул: ${variant.sku}`}>
                                                {variant.sku}
                                            </span>
                                        )}
                                    </div>

                                    {displayedAttributes.length > 0 && (
                                        <div className={styles.attributesContainer}>
                                            <div className={styles.attributes}>
                                                {displayedAttributes.map(attr => (
                                                    <span key={attr.id} className={styles.attributeBadge} title={`${attr.category_attribute_name}: ${attr.custom_value || attr.predefined_value_name}`}>
                                                        {attr.custom_value || attr.predefined_value_name}
                                                    </span>
                                                ))}
                                            </div>
                                            {hasMoreAttributes && (
                                                <button
                                                    className={styles.expandAttributesButton}
                                                    onClick={toggleAttributes}
                                                    title={isExpanded ? "Свернуть атрибуты" : "Показать все атрибуты"}
                                                >
                                                    {isExpanded ? (
                                                        <>
                                                            <FaChevronUp /> Свернуть
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FaChevronDown /> Показать все ({variant.attributes.length - 2})
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <div className={styles.productDetails}>
                                        <div className={styles.priceSection}>
                                            {hasPrice ? (
                                                variant.discount > 0 ? (
                                                    <div className={styles.priceContainer}>
                                                        <div className={styles.priceRow}>
                                                            <span className={styles.discountedPrice}>
                                                                {finalPrice.toLocaleString()} ₸
                                                            </span>
                                                            <span className={styles.originalPrice}>
                                                                {originalPrice.toLocaleString()} ₸
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={styles.priceContainer}>
                                                        <span className={styles.regularPrice}>
                                                            {originalPrice.toLocaleString()} ₸
                                                        </span>
                                                    </div>
                                                )
                                            ) : (
                                                <span className={styles.noPrice}>Цена не установлена</span>
                                            )}
                                        </div>

                                        <div className={styles.stockInfo}>
                                            <span className={`${styles.stockBadge} ${availableQty > 0 ? styles.inStock : styles.outOfStock}`}>
                                                {availableQty > 0 ? (
                                                    <>
                                                        <span className={styles.stockIcon}>✓</span>
                                                        {availableQty} {product?.unit_display || 'шт.'}
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className={styles.stockIcon}>✗</span>
                                                        Нет в наличии
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={styles.productActions}>
                                        <button
                                            className={`${styles.addToCartButton} ${styles.cartButton1}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addToCart(product, variant, 1);
                                            }}
                                            disabled={availableQty <= 0 || !hasPrice}
                                            title="Добавить в корзину 1"
                                        >
                                            <FaPlus /> Корзина 1
                                        </button>
                                        <button
                                            className={`${styles.addToCartButton} ${styles.cartButton2}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addToCart(product, variant, 2);
                                            }}
                                            disabled={availableQty <= 0 || !hasPrice}
                                            title="Добавить в корзину 2"
                                        >
                                            <FaPlus /> Корзина 2
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>
        );
    };

    // Render cart items
    const renderCartItems = (currentCart, setCurrentCart, cartNumber) => {
        if (currentCart.length === 0) {
            return (
                <div className={styles.emptyCart}>
                    <FaShoppingCart size="2em" />
                    <p>Добавьте товары из списка</p>
                </div>
            );
        }

        return (
            <div className={styles.cartItems}>
                {currentCart.map(item => {
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
                                                        setCurrentCart(prevCart =>
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

                                                        setCurrentCart(prevCart =>
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
                                    onClick={() => {
                                        setCurrentCart(prevCart => prevCart.filter(cartItem => 
                                            !(cartItem.variantId === item.variantId && (item.batchId === null || cartItem.batchId === item.batchId))
                                        ));
                                    }}
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
                                                        const itemInCart = currentCart.find(cartItem => cartItem.variantId === item.variantId);
                                                        if (!itemInCart) return;
                                                        const unitDisplay = itemInCart.unitDisplay || 'шт.';
                                                        const isPieces = unitDisplay === 'шт.';
                                                        let normalizedQuantity;
                                                        if (isPieces) {
                                                            normalizedQuantity = Math.max(1, Math.floor(newQty) || 1);
                                                        } else {
                                                            normalizedQuantity = Math.max(0.001, parseFloat(newQty) || 0.001);
                                                        }
                                                        if (normalizedQuantity > itemInCart.stock) {
                                                            alert('Недостаточно товара на складе');
                                                            normalizedQuantity = itemInCart.stock;
                                                        }
                                                        setCurrentCart(prevCart => prevCart.map(cartItem =>
                                                            cartItem.variantId === item.variantId
                                                                ? { ...cartItem, quantity: normalizedQuantity }
                                                                : cartItem
                                                        ));
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
                                                                setCurrentCart(prevCart => 
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
                                                            const itemInCart = currentCart.find(cartItem => cartItem.variantId === item.variantId);
                                                            if (!itemInCart) return;
                                                            const unitDisplay = itemInCart.unitDisplay || 'шт.';
                                                            const isPieces = unitDisplay === 'шт.';
                                                            let normalizedQuantity;
                                                            if (isPieces) {
                                                                normalizedQuantity = Math.max(1, Math.floor(numValue) || 1);
                                                            } else {
                                                                normalizedQuantity = Math.max(0.001, parseFloat(numValue) || 0.001);
                                                            }
                                                            if (normalizedQuantity > itemInCart.stock) {
                                                                alert('Недостаточно товара на складе');
                                                                normalizedQuantity = itemInCart.stock;
                                                            }
                                                            setCurrentCart(prevCart => prevCart.map(cartItem =>
                                                                cartItem.variantId === item.variantId
                                                                    ? { ...cartItem, quantity: normalizedQuantity }
                                                                    : cartItem
                                                            ));
                                                        }}
                                                        onBlur={(e) => {
                                                            const value = e.target.value;
                                                            // Если поле пустое или значение меньше минимума, устанавливаем минимальное значение
                                                            if (value === '' || value === null || parseFloat(value) < minValue) {
                                                                const itemInCart = currentCart.find(cartItem => cartItem.variantId === item.variantId);
                                                                if (!itemInCart) return;
                                                                const unitDisplay = itemInCart.unitDisplay || 'шт.';
                                                                const isPieces = unitDisplay === 'шт.';
                                                                const normalizedValue = isPieces ? 1 : 0.1;
                                                                setCurrentCart(prevCart => prevCart.map(cartItem =>
                                                                    cartItem.variantId === item.variantId
                                                                        ? { ...cartItem, quantity: normalizedValue }
                                                                        : cartItem
                                                                ));
                                                            } else {
                                                                // Нормализуем значение при потере фокуса
                                                                const numValue = parseFloat(value);
                                                                if (!isNaN(numValue)) {
                                                                    const itemInCart = currentCart.find(cartItem => cartItem.variantId === item.variantId);
                                                                    if (!itemInCart) return;
                                                                    const unitDisplay = itemInCart.unitDisplay || 'шт.';
                                                                    const isPieces = unitDisplay === 'шт.';
                                                                    const normalizedValue = isPieces 
                                                                        ? Math.floor(numValue)
                                                                        : parseFloat(numValue.toFixed(3));
                                                                    setCurrentCart(prevCart => prevCart.map(cartItem =>
                                                                        cartItem.variantId === item.variantId
                                                                            ? { ...cartItem, quantity: normalizedValue }
                                                                            : cartItem
                                                                    ));
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
                                                        const itemInCart = currentCart.find(cartItem => cartItem.variantId === item.variantId);
                                                        if (!itemInCart) return;
                                                        if (newQty <= itemInCart.stock) {
                                                            const unitDisplay = itemInCart.unitDisplay || 'шт.';
                                                            const isPieces = unitDisplay === 'шт.';
                                                            let normalizedQuantity;
                                                            if (isPieces) {
                                                                normalizedQuantity = Math.floor(newQty);
                                                            } else {
                                                                normalizedQuantity = parseFloat(newQty.toFixed(3));
                                                            }
                                                            setCurrentCart(prevCart => prevCart.map(cartItem =>
                                                                cartItem.variantId === item.variantId
                                                                    ? { ...cartItem, quantity: normalizedQuantity }
                                                                    : cartItem
                                                            ));
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
                                        setCurrentItemCartNumber(cartNumber);
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

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                            className={styles.addToCartButton}
                            onClick={() => addToCart(selectedProduct, selectedVariant, 1)}
                            disabled={availableQty <= 0 || !hasPrice}
                            style={{ flex: 1 }}
                        >
                            <FaPlus /> В корзину 1
                        </button>
                        <button
                            className={styles.addToCartButton}
                            onClick={() => addToCart(selectedProduct, selectedVariant, 2)}
                            disabled={availableQty <= 0 || !hasPrice}
                            style={{ flex: 1 }}
                        >
                            <FaPlus /> В корзину 2
                        </button>
                    </div>

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
                    <button
                        onClick={() => navigate(`/business/${business_slug}/bonus-history`)}
                        className={styles.bonusHistoryButton}
                        title="История бонусов"
                    >
                        <FaGift /> История бонусов
                    </button>
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
                                        setCart2([]); // Очищаем вторую корзину при смене локации
                                        setItemFifoStates({}); // Очищаем состояния FIFO
                                        // Сбрасываем фильтры при смене локации
                                        setSearchQuery('');
                                        setActiveSearchQuery('');
                                        setSelectedCategory('');
                                        setError(null); // Сбрасываем ошибки
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
                                    placeholder={scannerActive ? "Сканируйте штрих-код..." : "Поиск по названию, артикулу или штрих-коду..."}
                                    value={searchQuery}
                                    onChange={scannerActive ? handleScannerInput : (e) => setSearchQuery(e.target.value)}
                                    onKeyDown={scannerActive ? handleScannerKeyDown : (e) => {
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
                </div>

                {/* Right column - Carts */}
                <div className={styles.rightColumn}>
                    {/* Первая корзина */}
                    <div className={styles.cartCard}>
                        <div className={styles.cartHeader}>
                            <h4>Корзина 1</h4>
                        </div>

                        <div className={styles.cartBody}>
                            {renderCartItems(cart, setCart, 1)}

                            {renderCartFooter(cart, setCart, 1)}
                        </div>
                    </div>

                    {/* Вторая корзина */}
                    <div className={styles.cartCard}>
                        <div className={styles.cartHeader}>
                            <h4>Корзина 2</h4>
                        </div>

                        <div className={styles.cartBody}>
                            {renderCartItems(cart2, setCart2, 2)}

                            {renderCartFooter(cart2, setCart2, 2)}
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
                            <h4>Скидка на весь чек (Корзина {discountModalCart})</h4>
                            <ModalCloseButton onClick={() => setShowDiscountModal(false)} />
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
                            <ModalCloseButton onClick={() => setShowItemDiscountModal(false)} />
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
                                {currentItemForDiscount && (() => {
                                    const targetCart = currentItemCartNumber === 1 ? cart : cart2;
                                    const item = targetCart.find(i => i.variantId === currentItemForDiscount);
                                    if (!item) return null;
                                    return (
                                        <div className={styles.currentDiscountInfo}>
                                            <p>
                                                <span>Текущая цена:&nbsp;</span>
                                                <span className={styles.nowPrice}>
                                                    {item.price.toLocaleString()} ₸
                                                </span>
                                            </p>
                                            <p>
                                                <span>Оригинальная цена:&nbsp;</span>
                                                <span className={styles.oldPrice}>
                                                    {item.originalPrice.toLocaleString()} ₸
                                                </span>
                                            </p>
                                            {item.hasOriginalDiscount && (
                                                <p>
                                                    <span>Оригинальная скидка:&nbsp;</span>
                                                    <span className={styles.discountValueAccent}>
                                                        {item.discount}%
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}
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
                                onClick={() => {
                                    if (currentItemCartNumber === 1) {
                                        applyItemDiscount(cart, setCart);
                                    } else {
                                        applyItemDiscount(cart2, setCart2);
                                    }
                                }}
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
                            <ModalCloseButton
                                onClick={() => {
                                    // Сначала сбрасываем состояние продажи
                                    if (saleCompleted) {
                                        setSaleCompleted(false);
                                        setReceiptData(null);
                                        if (activeCartForSale === 1) {
                                            setCart([]);
                                            setDiscountValue(0);
                                        } else {
                                            setCart2([]);
                                            setDiscountValue2(0);
                                        }
                                        setCustomerName('');
                                        setCustomerPhone('');
                                        setSelectedCustomer(null);
                                        setBonusPercentOverride(null);
                                        setBonusRedemptionPercent(0);
                                        setBonusRedemptionAmount(0);
                                        setBonusRedemptionType('percent');
                                        setShowBonusRedemption(false);
                                    }
                                    // Затем закрываем модальное окно
                                    setShowPaymentModal(false);
                                }}
                            />
                        </div>
                        <div className={styles.modalBody}>
                            {!saleCompleted ? (
                                <>
                                    <div className={styles.receiptAndBonusContainer}>
                                        <div className={styles.receiptPreview}>
                                        <div className={styles.receiptHeader}>
                                            <h5>Чек #{new Date().getTime().toString().slice(-6)}</h5>
                                            <p>{new Date().toLocaleString('ru-RU')}</p>
                                        </div>

                                        <div className={styles.receiptItems}>
                                            {(activeCartForSale === 1 ? cart : cart2).map(item => {
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
                                                {(() => {
                                                    const currentCart = activeCartForSale === 1 ? cart : cart2;
                                                    const currentDiscountValue = activeCartForSale === 1 ? discountValue : discountValue2;
                                                    const currentDiscountType = activeCartForSale === 1 ? discountType : discountType2;
                                                    const subtotal = calculateSubtotal(currentCart);
                                                    const total = calculateTotal(currentCart, currentDiscountValue, currentDiscountType);
                                                    const totalDiscount = calculateTotalDiscount(currentCart, currentDiscountValue, currentDiscountType);
                                                    
                                                    return (
                                                        <>
                                                <div className={styles.receiptSummaryRow}>
                                                    <span>Товары:</span>
                                                    <span>{subtotal.toLocaleString()} ₸</span>
                                                </div>

                                                {currentCart.some(item => item.hasOriginalDiscount) && (
                                                    <div className={styles.receiptSummaryRow}>
                                                        <span>Изначальная скидка:</span>
                                                        <span className={styles.summaryDiscount}>
                                                            -{currentCart.reduce((sum, item) => {
                                                                if (!item.hasOriginalDiscount) return sum;
                                                                return sum + (item.originalPrice - Math.round(item.originalPrice * (1 - item.discount / 100))) * item.quantity;
                                                            }, 0).toLocaleString()} ₸
                                                        </span>
                                                    </div>
                                                )}

                                                {currentCart.some(item => item.itemDiscountPercent > 0 || item.itemDiscountAmount > 0) && (
                                                    <div className={styles.receiptSummaryRow}>
                                                        <span>Ваши скидки:</span>
                                                        <span className={styles.summaryDiscount}>
                                                            -{currentCart.reduce((sum, item) => {
                                                                const priceAfterOriginal = item.hasOriginalDiscount
                                                                    ? Math.round(item.originalPrice * (1 - item.discount / 100))
                                                                    : item.originalPrice;
                                                                const finalPrice = calculateItemPrice(item);
                                                                return sum + (priceAfterOriginal - finalPrice) * item.quantity;
                                                            }, 0).toLocaleString()} ₸
                                                        </span>
                                                    </div>
                                                )}

                                                {currentDiscountValue > 0 && (
                                                    <div className={styles.receiptSummaryRow}>
                                                        <span>Общая скидка на чек:</span>
                                                        <span className={styles.summaryDiscount}>
                                                            -{(currentDiscountType === 'percent'
                                                                ? (subtotal -
                                                                    currentCart.reduce((sum, item) => {
                                                                        if (item.hasOriginalDiscount) {
                                                                            sum += (item.originalPrice - Math.round(item.originalPrice * (1 - item.discount / 100))) * item.quantity;
                                                                        }
                                                                        const priceAfterOriginal = item.hasOriginalDiscount
                                                                            ? Math.round(item.originalPrice * (1 - item.discount / 100))
                                                                            : item.originalPrice;
                                                                        const finalPrice = calculateItemPrice(item);
                                                                        sum += (priceAfterOriginal - finalPrice) * item.quantity;
                                                                        return sum;
                                                                    }, 0)) * currentDiscountValue / 100
                                                                : currentDiscountValue
                                                            ).toLocaleString()} ₸
                                                        </span>
                                                    </div>
                                                )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <div className={styles.receiptSummarySaleRow}>
                                                <span>Конечная сумма скидки:</span>
                                                <span className={styles.summaryDiscount}>-{(() => {
                                                    const currentCart = activeCartForSale === 1 ? cart : cart2;
                                                    const currentDiscountValue = activeCartForSale === 1 ? discountValue : discountValue2;
                                                    const currentDiscountType = activeCartForSale === 1 ? discountType : discountType2;
                                                    return calculateTotalDiscount(currentCart, currentDiscountValue, currentDiscountType);
                                                })().toLocaleString()} ₸</span>
                                            </div>

                                            <div className={styles.receiptTotalSection}>
                                                <div className={styles.receiptTotalRow}>
                                                    <span>Итого к оплате:</span>
                                                    <span className={styles.receiptGrandTotal}>{(() => {
                                                        const currentCart = activeCartForSale === 1 ? cart : cart2;
                                                        const currentDiscountValue = activeCartForSale === 1 ? discountValue : discountValue2;
                                                        const currentDiscountType = activeCartForSale === 1 ? discountType : discountType2;
                                                        return calculateTotalWithBonuses(currentCart, currentDiscountValue, currentDiscountType);
                                                    })().toLocaleString()} ₸</span>
                                                </div>
                                                {/* Информация о списанных бонусах в модальном окне */}
                                                {selectedCustomer && bonusRedemptionType && showBonusRedemption && (() => {
                                                    const currentCart = activeCartForSale === 1 ? cart : cart2;
                                                    const currentDiscountValue = activeCartForSale === 1 ? discountValue : discountValue2;
                                                    const currentDiscountType = activeCartForSale === 1 ? discountType : discountType2;
                                                    const totalBeforeBonuses = calculateTotal(currentCart, currentDiscountValue, currentDiscountType);
                                                    const customerBalance = parseFloat(selectedCustomer.balance || 0);
                                                    let bonusRedeemed = 0;
                                                    if (bonusRedemptionType === 'percent' && bonusRedemptionPercent > 0) {
                                                        bonusRedeemed = Math.min(customerBalance * bonusRedemptionPercent / 100, totalBeforeBonuses);
                                                    } else if (bonusRedemptionType === 'amount' && bonusRedemptionAmount > 0) {
                                                        bonusRedeemed = Math.min(bonusRedemptionAmount, totalBeforeBonuses);
                                                    }
                                                    return bonusRedeemed > 0 ? (
                                                        <div className={styles.receiptTotalRow} style={{ color: 'var(--accent-green)', fontSize: '14px', marginTop: '8px' }}>
                                                            <span>Списано бонусов:</span>
                                                            <span>-{bonusRedeemed.toFixed(2)} баллов</span>
                                                        </div>
                                                    ) : null;
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Секция бонусов */}
                                    {selectedCustomer && bonusSettings && bonusSettings.is_enabled && (
                                        <div className={styles.bonusSection}>
                                            <div className={styles.bonusSectionHeader}>
                                                <h5><FaGift /> Бонусы</h5>
                                            </div>
                                            
                                            {/* Информация о балансе и уровне */}
                                            <div className={styles.bonusInfo}>
                                                <div className={styles.bonusBalanceDisplay}>
                                                    <div className={styles.bonusBalanceLabel}>Текущий баланс:</div>
                                                    <div className={styles.bonusBalanceValue}>
                                                        {parseFloat(selectedCustomer.balance || 0).toFixed(2)} баллов
                                                        <span className={styles.bonusBalanceHint}> (1 балл = 1 ₸)</span>
                                                    </div>
                                                </div>
                                                
                                                {selectedCustomer.tier && (
                                                    <div className={styles.bonusTierDisplay}>
                                                        <div className={styles.bonusTierLabel}>Уровень:</div>
                                                        <div className={styles.bonusTierValue}>
                                                            {selectedCustomer.tier.name} ({selectedCustomer.tier.bonus_percent}%)
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Выбор режима начисления бонусов */}
                                            <div className={styles.bonusAccrualModeSelector}>
                                                <label>Способ начисления бонусов:</label>
                                                <div className={styles.bonusAccrualModeOptions}>
                                                    <label className={styles.bonusModeOption}>
                                                        <input
                                                            type="radio"
                                                            name="bonusAccrualMode"
                                                            value="tier"
                                                            checked={bonusAccrualMode === 'tier'}
                                                            onChange={(e) => {
                                                                setBonusAccrualMode(e.target.value);
                                                                setBonusPercentOverride(null);
                                                            }}
                                                            disabled={!selectedCustomer.tier || bonusSettings.is_fixed_percent}
                                                        />
                                                        <span>
                                                            По уровню ({selectedCustomer.tier?.bonus_percent || bonusSettings.bonus_percent}%)
                                                        </span>
                                                    </label>
                                                    <label className={styles.bonusModeOption}>
                                                        <input
                                                            type="radio"
                                                            name="bonusAccrualMode"
                                                            value="settings"
                                                            checked={bonusAccrualMode === 'settings'}
                                                            onChange={(e) => {
                                                                setBonusAccrualMode(e.target.value);
                                                                setBonusPercentOverride(null);
                                                            }}
                                                            disabled={bonusSettings.is_fixed_percent}
                                                        />
                                                        <span>
                                                            По общим настройкам ({bonusSettings.bonus_percent}%)
                                                        </span>
                                                    </label>
                                                </div>
                                                {bonusSettings.is_fixed_percent && (
                                                    <div className={styles.bonusModeHint}>
                                                        Процент фиксированный, режим выбран автоматически
                                                    </div>
                                                )}
                                            </div>

                                            {/* История транзакций */}
                                            {selectedCustomer.recent_transactions && selectedCustomer.recent_transactions.length > 0 && (
                                                <div className={styles.bonusHistory}>
                                                    <div className={styles.bonusHistoryTitle}>Последние транзакции:</div>
                                                    <div className={styles.bonusHistoryList}>
                                                        {selectedCustomer.recent_transactions.slice(0, 5).map((t) => (
                                                            <div key={t.id} className={styles.bonusHistoryItem}>
                                                                <div className={styles.bonusHistoryType}>
                                                                    {t.type === 'accrual' ? 'Начисление' : 'Списание'}
                                                                </div>
                                                                <div className={`${styles.bonusHistoryAmount} ${
                                                                    parseFloat(t.amount) >= 0 ? styles.positive : styles.negative
                                                                }`}>
                                                                    {parseFloat(t.amount) >= 0 ? '+' : ''}
                                                                    {parseFloat(t.amount).toFixed(2)}
                                                                </div>
                                                                <div className={styles.bonusHistoryDate}>
                                                                    {new Date(t.created_at).toLocaleDateString('ru-RU')}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Прогноз начисления бонусов */}
                                            {(() => {
                                                const currentCart = activeCartForSale === 1 ? cart : cart2;
                                                const currentDiscountValue = activeCartForSale === 1 ? discountValue : discountValue2;
                                                const currentDiscountType = activeCartForSale === 1 ? discountType : discountType2;
                                                const bonusPrediction = calculateBonusPrediction(currentCart, currentDiscountValue, currentDiscountType);
                                                
                                                // Определяем процент бонусов, который будет использован (та же логика, что и в calculateBonusPrediction)
                                                let bonusPercentToUse = 0;
                                                
                                                // Если процент фиксированный, всегда используем настройки (если нет переопределения)
                                                if (bonusSettings.is_fixed_percent && bonusPercentOverride === null) {
                                                    bonusPercentToUse = parseFloat(bonusSettings.bonus_percent || 0);
                                                } else if (bonusPercentOverride !== null) {
                                                    bonusPercentToUse = bonusPercentOverride;
                                                } else if (bonusAccrualMode === 'tier' && selectedCustomer.tier?.bonus_percent) {
                                                    bonusPercentToUse = parseFloat(selectedCustomer.tier.bonus_percent);
                                                } else if (bonusAccrualMode === 'settings') {
                                                    // Явно используем процент из общих настроек
                                                    bonusPercentToUse = parseFloat(bonusSettings.bonus_percent || 0);
                                                } else {
                                                    // Fallback: используем процент из общих настроек
                                                    bonusPercentToUse = parseFloat(bonusSettings.bonus_percent || 0);
                                                }
                                                
                                                if (bonusPrediction !== null && bonusPrediction > 0) {
                                                    return (
                                                        <div className={styles.bonusPredictionCard}>
                                                            <div className={styles.bonusPredictionLabel}>После этой покупки:</div>
                                                            <div className={styles.bonusPredictionValue}>
                                                                +{bonusPrediction.toFixed(2)} баллов
                                                            </div>
                                                            <div className={styles.bonusPredictionHint}>
                                                                (≈ {bonusPrediction.toFixed(2)} ₸)
                                                            </div>
                                                            <div className={styles.bonusPercentInfo}>
                                                                Процент начисления: {parseFloat(bonusPercentToUse).toFixed(2)}%
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {/* Ручное управление процентом (если не фиксированный) */}
                                            {!bonusSettings.is_fixed_percent && (
                                                <div className={styles.bonusAccrualControl}>
                                                    <label>Или укажите процент вручную (%):</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        max="100"
                                                        value={bonusPercentOverride !== null ? bonusPercentOverride : ''}
                                                        onChange={(e) => setBonusPercentOverride(e.target.value ? parseFloat(e.target.value) : null)}
                                                        placeholder={bonusAccrualMode === 'tier' && selectedCustomer.tier?.bonus_percent 
                                                            ? selectedCustomer.tier.bonus_percent 
                                                            : bonusSettings.bonus_percent || '5.00'}
                                                        className={styles.bonusPercentInput}
                                                    />
                                                </div>
                                            )}

                                            {/* Кнопка для списания бонусов */}
                                            {parseFloat(selectedCustomer.balance || 0) > 0 && (
                                                <div className={styles.bonusRedemptionButtonWrapper}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowBonusRedemption(!showBonusRedemption)}
                                                        className={`${styles.bonusRedemptionToggleButton} ${
                                                            showBonusRedemption ? styles.active : ''
                                                        }`}
                                                    >
                                                        <FaGift /> {showBonusRedemption ? 'Скрыть списание бонусов' : 'Списать бонусы'}
                                                    </button>
                                                    
                                                    {/* Секция управления списанием бонусов */}
                                                    {showBonusRedemption && (
                                                        <div className={styles.bonusRedemptionControl}>
                                                            <label className={styles.bonusRedemptionLabel}>
                                                                Списать бонусы:
                                                            </label>
                                                            <div className={styles.bonusRedemptionType}>
                                                                <label className={styles.radioOption}>
                                                                    <input
                                                                        type="radio"
                                                                        value="percent"
                                                                        checked={bonusRedemptionType === 'percent'}
                                                                        onChange={(e) => {
                                                                            setBonusRedemptionType(e.target.value);
                                                                            setBonusRedemptionAmount(0);
                                                                        }}
                                                                    />
                                                                    <span>Процент от баланса</span>
                                                                </label>
                                                                <label className={styles.radioOption}>
                                                                    <input
                                                                        type="radio"
                                                                        value="amount"
                                                                        checked={bonusRedemptionType === 'amount'}
                                                                        onChange={(e) => {
                                                                            setBonusRedemptionType(e.target.value);
                                                                            setBonusRedemptionPercent(0);
                                                                        }}
                                                                    />
                                                                    <span>Фиксированная сумма</span>
                                                                </label>
                                                            </div>
                                                            {bonusRedemptionType === 'percent' ? (
                                                                <div className={styles.bonusRedemptionInputWrapper}>
                                                                    <div className={styles.bonusRedemptionInput}>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            step="1"
                                                                            value={bonusRedemptionPercent || ''}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value ? parseFloat(e.target.value) : 0;
                                                                                setBonusRedemptionPercent(Math.min(100, Math.max(0, value)));
                                                                            }}
                                                                            placeholder="0"
                                                                            className={bonusRedemptionPercent > 0 ? styles.hasValue : ''}
                                                                        />
                                                                        <span className={styles.inputSuffix}>%</span>
                                                                    </div>
                                                                    {bonusRedemptionPercent > 0 && (
                                                                        <div className={styles.bonusRedemptionPreview}>
                                                                            Будет списано: <span className={styles.bonusRedemptionPreviewValue}>
                                                                                {(parseFloat(selectedCustomer.balance || 0) * bonusRedemptionPercent / 100).toFixed(2)} баллов
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className={styles.bonusRedemptionInputWrapper}>
                                                                    <div className={styles.bonusRedemptionInput}>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max={parseFloat(selectedCustomer.balance || 0)}
                                                                            step="0.01"
                                                                            value={bonusRedemptionAmount || ''}
                                                                            onChange={(e) => {
                                                                                const inputValue = e.target.value;
                                                                                if (inputValue === '' || inputValue === null) {
                                                                                    setBonusRedemptionAmount(0);
                                                                                    return;
                                                                                }
                                                                                const value = parseFloat(inputValue);
                                                                                if (isNaN(value)) {
                                                                                    setBonusRedemptionAmount(0);
                                                                                    return;
                                                                                }
                                                                                const maxBalance = parseFloat(selectedCustomer.balance || 0);
                                                                                // Разрешаем вводить больше, но показываем ошибку
                                                                                setBonusRedemptionAmount(Math.max(0, value));
                                                                            }}
                                                                            placeholder="0.00"
                                                                            className={`${bonusRedemptionAmount > 0 ? styles.hasValue : ''} ${
                                                                                bonusRedemptionAmount > parseFloat(selectedCustomer.balance || 0) 
                                                                                    ? styles.inputError 
                                                                                    : ''
                                                                            }`}
                                                                        />
                                                                        <span className={styles.inputSuffix}>баллов</span>
                                                                    </div>
                                                                    {bonusRedemptionAmount > 0 && (
                                                                        <div className={`${styles.bonusRedemptionPreview} ${
                                                                            bonusRedemptionAmount > parseFloat(selectedCustomer.balance || 0) 
                                                                                ? styles.bonusRedemptionPreviewError 
                                                                                : ''
                                                                        }`}>
                                                                            Будет списано: <span className={styles.bonusRedemptionPreviewValue}>
                                                                                {bonusRedemptionAmount.toFixed(2)} баллов
                                                                            </span>
                                                                            {bonusRedemptionAmount > parseFloat(selectedCustomer.balance || 0) && (
                                                                                <span className={styles.bonusRedemptionError}>
                                                                                    ⚠ Недостаточно бонусов
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <div className={styles.bonusRedemptionHint}>
                                                                        Доступно: <strong>{parseFloat(selectedCustomer.balance || 0).toFixed(2)} баллов</strong>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
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
                                            <label>Сканировать QR-код клиента</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowQRScanner(true)}
                                                className={styles.qrButtonLarge}
                                                    title="Сканировать QR-код"
                                                >
                                                <FaQrcode size={32} />
                                                <span className={styles.qrButtonText}>Сканировать QR-код</span>
                                                </button>
                                            <p className={styles.qrButtonDescription}>
                                                Отсканируйте QR-код клиента для автоматического заполнения данных и применения бонусной программы
                                            </p>
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
                                        
                                        {/* Информация о бонусах */}
                                        {receiptData.bonus_info && (
                                            <div className={styles.receiptBonusInfo}>
                                                <h6><FaGift /> Информация о бонусах</h6>
                                                {receiptData.bonus_info.tier && (
                                                    <p>
                                                        <strong>Уровень покупателя:</strong>{' '}
                                                        {receiptData.bonus_info.tier.name} ({receiptData.bonus_info.tier.bonus_percent}%)
                                                    </p>
                                                )}
                                                <p>
                                                    <strong>Процент бонусов:</strong>{' '}
                                                    {parseFloat(receiptData.bonus_info.bonus_percent || 0).toFixed(2)}%
                                                </p>
                                                {parseFloat(receiptData.bonus_info.accrued || 0) > 0 && (
                                                    <p>
                                                        <strong>Начислено бонусов:</strong>{' '}
                                                        +{parseFloat(receiptData.bonus_info.accrued).toFixed(2)} баллов
                                                    </p>
                                                )}
                                                {parseFloat(receiptData.bonus_info.redeemed || 0) > 0 && (
                                                    <p>
                                                        <strong>Списано бонусов:</strong>{' '}
                                                        -{parseFloat(receiptData.bonus_info.redeemed).toFixed(2)} баллов
                                                    </p>
                                                )}
                                                <p>
                                                    <strong>Баланс после транзакции:</strong>{' '}
                                                    {parseFloat(receiptData.bonus_info.balance_after || 0).toFixed(2)} баллов
                                                </p>
                                            </div>
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
                                            setSelectedCustomer(null);
                                            setBonusPercentOverride(null);
                                            setBonusRedemptionPercent(0);
                                            setBonusRedemptionAmount(0);
                                            setBonusRedemptionType('percent');
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

            {/* QR Scanner Modal */}
            {showQRScanner && selectedLocation && (
                <QRScanner
                    locationId={selectedLocation}
                    onCustomerSelected={(customerData) => {
                        setSelectedCustomer(customerData);
                        setCustomerName(customerData.user.full_name || customerData.user.username);
                        // Сбрасываем значения списания из QR-сканера, если они были
                        if (customerData.bonus_redemption_percent) {
                            setBonusRedemptionType('percent');
                            setBonusRedemptionPercent(customerData.bonus_redemption_percent);
                        } else if (customerData.bonus_redemption_amount) {
                            setBonusRedemptionType('amount');
                            setBonusRedemptionAmount(customerData.bonus_redemption_amount);
                        }
                        setShowQRScanner(false);
                    }}
                    onClose={() => setShowQRScanner(false)}
                />
            )}
        </div>
    );
};

export default SalesPage;