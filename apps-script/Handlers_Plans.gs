/**
 * Handlers_Plans.gs
 */

function handleListPlans_(auth) {
  var plans = readTable_(SHEET_NAMES.WORKOUT_PLANS).filter(function (p) {
    return Number(p.user_id) === Number(auth.userId);
  });
  var allExercises = readTable_(SHEET_NAMES.PLAN_EXERCISES);

  var result = plans.map(function (plan) {
    var exercises = allExercises
      .filter(function (ex) { return Number(ex.plan_id) === Number(plan.id); })
      .sort(function (a, b) { return Number(a.position) - Number(b.position); });
    return decoratePlan_(plan, exercises);
  });

  return { plans: result };
}

function handleGetPlan_(auth, planId) {
  var plan = findById_(SHEET_NAMES.WORKOUT_PLANS, planId);
  if (!plan || Number(plan.user_id) !== Number(auth.userId)) apiError_(404, 'Scheda non trovata.');

  var exercises = readTable_(SHEET_NAMES.PLAN_EXERCISES)
    .filter(function (ex) { return Number(ex.plan_id) === Number(planId); })
    .sort(function (a, b) { return Number(a.position) - Number(b.position); });

  return { plan: decoratePlan_(plan, exercises) };
}

function handleCreatePlan_(auth, body) {
  if (!body.name || !body.name.trim()) apiError_(400, 'Il nome della scheda è obbligatorio.');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var planId = nextId_(SHEET_NAMES.WORKOUT_PLANS);
    var plan = {
      id: planId,
      user_id: auth.userId,
      name: body.name.trim(),
      description: body.description || '',
      day_of_week: body.dayOfWeek !== undefined && body.dayOfWeek !== null ? body.dayOfWeek : '',
      created_at: new Date().toISOString(),
    };
    insertRow_(SHEET_NAMES.WORKOUT_PLANS, plan);

    var exercises = insertPlanExercises_(planId, body.exercises || []);
    return { plan: decoratePlan_(plan, exercises) };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdatePlan_(auth, body) {
  var planId = body.id || body.planId;
  var plan = findById_(SHEET_NAMES.WORKOUT_PLANS, planId);
  if (!plan || Number(plan.user_id) !== Number(auth.userId)) apiError_(404, 'Scheda non trovata.');
  if (!body.name || !body.name.trim()) apiError_(400, 'Il nome della scheda è obbligatorio.');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var updated = updateRowById_(SHEET_NAMES.WORKOUT_PLANS, planId, {
      name: body.name.trim(),
      description: body.description || '',
      day_of_week: body.dayOfWeek !== undefined && body.dayOfWeek !== null ? body.dayOfWeek : '',
    });

    // Sostituzione integrale degli esercizi: cancella i vecchi, inserisce i nuovi
    deleteRowsWhere_(SHEET_NAMES.PLAN_EXERCISES, function (ex) { return Number(ex.plan_id) === Number(planId); });
    var exercises = insertPlanExercises_(planId, body.exercises || []);

    return { plan: decoratePlan_(updated, exercises) };
  } finally {
    lock.releaseLock();
  }
}

function handleDeletePlan_(auth, planId) {
  var plan = findById_(SHEET_NAMES.WORKOUT_PLANS, planId);
  if (!plan || Number(plan.user_id) !== Number(auth.userId)) apiError_(404, 'Scheda non trovata.');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    deleteRowsWhere_(SHEET_NAMES.PLAN_EXERCISES, function (ex) { return Number(ex.plan_id) === Number(planId); });
    deleteRowById_(SHEET_NAMES.WORKOUT_PLANS, planId);
    return { deleted: true };
  } finally {
    lock.releaseLock();
  }
}

/** Inserisce gli esercizi di una scheda, assegnando id incrementali e posizione in ordine. */
function insertPlanExercises_(planId, exercisesInput) {
  var nextExId = nextId_(SHEET_NAMES.PLAN_EXERCISES);
  var created = [];
  exercisesInput.forEach(function (ex, index) {
    var record = {
      id: nextExId + index,
      plan_id: planId,
      exercise_name: ex.exerciseName || ex.exercise_name || '',
      target_sets: ex.targetSets || ex.target_sets || 3,
      target_reps: ex.targetReps || ex.target_reps || '8-12',
      notes: ex.notes || '',
      position: index,
    };
    insertRow_(SHEET_NAMES.PLAN_EXERCISES, record);
    created.push(record);
  });
  return created;
}

function decoratePlan_(plan, exercises) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description || null,
    day_of_week: plan.day_of_week === '' ? null : Number(plan.day_of_week),
    created_at: plan.created_at,
    exercises: exercises.map(function (ex) {
      return {
        id: ex.id,
        exercise_name: ex.exercise_name,
        target_sets: Number(ex.target_sets),
        target_reps: ex.target_reps,
        notes: ex.notes || null,
        position: Number(ex.position),
      };
    }),
  };
}
