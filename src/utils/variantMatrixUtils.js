/**
 * Матрица вариантов: атрибуты show_attribute_at_right vs остальные.
 */

export function splitBaseAndRightAttrs(categoryAttributes) {
  const list = categoryAttributes || [];
  const base = list.filter((a) => !a.show_attribute_at_right);
  const right = list.filter((a) => a.show_attribute_at_right);
  return { baseAttrs: base, rightAttrs: right };
}

export function emptyValuesMapForAttrs(attrs) {
  return attrs.reduce((acc, attr) => {
    acc[String(attr.id)] = attr.has_predefined_values
      ? (attr.allow_multiple ? [] : '')
      : '';
    return acc;
  }, {});
}

/** Декартово произведение значений для атрибутов «справа» с предустановками. */
export function cartesianRightCombinations(rightAttrs) {
  const axes = rightAttrs.map((attr) =>
    (attr.values || []).map((v) => ({
      attrId: attr.id,
      valueId: String(v.id),
    }))
  );
  if (axes.length === 0 || axes.some((a) => a.length === 0)) return [];
  return axes.reduce((acc, axis) => {
    if (acc.length === 0) return axis.map((x) => [x]);
    const next = [];
    for (const row of acc) {
      for (const x of axis) next.push([...row, x]);
    }
    return next;
  }, []);
}

export function cartesianProductSize(rightAttrsPredefined) {
  return rightAttrsPredefined.reduce((n, a) => n * (a.values || []).length, 1) || 0;
}

/** Выбранные id значений по category_attribute id (строки). */
export function defaultSelectedRightPredefinedIds(rightAttrsPredefined) {
  const m = {};
  rightAttrsPredefined.forEach((a) => {
    m[String(a.id)] = (a.values || []).map((v) => String(v.id));
  });
  return m;
}

export function cartesianProductSizeFromSelection(rightAttrsPredefined, selectedValueIdsByAttrId) {
  if (!rightAttrsPredefined.length) return 0;
  let n = 1;
  for (const attr of rightAttrsPredefined) {
    const ids = selectedValueIdsByAttrId[String(attr.id)];
    const len = Array.isArray(ids) ? ids.length : 0;
    if (len === 0) return 0;
    n *= len;
  }
  return n;
}

/** Декартово произведение только по отмеченным значениям каждого атрибута «справа». */
export function cartesianRightCombinationsFromSelection(rightAttrsPredefined, selectedValueIdsByAttrId) {
  const axes = rightAttrsPredefined.map((attr) => {
    const ids = selectedValueIdsByAttrId[String(attr.id)];
    if (!ids || !ids.length) return [];
    return ids.map((valueId) => ({
      attrId: attr.id,
      valueId: String(valueId),
    }));
  });
  if (axes.length === 0 || axes.some((a) => a.length === 0)) return [];
  return axes.reduce((acc, axis) => {
    if (acc.length === 0) return axis.map((x) => [x]);
    const next = [];
    for (const row of acc) {
      for (const x of axis) next.push([...row, x]);
    }
    return next;
  }, []);
}
