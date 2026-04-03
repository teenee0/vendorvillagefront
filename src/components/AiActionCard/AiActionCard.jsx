import styles from './AiActionCard.module.css';

/**
 * Кнопка действия ИИ в стиле карточки квоты (block + tone).
 *
 * @param {import('react').ReactNode} shellIcon — иконка в фиолетовом квадрате (например FaImage)
 * @param {import('react').ReactNode} children — текст на кнопке
 * @param {boolean} disabled
 * @param {() => void} onClick
 * @param {string | null} [prereqHint] — подсказка под кнопкой (нет фото, категория, лимит…)
 * @param {'ready' | 'waiting' | 'busy' | 'quota'} visualState
 * @param {import('react').ReactNode} [leadingIcon] — маленькая иконка слева на кнопке
 */
function AiActionCard({
  shellIcon,
  leadingIcon,
  children,
  disabled,
  onClick,
  prereqHint,
  visualState,
  type = 'button',
}) {
  const cardClass = [
    styles.card,
    visualState === 'ready' && styles.cardReady,
    visualState === 'waiting' && styles.cardWaiting,
    visualState === 'busy' && styles.cardBusy,
    visualState === 'quota' && styles.cardQuota,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClass}>
      <div className={styles.shellIcon} aria-hidden>
        {shellIcon}
      </div>
      <div className={styles.main}>
        <button
          type={type}
          className={styles.actionBtn}
          disabled={disabled}
          onClick={onClick}
        >
          {leadingIcon ? (
            <span className={styles.btnIcon}>{leadingIcon}</span>
          ) : null}
          {children}
        </button>
        {prereqHint ? <p className={styles.prereq}>{prereqHint}</p> : null}
      </div>
    </div>
  );
}

export default AiActionCard;
