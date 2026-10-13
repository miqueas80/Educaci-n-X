// EDUCACIÓN X Academia: estructura curricular piloto y avance basado en evidencias.
// No equivale a acreditación oficial ni a aprobación de año escolar.
import { TOPIC_BY_ID, QUESTIONS, QUESTION_BY_ID } from '../data/curriculum.js';
import { topicStats } from './pedagogy.js';

export const ACADEMY = Object.freeze({
  id: 'matematica-fundamentos',
  title: 'Matemática — Fundamentos de secundaria',
  level: 'Trayecto piloto de ciclo básico',
  description: 'Un programa propio de siete temas, organizado en tres unidades. No sustituye la currícula provincial ni otorga títulos oficiales.',
  units: [
    { id: 'numeros', title: 'Unidad 1 · Pensar con números', objective: 'Operar, representar y comprender números enteros, fracciones y potencias.', topics: ['enteros','fracciones','potencias'] },
    { id: 'relaciones', title: 'Unidad 2 · Proporciones cotidianas', objective: 'Resolver problemas con proporcionalidad y porcentajes.', topics: ['proporcionalidad','porcentajes'] },
    { id: 'algebra', title: 'Unidad 3 · Modelar relaciones', objective: 'Plantear ecuaciones y comprender relaciones funcionales.', topics: ['ecuaciones','funciones'] },
  ],
});

export function findUnit(unitId) { return ACADEMY.units.find(unit => unit.id === unitId) ?? null; }

// Una evaluación integradora ofrece 5 cuestiones DISTINTAS, repartidas entre los
// temas, con dificultad inicial, media y alta; idéntica selección para reintentos.
export function unitAssessmentQuestions(unit) {
  if (!unit || !Array.isArray(unit.topics) || !unit.topics.length || unit.topics.some(id=>!TOPIC_BY_ID[id])) throw new Error('Unidad no válida');
  const result = [];
  const levels = [1, 2, 2, 3, 1];
  for (let i=0; i<5; i++) {
    const topicId = unit.topics[i % unit.topics.length];
    const desired = levels[i];
    const options = QUESTIONS.filter(q => q.topic === topicId && q.level === desired && !result.some(existing => existing.id === q.id));
    const fallback = QUESTIONS.filter(q=>q.topic === topicId && !result.some(existing => existing.id === q.id));
    const next = (options.length ? options : fallback).sort((a,b)=>a.id.localeCompare(b.id))[0];
    if (next) result.push(next);
  }
  if (result.length !== 5 || new Set(result.map(q=>q.id)).size !== 5) throw new Error('La unidad necesita cinco preguntas diferentes');
  return result;
}

export function assessmentSessions(unit, attempts) {
  if (!unit) return [];
  const groups = new Map();
  for (const a of attempts) {
    if (a.mode !== 'assessment' || !a.sessionId || !unit.topics.includes(a.topic)) continue;
    if (!QUESTION_BY_ID[a.questionId] || QUESTION_BY_ID[a.questionId].topic !== a.topic) continue;
    if (!groups.has(a.sessionId)) groups.set(a.sessionId, []);
    groups.get(a.sessionId).push(a);
  }
  const permitted = new Set(unitAssessmentQuestions(unit).map(q=>q.id));
  return [...groups.entries()].map(([id,items]) => {
    const distinct = new Set(items.map(a=>a.questionId));
    const complete = items.length === 5 && distinct.size === 5 && [...distinct].every(qid=>permitted.has(qid));
    return { id, complete, correct: items.filter(a=>a.correct).length, passed: complete && items.filter(a=>a.correct).length >= 4, date: items.at(-1)?.date, items };
  }).filter(s=>s.complete).sort((a,b)=>a.date.localeCompare(b.date));
}

export function unitStatus(unit, attempts) {
  if (!unit) throw new Error('Unidad desconocida');
  const mastery = unit.topics.map(id=>({topic:TOPIC_BY_ID[id], ...topicStats(attempts,id)}));
  const mastered = mastery.filter(s=>s.mastered).length;
  const sessions = assessmentSessions(unit,attempts);
  const passed = sessions.some(s=>s.passed);
  return {
    mastered, total:unit.topics.length, ready:mastered===unit.topics.length,
    passed, lastAssessment:sessions.at(-1) ?? null,
    status:passed?'Unidad acreditada internamente':mastered===unit.topics.length?'Lista para evaluar':'En formación',
  };
}

export function academyStatus(attempts) {
  const units=ACADEMY.units.map(unit=>({unit,...unitStatus(unit,attempts)}));
  return {units,passed:units.filter(u=>u.passed).length,total:units.length,completed:units.every(u=>u.passed)};
}
