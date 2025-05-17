import React, { useState, useEffect } from 'react';
import axios from "../../api/axiosDefault.js";
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductManagementCard from '../../components/ProductManagementCard/ProductManagementCard.jsx';
import styles from './ProductManagement.module.css';

const ProductManagement = () => {
    const { business_slug } = useParams();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [categories, setCategories] = useState([]);
    const [activeTab, setActiveTab] = useState('products');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProduct, setNewProduct] = useState({
        name: '',
        description: '',
        category: '',
        on_the_main: false,
        is_active: true
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsRes, categoriesRes] = await Promise.all([
                    axios.get(`/api/business/${business_slug}/products/`),
                    axios.get('/api/products/categories/')
                ]);
                setProducts(productsRes.data);
                setCategories(categoriesRes.data);
                setLoading(false);
            } catch (err) {
                setError('Не удалось загрузить данные');
                setLoading(false);
            }
        };

        fetchData();
    }, [business_slug]);

    const handleCreateProduct = async () => {
        try {
            const response = await axios.post(
                `/api/business/${business_slug}/products/`,
                newProduct
            );
            setProducts([...products, response.data]);
            setShowCreateModal(false);
            setNewProduct({
                name: '',
                description: '',
                category: '',
                on_the_main: false,
                is_active: true
            });
        } catch (err) {
            setError('Ошибка при создании товара');
        }
    };

    const toggleProductStatus = async (productId, currentStatus) => {
        try {
            const response = await axios.patch(
                `/api/business/${business_slug}/products/${productId}/`,
                { is_active: !currentStatus }
            );
            setProducts(products.map(p => 
                p.id === productId ? response.data : p
            ));
        } catch (err) {
            setError('Ошибка при изменении статуса');
        }
    };

    const deleteProduct = async (productId) => {
        if (window.confirm('Вы уверены, что хотите удалить этот товар?')) {
            try {
                await axios.delete(
                    `/api/business/${business_slug}/products/${productId}/`
                );
                setProducts(products.filter(p => p.id !== productId));
            } catch (err) {
                setError('Ошибка при удалении товара');
            }
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Загрузка...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>Попробовать снова</button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Управление товарами</h1>
                <button 
                    className={styles.addButton}
                    onClick={() => setShowCreateModal(true)}
                >
                    <i className="fas fa-plus"></i> Добавить товар
                </button>
            </div>

            <div className={styles.tabs}>
                <button 
                    className={activeTab === 'products' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveTab('products')}
                >
                    <i className="fas fa-box"></i> Товары
                </button>
                <button 
                    className={activeTab === 'categories' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveTab('categories')}
                >
                    <i className="fas fa-tags"></i> Категории
                </button>
                <button 
                    className={activeTab === 'analytics' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setActiveTab('analytics')}
                >
                    <i className="fas fa-chart-line"></i> Аналитика
                </button>
            </div>

            {activeTab === 'products' && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={styles.tabContent}
                >
                    {products.length === 0 ? (
                        <div className={styles.emptyState}>
                            <i className={`fas fa-box-open ${styles.emptyIcon}`}></i>
                            <h3 className={styles.emptyTitle}>У вас пока нет товаров</h3>
                            <p className={styles.emptyText}>Добавьте свой первый товар, чтобы начать продавать</p>
                            <button 
                                className={styles.createButton}
                                onClick={() => setShowCreateModal(true)}
                            >
                                Добавить товар
                            </button>
                        </div>
                    ) : (
                        <div className={styles.productsGrid}>
                            {products.map(product => (
                                <ProductManagementCard
                                    key={product.id}
                                    product={product}
                                    businessSlug={business_slug}
                                    onToggleStatus={toggleProductStatus}
                                    onDelete={deleteProduct}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            )}

            {activeTab === 'categories' && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={styles.tabContent}
                >
                    <div className={styles.categoriesList}>
                        {categories.length === 0 ? (
                            <div className={styles.emptyState}>
                                <i className={`fas fa-tags ${styles.emptyIcon}`}></i>
                                <h3 className={styles.emptyTitle}>Категории не найдены</h3>
                                <p className={styles.emptyText}>Нет доступных категорий товаров</p>
                            </div>
                        ) : (
                            categories.map(category => (
                                <motion.div 
                                    key={category.id}
                                    whileHover={{ y: -3 }}
                                    className={styles.categoryItem}
                                >
                                    <div className={styles.categoryInfo}>
                                        <h3>{category.name}</h3>
                                        <p>{category.description || 'Описание отсутствует'}</p>
                                    </div>
                                    <div className={styles.categoryStats}>
                                        <span>
                                            <i className="fas fa-box"></i> 
                                            {category.products_count || 0} товаров
                                        </span>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>
            )}

            {activeTab === 'analytics' && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={styles.tabContent}
                >
                    <div className={styles.analyticsPlaceholder}>
                        <i className={`fas fa-chart-pie ${styles.analyticsIcon}`}></i>
                        <h3>Аналитика продаж</h3>
                        <p>Здесь будут отображаться статистика и аналитика по вашим товарам</p>
                    </div>
                </motion.div>
            )}

            {showCreateModal && (
                <div className={styles.modalOverlay}>
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={styles.modal}
                    >
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Добавить новый товар</h2>
                            <button 
                                className={styles.closeButton}
                                onClick={() => setShowCreateModal(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Название товара</label>
                                <input 
                                    type="text" 
                                    className={styles.input}
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                                    placeholder="Введите название товара"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Описание</label>
                                <textarea 
                                    className={styles.textarea}
                                    value={newProduct.description}
                                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                                    placeholder="Добавьте описание товара"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Категория</label>
                                <select
                                    className={styles.select}
                                    value={newProduct.category}
                                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                                >
                                    <option value="">Выберите категорию</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formCheck}>
                                <input 
                                    type="checkbox" 
                                    id="on_the_main"
                                    className={styles.checkbox}
                                    checked={newProduct.on_the_main}
                                    onChange={(e) => setNewProduct({...newProduct, on_the_main: e.target.checked})}
                                />
                                <label htmlFor="on_the_main" className={styles.checkboxLabel}>Показывать на главной странице</label>
                            </div>
                            <div className={styles.formCheck}>
                                <input 
                                    type="checkbox" 
                                    id="is_active"
                                    className={styles.checkbox}
                                    checked={newProduct.is_active}
                                    onChange={(e) => setNewProduct({...newProduct, is_active: e.target.checked})}
                                />
                                <label htmlFor="is_active" className={styles.checkboxLabel}>Активный товар</label>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button 
                                className={styles.cancelButton}
                                onClick={() => setShowCreateModal(false)}
                            >
                                Отмена
                            </button>
                            <button 
                                className={!newProduct.name || !newProduct.category ? styles.submitButtonDisabled : styles.submitButton}
                                onClick={handleCreateProduct}
                                disabled={!newProduct.name || !newProduct.category}
                            >
                                Создать товар
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ProductManagement;