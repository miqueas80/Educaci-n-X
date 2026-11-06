import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewStatus, reviewPlan, reviewDeck } from '../core/review.js';
import { QUESTION_BY_ID, TOPICS } from '../data/curriculum.js';
import { validateBackup, buildAttempt } from '../core/pedagogy.js';

const at = (day) => new Date(`2026-11-${String(day).padStart(2,'0')}T12:00:00.000Z`).toISOString();
const attempt = (qid, correct, day, mode='practice', suffix='') => ({
  id: `${qid}-${day}-${mode}-${suffix}`, questionId:qid, topic:QUESTION_BY_ID[qid].topic,
  mode, track:'support', answer:correct?String(QUESTION_BY_ID[qid].answer):String(QUESTION_BY_ID[qid].answer+123),
  correct, date:at(day)
});
const first = TOPICS[0].id;
const qs = Object.keys(QUESTION_BY_ID).filter(id=>QUESTION_BY_ID[id].topic===first);

test('a topic without practiced attempts is not due and has no fabricated evidence',()=>{
  const s=reviewStatus([],first,at(15));
  assert.equal(s.status,'not-started');
  assert.equal(s.due,false);
  assert.equal(s.dueAt,null);
  assert.equal(reviewPlan([],at(15)).due.length,0);
});

test('recent correct practice becomes due after one day without mastered evidence',()=>{
  const s=reviewStatus([attempt(qs[0],true,1)],first,at(2));
  assert.equal(s.status,'due');
  assert.equal(s.due,true);
  assert.equal(s.streak,0);
});

test('a wrong answer requests immediate revision, not an invented achievement',()=>{
  const s=reviewStatus([attempt(qs[0],false,1)],first,at(1));
  assert.equal(s.due,true);
  assert.equal(s.status,'due');
  assert.equal(s.lastCorrect,false);
});

test('five distinct successful practice attempts with intermediate level wait three days',()=>{
  const chosen = qs.slice(0,5).map((id,i)=>attempt(id,true,1,'practice',String(i)));
  assert.equal(reviewStatus(chosen,first,at(3)).due,false);
  assert.equal(reviewStatus(chosen,first,at(4)).due,true);
});

test('successful reviews extend intervals: 1, 3, 7 days, failure resets',()=>{
  const base=[attempt(qs[0],true,1)];
  const r1=attempt(qs[1],true,2,'review');
  const r2=attempt(qs[2],true,3,'review');
  const r3=attempt(qs[3],true,6,'review');
  assert.equal(reviewStatus([...base,r1],first,at(3)).due,true);
  assert.equal(reviewStatus([...base,r1,r2],first,at(5)).due,false);
  assert.equal(reviewStatus([...base,r1,r2],first,at(6)).due,true);
  assert.equal(reviewStatus([...base,r1,r2,r3],first,at(12)).due,false);
  const wrong=attempt(qs[4],false,13,'review');
  const failed=reviewStatus([...base,r1,r2,r3,wrong],first,at(13));
  assert.equal(failed.due,true);
  assert.equal(failed.streak,0);
});

test('a new practice resets review schedule and ignores future attempts',()=>{
  const attempts=[attempt(qs[0],true,1),attempt(qs[1],true,2,'review'),attempt(qs[2],true,5)];
  assert.equal(reviewStatus(attempts,first,at(5)).streak,0);
  assert.equal(reviewStatus(attempts,first,at(5)).due,false);
  const s=reviewStatus([...attempts,attempt(qs[3],false,20,'review')],first,at(5));
  assert.equal(s.due,false);
  assert.equal(s.lastCorrect,true);
});

test('deck is deterministic, selects practiced due topics without duplicating questions',()=>{
  const attempts=[attempt(qs[0],false,1)];
  const plan=reviewPlan(attempts,at(3));
  assert.equal(plan.due.length,1);
  const deck=reviewDeck(attempts,at(3));
  assert.equal(deck.length,1);
  assert.equal(deck[0].topic,first);
  assert.notEqual(deck[0].id,qs[0]);
  assert.deepEqual(reviewDeck(attempts,at(3)).map(x=>x.id),deck.map(x=>x.id));
});

test('review mode is an acceptable, validated backup format; legacy backup still valid',()=>{
  const q=QUESTION_BY_ID[qs[0]];
  const review=buildAttempt(q,String(q.answer),'review','support');
  assert.equal(review.mode,'review');
  const backup={format:'educacion-x-backup-v1',profile:{name:'A',grade:2,track:'support'},attempts:[review]};
  assert.equal(validateBackup(backup).attempts[0].mode,'review');
  assert.equal(validateBackup({...backup,attempts:[attempt(qs[0],true,1)]}).attempts.length,1);
});
