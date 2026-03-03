import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SearchResultCard.module.css';

const SearchResultCard = ({ hit }) => {
  const navigate = useNavigate();
  const { product_id, product_name, variant_name, category_name, price_min } = hit;
  const displayName = variant_name || product_name;

  const goToProduct = () => navigate(`/marketplace/products/${product_id}`);

  return (
    <article className={styles.card} onClick={goToProduct}>
      <div className={styles.placeholderImage}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 16L8.5 10.5L11 13.5L14.5 9L20 16M4 16H20M4 16V4H20V16" />
        </svg>
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{displayName}</h3>
        {category_name && (
          <p className={styles.category}>{category_name}</p>
        )}
        <p className={styles.price}>
          {price_min != null
            ? `${Number(price_min).toLocaleString('ru-RU')} ₸`
            : '—'}
        </p>
      </div>
    </article>
  );
};

export default SearchResultCard;
