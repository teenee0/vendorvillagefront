import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './Header.module.css';
import logoIcon from '../../assets/logo.svg';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import CitySelector from '../CitySelector/CitySelector';
import { useCity } from '../../hooks/useCity';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import SnowfallToggle from '../SnowfallToggle/SnowfallToggle';
import axios from '../../api/axiosDefault';
import SearchDropdown from './SearchDropdown';
import CartButton from '../CartButton/CartButton';

// ─── история поиска (localStorage) ───────────────────────────────────────────

const HISTORY_KEY = 'search_history';
const HISTORY_MAX = 5;

function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function pushSearchHistory(query) {
  if (!query || query.length < 2) return;
  try {
    const prev = getSearchHistory().filter((q) => q !== query);
    const next = [query, ...prev].slice(0, HISTORY_MAX);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // localStorage может быть заблокирован (приватный режим)
  }
}

function removeHistoryItem(query) {
  try {
    const next = getSearchHistory().filter((q) => q !== query);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

// ─── debounce ─────────────────────────────────────────────────────────────────

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── компонент ────────────────────────────────────────────────────────────────

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [searchInput, setSearchInput] = useState('');

  // Suggest-state
  const [suggestions, setSuggestions] = useState({ queries: [], categories: [], products: [] });
  const [history, setHistory] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  // Индекс выделенного элемента для навигации стрелками (-1 = ничего)
  const [activeIndex, setActiveIndex] = useState(-1);
  // Мобильный режим «поиск активен»: логотип скрыт, поле на всю ширину
  const [mobileSearchActive, setMobileSearchActive] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { selectedCity, setSelectedCity } = useCity();
  const citySelectorRef = useRef(null);
  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const inputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const abortRef = useRef(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(110);

  // Дебаунс 250 мс — не бомбардируем API на каждый символ
  const debouncedQuery = useDebounce(searchInput, 250);

  // Синхронизация input с URL-параметром q
  const currentQuery = searchParams.get('q') || '';
  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  // ─── закрываем поиск при любой навигации ─────────────────────────────────

  useEffect(() => {
    setMobileSearchActive(false);
    setDropdownOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
    mobileInputRef.current?.blur();
  }, [location.pathname, location.search]);

  // ─── измеряем высоту шапки для позиционирования мобильного дропдауна ──────

  useEffect(() => {
    if (!headerRef.current) return;
    const obs = new ResizeObserver(() => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.getBoundingClientRect().height);
      }
    });
    obs.observe(headerRef.current);
    return () => obs.disconnect();
  }, []);

  // ─── scroll behaviour ───────────────────────────────────────────────────────

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          setScrolled(y > 10);
          if (y > lastScrollY && y > 100) setIsVisible(false);
          else if (y < lastScrollY || y <= 100) setIsVisible(true);
          setLastScrollY(y);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // ─── закрытие дропдауна по клику вне (десктоп) ────────────────────────────

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // ─── suggest-запрос ────────────────────────────────────────────────────────

  useEffect(() => {
    // Отменяем предыдущий запрос если пользователь продолжил вводить
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (debouncedQuery.length < 2) {
      setSuggestions({ queries: [], categories: [], products: [] });
      setDropdownLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setDropdownLoading(true);

    axios
      .get('/search/api/suggest/', {
        params: { q: debouncedQuery, limit: 6 },
        signal: controller.signal,
      })
      .then((res) => {
        const data = res.data || {};
        setSuggestions({
          queries: data.queries || [],
          categories: data.categories || [],
          products: data.products || [],
        });
        setActiveIndex(-1);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          setSuggestions({ queries: [], categories: [], products: [] });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDropdownLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  // ─── вычисляем плоский список элементов для навигации стрелками ────────────

  const flatItems = useCallback(() => {
    if (searchInput.length < 2) {
      return history.map((q) => ({ type: 'history', value: q }));
    }
    const qs = (suggestions.queries || []).map((q) => ({ type: 'query', value: q }));
    const cats = (suggestions.categories || []).map((c) => ({ type: 'category', ...c }));
    const prods = (suggestions.products || []).map((p) => ({ type: 'product', ...p }));
    return [...qs, ...cats, ...prods];
  }, [searchInput, suggestions, history]);

  // ─── обработчик ввода ──────────────────────────────────────────────────────

  const handleInputChange = (e) => {
    setSearchInput(e.target.value);
    setDropdownOpen(true);
    setActiveIndex(-1);
    if (e.target.value.length < 2) {
      setHistory(getSearchHistory());
    }
  };

  const handleInputFocus = () => {
    if (dropdownOpen) return;
    setHistory(getSearchHistory());
    setDropdownOpen(true);
    setActiveIndex(-1);
  };

  // ─── блокировка скролла страницы когда поиск активен ─────────────────────

  useEffect(() => {
    if (mobileSearchActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileSearchActive]);

  // ─── мобильный фокус — активируем полноэкранный режим ─────────────────────

  const handleMobileFocus = () => {
    if (mobileSearchActive) return;
    setMobileSearchActive(true);
    setHistory(getSearchHistory());
    setDropdownOpen(true);
    setActiveIndex(-1);
  };

  const handleMobileCancel = () => {
    setMobileSearchActive(false);
    setDropdownOpen(false);
    setActiveIndex(-1);
    mobileInputRef.current?.blur();
  };

  // ─── навигация стрелками в дропдауне ───────────────────────────────────────

  const handleKeyDown = (e) => {
    const items = flatItems();

    if (e.key === 'Escape') {
      setDropdownOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!dropdownOpen || items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => {
        if (i <= 0) {
          // возвращаемся в поле ввода — снимаем выделение
          return -1;
        }
        return i - 1;
      });
      return;
    }

    if (e.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
      e.preventDefault();
      handleItemSelect(items[activeIndex]);
    }
  };

  // ─── выбор элемента дропдауна ──────────────────────────────────────────────

  const handleItemSelect = (item) => {
    setDropdownOpen(false);
    setActiveIndex(-1);

    if (item.type === 'history' || item.type === 'query') {
      setSearchInput(item.value);
      pushSearchHistory(item.value);
      navigate(`/marketplace/search?q=${encodeURIComponent(item.value)}`);
      return;
    }

    if (item.type === 'category') {
      pushSearchHistory(item.name);
      navigate(`/marketplace/categories/${item.id}/products/`);
      return;
    }

    if (item.type === 'product') {
      navigate(`/marketplace/products/${item.product_id}`);
    }
  };

  const handleHistoryRemove = (query, e) => {
    e.stopPropagation();
    removeHistoryItem(query);
    setHistory(getSearchHistory());
  };

  // ─── сабмит формы ──────────────────────────────────────────────────────────

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchInput?.trim() || '';
    if (q) {
      pushSearchHistory(q);
      navigate(`/marketplace/search?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/marketplace/search');
    }
  };

  // ─── очистка поля ──────────────────────────────────────────────────────────

  const handleClear = () => {
    setSearchInput('');
    setSuggestions({ categories: [], products: [] });
    setActiveIndex(-1);
    // На мобильном оставляем дропдаун открытым (показываем историю)
    if (mobileSearchActive) {
      setHistory(getSearchHistory());
      setDropdownOpen(true);
    } else {
      setDropdownOpen(false);
    }
    (inputRef.current || mobileInputRef.current)?.focus();
  };

  // ─── проверяем есть ли что показать в дропдауне ────────────────────────────

  const hasDropdownContent =
    dropdownLoading ||
    (searchInput.length < 2 && history.length > 0) ||
    suggestions.queries.length > 0 ||
    suggestions.categories.length > 0 ||
    suggestions.products.length > 0;

  const showDropdown = dropdownOpen && hasDropdownContent;

  // ─── shared SearchBox ───────────────────────────────────────────────────────

  const renderSearchBox = (inputClassName, buttonClassName, formClassName, ref) => (
    <div ref={dropdownRef} className={styles.searchWrapper}>
      <form
        className={formClassName}
        role="search"
        onSubmit={handleSearchSubmit}
        autoComplete="off"
      >
        <input
          ref={ref}
          className={inputClassName}
          type="text"
          placeholder="Поиск товаров"
          aria-label="Поиск"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          value={searchInput}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
        />

        {/* Кнопка очистки × */}
        {searchInput.length > 0 && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="Очистить поиск"
            tabIndex={-1}
          >
            ×
          </button>
        )}

        <button className={buttonClassName} type="submit" aria-label="Найти">
          <i className="fas fa-search" />
        </button>
      </form>

      {showDropdown && (
        <SearchDropdown
          query={searchInput}
          loading={dropdownLoading}
          history={history}
          queries={suggestions.queries}
          categories={suggestions.categories}
          products={suggestions.products}
          activeIndex={activeIndex}
          onSelect={handleItemSelect}
          onHistoryRemove={handleHistoryRemove}
        />
      )}
    </div>
  );

  return (
  <>
    <header
      ref={headerRef}
      className={`${styles.header} ${styles.scrolled} ${mobileSearchActive ? styles.mobileSearchActive : ''}`}
    >
      {/* Mobile city bar */}
      <div className={`${styles.mobileCityBar} ${!isVisible ? styles.hidden : ''}`}>
        <button
          className={styles.mobileCityButton}
          onClick={() => {
            const wrapper = citySelectorRef.current;
            if (wrapper) {
              const btn = wrapper.querySelector('button');
              if (btn) btn.click();
            }
          }}
        >
          <span className={styles.mobileCityText}>
            {selectedCity ? selectedCity.name : 'Выберите город'}
          </span>
          <i className="fas fa-chevron-down" />
        </button>
        <div className={styles.mobileCitySelectorWrapper} ref={citySelectorRef}>
          <CitySelector selectedCity={selectedCity} onSelectCity={setSelectedCity} />
        </div>
      </div>

      <nav className={styles.navbar}>
        <div className={styles.container}>
          {/* Desktop layout */}
          <div className={styles.desktopLayout}>
            <Link to="/" className={styles.brand}>
              <img src={logoIcon} alt="A" className={styles.logoIcon} />
              <span>xione</span>
            </Link>

            <div className={styles.navbarCollapse}>
              <ul className={styles.navbarNav}>
                <li className={styles.navItem}>
                  <Link to="/business-categories" className={styles.navLink}>Категории</Link>
                </li>
                <li className={styles.navItem}>
                  <Link to="/sites" className={styles.navLink}>Магазины</Link>
                </li>
              </ul>

              {renderSearchBox(
                styles.searchInput,
                styles.searchButton,
                styles.searchForm,
                inputRef,
              )}

              <ul className={styles.navbarNav}>
                <li className={styles.navItem}>
                  <CartButton className={styles.navLink} />
                </li>
                <li className={styles.navItem}>
                  <Link to="/account" className={styles.navLink}>
                    <i className="fas fa-user" /> Аккаунт
                  </Link>
                </li>
                <li className={styles.navItem}>
                  <CitySelector selectedCity={selectedCity} onSelectCity={setSelectedCity} />
                </li>
                <li className={styles.navItem}><ThemeToggle /></li>
                <li className={styles.navItem}><SnowfallToggle /></li>
              </ul>
            </div>
          </div>

          {/* Mobile layout */}
          <div
            className={`${styles.mobileLayout} ${mobileSearchActive ? styles.mobileSearchActive : ''}`}
          >
            {/* Логотип и кнопка «Назад» всегда в DOM — анимируются через CSS */}
            <Link
              to="/"
              className={`${styles.mobileBrand} ${!isVisible ? styles.hidden : ''}`}
              tabIndex={mobileSearchActive ? -1 : 0}
              aria-hidden={mobileSearchActive}
            >
              <img src={logoIcon} alt="A" className={styles.logoIcon} />
              <span>xione</span>
            </Link>

            <button
              type="button"
              className={styles.mobileBackButton}
              onClick={handleMobileCancel}
              aria-label="Отмена поиска"
              tabIndex={mobileSearchActive ? 0 : -1}
            >
              <i className="fas fa-arrow-left" />
            </button>

            {/* Мобильная поисковая форма + полноэкранный дропдаун */}
            <div ref={mobileDropdownRef} className={styles.mobileSearchWrapper}>
              <form
                className={`${styles.mobileSearchForm} ${!isVisible ? styles.scrolled : ''}`}
                role="search"
                onSubmit={handleSearchSubmit}
                autoComplete="off"
              >
                <input
                  ref={mobileInputRef}
                  className={styles.mobileSearchInput}
                  type="text"
                  placeholder="Поиск товаров"
                  aria-label="Поиск"
                  aria-autocomplete="list"
                  aria-expanded={showDropdown}
                  value={searchInput}
                  onChange={handleInputChange}
                  onFocus={handleMobileFocus}
                  onKeyDown={handleKeyDown}
                />

                {searchInput.length > 0 && (
                  <button
                    type="button"
                    className={styles.clearButton}
                    onClick={handleClear}
                    aria-label="Очистить поиск"
                    tabIndex={-1}
                  >
                    ×
                  </button>
                )}

                <button
                  className={styles.mobileSearchButton}
                  type="submit"
                  aria-label="Найти"
                >
                  <i className="fas fa-search" />
                </button>
              </form>

              {/* Шторка рендерится через portal в document.body (см. ниже) */}
            </div>
          </div>
        </div>
      </nav>
    </header>

    {/* Portal: шторка и затемнение рендерятся в document.body,
        чтобы обойти stacking context шапки (backdrop-filter) */}
    {mobileSearchActive && createPortal(
      <>
        <div
          className={styles.mobileSearchBackdrop}
          onPointerDown={handleMobileCancel}
          aria-hidden="true"
        />
        <SearchDropdown
          query={searchInput}
          loading={dropdownLoading}
          history={history}
          categories={suggestions.categories}
          products={suggestions.products}
          activeIndex={activeIndex}
          queries={suggestions.queries}
          onSelect={(item) => {
            handleMobileCancel();
            handleItemSelect(item);
          }}
          onHistoryRemove={handleHistoryRemove}
          mobile
          mobileTop={headerHeight + 8}
        />
      </>,
      document.body,
    )}
  </>
  );
}

export default Header;
