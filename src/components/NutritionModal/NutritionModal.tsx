import React from 'react';
import styles from './NutritionModal.module.scss';
import { DailyNutrition, MealNutrition, DAILY_TARGETS, calculatePercentage, formatNutritionValue, getNutritionStatus } from '@/lib/nutritionUtils';

interface NutritionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayName: string;
  total: DailyNutrition;
  meals: MealNutrition[];
}

const NutritionModal: React.FC<NutritionModalProps> = ({ isOpen, onClose, dayName, total, meals }) => {
  if (!isOpen) return null;

  const nutritionItems = [
    { label: 'Calories', value: total.calories, target: DAILY_TARGETS.calories, unit: ' kcal' },
    { label: 'Protein', value: total.protein, target: DAILY_TARGETS.protein, unit: 'g' },
    { label: 'Carbs', value: total.carbs, target: DAILY_TARGETS.carbs, unit: 'g' },
    { label: 'Fat', value: total.fat, target: DAILY_TARGETS.fat, unit: 'g' },
    { label: 'Fiber', value: total.fiber, target: DAILY_TARGETS.fiber, unit: 'g' },
    { label: 'Sodium', value: total.sodium, target: DAILY_TARGETS.sodium, unit: 'mg' },
  ];

  const mealTypeLabels = {
    breakfast: '🍳 Colazione',
    lunch: '🍝 Pranzo',
    dinner: '🍖 Cena',
  };

  // Sort meals by meal type: breakfast, lunch, dinner
  const mealOrder = { breakfast: 0, lunch: 1, dinner: 2 };
  const sortedMeals = [...meals].sort((a, b) => mealOrder[a.mealType] - mealOrder[b.mealType]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>
            <i className="bi bi-heart-pulse"></i>
            Nutrizione - {dayName}
          </h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className={styles.content}>
          {sortedMeals.length === 0 ? (
            <div className={styles.noData}>
              <i className="bi bi-info-circle"></i>
              <p>Nessun dato nutrizionale disponibile per le ricette di oggi.</p>
            </div>
          ) : (
            <>
              <div className={styles.summary}>
                <h4>Totale Giornaliero</h4>
                <div className={styles.nutritionGrid}>
                  {nutritionItems.map((item) => {
                    const percentage = calculatePercentage(item.value, item.target);
                    const status = getNutritionStatus(percentage);
                    
                    return (
                      <div key={item.label} className={styles.nutritionItem}>
                        <div className={styles.nutritionLabel}>{item.label}</div>
                        <div className={styles.nutritionValue}>
                          {formatNutritionValue(item.value, item.unit)}
                          <span className={styles.target}>/ {formatNutritionValue(item.target, item.unit)}</span>
                        </div>
                        <div className={styles.progressBar}>
                          <div 
                            className={`${styles.progressFill} ${styles[status]}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                        <div className={styles.percentage}>{percentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {sortedMeals.length > 0 && (
                <div className={styles.meals}>
                  <h4>Dettaglio Pasti</h4>
                  {sortedMeals.map((meal, index) => (
                    <div key={index} className={styles.meal}>
                      <div className={styles.mealHeader}>
                        <span className={styles.mealType}>{mealTypeLabels[meal.mealType]}</span>
                        <span className={styles.mealName}>{meal.recipeName}</span>
                      </div>
                      <div className={styles.mealNutrition}>
                        <span>{formatNutritionValue(meal.nutrition.calories, ' kcal')}</span>
                        <span>{formatNutritionValue(meal.nutrition.protein, 'g')} proteine</span>
                        <span>{formatNutritionValue(meal.nutrition.carbs, 'g')} carb</span>
                        <span>{formatNutritionValue(meal.nutrition.fat, 'g')} grassi</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NutritionModal;
