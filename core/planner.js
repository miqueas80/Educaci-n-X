// EDUCACIÓN X v0.5 · Planificador académico Local-First.
// Agenda sugerida y tiempo autodeclarado; NO acredita dominio, notas ni asistencia.
import { TOPICS, TOPIC_BY_ID } from '../data/curriculum.js';
import { diagnosticStatus, topicStats, validateBackup } from './pedagogy.js';
import { reviewPlan } from './review.js';

const two = n => String(n).padStart(2,'0');
export const localDayKey = day => `${day.getFullYear()}-${two(day.getMonth()+1)}-${two(day.getDate())}`;
export function mondayKey(now=new Date()) {
  const value=new Date(now);
  if(!Number.isFinite(value.getTime()))throw new Error('Fecha inválida');
  value.setHours(12,0,0,0);
  value.setDate(value.getDate() - ((value.getDay()+6)%7));
  return localDayKey(value);
}
export function defaultStudyPreferences() {return {weeklyGoalMinutes:150, sessionMinutes:25, days:[1,2,3,4,5]};}
export function normalizeStudyPreferences(input) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new Error('La configuración del plan no es válida.');
  const {weeklyGoalMinutes, sessionMinutes, days}=input;
  if (!Number.isInteger(weeklyGoalMinutes) || weeklyGoalMinutes<30 || weeklyGoalMinutes>420) throw new Error('La meta semanal debe estar entre 30 y 420 minutos.');
  if (!Number.isInteger(sessionMinutes) || sessionMinutes<15 || sessionMinutes>60) throw new Error('La sesión debe durar entre 15 y 60 minutos.');
  if (!Array.isArray(days) || !days.length || days.length>7 || days.some(d=>!Number.isInteger(d) || d<1 || d>7)) throw new Error('Elegí al menos un día válido para estudiar.');
  return {weeklyGoalMinutes, sessionMinutes, days:[...new Set(days)].sort((a,b)=>a-b)};
}
function parseDay(value) {
  if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('La fecha de estudio no es válida.');
  const [year,month,day]=value.split('-').map(Number);
  const parsed=new Date(year,month-1,day,12);
  if(localDayKey(parsed)!==value)throw new Error('La fecha de estudio no existe.');
  return parsed;
}
export function validateStudyEntry(input) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Registro de estudio inválido.');
  const {id,date,topicId,minutes}=input;
  if(typeof id!=='string' || !/^[a-zA-Z0-9-]{6,100}$/.test(id)) throw new Error('Identificador de estudio inválido.');
  parseDay(date);
  if(!TOPIC_BY_ID[topicId])throw new Error('El tema de estudio no existe.');
  if(!Number.isInteger(minutes) || minutes<1 || minutes>180)throw new Error('Duración de estudio inválida.');
  return {id,date,topicId,minutes};
}
export function validateStudyBackup(data) {
  const prior=validateBackup(data); // Conserva la validación estricta de perfil y respuestas de v0.1–v0.4.
  const planner=data.planner===undefined ? defaultStudyPreferences() : normalizeStudyPreferences(data.planner);
  const raw=data.studyEntries===undefined ? [] : data.studyEntries;
  if(!Array.isArray(raw) || raw.length>20000)throw new Error('Los registros de estudio no son válidos.');
  const ids=new Set();
  const studyEntries=raw.map(entry=>{
    const valid=validateStudyEntry(entry);
    if(ids.has(valid.id))throw new Error('La copia tiene registros de estudio duplicados.');
    ids.add(valid.id);return valid;
  });
  return {...prior, planner, studyEntries};
}

export function buildWeeklyPlan(attempts, studyEntries, preferences, now=new Date()) {
  const p=normalizeStudyPreferences(preferences);
  const stamp=new Date(now);
  if(!Number.isFinite(stamp.getTime()))throw new Error('Fecha inválida.');
  const weekStart=mondayKey(stamp), start=parseDay(weekStart), today=localDayKey(stamp);
  const weekEndDate=new Date(start);weekEndDate.setDate(weekEndDate.getDate()+6);
  const weekEnd=localDayKey(weekEndDate);
  const completed=studyEntries.filter(entry=>entry.date>=weekStart && entry.date<=weekEnd);
  const completedMinutes=completed.reduce((sum,entry)=>sum+entry.minutes,0);
  const due=reviewPlan(attempts,stamp).due.map(x=>x.topicId);
  const weak=TOPICS.filter(t=>diagnosticStatus(attempts,t.id)==='Reforzar' && !topicStats(attempts,t.id).mastered).map(t=>t.id);
  const unmastered=TOPICS.filter(t=>!topicStats(attempts,t.id).mastered).map(t=>t.id);
  const priority=[...new Set([...due,...weak,...unmastered,...TOPICS.map(t=>t.id)])];
  const requested=Math.ceil(p.weeklyGoalMinutes/p.sessionMinutes);
  const count=Math.min(requested,p.days.length*4);
  const perDay=new Map(p.days.map(d=>[d,0]));
  const schedule=[];
  for(let i=0;i<count;i++) {
    const weekday=p.days[i%p.days.length];
    const slot=perDay.get(weekday)+1;perDay.set(weekday,slot);
    const date=new Date(start);date.setDate(date.getDate()+weekday-1);
    const key=localDayKey(date), topicId=priority[i%priority.length];
    schedule.push({id:`${weekStart}-${weekday}-${slot}`,date:key,weekday,slot,topicId,title:TOPIC_BY_ID[topicId].title,minutes:p.sessionMinutes,
      kind:due.includes(topicId)?'review':'practice',status:key<today?'past':key===today?'today':'upcoming'});
  }
  schedule.sort((a,b)=>a.date.localeCompare(b.date)||a.slot-b.slot);
  const plannedMinutes=count*p.sessionMinutes;
  return {weekStart,weekEnd,today,schedule,completedMinutes,registeredSessions:completed.length,
    goalMinutes:p.weeklyGoalMinutes,progressPercent:Math.min(100,Math.round(completedMinutes/p.weeklyGoalMinutes*100)),
    plannedMinutes,unplannedMinutes:Math.max(0,p.weeklyGoalMinutes-plannedMinutes),
    suggestedTopic:priority[0],dueCount:due.length};
}