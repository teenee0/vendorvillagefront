import React, { useState, useEffect } from 'react';
import axios from "../../api/axiosDefault.js";
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './ProductEditPage.module.css';
import ProductVariantEditor from '../ProductVariantEditor/ProductVariantEditor.jsx'
const ProductEditPage = () => {
    const { business_slug, product_id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        on_the_main: false,
        is_active: true
    });
    const [variants, setVariants] = useState([]);
    const [images, setImages] = useState([]);
    const [showImageModal, setShowImageModal] = useState(false);
    
    const [newImage, setNewImage] = useState({
        image: null,
        is_main: false,
        alt_text: '',
        display_order: 0
    });

    useEffect(() => {
        const fetchProductData = async () => {
            try {
              const [productRes, categoriesRes, imagesRes] = await Promise.all([
                axios.get(`/api/business/${business_slug}/products/${product_id}/`),
                axios.get('/api/products/categories/'),
                axios.get(`/api/business/${business_slug}/products/${product_id}/images/`)
              ]);
          
              setProduct(productRes.data);
              setFormData({
                name: productRes.data.name,
                description: productRes.data.description,
                category: productRes.data?.category || '',
                on_the_main: productRes.data.on_the_main,
                is_active: productRes.data.is_active
              });
              setCategories(categoriesRes.data);
              setImages(imagesRes.data);
              setLoading(false);
            } catch (err) {
              setError('Не удалось загрузить данные товара');
              setLoading(false);
            }
          };

        fetchProductData();
    }, [business_slug, product_id]);

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };


    const handleImageChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        setNewImage(prev => ({
            ...prev,
            [name]: type === 'file' ? files[0] : type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.put(
                `/api/business/${business_slug}/products/${product_id}/`,
                formData
            );
            setProduct(response.data);
        } catch (err) {
            setError('Ошибка при сохранении товара');
        }
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return '';
        
        if (/^https?:\/\//i.test(imagePath)) {
            return imagePath;
        }
        if (imagePath.startsWith('/media/')) {
            return `http://localhost:8000${imagePath}`;
        }
        if (!imagePath.startsWith('/')) {
            return `http://localhost:8000/media/${imagePath}`;
        }
        return `http://localhost:8000${imagePath}`;
    };

    const handleAddImage = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('image', newImage.image);
        formData.append('is_main', newImage.is_main);
        formData.append('alt_text', newImage.alt_text);
        formData.append('display_order', newImage.display_order);

        try {
            const response = await axios.post(
                `/api/business/${business_slug}/products/${product_id}/images/`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setImages([...images, response.data]);
            setShowImageModal(false);
            setNewImage({
                image: null,
                is_main: false,
                alt_text: '',
                display_order: 0
            });
        } catch (err) {
            setError('Ошибка при добавлении изображения');
        }
    };


    const deleteImage = async (imageId) => {
        if (window.confirm('Вы уверены, что хотите удалить это изображение?')) {
            try {
                await axios.delete(
                    `/api/business/${business_slug}/products/${product_id}/images/${imageId}/`
                );
                setImages(images.filter(img => img.id !== imageId));
            } catch (err) {
                setError('Ошибка при удалении изображения');
            }
        }
    };

    const setMainImage = async (imageId) => {
        try {
            await axios.patch(
                `/api/business/${business_slug}/products/${product_id}/images/${imageId}/`,
                { is_main: true }
            );
            const updatedImages = images.map(img => ({
                ...img,
                is_main: img.id === imageId
            }));
            setImages(updatedImages);
        } catch (err) {
            setError('Ошибка при установке главного изображения');
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Загрузка товара...</p>
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
                <h1>Редактирование товара</h1>
                <button 
                    className={styles.backBtn}
                    onClick={() => navigate(-1)}
                >
                    <i className="fas fa-arrow-left"></i> Назад
                </button>
            </div>

            <div className={styles.content}>
                {/* Общая информация */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Основная информация</h2>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label>Название товара</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleFormChange}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Описание</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleFormChange}
                                rows="5"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Категория</label>
                            <select
                                name="category"
                                value={String(formData.category)}  // Приводим к строке
                                onChange={handleFormChange}
                                required
                            >
                                <option value="">Выберите категорию</option>
                                {categories.map(category => (
                                    <option key={category.id} value={String(category.id)}>
                                    {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.checkboxGroup}>
                            <div className={styles.formCheck}>
                                <input
                                    type="checkbox"
                                    id="on_the_main"
                                    name="on_the_main"
                                    checked={formData.on_the_main}
                                    onChange={handleFormChange}
                                />
                                <label htmlFor="on_the_main">Показывать на главной</label>
                            </div>
                            <div className={styles.formCheck}>
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleFormChange}
                                />
                                <label htmlFor="is_active">Активный товар</label>
                            </div>
                        </div>
                        <div className={styles.formActions}>
                            <button type="submit" className={styles.saveBtn}>
                                <i className="fas fa-save"></i> Сохранить изменения
                            </button>
                        </div>
                    </form>
                </section>

                {/* Варианты товара */}
                <section className={styles.section}>
                <ProductVariantEditor 
                    productId={product_id}
                    businessSlug={business_slug}
                />
                </section>

                {/* Изображения товара */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Изображения товара</h2>
                        <button 
                            className={styles.addButton}
                            onClick={() => setShowImageModal(true)}
                        >
                            <i className="fas fa-plus"></i> Добавить изображение
                        </button>
                    </div>

                    {images.length === 0 ? (
                        <div className={styles.emptyState}>
                            <i className="fas fa-image"></i>
                            <h3>Нет изображений</h3>
                            <p>Добавьте изображения товара для лучшего отображения в каталоге</p>
                        </div>
                    ) : (
                        <div className={styles.imagesGrid}>
                            {images.map(image => (
                                <div key={image.id} className={`${styles.imageItem} ${image.is_main ? styles.mainImage : ''}`}>
                                    <img 
                                        src={getImageUrl(image.image)} 
                                        alt={image.alt_text || product.name} 
                                    />
                                    <div className={styles.imageActions}>
                                        {!image.is_main && (
                                            <button 
                                                className={styles.setMainButton}
                                                onClick={() => setMainImage(image.id)}
                                            >
                                                Сделать главной
                                            </button>
                                        )}
                                        {image.is_main && (
                                            <span className={styles.mainLabel}>Главная</span>
                                        )}
                                        <button 
                                            className={styles.deleteImageButton}
                                            onClick={() => deleteImage(image.id)}
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Модальное окно добавления изображения */}
            {showImageModal && (
                <div className={styles.modalOverlay}>
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={styles.modalContent}
                    >
                        <div className={styles.modalHeader}>
                            <h2>Добавить изображение</h2>
                            <button 
                                className={styles.closeModal}
                                onClick={() => setShowImageModal(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleAddImage}>
                            <div className={styles.modalBody}>
                                <div className={styles.formGroup}>
                                    <label>Изображение</label>
                                    <input
                                        type="file"
                                        name="image"
                                        onChange={handleImageChange}
                                        accept="image/*"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Альтернативный текст</label>
                                    <input
                                        type="text"
                                        name="alt_text"
                                        value={newImage.alt_text}
                                        onChange={handleImageChange}
                                        placeholder="Описание изображения"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Порядок отображения</label>
                                    <input
                                        type="number"
                                        name="display_order"
                                        value={newImage.display_order}
                                        onChange={handleImageChange}
                                        min="0"
                                    />
                                </div>
                                <div className={styles.formCheck}>
                                    <input
                                        type="checkbox"
                                        id="is_main"
                                        name="is_main"
                                        checked={newImage.is_main}
                                        onChange={handleImageChange}
                                    />
                                    <label htmlFor="is_main">Сделать главным изображением</label>
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button 
                                    type="button"
                                    className={styles.cancelBtn}
                                    onClick={() => setShowImageModal(false)}
                                >
                                    Отмена
                                </button>
                                <button 
                                    type="submit"
                                    className={styles.saveBtn}
                                >
                                    Добавить изображение
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ProductEditPage;