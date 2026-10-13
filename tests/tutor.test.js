import test from 'node:test';
import assert from 'node:assert/strict';
import {TOPICS,QUESTIONS,TOPIC_BY_ID} from '../data/curriculum.js';
import {learningAdvice,tutorReply} from '../core/tutor.js';
import {topicStats,diagnosticQuestions,validateBackup} from '../core/pedagogy.js';

const date=n=>new Date(Date.UTC(2026,9,n+1)).toISOString();
const attempt=(id,correct,mode='practice',i=1)=>({id:`attempt-${id}-${i}`,questionId:id,topic:'enteros',mode,track:'support',correct,date:date(i),answer:correct?'3':'99'});

test('se agregan 2 módulos y 16 actividades sin romper los identificadores antiguos',()=>{
  assert.equal(TOPICS.length,7);
  assert.equal(QUESTIONS.length,56);
  assert.ok(TOPIC_BY_ID.potencias && TOPIC_BY_ID.funciones);
  assert.equal(diagnosticQuestions().length,TOPICS.length);
  assert.ok(QUESTIONS.every(q=>Number.isFinite(q.answer)&&q.hint&&q.explanation));
});

test('el profesor detecta dificultades reales y muestra contexto, sin inventar errores',()=>{
  const bad=[attempt('e1',false,'practice',1),attempt('e2',false,'practice',2)];
  const advice=learningAdvice(TOPIC_BY_ID.enteros,bad,'support');
  assert.match(advice.headline,/dificultades/i);
  assert.match(tutorReply('¿Cómo voy?',TOPIC_BY_ID.enteros,bad),/2 ejercicios de práctica/);
  assert.match(tutorReply('Me equivoqué',TOPIC_BY_ID.enteros,bad),/error reciente/i);
  assert.match(tutorReply('Mostrame un ejemplo',TOPIC_BY_ID.enteros,bad),/un ejemplo/i);
  assert.match(tutorReply('¿Cuáles son los pasos?',TOPIC_BY_ID.enteros,bad),/paso a paso/i);
  assert.match(tutorReply('palabra irreconocible',TOPIC_BY_ID.enteros,bad),/No interpreto libremente/);
});

test('expone bases sugeridas sin bloquear la formación independiente',()=>{
  const response=tutorReply('¿Qué necesito saber antes?',TOPIC_BY_ID.funciones,[],'academy');
  assert.match(response,/Ecuaciones lineales/);
  assert.match(response,/Proporcionalidad/);
  assert.match(response,/No están bloqueadas/);
  assert.equal(learningAdvice(TOPIC_BY_ID.funciones,[],'academy').context.startsWith('Academia'),true);
});

test('el dominio sigue basado exclusivamente en evidencias de práctica',()=>{
  const onlyDiagnostic=[attempt('e1',true,'diagnostic',1)];
  assert.equal(topicStats(onlyDiagnostic,'enteros').mastered,false);
  assert.match(tutorReply('mi progreso',TOPIC_BY_ID.enteros,onlyDiagnostic),/0 ejercicios de práctica/);
});

test('las copias versión 1 siguen siendo compatibles con los nuevos módulos',()=>{
  const base={format:'educacion-x-backup-v1',profile:{name:'Estudiante',grade:3,track:'support'},attempts:[]};
  assert.equal(validateBackup(base).profile.grade,3);
  assert.equal(validateBackup({...base,attempts:[{id:'potencias-ok',questionId:'t1',topic:'potencias',mode:'practice',track:'academy',correct:true,answer:'8',date:date(2)}]}).attempts.length,1);
});
