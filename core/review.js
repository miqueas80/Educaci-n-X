// Método X v0.4: repaso espaciado local, auditable, sin red ni calificaciones.
// Los intervalos son heurísticos de producto, NO validación de retención científica.
import { TOPICS, TOPIC_BY_ID, QUESTIONS } from '../data/curriculum.js';
import { topicStats } from './pedagogy.js';

const DAY = 24 * 60 * 60 * 1000;
const REVIEW_DAYS = [1, 3, 7, 14, 30];

function asTime(value) {
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) throw new Error('Fecha de revisión inválida');
  return t;
}

export function reviewStatus(attempts, topicId, now = new Date()) {
  if (!TOPIC_BY_ID[topicId]) throw new Error('Tema desconocido');
  const current = asTime(now);
  const history = attempts.filter(a => a?.topic === topicId && ['practice','review'].includes(a.mode)
    && Number.isFinite(Date.parse(a.date)) && Date.parse(a.date) <= current)
    .slice().sort((a,b)=>a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
  if (!history.some(a => a.mode === 'practice')) {
    return { topicId, status:'not-started', due:false, dueAt:null, streak:0, lastCorrect:null, practiced:false };
  }
  const last = history.at(-1);
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].mode !== 'review' || !history[i].correct) break;
    streak++;
  }
  let days = 0;
  if (last.correct) {
    days = last.mode === 'review' ? REVIEW_DAYS[Math.min(streak-1, REVIEW_DAYS.length-1)]
      : (topicStats(history,topicId).mastered ? 3 : 1);
  }
  const dueAt = new Date(Date.parse(last.date) + days * DAY).toISOString();
  const due = Date.parse(dueAt) <= current;
  return {topicId,status:due?'due':'scheduled',due,dueAt,streak,lastCorrect:last.correct,practiced:true};
}

export function reviewPlan(attempts, now = new Date()) {
  const statuses=TOPICS.map(topic=>({topic,...reviewStatus(attempts,topic.id,now)}));
  const sortDue=(a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt) || a.topic.order-b.topic.order;
  return {
    due: statuses.filter(s=>s.due).sort(sortDue),
    upcoming: statuses.filter(s=>s.status==='scheduled').sort(sortDue),
    notStarted: statuses.filter(s=>!s.practiced),
  };
}

export function reviewDeck(attempts, now = new Date(), maxQuestions = 5) {
  const size=Math.max(0,Math.min(7,Math.trunc(Number(maxQuestions)||0)));
  return reviewPlan(attempts,now).due.slice(0,size).map(item=>{
    const history=attempts.filter(a=>a.topic===item.topicId && ['practice','review'].includes(a.mode));
    const lastId=history.slice().sort((a,b)=>a.date.localeCompare(b.date)).at(-1)?.questionId;
    const desired=item.lastCorrect===false?1:2;
    const choices=QUESTIONS.filter(q=>q.topic===item.topicId).map(q=>({
      q, repeats:history.filter(a=>a.questionId===q.id).length,
      cost:Math.abs(q.level-desired)*10,
      recent:q.id===lastId?1:0,
    }));
    choices.sort((a,b)=>a.repeats-b.repeats || a.recent-b.recent || a.cost-b.cost || a.q.id.localeCompare(b.q.id));
    if (!choices.length) throw new Error('No hay preguntas disponibles para el repaso');
    return choices[0].q;
  });
}
