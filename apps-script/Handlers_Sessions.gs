/**
 * Handlers_Sessions.gs
 */

function handleListSessions_(auth) {
  var sessions = readTable_(SHEET_NAMES.WORKOUT_SESSIONS)
    .filter(function (s) { return Number(s.user_id) === Number(auth.userId); })
    .sort(function (a, b) { return b.session_date.localeCompare(a.session_date); });

  var allEntries = readTable_(SHEET_NAMES.SESSION_ENTRIES);

  var result = sessions.map(function (session) {
    var entries = allEntries.filter(function (en) { return Number(en.session_id) === Number(session.id); });
    return decorateSession_(session, entries);
  });

  return { sessions: result };
}

function handleCreateSession_(auth, body) {
  if (!body.sessionDate) apiError_(400, 'La data della sessione è obbligatoria.');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sessionId = nextId_(SHEET_NAMES.WORKOUT_SESSIONS);
    var session = {
      id: sessionId,
      user_id: auth.userId,
      plan_id: body.planId || '',
      plan_name: body.planName || '',
      session_date: body.sessionDate,
      notes: body.notes || '',
      created_at: new Date().toISOString(),
    };
    insertRow_(SHEET_NAMES.WORKOUT_SESSIONS, session);

    var nextEntryId = nextId_(SHEET_NAMES.SESSION_ENTRIES);
    var entries = (body.entries || []).map(function (entry, index) {
      var record = {
        id: nextEntryId + index,
        session_id: sessionId,
        exercise_name: entry.exerciseName || entry.exercise_name || '',
        set_number: entry.setNumber || entry.set_number || 1,
        reps: entry.reps || 0,
        weight_kg: entry.weightKg !== undefined ? entry.weightKg : (entry.weight_kg || 0),
        rpe: entry.rpe || '',
      };
      insertRow_(SHEET_NAMES.SESSION_ENTRIES, record);
      return record;
    });

    return { session: decorateSession_(session, entries) };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteSession_(auth, sessionId) {
  var session = findById_(SHEET_NAMES.WORKOUT_SESSIONS, sessionId);
  if (!session || Number(session.user_id) !== Number(auth.userId)) apiError_(404, 'Sessione non trovata.');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    deleteRowsWhere_(SHEET_NAMES.SESSION_ENTRIES, function (en) { return Number(en.session_id) === Number(sessionId); });
    deleteRowById_(SHEET_NAMES.WORKOUT_SESSIONS, sessionId);
    return { deleted: true };
  } finally {
    lock.releaseLock();
  }
}

function handleListExercises_(auth) {
  var userSessionIds = readTable_(SHEET_NAMES.WORKOUT_SESSIONS)
    .filter(function (s) { return Number(s.user_id) === Number(auth.userId); })
    .map(function (s) { return Number(s.id); });

  var names = readTable_(SHEET_NAMES.SESSION_ENTRIES)
    .filter(function (en) { return userSessionIds.indexOf(Number(en.session_id)) !== -1; })
    .map(function (en) { return en.exercise_name; });

  var unique = names.filter(function (name, index) { return names.indexOf(name) === index; });
  unique.sort();

  return { exercises: unique };
}

function handleExerciseProgress_(auth, exerciseName) {
  if (!exerciseName) apiError_(400, 'Nome esercizio richiesto.');

  var userSessions = readTable_(SHEET_NAMES.WORKOUT_SESSIONS)
    .filter(function (s) { return Number(s.user_id) === Number(auth.userId); });
  var sessionDateById = {};
  userSessions.forEach(function (s) { sessionDateById[s.id] = s.session_date; });
  var sessionIds = userSessions.map(function (s) { return Number(s.id); });

  var entries = readTable_(SHEET_NAMES.SESSION_ENTRIES).filter(function (en) {
    return sessionIds.indexOf(Number(en.session_id)) !== -1 && en.exercise_name === exerciseName;
  });

  // Raggruppa per data, prendendo il massimo peso e massime ripetizioni di quella data
  var byDate = {};
  entries.forEach(function (en) {
    var date = sessionDateById[en.session_id];
    if (!byDate[date]) byDate[date] = { date: date, maxWeight: 0, maxReps: 0 };
    byDate[date].maxWeight = Math.max(byDate[date].maxWeight, Number(en.weight_kg) || 0);
    byDate[date].maxReps = Math.max(byDate[date].maxReps, Number(en.reps) || 0);
  });

  var history = Object.keys(byDate)
    .map(function (date) { return byDate[date]; })
    .sort(function (a, b) { return a.date.localeCompare(b.date); });

  return { exerciseName: exerciseName, history: history };
}

function decorateSession_(session, entries) {
  return {
    id: session.id,
    plan_id: session.plan_id === '' ? null : Number(session.plan_id),
    session_date: session.session_date,
    notes: session.notes || null,
    entries: entries.map(function (en) {
      return {
        id: en.id,
        exercise_name: en.exercise_name,
        set_number: Number(en.set_number),
        reps: Number(en.reps),
        weight_kg: Number(en.weight_kg),
        rpe: en.rpe === '' ? null : Number(en.rpe),
      };
    }),
  };
}
