import React, { useState, useEffect } from 'react';
import { FaGift } from 'react-icons/fa';
import styles from './BonusPanel.module.css';

/**
 * Переиспользуемая бонусная панель.
 *
 * Props:
 *   customer        — { balance, tier, recent_transactions }
 *   bonusSettings   — объект из /bonus-settings/ (is_enabled, bonus_percent, is_fixed_percent, ...)
 *   totalAmount     — число (для расчёта прогноза начисления)
 *   onChange        — коллбэк({ bonus_redemption_percent, bonus_redemption_amount,
 *                                bonus_accrual_mode, bonus_percent_override })
 */
function BonusPanel({ customer, bonusSettings, totalAmount = 0, onChange }) {
  const [bonusAccrualMode, setBonusAccrualMode] = useState('tier');
  const [bonusPercentOverride, setBonusPercentOverride] = useState(null);
  const [showBonusRedemption, setShowBonusRedemption] = useState(false);
  const [bonusRedemptionType, setBonusRedemptionType] = useState('percent');
  const [bonusRedemptionPercent, setBonusRedemptionPercent] = useState(0);
  const [bonusRedemptionAmount, setBonusRedemptionAmount] = useState(0);

  useEffect(() => {
    if (!onChange) return;

    // Вычисляем прогноз начисления прямо здесь чтобы передать наружу
    let prediction = null;
    if (bonusSettings && totalAmount >= parseFloat(bonusSettings.min_purchase_amount || 0)) {
      let pct = 0;
      if (bonusAccrualMode === 'none') {
        pct = 0;
      } else if (bonusSettings.is_fixed_percent && bonusPercentOverride === null) {
        pct = parseFloat(bonusSettings.bonus_percent || 0);
      } else if (bonusPercentOverride !== null) {
        pct = parseFloat(bonusPercentOverride);
      } else if (bonusAccrualMode === 'tier' && customer?.tier?.bonus_percent) {
        pct = parseFloat(customer.tier.bonus_percent);
      } else {
        pct = parseFloat(bonusSettings.bonus_percent || 0);
      }
      let acc = totalAmount * pct / 100;
      if (bonusSettings.max_bonus_percent) acc = Math.min(acc, totalAmount * parseFloat(bonusSettings.max_bonus_percent) / 100);
      if (bonusSettings.max_bonus_amount) acc = Math.min(acc, parseFloat(bonusSettings.max_bonus_amount));
      prediction = Math.max(0, Math.round(acc));
    }

    onChange({
      bonus_accrual_mode: bonusAccrualMode,
      bonus_percent_override: bonusPercentOverride,
      bonus_redemption_percent:
        showBonusRedemption && bonusRedemptionType === 'percent' && bonusRedemptionPercent > 0
          ? bonusRedemptionPercent
          : null,
      bonus_redemption_amount:
        showBonusRedemption && bonusRedemptionType === 'amount' && bonusRedemptionAmount > 0
          ? bonusRedemptionAmount
          : null,
      bonus_accrued_prediction: prediction,
    });
  }, [
    bonusAccrualMode,
    bonusPercentOverride,
    showBonusRedemption,
    bonusRedemptionType,
    bonusRedemptionPercent,
    bonusRedemptionAmount,
    bonusSettings,
    totalAmount,
    customer,
    onChange,
  ]);

  if (!customer || !bonusSettings || !bonusSettings.is_enabled) return null;

  const balance = parseFloat(customer.balance || 0);

  const calculateBonusPrediction = () => {
    if (bonusAccrualMode === 'none') return 0;
    if (totalAmount < parseFloat(bonusSettings.min_purchase_amount || 0)) return null;

    let bonusPercent = 0;
    if (bonusSettings.is_fixed_percent && bonusPercentOverride === null) {
      bonusPercent = parseFloat(bonusSettings.bonus_percent || 0);
    } else if (bonusPercentOverride !== null) {
      bonusPercent = parseFloat(bonusPercentOverride);
    } else if (bonusAccrualMode === 'tier' && customer.tier?.bonus_percent) {
      bonusPercent = parseFloat(customer.tier.bonus_percent);
    } else {
      bonusPercent = parseFloat(bonusSettings.bonus_percent || 0);
    }

    let accrual = totalAmount * bonusPercent / 100;
    if (bonusSettings.max_bonus_percent) {
      accrual = Math.min(accrual, totalAmount * parseFloat(bonusSettings.max_bonus_percent) / 100);
    }
    if (bonusSettings.max_bonus_amount) {
      accrual = Math.min(accrual, parseFloat(bonusSettings.max_bonus_amount));
    }
    return Math.max(0, Math.round(accrual));
  };

  const getBonusPercentToUse = () => {
    if (bonusAccrualMode === 'none') return 0;
    if (bonusSettings.is_fixed_percent && bonusPercentOverride === null) {
      return parseFloat(bonusSettings.bonus_percent || 0);
    }
    if (bonusPercentOverride !== null) return bonusPercentOverride;
    if (bonusAccrualMode === 'tier' && customer.tier?.bonus_percent) {
      return parseFloat(customer.tier.bonus_percent);
    }
    return parseFloat(bonusSettings.bonus_percent || 0);
  };

  const bonusPrediction = calculateBonusPrediction();
  const bonusPercentToUse = getBonusPercentToUse();

  return (
    <div className={styles.bonusSection}>
      <div className={styles.bonusSectionHeader}>
        <h5><FaGift /> Бонусы</h5>
      </div>

      {/* Баланс и уровень */}
      <div className={styles.bonusInfo}>
        <div className={styles.bonusBalanceDisplay}>
          <div className={styles.bonusBalanceLabel}>Текущий баланс:</div>
          <div className={styles.bonusBalanceValue}>
            {balance.toFixed(2)} баллов
            <span className={styles.bonusBalanceHint}> (1 балл = 1 ₸)</span>
          </div>
        </div>
        {customer.tier && (
          <div className={styles.bonusTierDisplay}>
            <div className={styles.bonusTierLabel}>Уровень:</div>
            <div className={styles.bonusTierValue}>
              {customer.tier.name} ({customer.tier.bonus_percent}%)
            </div>
          </div>
        )}
      </div>

      {/* Режим начисления */}
      <div className={styles.bonusAccrualModeSelector}>
        <label>Способ начисления бонусов:</label>
        <div className={styles.bonusAccrualModeOptions}>
          <label className={styles.bonusModeOption}>
            <input
              type="radio"
              name="bonusAccrualMode"
              value="tier"
              checked={bonusAccrualMode === 'tier'}
              onChange={() => { setBonusAccrualMode('tier'); setBonusPercentOverride(null); }}
              disabled={!customer.tier || bonusSettings.is_fixed_percent}
            />
            <span>
              По уровню ({customer.tier?.bonus_percent || bonusSettings.bonus_percent}%)
            </span>
          </label>
          <label className={styles.bonusModeOption}>
            <input
              type="radio"
              name="bonusAccrualMode"
              value="settings"
              checked={bonusAccrualMode === 'settings'}
              onChange={() => { setBonusAccrualMode('settings'); setBonusPercentOverride(null); }}
              disabled={bonusSettings.is_fixed_percent}
            />
            <span>По общим настройкам ({bonusSettings.bonus_percent}%)</span>
          </label>
          <label className={styles.bonusModeOption}>
            <input
              type="radio"
              name="bonusAccrualMode"
              value="none"
              checked={bonusAccrualMode === 'none'}
              onChange={() => { setBonusAccrualMode('none'); setBonusPercentOverride(null); }}
            />
            <span className={styles.bonusModeNone}>Не начислять</span>
          </label>
        </div>
        {bonusSettings.is_fixed_percent && bonusAccrualMode !== 'none' && (
          <div className={styles.bonusModeHint}>
            Процент фиксированный, режим выбран автоматически
          </div>
        )}
      </div>

      {/* История транзакций */}
      {customer.recent_transactions && customer.recent_transactions.length > 0 && (
        <div className={styles.bonusHistory}>
          <div className={styles.bonusHistoryTitle}>Последние транзакции:</div>
          <div className={styles.bonusHistoryList}>
            {customer.recent_transactions.slice(0, 5).map((t) => (
              <div key={t.id} className={styles.bonusHistoryItem}>
                <div className={styles.bonusHistoryType}>
                  {t.type === 'accrual' ? 'Начисление' : 'Списание'}
                </div>
                <div className={`${styles.bonusHistoryAmount} ${
                  parseFloat(t.amount) >= 0 ? styles.positive : styles.negative
                }`}>
                  {parseFloat(t.amount) >= 0 ? '+' : ''}
                  {parseFloat(t.amount).toFixed(2)}
                </div>
                <div className={styles.bonusHistoryDate}>
                  {new Date(t.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Прогноз начисления */}
      {bonusPrediction !== null && bonusPrediction > 0 && (
        <div className={styles.bonusPredictionCard}>
          <div className={styles.bonusPredictionLabel}>После этой покупки:</div>
          <div className={styles.bonusPredictionValue}>+{bonusPrediction} баллов</div>
          <div className={styles.bonusPredictionHint}>(≈ {bonusPrediction} ₸)</div>
          <div className={styles.bonusPercentInfo}>
            Процент начисления: {parseFloat(bonusPercentToUse).toFixed(2)}%
          </div>
        </div>
      )}

      {/* Ручной процент */}
      {!bonusSettings.is_fixed_percent && bonusAccrualMode !== 'none' && (
        <div className={styles.bonusAccrualControl}>
          <label>Или укажите процент вручную (%):</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={bonusPercentOverride !== null ? bonusPercentOverride : ''}
            onChange={(e) =>
              setBonusPercentOverride(e.target.value ? parseFloat(e.target.value) : null)
            }
            placeholder={
              bonusAccrualMode === 'tier' && customer.tier?.bonus_percent
                ? customer.tier.bonus_percent
                : bonusSettings.bonus_percent || '5.00'
            }
            className={styles.bonusPercentInput}
          />
        </div>
      )}

      {/* Кнопка списания */}
      {balance > 0 && (
        <div className={styles.bonusRedemptionButtonWrapper}>
          <button
            type="button"
            onClick={() => setShowBonusRedemption((v) => !v)}
            className={`${styles.bonusRedemptionToggleButton} ${
              showBonusRedemption ? styles.active : ''
            }`}
          >
            <FaGift />{' '}
            {showBonusRedemption ? 'Скрыть списание бонусов' : 'Списать бонусы'}
          </button>

          {showBonusRedemption && (
            <div className={styles.bonusRedemptionControl}>
              <label className={styles.bonusRedemptionLabel}>Списать бонусы:</label>
              <div className={styles.bonusRedemptionType}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    value="percent"
                    checked={bonusRedemptionType === 'percent'}
                    onChange={() => { setBonusRedemptionType('percent'); setBonusRedemptionAmount(0); }}
                  />
                  <span>Процент от баланса</span>
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    value="amount"
                    checked={bonusRedemptionType === 'amount'}
                    onChange={() => { setBonusRedemptionType('amount'); setBonusRedemptionPercent(0); }}
                  />
                  <span>Фиксированная сумма</span>
                </label>
              </div>

              {bonusRedemptionType === 'percent' ? (
                <div className={styles.bonusRedemptionInputWrapper}>
                  <div className={styles.bonusRedemptionInput}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={bonusRedemptionPercent || ''}
                      onChange={(e) => {
                        const v = e.target.value ? parseFloat(e.target.value) : 0;
                        setBonusRedemptionPercent(Math.min(100, Math.max(0, v)));
                      }}
                      placeholder="0"
                      className={bonusRedemptionPercent > 0 ? styles.hasValue : ''}
                    />
                    <span className={styles.inputSuffix}>%</span>
                  </div>
                  {bonusRedemptionPercent > 0 && (
                    <div className={styles.bonusRedemptionPreview}>
                      Будет списано:{' '}
                      <span className={styles.bonusRedemptionPreviewValue}>
                        {Math.round(balance * bonusRedemptionPercent / 100)} баллов
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.bonusRedemptionInputWrapper}>
                  <div className={styles.bonusRedemptionInput}>
                    <input
                      type="number"
                      min="0"
                      max={balance}
                      step="0.01"
                      value={bonusRedemptionAmount || ''}
                      onChange={(e) => {
                        const v = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setBonusRedemptionAmount(isNaN(v) ? 0 : Math.max(0, v));
                      }}
                      placeholder="0.00"
                      className={`${bonusRedemptionAmount > 0 ? styles.hasValue : ''} ${
                        bonusRedemptionAmount > balance ? styles.inputError : ''
                      }`}
                    />
                    <span className={styles.inputSuffix}>баллов</span>
                  </div>
                  {bonusRedemptionAmount > 0 && (
                    <div className={`${styles.bonusRedemptionPreview} ${
                      bonusRedemptionAmount > balance ? styles.bonusRedemptionPreviewError : ''
                    }`}>
                      Будет списано:{' '}
                      <span className={styles.bonusRedemptionPreviewValue}>
                        {bonusRedemptionAmount.toFixed(2)} баллов
                      </span>
                      {bonusRedemptionAmount > balance && (
                        <span className={styles.bonusRedemptionError}>
                          ⚠ Недостаточно бонусов
                        </span>
                      )}
                    </div>
                  )}
                  <div className={styles.bonusRedemptionHint}>
                    Доступно: <strong>{balance.toFixed(2)} баллов</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BonusPanel;
