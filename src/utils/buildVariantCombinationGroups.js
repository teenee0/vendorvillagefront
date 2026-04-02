/**
 * Группы комплектаций для карточки товара.
 * Если в API есть attributes_at_right — одна опция = полный набор значений (память + SIM и т.д.).
 * Иначе fallback: только атрибут «Размер» (старое поведение).
 */

function mergeLocationLists(a, b) {
  return [...(a || []), ...(b || [])];
}

function priceRangeFromLocations(locations) {
  if (!locations?.length) return { minPrice: 0, maxPrice: 0 };
  const prices = locations.map((loc) => parseFloat(loc.price));
  return {
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  };
}

function groupsFromRightSpecs(product, specs) {
  const attrIds = specs.map((s) => s.attribute_id);
  const groups = new Map();

  for (const variant of product.variants || []) {
    if (!variant.is_in_stock || !variant.locations?.length) continue;

    const valueById = {};
    for (const att of variant.attributes || []) {
      if (attrIds.includes(att.attribute_id)) {
        valueById[att.attribute_id] = att.display_value;
      }
    }
    if (attrIds.some((id) => valueById[id] == null || valueById[id] === '')) continue;

    const key = attrIds.map((id) => `${id}=${valueById[id]}`).join('|');
    const label = attrIds.map((id) => valueById[id]).join(' · ');

    if (!groups.has(key)) {
      const { minPrice, maxPrice } = priceRangeFromLocations(variant.locations);
      groups.set(key, {
        key,
        label,
        variant,
        locations: [...(variant.locations || [])],
        minPrice,
        maxPrice,
      });
    } else {
      const existing = groups.get(key);
      const locations = mergeLocationLists(existing.locations, variant.locations);
      const { minPrice, maxPrice } = priceRangeFromLocations(locations);
      groups.set(key, {
        ...existing,
        locations,
        minPrice,
        maxPrice,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'ru', { numeric: true })
  );
}

function legacySizeOnlyGroups(product) {
  const groups = new Map();

  for (const variant of product.variants || []) {
    const sizeAttr = variant.attributes?.find((attr) => attr.attribute_name === 'Размер');
    if (!sizeAttr || !variant.is_in_stock || !variant.locations?.length) continue;

    const sizeValue = sizeAttr.display_value;
    const key = `legacy-size:${sizeValue}`;

    if (!groups.has(key)) {
      const { minPrice, maxPrice } = priceRangeFromLocations(variant.locations);
      groups.set(key, {
        key,
        label: sizeValue,
        variant,
        locations: [...(variant.locations || [])],
        minPrice,
        maxPrice,
      });
    } else {
      const existing = groups.get(key);
      const locations = mergeLocationLists(existing.locations, variant.locations);
      const { minPrice, maxPrice } = priceRangeFromLocations(locations);
      let nextVariant = existing.variant;
      if (
        variant.locations.length > existing.variant.locations.length ||
        Math.min(...variant.locations.map((l) => parseFloat(l.price))) < existing.minPrice
      ) {
        nextVariant = variant;
      }
      groups.set(key, {
        key,
        label: sizeValue,
        variant: nextVariant,
        locations,
        minPrice,
        maxPrice,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aNum = parseFloat(a.label);
    const bNum = parseFloat(b.label);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    return a.label.localeCompare(b.label, 'ru', { numeric: true });
  });
}

/**
 * @param {object} product — объект product из ответа marketplace/api/products/:id/
 * @returns {Array<{ key: string, label: string, variant: object, locations: array, minPrice: number, maxPrice: number }>}
 */
export function buildVariantCombinationGroups(product) {
  if (!product) return [];
  const specs = product.attributes_at_right;
  if (specs?.length) {
    return groupsFromRightSpecs(product, specs);
  }
  return legacySizeOnlyGroups(product);
}

/**
 * Заголовок секции выбора комплектации.
 */
export function combinationSectionTitle(product) {
  const specs = product?.attributes_at_right;
  if (specs?.length) {
    return specs.map((s) => s.name).join(' · ');
  }
  return 'Размер';
}

/** Варианты в наличии со всеми атрибутами из specs заполнены */
function getEligibleVariantsForRightSpecs(product, specs) {
  const attrIds = specs.map((s) => s.attribute_id);
  return (product.variants || []).filter((v) => {
    if (!v.is_in_stock || !v.locations?.length) return false;
    for (const id of attrIds) {
      const att = v.attributes?.find((a) => a.attribute_id === id);
      if (!att || att.display_value == null || att.display_value === '') return false;
    }
    return true;
  });
}

/**
 * Допустимые значения для specs[specIndex] при уже выбранных предыдущих атрибутах.
 * @param {Record<number, string>} selection — attribute_id -> display_value
 */
export function getAvailableValuesAtSpecIndex(product, specs, specIndex, selection) {
  const attrIds = specs.map((s) => s.attribute_id);
  const variants = getEligibleVariantsForRightSpecs(product, specs);
  const filtered = variants.filter((v) => {
    for (let j = 0; j < specIndex; j++) {
      const id = attrIds[j];
      const want = selection[id];
      if (want == null || want === '') return false;
      const att = v.attributes?.find((a) => a.attribute_id === id);
      if (!att || att.display_value !== want) return false;
    }
    return true;
  });
  const values = new Set();
  for (const v of filtered) {
    const id = attrIds[specIndex];
    const att = v.attributes?.find((a) => a.attribute_id === id);
    if (att) values.add(att.display_value);
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
}

/**
 * Все значения для строки (порядок из API) + флаг «есть вариант в наличии».
 */
export function getOptionsForRightSpec(product, specs, specIndex, selection) {
  const available = new Set(
    getAvailableValuesAtSpecIndex(product, specs, specIndex, selection)
  );
  const spec = specs[specIndex];
  const catalog =
    spec.values && spec.values.length
      ? [...spec.values]
      : Array.from(available).sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
  const seen = new Set();
  const ordered = [];
  for (const v of catalog) {
    if (seen.has(v)) continue;
    seen.add(v);
    ordered.push(v);
  }
  const extras = Array.from(available)
    .filter((v) => !seen.has(v))
    .sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
  for (const v of extras) ordered.push(v);
  return ordered.map((value) => ({
    value,
    selectable: available.has(value),
  }));
}

/** Стартовый выбор: первое доступное значение на каждом шаге */
export function buildDefaultRightSelection(product, specs) {
  const selection = {};
  for (let i = 0; i < specs.length; i++) {
    const vals = getAvailableValuesAtSpecIndex(product, specs, i, selection);
    if (!vals.length) return selection;
    selection[specs[i].attribute_id] = vals[0];
  }
  return selection;
}

/** После выбора значения — сброс зависимых полей и автозаполнение следующих */
export function rightSelectionAfterPick(product, specs, selection, attributeId, value) {
  const idx = specs.findIndex((s) => s.attribute_id === attributeId);
  if (idx < 0) return { ...selection };
  const next = { ...selection, [attributeId]: value };
  for (let j = idx + 1; j < specs.length; j++) {
    delete next[specs[j].attribute_id];
  }
  for (let j = idx + 1; j < specs.length; j++) {
    const vals = getAvailableValuesAtSpecIndex(product, specs, j, next);
    if (!vals.length) break;
    next[specs[j].attribute_id] = vals[0];
  }
  return next;
}

/**
 * Сводка комплектации как у buildVariantCombinationGroups (locations, variant, цены).
 */
export function buildMergedGroupFromRightSelection(product, specs, selection) {
  const attrIds = specs.map((s) => s.attribute_id);
  if (!attrIds.every((id) => selection[id] != null && selection[id] !== '')) {
    return null;
  }
  const key = attrIds.map((id) => `${id}=${selection[id]}`).join('|');
  const label = attrIds.map((id) => selection[id]).join(' · ');

  let variant = null;
  let locations = [];
  for (const v of product.variants || []) {
    if (!v.is_in_stock || !v.locations?.length) continue;
    const valueById = {};
    for (const att of v.attributes || []) {
      if (attrIds.includes(att.attribute_id)) {
        valueById[att.attribute_id] = att.display_value;
      }
    }
    if (!attrIds.every((id) => valueById[id] === selection[id])) continue;
    if (!variant) variant = v;
    locations = mergeLocationLists(locations, v.locations);
  }
  if (!variant) return null;
  const { minPrice, maxPrice } = priceRangeFromLocations(locations);
  return {
    key,
    label,
    variant,
    locations,
    minPrice,
    maxPrice,
  };
}
