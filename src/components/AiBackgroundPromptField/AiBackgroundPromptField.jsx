import { useCallback, useEffect, useState } from 'react';
import { FaChevronDown, FaChevronUp, FaPlus, FaTrash } from 'react-icons/fa';
import axios from '../../api/axiosDefault.js';
import styles from './AiBackgroundPromptField.module.css';

const SAVED_MAX = 5;

/**
 * Поле описания фона ИИ + сохранённые промпты (до 5 на бизнес).
 *
 * @param {string} textareaId
 * @param {string} businessSlug
 * @param {string} value
 * @param {(next: string) => void} onValueChange
 * @param {boolean} disabled
 * @param {number} maxLength
 * @param {import('react').ReactNode} [hint] — блок подсказки под полем (своими стилями страницы)
 */
function AiBackgroundPromptField({
  textareaId,
  businessSlug,
  value,
  onValueChange,
  disabled,
  maxLength,
  hint,
}) {
  const [saved, setSaved] = useState([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  const apiBase = businessSlug
    ? `/api/business/${businessSlug}/ai/saved-background-prompts/`
    : null;

  const loadSaved = useCallback(async () => {
    if (!apiBase) return;
    setListLoading(true);
    try {
      const res = await axios.get(apiBase);
      const rows = Array.isArray(res.data?.results) ? res.data.results : [];
      setSaved(rows);
    } catch {
      setSaved([]);
    } finally {
      setListLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const trimmed = value.trim();
  const atLimit = saved.length >= SAVED_MAX;
  const canSave =
    Boolean(apiBase) &&
    !disabled &&
    trimmed.length > 0 &&
    trimmed.length <= maxLength &&
    !atLimit;

  const handleSaveClick = async () => {
    if (!canSave || !apiBase) return;
    try {
      await axios.post(apiBase, { text: trimmed });
      await loadSaved();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Не удалось сохранить промпт';
      alert(typeof msg === 'string' ? msg : 'Не удалось сохранить промпт');
    }
  };

  const handlePick = (text) => {
    onValueChange(text);
    setSavedOpen(false);
  };

  const handleDelete = async (id, textPreview) => {
    const ok = window.confirm(
      `Удалить сохранённый промпт из списка?\n\n«${textPreview.slice(0, 80)}${textPreview.length > 80 ? '…' : ''}»`
    );
    if (!ok || !apiBase) return;
    try {
      await axios.delete(`${apiBase}${id}/`);
      await loadSaved();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Не удалось удалить';
      alert(typeof msg === 'string' ? msg : 'Не удалось удалить');
    }
  };

  return (
    <div className={styles.promptBlock}>
      <div className={styles.promptShell}>
        <div className={styles.promptInner}>
          <div className={styles.promptHeaderRow}>
            <label htmlFor={textareaId} className={styles.promptLabel}>
              Описание фона *
            </label>
            <button
              type="button"
              className={styles.savePlusBtn}
              onClick={handleSaveClick}
              disabled={!canSave}
              title={
                atLimit
                  ? `Не более ${SAVED_MAX} сохранённых промптов`
                  : !trimmed
                    ? 'Сначала введите текст промпта'
                    : 'Сохранить промпт в список'
              }
              aria-label="Сохранить промпт в список"
            >
              <FaPlus aria-hidden />
            </button>
          </div>
          <textarea
            id={textareaId}
            className={styles.promptTextarea}
            rows={2}
            maxLength={maxLength}
            placeholder="Например: светло-серый фон, деревянная столешница…"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            disabled={disabled}
          />
          <div className={styles.promptMeta}>
            {apiBase ? (
              <span className={styles.savedLimitBadge} aria-live="polite">
                Сохранённых шаблонов: {saved.length} из {SAVED_MAX}
              </span>
            ) : null}
            <span className={styles.charCount}>
              {value.length}/{maxLength}
            </span>
          </div>
          {apiBase && atLimit ? (
            <p className={styles.limitReached} role="status">
              Лимит {SAVED_MAX} шаблонов. Удалите один в списке ниже, чтобы сохранить новый.
            </p>
          ) : null}
        </div>
      </div>

      {hint ? <div className={styles.hintSlot}>{hint}</div> : null}

      {apiBase ? (
        <>
          <button
            type="button"
            className={styles.savedToggle}
            onClick={() => setSavedOpen((v) => !v)}
            aria-expanded={savedOpen}
          >
            <span className={styles.savedToggleLabel}>
              Сохранённые промпты
              <span className={styles.savedCount}>
                ({saved.length}/{SAVED_MAX})
              </span>
            </span>
            {savedOpen ? (
              <FaChevronUp aria-hidden />
            ) : (
              <FaChevronDown aria-hidden />
            )}
          </button>
          {savedOpen ? (
            <div className={styles.savedPanel}>
              {listLoading ? (
                <p className={styles.savedEmpty}>Загрузка…</p>
              ) : saved.length === 0 ? (
                <p className={styles.savedEmpty}>
                  Пока нет сохранённых промптов. Можно сохранить до {SAVED_MAX}{' '}
                  шаблонов — введите текст и нажмите «+».
                </p>
              ) : (
                <ul className={styles.savedList}>
                  {saved.map((row) => (
                    <li key={row.id} className={styles.savedRow}>
                      <button
                        type="button"
                        className={styles.savedPick}
                        onClick={() => handlePick(row.text)}
                      >
                        {row.text}
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(row.id, row.text)}
                        aria-label="Удалить промпт"
                        title="Удалить"
                      >
                        <FaTrash aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default AiBackgroundPromptField;
