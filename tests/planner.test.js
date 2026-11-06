import test from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS, QUESTIONS } from '../data/curriculum.js';
import { defaultStudyPreferences, normalizeStudyPreferences, mondayKey, buildWeeklyPlan, validateStudyBackup, validateStudyEntry } from '../core/planner.js';

const now = new Date(2026, 10, 6, 12, 0, 0); // viernes, en hora local
const sample = (q, day='2026-11-04', correct=true, mode='practice')=>({id:`id-${q.id}-${day}`,topic:q.topic,questionId:q.id,correct,mode,date:`${day}T12:00:00.000Z`,track:'support',answer:'1'});

test('la semana se calcula de lunes a domingo en calendario local y sin fecha UTC',()=>{
  assert.equal(mondayKey(new Date(2026,10,6,23,45)),'2026-11-02');
  assert.equal(mondayKey(new Date(2026,10,8,15)),'2026-11-02');
  assert.equal(mondayKey(new Date(2026,10,9,15)),'2026-11-09');
});

test('normaliza días sin duplicados y bloquea metas inviables o incorrectas',()=>{
  assert.deepEqual(normalizeStudyPreferences({weeklyGoalMinutes:150,sessionMinutes:25,days:[5,1,3,1]}).days,[1,3,5]);
  for(const data of [{weeklyGoalMinutes:0,sessionMinutes:25,days:[1]},{weeklyGoalMinutes:120,sessionMinutes:25,days:[]},{weeklyGoalMinutes:120,sessionMinutes:0,days:[1]},{weeklyGoalMinutes:120,sessionMinutes:25,days:[9]}]){
    assert.throws(()=>normalizeStudyPreferences(data));
  }
});

test('genera sesiones deterministas de estudio semanales y limita cuatro por día',()=>{
  const p=defaultStudyPreferences();
  const a=buildWeeklyPlan([],[],p,now);
  const b=buildWeeklyPlan([],[],p,now);
  assert.deepEqual(a.schedule,b.schedule);
  assert.equal(a.weekStart,'2026-11-02');
  assert.equal(a.plannedMinutes,150);
  assert.equal(a.schedule.length,6);
  assert.equal(a.schedule.reduce((acc,s)=>acc+s.minutes,0),150);
  assert.ok(a.schedule.every(s=>[1,2,3,4,5].includes(s.weekday)));
  assert.ok(new Set(a.schedule.map(s=>s.id)).size===a.schedule.length);
  const heavy=buildWeeklyPlan([],[],{weeklyGoalMinutes:420,sessionMinutes:15,days:[1]},now);
  assert.ok(heavy.schedule.length<=4);
  assert.equal(heavy.unplannedMinutes,360);
});

test('prioriza un repaso vencido antes de sugerir temas nuevos',()=>{
  const q=QUESTIONS.find(q=>q.topic==='fracciones');
  const p=defaultStudyPreferences();
  const result=buildWeeklyPlan([sample(q,'2026-10-20',false)],[],p,now);
  assert.equal(result.schedule[0].topicId,'fracciones');
  assert.equal(result.schedule[0].kind,'review');
});

test('los minutos registrados son autodeclarados y no otorgan dominio',()=>{
  const q=QUESTIONS.find(q=>q.topic===TOPICS[0].id);
  const a=buildWeeklyPlan([], [{id:'valid-log',date:'2026-11-05',topicId:q.topic,minutes:25},{id:'old-log',date:'2026-10-31',topicId:q.topic,minutes:45}],defaultStudyPreferences(),now);
  assert.equal(a.completedMinutes,25);
  assert.equal(a.progressPercent,17);
  assert.equal(a.schedule[0].topicId,TOPICS[0].id);
  assert.equal(a.registeredSessions,1);
});

test('rechaza entradas inválidas, fechas imposibles, duración nula y texto externo',()=>{
  const valid={id:'study-abc123',date:'2026-11-06',topicId:TOPICS[0].id,minutes:25};
  assert.deepEqual(validateStudyEntry(valid),valid);
  for (const edit of [{date:'2026-02-30'},{topicId:'<script>'},{minutes:0},{minutes:999},{id:'bad id'},{date:'2026-11-06T23:00:00Z'}]){
    assert.throws(()=>validateStudyEntry({...valid,...edit}));
  }
});

test('acepta respaldos v1 anteriores y crea un plan nuevo sin registros',()=>{
  const old={format:'educacion-x-backup-v1',profile:{name:'Alumno',grade:2,track:'support'},attempts:[]};
  const result=validateStudyBackup(old);
  assert.equal(result.planner.weeklyGoalMinutes,150);
  assert.deepEqual(result.studyEntries,[]);
});

test('valida respaldo extendido, evita duplicados y rechaza datos maliciosos antes de importar',()=>{
  const entry={id:'study-entry-a',date:'2026-11-06',topicId:TOPICS[0].id,minutes:25};
  const base={format:'educacion-x-backup-v1',profile:{name:'Estudiante',grade:3,track:'academy'},attempts:[],planner:defaultStudyPreferences(),studyEntries:[entry]};
  assert.equal(validateStudyBackup(base).studyEntries[0].minutes,25);
  assert.throws(()=>validateStudyBackup({...base,studyEntries:[entry,entry]}));
  assert.throws(()=>validateStudyBackup({...base,planner:{weeklyGoalMinutes:25,sessionMinutes:60,days:[]}}));
  assert.throws(()=>validateStudyBackup({...base,studyEntries:[{...entry, minutes:-3}]}));
});