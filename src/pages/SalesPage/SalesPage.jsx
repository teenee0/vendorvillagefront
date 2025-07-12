import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axiosDefault';
import {
    FaSearch,
    FaBarcode,
    FaTrashAlt,
    FaCashRegister,
    FaBoxOpen,
    FaShoppingCart,
    FaHistory,
    FaCamera,
    FaCheck,
    FaPrint,
    FaTimes,
    FaPlus,
    FaMinus
} from 'react-icons/fa';
import styles from './SalesPage.module.css';

const SalesPage = () => {

    const { business_slug } = useParams();
    const navigate = useNavigate();
    const [cart, setCart] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);


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
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    }, [business_slug, searchQuery, selectedCategory]);

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            const response = await axios.get(`/api/business/${business_slug}/categories/`);
            setCategories(response.data);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    }, [business_slug]);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, [fetchProducts, fetchCategories]);

    // Add to cart function
    const addToCart = (product, variant) => {
        const availableQty = variant.stocks.reduce((sum, stock) => sum + stock.available_quantity, 0);
        if (availableQty <= 0) {
            alert('Товар отсутствует на складе');
            return;
        }

        setCart(prevCart => {
            // Проверяем и variantId, и productId
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
                const price = variant.discount
                    ? Math.round(variant.price * (1 - variant.discount / 100))
                    : parseFloat(variant.price);

                return [
                    ...prevCart,
                    {
                        productId: product.id,
                        productName: product.name,
                        variantId: variant.id,
                        sku: variant.sku,
                        attributes: variant.attributes,
                        price,
                        originalPrice: parseFloat(variant.price),
                        discount: variant.discount || 0,
                        quantity: 1,
                        stock: availableQty,
                        image: product.images.find(img => img.is_main)?.image || product.images[0]?.image
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

    // Calculate total
    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    // Handle barcode search
    const handleBarcodeSearch = async (barcode) => {
        try {
            const response = await axios.get(`/api/business/${business_slug}/sales-products/?barcode=${barcode}`);
            if (response.data.products.length > 0) {
                const product = response.data.products[0];
                const variant = product.variants.find(v =>
                    v.barcode === barcode || v.sku === barcode
                );

                if (variant) {
                    addToCart(product, variant);
                    setSelectedProduct(product);
                    setSelectedVariant(variant);
                }
            } else {
                alert('Товар с таким штрих-кодом не найден');
            }
        } catch (err) {
            console.error('Barcode search error:', err);
            alert('Ошибка при поиске по штрих-коду');
        }
    };

    // Complete sale
    const completeSale = async () => {
        try {
            const saleData = {
                items: cart.map(item => ({
                    product_id: item.productId,
                    variant_id: item.variantId,
                    quantity: item.quantity,
                    price: item.price
                })),
                payment_method: paymentMethod,
                customer_name: customerName,
                customer_phone: customerPhone,
                total_amount: calculateTotal()
            };

            await axios.post(`/api/business/${business_slug}/sales/`, saleData);

            // Clear cart and close modal
            setCart([]);
            setShowPaymentModal(false);
            setCustomerName('');
            setCustomerPhone('');

            alert('Продажа успешно оформлена!');
        } catch (err) {
            console.error('Sale error:', err);
            alert('Ошибка при оформлении продажи');
        }
    };

    // Render product cards
    const renderProductCards = () => {
        if (loading) return <div className={styles.loading}>Загрузка товаров...</div>;
        if (error) return <div className={styles.error}>Ошибка: {error}</div>;
        if (products.length === 0) return <div className={styles.empty}>Товары не найдены</div>;

        return (
            <div className={styles.productsGrid}>
                {products.map(product => (
                    product.variants.map(variant => (
                        <div
                            key={`${product.id}-${variant.id}`}
                            className={`${styles.productCard} ${selectedProduct?.id === product.id && selectedVariant?.id === variant.id ? styles.selected : ''
                                }`}
                            onClick={() => {
                                setSelectedProduct(product);
                                setSelectedVariant(variant);
                            }}
                        >
                            <div className={styles.productImage}>
                                <img
                                    src={product.images.find(img => img.is_main)?.image || product.images[0]?.image}
                                    alt={product.name}
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
                                    <span className={`${styles.stockBadge} ${variant.stocks.some(s => s.available_quantity > 0) ? styles.inStock : styles.outOfStock
                                        }`}>
                                        {variant.stocks.some(s => s.available_quantity > 0)
                                            ? `В наличии: ${variant.stocks.reduce((sum, stock) => sum + stock.available_quantity, 0)}`
                                            : 'Нет в наличии'}
                                    </span>
                                </div>
                                <button
                                    className={styles.addToCartButton}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(product, variant);
                                    }}
                                    disabled={!variant.stocks.some(s => s.available_quantity > 0)}
                                >
                                    <FaPlus /> В корзину
                                </button>
                            </div>
                        </div>
                    ))
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
                {cart.map(item => (
                    <div key={item.variantId} className={styles.cartItem}>
                        <div className={styles.cartItemImage}>
                            <img src={item.image} alt={item.productName} />
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
                                {(item.price * item.quantity).toLocaleString()} ₸
                            </div>
                        </div>
                    </div>
                ))}
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
                </div>
            );
        }

        const availableQty = selectedVariant.stocks.reduce((sum, stock) => sum + stock.available_quantity, 0);
        const mainImage = selectedProduct.images.find(img => img.is_main)?.image || selectedProduct.images[0]?.image;

        return (
            <div className={styles.productDetails}>
                <div className={styles.productGallery}>
                    <div className={styles.mainImage}>
                        <img src={mainImage} alt={selectedProduct.name} />
                    </div>
                    <div className={styles.thumbnailContainer}>
                        {selectedProduct.images.map((image, index) => (
                            <div key={index} className={styles.thumbnail}>
                                <img src={image.image} alt={selectedProduct.name} />
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
                                className={styles.scannerButton}
                                onClick={() => setShowScanner(true)}
                            >
                                <FaBarcode /> Сканер штрих-кода
                            </button>
                        </div>

                        <div className={styles.searchControls}>
                            <div className={styles.searchInputGroup}>
                                <input
                                    type="text"
                                    placeholder="Название, артикул или штрих-код..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && fetchProducts()}
                                />
                                <button
                                    className={styles.searchButton}
                                    onClick={fetchProducts}
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
                                <div className={styles.cartTotal}>
                                    <h5>Итого: <span>{calculateTotal().toLocaleString()}</span> ₸</h5>
                                </div>

                                <div className={styles.cartActions}>
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

                    <div className={styles.salesCard}>
                        <div className={styles.salesHeader}>
                            <h4>Последние продажи</h4>
                        </div>
                        <div className={styles.salesBody}>
                            <div className={styles.emptySales}>
                                <FaHistory size="2em" />
                                <p>Здесь будут отображаться последние продажи</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barcode scanner modal */}
            {showScanner && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h4>Сканер штрих-кода</h4>
                            <button
                                className={styles.closeButton}
                                onClick={() => setShowScanner(false)}
                            >
                                &times;
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.scannerContainer}>
                                <p>Здесь будет сканер штрих-кодов</p>
                            </div>

                            <div className={styles.manualInput}>
                                <input
                                    type="text"
                                    placeholder="Или введите штрих-код вручную"
                                    value={scannedBarcode}
                                    onChange={(e) => setScannedBarcode(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSearch(scannedBarcode)}
                                />
                                <button
                                    className={styles.searchButton}
                                    onClick={() => handleBarcodeSearch(scannedBarcode)}
                                >
                                    <FaSearch /> Найти
                                </button>
                            </div>

                            <div className={styles.scannerInfo}>
                                <FaCamera /> Наведите камеру на штрих-код товара
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                className={styles.secondaryButton}
                                onClick={() => setShowScanner(false)}
                            >
                                Закрыть
                            </button>
                            <button className={styles.primaryButton}>
                                <FaCamera /> Сменить камеру
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment modal */}
            {showPaymentModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h4>Оформление продажи</h4>
                            <button
                                className={styles.closeButton}
                                onClick={() => setShowPaymentModal(false)}
                            >
                                &times;
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.receiptPreview}>
                                <div className={styles.receiptHeader}>
                                    <h5>Магазин "{business_slug}"</h5>
                                    <p>Чек #{new Date().getTime().toString().slice(-6)}</p>
                                    <p>{new Date().toLocaleString('ru-RU')}</p>
                                </div>

                                <div className={styles.receiptItems}>
                                    {cart.map(item => (
                                        <div key={item.variantId} className={styles.receiptItem}>
                                            <div>
                                                {item.productName} ({item.attributes.map(a => a.custom_value || a.predefined_value).join(', ')})
                                                <br />
                                                <small>{item.quantity} × {item.price.toLocaleString()} ₸</small>
                                            </div>
                                            <div>{(item.price * item.quantity).toLocaleString()} ₸</div>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.receiptTotal}>
                                    <strong>Итого:</strong>
                                    <strong>{calculateTotal().toLocaleString()} ₸</strong>
                                </div>
                            </div>

                            <div className={styles.paymentForm}>
                                <div className={styles.formGroup}>
                                    <label>Способ оплаты</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    >
                                        <option value="cash">Наличные</option>
                                        <option value="card">Банковская карта</option>
                                        <option value="qr">Kaspi QR</option>
                                        <option value="transfer">Перевод</option>
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
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                className={styles.secondaryButton}
                                onClick={() => setShowPaymentModal(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className={styles.successButton}
                                onClick={completeSale}
                            >
                                <FaCheck /> Подтвердить продажу
                            </button>
                            <button className={styles.primaryButton}>
                                <FaPrint /> Печать чека
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesPage;