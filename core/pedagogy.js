import { QUESTIONS, QUESTION_BY_ID, TOPICS } from '../data/curriculum.js';

export function parseNumber(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (typeof input !== 'string') return null;
  const clean = input.trim().replace(',', '.').replace(/\s+/g, '');
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:\/[+-]?(?:\d+(?:\.\d+)?|\.\d+))?$/.test(clean)) return null;
  if (clean.includes('/')) {
    const [a, b] = clean.split('/').map(Number);
    return b === 0 ? null : a / b;
  }
  const value = Number(clean);
  return Number.isFinite(value) ? value : null;
}

export function checkAnswer(question, input) {
  const actual = parseNumber(input);
  if (actual === null) return { valid: false, correct: false, message: 'Escribí un número. Podés usar coma decimal o fracción (por ejemplo, 3/4).' };
  return {
    valid: true,
    correct: Math.abs(actual - question.answer) <= 1e-7 * Math.max(1, Math.abs(question.answer)),
    value: actual
  };
}

export function topicStats(attempts, topicId) {
  const all = attempts.filter(a => a.topic === topicId && a.mode === 'practice').sort((a,b) => a.date.localeCompare(b.date));
  const recent = all.slice(-5);
  const correct = recent.filter(a => a.correct);
  const distinct = new Set(correct.map(a => a.questionId)).size;
  const hasIntermediate = correct.some(a => (QUESTION_BY_ID[a.questionId]?.level ?? 0) >= 2);
  const mastered = recent.length >= 5 && correct.length >= 4 && distinct >= 3 && hasIntermediate;
  const accuracy = recent.length ? Math.round(100 * correct.length / recent.length) : 0;
  return {
    total: all.length, recent: recent.length, correct: correct.length, accuracy, distinct,
    mastered,
    status: mastered ? 'Dominado' : all.length ? 'En práctica' : 'Pendiente',
    // Un índice formativo, no una nota escolar ni certificación.
    progress: mastered ? 100 : Math.min(90, Math.round((Math.min(all.length,5)/5)*45 + accuracy*0.45)),
  };
}

export function diagnosticStatus(attempts, topicId) {
  const checks = attempts.filter(a => a.topic === topicId && a.mode === 'diagnostic');
  const last = checks.at(-1);
  return last ? (last.correct ? 'Base detectada' : 'Reforzar') : 'Sin diagnóstico';
}

export function recommendTopic(attempts, track = 'support') {
  const weak = TOPICS.find(t => diagnosticStatus(attempts,t.id) === 'Reforzar' && !topicStats(attempts,t.id).mastered);
  if (track === 'support' && weak) return weak;
  const next = TOPICS.find(t => !topicStats(attempts, t.id).mastered);
  return next || TOPICS.at(-1);
}

export function selectNextQuestion(topicId, attempts) {
  const candidates = QUESTIONS.filter(q => q.topic === topicId);
  if (!candidates.length) throw new Error('Tema desconocido');
  const practice = attempts.filter(a => a.topic === topicId && a.mode === 'practice');
  const last = practice.slice(-3);
  const correctLast = last.filter(a => a.correct).length;
  // Aprendizaje adaptativo por reglas explicables: dificultad sube con aciertos consistentes.
  const desired = last.length < 2 ? 1 : correctLast === 3 ? 3 : correctLast >= 2 ? 2 : 1;
  const used = new Set(practice.map(a => a.questionId));
  const unseen = candidates.filter(q => !used.has(q.id));
  const pool = unseen.length ? unseen : candidates;
  const lastId = practice.at(-1)?.questionId;
  const ranked = pool.map(q => ({
    q, score: Math.abs(q.level-desired)*10 + (q.id===lastId ? 8 : 0) + (practice.filter(a => a.questionId===q.id).length * 2)
  })).sort((a,b) => a.score-b.score || a.q.id.localeCompare(b.q.id));
  return ranked[0].q;
}

export function diagnosticQuestions() {
  // Una pregunta exploratoria por área; no es evaluación oficial ni permite certificar dominio.
  return TOPICS.map(topic => QUESTIONS.find(q => q.topic === topic.id && q.level === 1));
}

function freshId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  if (typeof globalThis.crypto?.getRandomValues !== 'function') throw new Error('No hay un generador de identificadores seguro en este navegador.');
  const bytes = new Uint8Array(16); globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map(v => v.toString(16).padStart(2,'0')).join('');
}

export function buildAttempt(question, answer, mode, track) {
  const result = checkAnswer(question, answer);
  if (!result.valid) throw new Error(result.message);
  return {
    id: freshId(), questionId: question.id, topic: question.topic,
    mode, track, correct: result.correct, answer: String(answer).slice(0,80),
    date: new Date().toISOString(),
  };
}

export function validateBackup(data) {
  if (!data || typeof data !== 'object' || data.format !== 'educacion-x-backup-v1') throw new Error('El archivo no es una copia válida de EDUCACIÓN X.');
  if (!Array.isArray(data.attempts) || data.attempts.length > 200000) throw new Error('El historial no tiene un formato válido.');
  if (!data.profile || typeof data.profile !== 'object') throw new Error('Falta el perfil.');
  const profile = {
    name: typeof data.profile.name === 'string' ? data.profile.name.trim().slice(0,45) : 'Estudiante',
    grade: Number.isInteger(data.profile.grade) && data.profile.grade>=1 && data.profile.grade<=6 ? data.profile.grade : 1,
    track: ['support','academy'].includes(data.profile.track) ? data.profile.track : 'support'
  };
  const ids = new Set();
  const attempts = data.attempts.map(a => {
    if (!a || typeof a.id !== 'string' || a.id.length>100 || ids.has(a.id) || !QUESTION_BY_ID[a.questionId] || !['diagnostic','practice'].includes(a.mode) || !['support','academy'].includes(a.track) || typeof a.correct !== 'boolean' || typeof a.date !== 'string' || !Number.isFinite(Date.parse(a.date)) || a.topic !== QUESTION_BY_ID[a.questionId].topic || typeof a.answer !== 'string' || a.answer.length>80 || checkAnswer(QUESTION_BY_ID[a.questionId],a.answer).correct !== a.correct) {
      throw new Error('La copia contiene un registro inválido. No se importó nada.');
    }
    ids.add(a.id);
    return { id:a.id, questionId:a.questionId, topic:a.topic, mode:a.mode, track:a.track, correct:a.correct, answer:a.answer, date:a.date };
  });
  return { profile, attempts };
}
