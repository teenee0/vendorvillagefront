/** Размер страницы для главной маркетплейса (должен совпадать с запросом к API). */
export const MAIN_PAGE_PRODUCTS_PAGE_SIZE = 8;

/** URL списка товаров главной с пагинацией (infinite scroll). */
export function buildMainPageProductsUrl(page = 1) {
  const params = new URLSearchParams({
    page_size: String(MAIN_PAGE_PRODUCTS_PAGE_SIZE),
    page: String(page),
    sort: '-created_at',
  });
  return `marketplace/api/products/?${params.toString()}`;
}

/** Первая страница (удобно для совместимости). */
export const MAIN_PAGE_PRODUCTS_URL = buildMainPageProductsUrl(1);
