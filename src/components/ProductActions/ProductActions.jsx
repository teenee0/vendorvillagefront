import React from 'react';
import { FiShoppingCart } from 'react-icons/fi';
import GlareHover from '/src/components/GlareHover/GlareHover.jsx'; 
import styles from './ProductActions.module.css';

const ProductActions = ({
  quantity,
  setQuantity,
  currentVariant,
  handleAddToCart,
  isComingSoon = true
}) => {
  return (
    <div className={styles.actionsWrapper}>
      <GlareHover
        width="100%"
        height="auto"
        background="rgba(0, 0, 0, 0.7)"
        borderRadius="8px"
        borderColor="rgba(255, 255, 255, 0.1)"
        glareColor="#ffffff"
        glareOpacity={0.2}
        glareAngle={-30}
        glareSize={300}
        transitionDuration={800}
        playOnce={false}
        style={{ padding: '20px' }}
      >
        <div className={styles.comingSoonOverlay}>
          <div className={isComingSoon ? styles.disabledContent : ''}>
            <div className={styles.productActions}>
              <div className={styles.quantityControl}>
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
                className={styles.addToCart}
                onClick={handleAddToCart}
                disabled={!currentVariant || currentVariant.stock_quantity <= 0}
              >
                <FiShoppingCart />
                {currentVariant?.stock_quantity > 0 ? 'Добавить в корзину' : 'Нет в наличии'}
              </button>
            </div>
            <div className={styles.deliveryInfo}>
              <div className={styles.deliveryItem}>
                <div className={styles.icon}>🚚</div>
                <div>
                  <h4>Быстрая доставка</h4>
                  <p>1-3 дня по всей России</p>
                </div>
              </div>
              <div className={styles.deliveryItem}>
                <div className={styles.icon}>🔄</div>
                <div>
                  <h4>Легкий возврат</h4>
                  <p>14 дней на возврат</p>
                </div>
              </div>
            </div>
          </div>
          {isComingSoon && (
            <div className={styles.comingSoonText}>Скоро...</div>
          )}
        </div>
      </GlareHover>
    </div>
  );
};

export default ProductActions;