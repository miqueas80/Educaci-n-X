import test from 'node:test';
import assert from 'node:assert/strict';
import { ACADEMY, unitAssessmentQuestions, unitStatus, assessmentSessions, academyStatus } from '../core/academy.js';
import { QUESTIONS, TOPIC_BY_ID } from '../data/curriculum.js';
import { validateBackup, buildAttempt } from '../core/pedagogy.js';
import { tutorTurn } from '../core/dialogue.js';

const date=i=>new Date(Date.UTC(2026,9,1,0,0,i)).toISOString();
const attempt=(q,correct,mode,sessionId,i)=>({id:`${mode}-${q.id}-${sessionId}-${i}`,questionId:q.id,topic:q.topic,mode,track:'academy',answer:correct?String(q.answer):String(q.answer+999),correct,date:date(i),...(sessionId?{sessionId}:{})});

test('tres unidades cubren exactamente los siete temas y tienen evaluaciones variadas',()=>{
  assert.equal(ACADEMY.units.length,3);
  const ids=ACADEMY.units.flatMap(u=>u.topics);
  assert.equal(ids.length,7);
  assert.equal(new Set(ids).size,7);
  for(const unit of ACADEMY.units){
    const questions=unitAssessmentQuestions(unit);
    assert.equal(questions.length,5);
    assert.equal(new Set(questions.map(q=>q.id)).size,5);
    assert.deepEqual(new Set(questions.map(q=>q.level)),new Set([1,2,3]));
    assert.equal(new Set(questions.map(q=>q.topic)).size,unit.topics.length);
  }
});

test('evaluaciones incompletas no acreditan y requieren 4/5 aciertos para aprobar',()=>{
  const u=ACADEMY.units[0], questions=unitAssessmentQuestions(u);
  const four=questions.slice(0,4).map((q,i)=>attempt(q,true,'assessment','session-one',i));
  assert.equal(assessmentSessions(u,four).length,0);
  assert.equal(unitStatus(u,four).passed,false);
  const fail=[...four.slice(0,3),...questions.slice(3).map((q,i)=>attempt(q,false,'assessment','session-one',i+3))];
  assert.equal(unitStatus(u,fail).passed,false);
  const pass=[...four,attempt(questions[4],false,'assessment','session-one',4)];
  assert.equal(unitStatus(u,pass).passed,true);
  assert.equal(academyStatus(pass).passed,1);
});

test('una evaluación no simula dominio por práctica, aun con nota 5/5',()=>{
  const unit=ACADEMY.units[1];
  const arr=unitAssessmentQuestions(unit).map((q,i)=>attempt(q,true,'assessment','session-two',i));
  const status=unitStatus(unit,arr);
  assert.equal(status.passed,true);
  assert.equal(status.mastered,0);
  assert.equal(status.ready,false);
});

test('respaldo v1 anterior conserva compatibilidad, y uno nuevo valida las sesiones',()=>{
  const unit=ACADEMY.units[0],q=unitAssessmentQuestions(unit)[0];
  const data={format:'educacion-x-backup-v1',profile:{name:'Ana',grade:2,track:'academy'},attempts:[attempt(q,true,'assessment','sess-ok-1234',1)]};
  const validated=validateBackup(data);
  assert.equal(validated.attempts[0].sessionId,'sess-ok-1234');
  assert.equal(validateBackup({...data,attempts:[]}).attempts.length,0);
  assert.throws(()=>validateBackup({...data,attempts:[{...data.attempts[0],sessionId:'<bad>'}]}));
  assert.throws(()=>validateBackup({...data,attempts:[{...data.attempts[0],correct:false}]}));
});

test('Profesor X sostiene guía socrática sin atribuir respuestas al alumno',()=>{
  const topic=TOPIC_BY_ID.ecuaciones;
  const a=tutorTurn('guiame paso a paso',topic,[],'academy');
  assert.match(a.reply,/Paso 1 de 3/);
  const b=tutorTurn('siguiente',topic,[],'academy',a.state);
  assert.match(b.reply,/Paso 2 de 3/);
  const c=tutorTurn('siguiente',topic,[],'academy',b.state);
  const d=tutorTurn('siguiente',topic,[],'academy',c.state);
  assert.match(d.reply,/por tu cuenta/);
  assert.equal(d.state.active,false);
  const f=tutorTurn('qué es',topic,[],'academy',null);
  assert.match(f.reply,/ecuación/i);
});
