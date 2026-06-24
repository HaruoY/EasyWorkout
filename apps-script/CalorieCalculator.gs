/**
 * CalorieCalculator.gs
 *
 * Stessa logica della versione Node (vedi backend/src/utils/calorieCalculator.ts):
 * - Harris-Benedict (revisione 1984)
 * - Mifflin-St Jeor (1990)
 */

var ACTIVITY_MULTIPLIERS_ = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

var GOAL_ADJUSTMENT_ = {
  lose: -500,
  maintain: 0,
  gain: 400,
};

function calculateBMR_(formula, sex, weightKg, heightCm, age) {
  if (formula === 'harris_benedict') {
    return sex === 'male'
      ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age
      : 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.330 * age;
  }
  var base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

function calculateAge_(birthDateIso) {
  var birth = new Date(birthDateIso);
  var today = new Date();
  var age = today.getFullYear() - birth.getFullYear();
  var monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function calculateCalorieNeeds_(user) {
  if (!user.sex || !user.birth_date || !user.height_cm || !user.weight_kg) return null;
  var age = calculateAge_(user.birth_date);
  var bmr = calculateBMR_(user.formula, user.sex, Number(user.weight_kg), Number(user.height_cm), age);
  var tdee = bmr * ACTIVITY_MULTIPLIERS_[user.activity_level];
  var target = tdee + GOAL_ADJUSTMENT_[user.goal];
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(target),
    formula: user.formula,
    activityLevel: user.activity_level,
    goal: user.goal,
  };
}
