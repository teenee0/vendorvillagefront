import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../api/axiosDefault';
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
import styles from './SalesPage.module.css';

const SalesPage = () => {
    const { business_slug } = useParams();
    const [cart, setCart] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
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

    // Fetch products from API
    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (selectedCategory) params.category = selectedCategory;

            const response = await axios.get(`/api/business/${business_slug}/sales-products/`, { params });
            setProducts(response.data.products);
            setLoading(false);
            if (scannerActive) setSearchQuery('');
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    }, [business_slug, searchQuery, selectedCategory]);

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
        fetchProducts();
        fetchCategories();
        fetchPaymentMethods();
    }, []);


    const handleActivateScanner = () => {
        setScannerActive(true);
        setTimeout(() => {
            searchInputRef.current && searchInputRef.current.focus();
        }, 100);
    };

    // Add to cart function
    const addToCart = (product, variant) => {
        const availableQty = variant.stocks.reduce((sum, stock) => sum + stock.available_quantity, 0);
        if (availableQty <= 0) {
            alert('Товар отсутствует на складе');
            return;
        }

        setCart(prevCart => {
            const existingItem = prevCart.find(
                item => item.variantId === variant.id && item.productId === product.id
            );

            if (existingItem) {
                if (existingItem.quantity < availableQty) {
                    return prevCart.map(item =>
                        item.variantId === variant.id && item.productId === product.id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    );
                } else {
                    alert('Недостаточно товара на складе');
                    return prevCart;
                }
            } else {
                const hasOriginalDiscount = variant.discount > 0;
                const originalPrice = parseFloat(variant.price);
                const price = hasOriginalDiscount
                    ? Math.round(originalPrice * (1 - variant.discount / 100))
                    : originalPrice;

                // Всегда устанавливаем локацию, даже если она одна
                const availableStock = variant.stocks[0]; // Берем первую доступную локацию

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
                        quantity: 1,
                        stock: availableQty,
                        image: product.images.find(img => img.is_main)?.image || product.images[0]?.image,
                        itemDiscountAmount: 0,
                        itemDiscountPercent: 0,
                        location: availableStock?.location || null,
                        locationName: availableStock?.location_name || 'Основной склад',
                        hasOriginalDiscount
                    }
                ];
            }
        });
    };

    // Remove from cart
    const removeFromCart = (variantId) => {
        setCart(prevCart => prevCart.filter(item => item.variantId !== variantId));
    };

    // Update quantity
    const updateQuantity = (variantId, newQuantity) => {
        if (newQuantity < 1) return;

        setCart(prevCart => {
            const item = prevCart.find(item => item.variantId === variantId);
            if (!item) return prevCart;

            if (newQuantity > item.stock) {
                alert('Недостаточно товара на складе');
                return prevCart.map(item =>
                    item.variantId === variantId
                        ? { ...item, quantity: item.stock }
                        : item
                );
            }

            return prevCart.map(item =>
                item.variantId === variantId
                    ? { ...item, quantity: newQuantity }
                    : item
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
        setSalePosting(true);
        try {
            const saleData = {
                items: cart.map(item => ({
                    variant: item.variantId,
                    location: item.location,
                    quantity: item.quantity,
                    discount_amount: item.itemDiscountAmount || 0,
                    discount_percent: item.itemDiscountPercent || 0
                })),
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

            setReceiptData(response.data);
            setSaleCompleted(true);
            await fetchProducts();
            setCart([]);
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

    const handlePrintReceipt = () => {
        if (!receiptData?.receipt_pdf_file) {
            console.error('PDF файл чека не найден');
            return;
        }

        const pdfUrl = receiptData.receipt_pdf_file.startsWith('http')
            ? receiptData.receipt_pdf_file
            : getFileUrl(receiptData.receipt_pdf_file);

        const printWindow = window.open(pdfUrl, '_blank');

        printWindow?.addEventListener('load', () => {
            setTimeout(() => {
                printWindow.print();
            }, 500);
        });
    };

    const handleDownloadPdf = () => {
        if (!receiptData?.receipt_pdf_file) return;

        const pdfUrl = receiptData.receipt_pdf_file.startsWith('http')
            ? receiptData.receipt_pdf_file
            : getFileUrl(receiptData.receipt_pdf_file);

        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `Чек_${receiptData.number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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

    const getFileUrl = (imagePath) => {
        if (!imagePath) return '';
        if (/^https?:\/\//i.test(imagePath)) return imagePath;
        if (imagePath.startsWith('/media/')) return `http://localhost:8000${imagePath}`;
        if (!imagePath.startsWith('/')) return `http://localhost:8000/media/${imagePath}`;
        return `http://localhost:8000${imagePath}`;
    };

    // Render product cards
    const renderProductCards = () => {
        if (loading) return <div className={styles.loading}>Загрузка товаров...</div>;
        if (error) return <div className={styles.error}>Ошибка: {error}</div>;
        if (products.length === 0) return <div className={styles.empty}>Товары не найдены</div>;

        return (

            <div className={styles.productsGrid}>
                {products.map(product => (
                    product.variants.map(variant => {
                        const availableQty = variant.stocks.reduce((sum, stock) => sum + stock.available_quantity, 0);
                        const mainImage = product.images.find(img => img.is_main)?.image || product.images[0]?.image;

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
                                        {variant.discount > 0 ? (
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
                                        )}
                                    </div>
                                    <div className={styles.stockInfo}>
                                        <span className={`${styles.stockBadge} ${availableQty > 0 ? styles.inStock : styles.outOfStock}`}>
                                            {availableQty > 0 ? `В наличии: ${availableQty}` : 'Нет в наличии'}
                                        </span>
                                    </div>
                                    <button
                                        className={styles.addToCartButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addToCart(product, variant);
                                        }}
                                        disabled={availableQty <= 0}
                                    >
                                        <FaPlus /> В корзину
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ))}
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
                    const availableLocations = selectedVariant?.stocks || [];

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

                                {/* Выбор локации */}
                                {availableLocations.length > 0 && (
                                    <div className={styles.locationSelect}>
                                        <label>Локация:</label>
                                        <select
                                            value={item.location || ''}
                                            onChange={(e) => {
                                                const newLocation = e.target.value;
                                                setCart(prevCart =>
                                                    prevCart.map(cartItem =>
                                                        cartItem.variantId === item.variantId
                                                            ? { ...cartItem, location: newLocation }
                                                            : cartItem
                                                    )
                                                );
                                            }}
                                        >
                                            {availableLocations.map(stock => (
                                                <option
                                                    key={stock.location_id}
                                                    value={stock.location_id}
                                                >
                                                    {stock.location_name} (Доступно: {stock.available_quantity})
                                                </option>
                                            ))}
                                        </select>
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
                                    <button
                                        className={styles.quantityButton}
                                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                                    >
                                        <FaMinus />
                                    </button>
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateQuantity(item.variantId, parseInt(e.target.value) || 1)}
                                        min="1"
                                        max={item.stock}
                                        className={styles.quantityInput}
                                    />
                                    <button
                                        className={styles.quantityButton}
                                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                        disabled={item.quantity >= item.stock}
                                    >
                                        <FaPlus />
                                    </button>
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

        const availableQty = selectedVariant.stocks.reduce((sum, stock) => sum + stock.available_quantity, 0);
        const currentImage = selectedProduct.images[currentImageIndex]?.image;

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
                        {selectedVariant.discount > 0 ? (
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
                        )}
                    </div>

                    <div className={styles.stockInfo}>
                        <span className={`${styles.stockBadge} ${availableQty > 0 ? styles.inStock : styles.outOfStock}`}>
                            {availableQty > 0 ? `В наличии: ${availableQty}` : 'Нет в наличии'}
                        </span>
                    </div>

                    <div className={styles.skuInfo}>
                        <small>Артикул: {selectedVariant.sku}</small>
                    </div>

                    <button
                        className={styles.addToCartButton}
                        onClick={() => addToCart(selectedProduct, selectedVariant)}
                        disabled={availableQty <= 0}
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

                        <div className={styles.searchControls}>
                            <div className={styles.searchInputGroup}>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Название, артикул или штрих-код..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSearch();
                                    }}
                                />
                                <button
                                    className={styles.searchButton}
                                    onClick={handleSearch}
                                >
                                    <FaSearch />
                                </button>
                            </div>

                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className={styles.categorySelect}
                            >
                                <option value="">Все категории</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
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
                                        onClick={() => setCart([])}
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
                                    if (!saleCompleted) {
                                        setShowPaymentModal(false);
                                    }
                                }}
                                disabled={saleCompleted}
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
                                    <div className={styles.receiptImageContainer}>
                                        <img
                                            src={getFileUrl(receiptData.receipt_preview_image)}
                                            alt={`Чек ${receiptData.number}`}
                                            className={styles.receiptImage}
                                            onError={(e) => {
                                                e.target.src = 'https://via.placeholder.com/300x400?text=No+Image';
                                            }}
                                        />
                                    </div>

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