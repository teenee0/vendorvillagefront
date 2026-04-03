import { useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from '../../api/axiosDefault.js';
import styles from './AiQuotaBar.module.css';

/** Ссылка для докупки запросов ИИ (Telegram). */
export const AI_REQUESTS_TELEGRAM_URL = 'https://t.me/teenee0';

const MONTHLY_LIMIT_HINT =
  'Лимит обновляется каждый месяц. Можно докупить дополнительные запросы через «Докупить».';

function BuyLink({ className }) {
  return (
    <a
      className={className}
      href={AI_REQUESTS_TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className={styles.plusIcon} aria-hidden>
        +
      </span>
      Докупить
    </a>
  );
}

function formatCreditDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function CreditsHistoryModal({
  open,
  onClose,
  loading,
  error,
  items,
  titleId,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={styles.modalRoot}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.modalDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.modalHeader}>
          <h2 id={titleId} className={styles.modalTitle}>
            История начислений
          </h2>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          {loading && (
            <p className={styles.modalMuted}>Загрузка…</p>
          )}
          {!loading && error && (
            <p className={styles.modalError}>{error}</p>
          )}
          {!loading && !error && items.length === 0 && (
            <p className={styles.modalMuted}>
              Пока нет записей о начислениях к лимиту.
            </p>
          )}
          {!loading && !error && items.length > 0 && (
            <ul className={styles.modalList}>
              {items.map((row) => (
                <li key={row.id} className={styles.modalListItem}>
                  <div className={styles.modalRowTop}>
                    <span className={styles.modalAmount}>+{row.amount}</span>
                    <span className={styles.modalDate}>
                      {formatCreditDate(row.created_at)}
                    </span>
                  </div>
                  <p className={styles.modalBy}>
                    {row.created_by_username
                      ? `Кто: ${row.created_by_username}`
                      : 'Кто: —'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function warnThresholdForLimit(limit) {
  if (!limit || limit <= 0) return 10;
  return Math.max(1, Math.min(10, Math.ceil(limit * 0.2)));
}

/**
 * Блок квоты ИИ в стиле карточки: остаток, прогресс, докупка.
 *
 * @param {boolean} loading
 * @param {boolean} [fetchFailed]
 * @param {{ remaining: number, limit: number } | null} quota
 * @param {number} [neededCount]
 * @param {boolean} [compact]
 * @param {string} [businessSlug] — для кнопки «История начислений»
 */
function AiQuotaBar({
  loading,
  fetchFailed,
  quota,
  neededCount,
  compact,
  businessSlug,
}) {
  const historyTitleId = useId();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);

  const openHistory = useCallback(() => {
    setHistoryOpen(true);
  }, []);

  const closeHistory = useCallback(() => {
    setHistoryOpen(false);
  }, []);

  useEffect(() => {
    if (!historyOpen || !businessSlug) return undefined;

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    axios
      .get(`/api/business/${businessSlug}/ai/quota-credits/`)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data?.results) ? res.data.results : [];
        setHistoryItems(list);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err.response?.data?.detail ||
          err.message ||
          'Не удалось загрузить историю';
        setHistoryError(typeof msg === 'string' ? msg : 'Ошибка загрузки');
        setHistoryItems([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [historyOpen, businessSlug]);

  const renewHint = !compact && (
    <p className={styles.hintLine}>
      Счётчик обновляется после каждого запроса к ИИ и при обновлении страницы.
    </p>
  );
  const increaseHint = !compact && (
    <p className={styles.hintLine}>
      Лимит на месяц можно увеличить — нажмите «Докупить».
    </p>
  );

  const historyButton =
    businessSlug && !compact ? (
      <button
        type="button"
        className={styles.historyBtn}
        onClick={openHistory}
      >
        Показать историю начислений
      </button>
    ) : null;

  const rootClass = [styles.block, compact && styles.compact].filter(Boolean).join(' ');

  if (loading) {
    return (
      <>
        <div className={rootClass} role="status" aria-live="polite">
          <div className={styles.header}>
            <div className={styles.aiIcon} aria-hidden>
              ✨
            </div>
            <span className={styles.title}>Запросы в нейросеть</span>
            <span className={styles.sub}>в этом месяце</span>
          </div>
          <div className={styles.stats}>
            <div className={styles.countRow}>
              <span className={styles.mutedLarge}>Загрузка…</span>
            </div>
          </div>
          <div className={styles.footer}>
            <div className={styles.infoText}>
              <span>Месячный лимит запросов</span>
              <span className={styles.tooltipIcon} title={MONTHLY_LIMIT_HINT}>
                ?
              </span>
            </div>
            <BuyLink className={styles.buyBtn} />
          </div>
          {historyButton ? (
            <div className={styles.historyRow}>{historyButton}</div>
          ) : null}
          {!compact && <div className={styles.hintsBelow}>{increaseHint}</div>}
        </div>
        <CreditsHistoryModal
          open={historyOpen}
          onClose={closeHistory}
          loading={historyLoading}
          error={historyError}
          items={historyItems}
          titleId={historyTitleId}
        />
      </>
    );
  }

  if (fetchFailed || !quota) {
    return (
      <>
        <div className={`${rootClass} ${styles.toneCritical}`} role="status">
          <div className={styles.header}>
            <div className={styles.aiIcon} aria-hidden>
              ✨
            </div>
            <span className={styles.title}>Запросы в нейросеть</span>
            <span className={styles.sub}>в этом месяце</span>
          </div>
          <p className={styles.warn}>
            Не удалось загрузить квоту ИИ. Проверьте вход в аккаунт и обновите страницу.
          </p>
          <div className={styles.footer}>
            <div className={styles.infoText}>
              <span>Месячный лимит запросов</span>
              <span className={styles.tooltipIcon} title={MONTHLY_LIMIT_HINT}>
                ?
              </span>
            </div>
            <BuyLink className={styles.buyBtn} />
          </div>
          {historyButton ? (
            <div className={styles.historyRow}>{historyButton}</div>
          ) : null}
          {!compact && <div className={styles.hintsBelow}>{increaseHint}</div>}
        </div>
        <CreditsHistoryModal
          open={historyOpen}
          onClose={closeHistory}
          loading={historyLoading}
          error={historyError}
          items={historyItems}
          titleId={historyTitleId}
        />
      </>
    );
  }

  const { remaining, limit } = quota;
  const notEnough =
    typeof neededCount === 'number' && neededCount > 0 && neededCount > remaining;
  const pct = limit > 0 ? Math.min(100, Math.round((remaining / limit) * 100)) : 0;

  let toneClass = styles.toneOk;
  let badgeText = 'Доступно';
  if (remaining === 0) {
    toneClass = styles.toneCritical;
    badgeText = 'Закончились';
  } else if (remaining <= warnThresholdForLimit(limit)) {
    toneClass = styles.toneWarning;
    badgeText = 'Мало осталось';
  }

  return (
    <>
      <div
        className={`${rootClass} ${toneClass}`}
        role="region"
        aria-label="Квота запросов к нейросети"
      >
        <div className={styles.header}>
          <div className={styles.aiIcon} aria-hidden>
            ✨
          </div>
          <span className={styles.title}>Запросы в нейросеть</span>
          <span className={styles.sub}>в этом месяце</span>
        </div>
        <div className={styles.stats}>
          <div className={styles.countRow}>
            <span className={styles.currentCount}>{remaining}</span>
            <span className={styles.maxCount}>/ {limit}</span>
          </div>
          <span className={styles.statusBadge}>{badgeText}</span>
        </div>
        <div className={styles.progressWrap}>
          <div
            className={styles.progressFill}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={remaining}
            aria-valuemin={0}
            aria-valuemax={limit}
          />
        </div>
        <div className={styles.footer}>
          <div className={styles.infoText}>
            <span>Осталось запросов в этом месяце</span>
            <span className={styles.tooltipIcon} title={MONTHLY_LIMIT_HINT}>
              ?
            </span>
          </div>
          <BuyLink className={styles.buyBtn} />
        </div>
        {historyButton ? (
          <div className={styles.historyRow}>{historyButton}</div>
        ) : null}
        {remaining === 0 && (
          <p className={styles.warnInline}>Лимит на этот месяц исчерпан.</p>
        )}
        {notEnough && remaining > 0 && (
          <p className={styles.warnInline}>
            Для этого действия нужно {neededCount} запр. (осталось {remaining})
          </p>
        )}
        {!compact && (
          <div className={styles.hintsBelow}>
            {increaseHint}
            {renewHint}
          </div>
        )}
      </div>
      <CreditsHistoryModal
        open={historyOpen}
        onClose={closeHistory}
        loading={historyLoading}
        error={historyError}
        items={historyItems}
        titleId={historyTitleId}
      />
    </>
  );
}

export default AiQuotaBar;
