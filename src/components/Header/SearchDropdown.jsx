/**
 * SearchDropdown — выпадающий список автодополнения поисковой строки.
 *
 * Отображает три секции (в зависимости от состояния):
 *   1. История последних запросов — когда поле пустое или содержит < 2 символов.
 *   2. Совпадающие категории — из БД через /search/api/suggest/.
 *   3. Товары — из Elasticsearch через /search/api/suggest/.
 *
 * Поддерживает навигацию стрелками через activeIndex (управляется родителем).
 */

import React from 'react';
import styles from './SearchDropdown.module.css';

// ─── вспомогательные компоненты ───────────────────────────────────────────────

function SectionLabel({ children }) {
  return <p className={styles.sectionLabel}>{children}</p>;
}

function HistoryItem({ query, isActive, onSelect, onRemove }) {
  return (
    <li
      className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
      onPointerDown={(e) => { e.preventDefault(); onSelect(); }}
      role="option"
      aria-selected={isActive}
    >
      <span className={styles.historyIcon}>
        <i className="fas fa-clock" />
      </span>
      <span className={styles.itemText}>{query}</span>
      <button
        className={styles.removeButton}
        onPointerDown={(e) => { e.preventDefault(); onRemove(e); }}
        aria-label={`Удалить "${query}" из истории`}
        tabIndex={-1}
      >
        ×
      </button>
    </li>
  );
}

function CategoryItem({ category, isActive, onSelect }) {
  return (
    <li
      className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
      onPointerDown={(e) => { e.preventDefault(); onSelect(); }}
      role="option"
      aria-selected={isActive}
    >
      <span className={styles.categoryIcon}>
        <i className="fas fa-folder-open" />
      </span>
      <span className={styles.itemText}>{category.name}</span>
      <span className={styles.categoryHint}>в категории</span>
    </li>
  );
}

function ProductItem({ product, isActive, onSelect }) {
  const price = product.price != null
    ? `${Math.round(product.price).toLocaleString('ru-RU')} ₸`
    : null;

  return (
    <li
      className={`${styles.item} ${styles.productItem} ${isActive ? styles.itemActive : ''}`}
      onPointerDown={(e) => { e.preventDefault(); onSelect(); }}
      role="option"
      aria-selected={isActive}
    >
      <span className={styles.productThumb}>
        {product.image
          ? <img src={product.image} alt={product.name} className={styles.productImage} />
          : <span className={styles.productImagePlaceholder}><i className="fas fa-image" /></span>
        }
      </span>
      <span className={styles.productInfo}>
        <span className={styles.productName}>{product.name}</span>
        {price && <span className={styles.productPrice}>{price}</span>}
      </span>
    </li>
  );
}

// ─── главный компонент ────────────────────────────────────────────────────────

export default function SearchDropdown({
  query,
  loading,
  history,
  queries = [],
  categories,
  products,
  activeIndex,
  onSelect,
  onHistoryRemove,
  mobile = false,
  mobileTop = 110,
}) {
  const showHistory = query.length < 2 && history.length > 0;
  const showSuggestions = query.length >= 2 && (
    queries.length > 0 || categories.length > 0 || products.length > 0
  );
  const showMobileHint = mobile && !loading && query.length < 2 && history.length === 0;

  // Плоский список для расчёта activeIndex
  let flatOffset = 0;

  const mobileStyle = mobile ? { top: mobileTop } : undefined;

  return (
    <div
      className={`${styles.dropdown} ${mobile ? styles.dropdownMobile : ''}`}
      style={mobileStyle}
      role="listbox"
      aria-label="Подсказки поиска"
    >
      {/* Лоадер */}
      {loading && (
        <div className={styles.loader}>
          <span className={styles.loaderDot} />
          <span className={styles.loaderDot} />
          <span className={styles.loaderDot} />
        </div>
      )}

      {/* Подсказка на мобильном когда история пуста */}
      {showMobileHint && (
        <div className={styles.mobileHint}>
          <span className={styles.mobileHintIcon}>
            <i className="fas fa-search" />
          </span>
          <p className={styles.mobileHintText}>Начните вводить запрос</p>
          <p className={styles.mobileHintSub}>Поиск по товарам, брендам и категориям</p>
        </div>
      )}

      {/* История */}
      {showHistory && !loading && (
        <section className={styles.section}>
          <SectionLabel>Недавние запросы</SectionLabel>
          <ul className={styles.list}>
            {history.map((q, idx) => {
              const itemIdx = flatOffset + idx;
              return (
                <HistoryItem
                  key={q}
                  query={q}
                  isActive={activeIndex === itemIdx}
                  onSelect={() => onSelect({ type: 'history', value: q })}
                  onRemove={(e) => onHistoryRemove(q, e)}
                />
              );
            })}
          </ul>
        </section>
      )}

      {/* Похожие запросы */}
      {showSuggestions && !loading && queries.length > 0 && (() => {
        const sectionOffset = flatOffset;
        flatOffset += queries.length;
        return (
          <section className={styles.section}>
            <SectionLabel>Похожие запросы</SectionLabel>
            <ul className={styles.list}>
              {queries.map((q, idx) => (
                <li
                  key={q}
                  className={`${styles.item} ${activeIndex === sectionOffset + idx ? styles.itemActive : ''}`}
                  onPointerDown={(e) => { e.preventDefault(); onSelect({ type: 'query', value: q }); }}
                  role="option"
                  aria-selected={activeIndex === sectionOffset + idx}
                >
                  <span className={styles.queryIcon}>
                    <i className="fas fa-search" />
                  </span>
                  <span className={styles.itemText}>{q}</span>
                  <span className={styles.queryArrow}>
                    <i className="fas fa-arrow-up-left" />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      {/* Категории */}
      {showSuggestions && !loading && categories.length > 0 && (() => {
        const sectionOffset = flatOffset;
        flatOffset += categories.length;
        return (
          <section className={styles.section}>
            <SectionLabel>Категории</SectionLabel>
            <ul className={styles.list}>
              {categories.map((cat, idx) => (
                <CategoryItem
                  key={cat.id}
                  category={cat}
                  isActive={activeIndex === sectionOffset + idx}
                  onSelect={() => onSelect({ type: 'category', ...cat })}
                />
              ))}
            </ul>
          </section>
        );
      })()}

      {/* Товары */}
      {showSuggestions && !loading && products.length > 0 && (() => {
        const sectionOffset = flatOffset;
        return (
          <section className={styles.section}>
            <SectionLabel>Товары</SectionLabel>
            <ul className={styles.list}>
              {products.map((prod, idx) => (
                <ProductItem
                  key={prod.product_id}
                  product={prod}
                  isActive={activeIndex === sectionOffset + idx}
                  onSelect={() => onSelect({ type: 'product', ...prod })}
                />
              ))}
            </ul>
          </section>
        );
      })()}

      {/* Нет результатов */}
      {!loading && query.length >= 2 && !showSuggestions && (
        <p className={styles.empty}>
          Ничего не найдено по запросу «{query}»
        </p>
      )}
    </div>
  );
}
