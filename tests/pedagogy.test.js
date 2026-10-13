import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNumber,checkAnswer, topicStats, selectNextQuestion, diagnosticQuestions, recommendTopic, validateBackup} from '../core/pedagogy.js';
import { QUESTIONS, TOPICS } from '../data/curriculum.js';

test('banco curricular íntegro, con temas y niveles', () => {
  assert.equal(TOPICS.length,5);
  assert.equal(QUESTIONS.length,40);
  for (const t of TOPICS) {
    assert.equal(QUESTIONS.filter(q=>q.topic===t.id).length,8);
    assert.deepEqual(new Set(QUESTIONS.filter(q=>q.topic===t.id).map(q=>q.level)),new Set([1,2,3]));
  }
  assert.equal(new Set(QUESTIONS.map(q=>q.id)).size,40);
});
test('respuestas numéricas aceptan fracciones, coma y signos sin evaluar código', () => {
  assert.equal(parseNumber('3/4'),.75);
  assert.equal(parseNumber('0,75'),.75);
  assert.equal(parseNumber('-7/2'),-3.5);
  assert.equal(parseNumber('1/0'),null);
  assert.equal(parseNumber('2+3'),null);
  assert.equal(parseNumber('alert(1)'),null);
  assert.equal(checkAnswer(QUESTIONS.find(q=>q.id==='f7'),'7/12').correct,true);
});
test('diagnóstico no concede dominio, práctica con evidencias sí', () => {
  const mk=(questionId,correct,mode='practice',i=0)=>({questionId,correct,topic:'enteros',mode,track:'support',date:new Date(2026,0,i+1).toISOString()});
  const diagnostic = [mk('e1',true,'diagnostic')];
  assert.equal(topicStats(diagnostic,'enteros').mastered,false);
  const worked = ['e1','e2','e4','e5','e7'].map((id,i)=>mk(id,true,'practice',i));
  assert.equal(topicStats([...diagnostic,...worked],'enteros').mastered,true);
  assert.equal(topicStats([...worked.slice(0,3)],'enteros').mastered,false);
  assert.equal(topicStats([...worked.slice(0,4),mk('e8',false,'practice',4)],'enteros').mastered,true);
});
test('selección adaptativa no repite antes de agotar el banco', () => {
  const attempts=[];
  for(let i=0;i<8;i++) {
    const q = selectNextQuestion('enteros',attempts);
    assert.ok(!attempts.find(a=>a.questionId===q.id));
    attempts.push({questionId:q.id,topic:'enteros',mode:'practice',correct:true});
  }
  assert.ok(selectNextQuestion('enteros',attempts));
  assert.equal(diagnosticQuestions().length,5);
  assert.equal(recommendTopic([], 'academy').id,'enteros');
});
test('validación de copia rechaza preguntas falsas y permite entradas sanas', () => {
  const base = {format:'educacion-x-backup-v1',profile:{name:'Ana',grade:2,track:'academy'},attempts:[]};
  assert.equal(validateBackup(base).profile.name,'Ana');
  assert.throws(()=>validateBackup({...base,attempts:[{id:'1',questionId:'x'}]}));
});
