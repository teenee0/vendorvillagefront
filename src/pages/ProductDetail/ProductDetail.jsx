import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from "../../api/axiosDefault.js";
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
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`marketplace/api/products/${pk}/`);
        setProductData(response.data);
        if (response.data.product.default_variant) {
          setSelectedVariant(response.data.product.default_variant.id);
          const defaultAttrs = {};
          response.data.product.default_variant.attributes.forEach(attr => {
            defaultAttrs[attr.attribute_id] = attr.display_value;
          });
          setSelectedAttributes(defaultAttrs);
        }
      } catch (err) {
        setError(err.message || 'Произошла ошибка при загрузке товара');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [pk]);

  const getCurrentVariant = () => {
    if (!productData) return null;
    if (selectedVariant) {
      return productData.product.variants.find(v => v.id === selectedVariant);
    }
    return productData.product.default_variant;
  };

  const handleAttributeSelect = (attributeId, value) => {
    setSelectedAttributes(prev => {
      const newAttributes = { ...prev, [attributeId]: value };
      // Находим вариант, который содержит выбранное значение атрибута
      const matchingVariant = productData.product.variants.find(variant =>
        variant.attributes.some(a => 
          a.attribute_id === Number(attributeId) && a.display_value === value
        )
      );
      if (matchingVariant) {
        setSelectedVariant(matchingVariant.id);
        // Обновляем selectedAttributes с атрибутами выбранного варианта
        const updatedAttrs = {};
        matchingVariant.attributes.forEach(attr => {
          updatedAttrs[attr.attribute_id] = attr.display_value;
        });
        return updatedAttrs;
      }
      return newAttributes;
    });
  };

  const isAttributeValueAvailable = (attributeId, value) => {
    if (!productData || !productData.product || !productData.product.variants) {
      return false;
    }
    const isAvailable = productData.product.variants.some(variant =>
      variant.attributes.some(a => 
        a.attribute_id === Number(attributeId) && a.display_value === value
      )
    );
    return isAvailable;
  };

  const handleAddToCart = () => {
    const variant = getCurrentVariant();
    if (!variant) return;
    console.log('Добавлено в корзину:', {
      productId: productData.product.id,
      variantId: variant.id,
      quantity: quantity,
      price: variant.current_price
    });
  };

  if (loading) return <div className="product-loading">Загрузка товара...</div>;
  if (error) return <div className="product-error">{error}</div>;
  if (!productData) return <div className="product-not-found">Товар не найден</div>;

  const { product, same_products } = productData;
  const currentVariant = getCurrentVariant();

  const availableAttributes = {};
  if (product.available_attributes) {
    Object.entries(product.available_attributes).forEach(([attrName, attrData]) => {
      availableAttributes[attrData.attribute_id] = {
        name: attrName,
        values: attrData.values,
        required: attrData.required
      };
    });
  }

  const sliderSettings = {
    dots: true,
    infinite: same_products.length > 4,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    arrows: true,
    responsive: [
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
    ]
  };

  return (
    <div className="product-detail">
      <Breadcrumbs 
        breadcrumbs={productData.breadcrumbs}
        currentPage={product.name}
      />
      <div className="product-main">
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
        <div className="product-info">
          <h1 className="product-title">{product.name}</h1>
          <div className="product-meta">
            <span className="product-id">Артикул: {currentVariant?.sku || product.id}</span>
            <span className={`stock ${currentVariant?.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'}`}>
              {currentVariant?.stock_quantity > 0 ? 'В наличии' : 'Нет в наличии'}
            </span>
          </div>
          <div className="product-rating">
            {[...Array(5)].map((_, i) => (
              i < 4 ? <FaStar key={i} className="star filled" /> : <FaRegStar key={i} className="star" />
            ))}
            <span className="rating-text">({Math.floor(Math.random() * 50) + 1} отзывов)</span>
          </div>
          {currentVariant && (
            <div className="product-price">
              <span className="current">
                {parseFloat(currentVariant.current_price).toLocaleString('ru-RU')} ₽
              </span>
              {currentVariant.discount > 0 && (
                <>
                  <span className="old">
                    {parseFloat(currentVariant.price).toLocaleString('ru-RU')} ₽
                  </span>
                  <span className="discount">
                    -{currentVariant.discount}%
                  </span>
                </>
              )}
            </div>
          )}
          {Object.entries(availableAttributes).map(([attrId, attr]) => (
          <div key={attrId} className="attribute-selector">
            <h4>{attr.name}:</h4>
            <div className="attribute-values">
              {attr.values.map(value => (
                <button
                  key={value}
                  className={`attribute-value ${
                    selectedAttributes[attrId] === value ? 'selected' : ''
                  }`}
                  onClick={() => handleAttributeSelect(Number(attrId), value)}
                  disabled={!isAttributeValueAvailable(Number(attrId), value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          ))}
          <div className="product-actions">
            <div className="quantity-control">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={!currentVariant || currentVariant.stock_quantity <= 0}
              >
                −
              </button>
              <span>{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                disabled={!currentVariant || currentVariant.stock_quantity <= 0}
              >
                +
              </button>
            </div>
            <button 
              className="add-to-cart"
              onClick={handleAddToCart}
              disabled={!currentVariant || currentVariant.stock_quantity <= 0}
            >
              <FiShoppingCart />
              {currentVariant?.stock_quantity > 0 ? 'Добавить в корзину' : 'Нет в наличии'}
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
        {/* <button 
          className={`tab ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Отзывы
        </button> */}
      </div>
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
                {currentVariant?.attributes.map(attr => (
                  <tr key={attr.id}>
                    <td>{attr.attribute_name}</td>
                    <td>{attr.display_value}</td>
                  </tr>
                ))}
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
              <p className="text">Отличный товар, соответствует описанию. Доставили быстро.</p>
              <span className="date">15.01.2023</span>
            </div>
          </div>
        )}
      </div>
      {productData.same_products && productData.same_products.length > 0 && (
        <div className="similar-products-section">
          <h2 className="section-title">Похожие товары</h2>
          <div className="slider-container">
            <Slider {...sliderSettings}>
              {productData.same_products.map((product) => (
                <div key={`product-${product.id}`} className="slide-item">
                  <ProductCard product={product} />
                </div>
              ))}
            </Slider>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;