import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiShoppingCart, FiHeart, FiShare2, FiChevronLeft } from 'react-icons/fi';
import { FaRegStar, FaStar } from 'react-icons/fa';
import './ProductDetail.css';
import ProductCard from '/src/components/ProductCard/ProductCard.jsx';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";
import Breadcrumbs from '/src/components/Breadcrumbs/Breadcrumbs.jsx';



const ProductDetail = () => {
  const { pk } = useParams();
  const navigate = useNavigate();
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [rating, setRating] = useState(4.5);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/marketplace/api/products/${pk}/`);
        setProductData(response.data);
      } catch (err) {
        setError(err.message || 'Произошла ошибка при загрузке товара');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [pk]);

  const handleAddToCart = () => {
    if (!productData) return;
    console.log('Добавлено в корзину:', productData.product.id, 'Количество:', quantity);
  };

  if (loading) return <div className="product-loading">Загрузка товара...</div>;
  if (error) return <div className="product-error">{error}</div>;
  if (!productData) return <div className="product-not-found">Товар не найден</div>;

  const { product, same_products } = productData;
  const hasDiscount = product.discount && product.discount !== "0.00";
  const currentPrice = hasDiscount ? product.discount : product.price;

  return (
    <div className="product-detail">
      {/* Хлебные крошки */}
      <Breadcrumbs 
              breadcrumbs={data?.breadcrumbs} 
        />

      {/* Основная информация */}
      <div className="product-main">
        {/* Галерея */}
        <div className="product-gallery">
          <div 
            className="main-image" 
            style={{ backgroundImage: `url(${product.images[selectedImage]?.image || ''})` }}
          />
          <div className="thumbnails">
            {product.images.map((img, index) => (
              <div 
                key={index}
                className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                onClick={() => setSelectedImage(index)}
                style={{ backgroundImage: `url(${img.image})` }}
              />
            ))}
          </div>
        </div>

        {/* Информация */}
        <div className="product-info">
          <h1 className="product-title">{product.name}</h1>
          
          <div className="product-meta">
            <span className="product-id">Артикул: {product.id}</span>
            <span className={`stock ${product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'}`}>
              {product.stock_quantity > 0 ? 'В наличии' : 'Нет в наличии'}
            </span>
          </div>

          <div className="product-rating">
            {[...Array(5)].map((_, i) => (
              i < Math.floor(rating) ? 
                <FaStar key={i} className="star filled" /> : 
                <FaRegStar key={i} className="star" />
            ))}
            <span className="rating-text">({Math.floor(Math.random() * 50) + 1} отзывов)</span>
          </div>

          <div className="product-price">
            <span className="current">{parseFloat(currentPrice).toLocaleString('ru-RU')} ₽</span>
            {hasDiscount && (
              <>
                <span className="old">{parseFloat(product.price).toLocaleString('ru-RU')} ₽</span>
                <span className="discount">
                  -{Math.round((1 - parseFloat(product.discount)/parseFloat(product.price)) * 100)}%
                </span>
              </>
            )}
          </div>

          <div className="product-actions">
            <div className="quantity-control">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={product.stock_quantity <= 0}
              >
                −
              </button>
              <span>{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                disabled={product.stock_quantity <= 0}
              >
                +
              </button>
            </div>
            <button 
              className="add-to-cart"
              onClick={handleAddToCart}
              disabled={product.stock_quantity <= 0}
            >
              <FiShoppingCart />
              {product.stock_quantity > 0 ? 'Добавить в корзину' : 'Нет в наличии'}
            </button>
          </div>

          <div className="delivery-info">
            <div className="delivery-item">
              <div className="icon">🚚</div>
              <div>
                <h4>Быстрая доставка</h4>
                <p>1-3 дня по всей России</p>
              </div>
            </div>
            <div className="delivery-item">
              <div className="icon">🔄</div>
              <div>
                <h4>Легкий возврат</h4>
                <p>14 дней на возврат</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Табы */}
      <div className="product-tabs">
        <button 
          className={`tab ${activeTab === 'description' ? 'active' : ''}`}
          onClick={() => setActiveTab('description')}
        >
          Описание
        </button>
        <button 
          className={`tab ${activeTab === 'specs' ? 'active' : ''}`}
          onClick={() => setActiveTab('specs')}
        >
          Характеристики
        </button>
        <button 
          className={`tab ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Отзывы
        </button>
      </div>

      {/* Контент табов */}
      <div className="tab-content">
        {activeTab === 'description' && (
          <div className="description">
            <p>{product.description || 'Описание отсутствует.'}</p>
          </div>
        )}
        
        {activeTab === 'specs' && (
          <div className="specifications">
            <table>
              <tbody>
                <tr>
                  <td>Артикул</td>
                  <td>{product.id}</td>
                </tr>
                <tr>
                  <td>Категория</td>
                  <td>Куртки</td>
                </tr>
                <tr>
                  <td>Материал</td>
                  <td>Натуральная кожа</td>
                </tr>
                <tr>
                  <td>Цвет</td>
                  <td>Черный</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === 'reviews' && (
          <div className="reviews">
            <div className="review">
              <div className="review-header">
                <span className="author">Алексей П.</span>
                <div className="rating">
                  <FaStar className="filled" />
                  <FaStar className="filled" />
                  <FaStar className="filled" />
                  <FaStar className="filled" />
                  <FaStar />
                </div>
              </div>
              <p className="text">Отличная куртка, очень теплая и стильная. Доставили быстро.</p>
              <span className="date">15.01.2023</span>
            </div>
          </div>
        )}
      </div>

      {/* Похожие товары - карусель */}
        {productData.same_products && productData.same_products.length > 0 && (
        <div className="similar-products-section">
            <h2 className="section-title">Похожие товары</h2>
            <Slider
            className="detail-product-carousel"
            dots={true}
            infinite={true}
            speed={500}
            slidesToShow={4}
            slidesToScroll={1}
            responsive={[
                {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 3,
                    slidesToScroll: 1,
                }
                },
                {
                breakpoint: 768,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1
                }
                },
                {
                breakpoint: 480,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1
                }
                }
            ]}
            >
            {productData.same_products.map((item) => (
                <div key={item.id} className="carousel-item">
                <ProductCard product={item} />
                </div>
            ))}
            </Slider>
        </div>
        )}
    </div>
  );
};

export default ProductDetail;