import test from 'node:test';
import assert from 'node:assert/strict';
import {SUBJECTS, subjectsForGrade, validateSchoolTask, validateSchoolBackup, summarizeSchoolTasks, monthCalendar} from '../core/school.js';
const task={id:'task-123abc',title:'Trabajo práctico de Biología',notes:'Leer capítulo 3',subjectId:'biologia',grade:4,dueDate:'2026-11-07',priority:'high',status:'pending',createdAt:'2026-11-06T14:00:00.000Z',completedAt:null};
test('catálogo orientativo por año 1 a 6, Matemática siempre disponible',()=>{
  assert.equal(subjectsForGrade(1).some(s=>s.id==='matematica'),true);
  assert.equal(subjectsForGrade(6).some(s=>s.id==='matematica'),true);
  assert.ok(SUBJECTS.some(s=>s.id==='biologia'));
  assert.throws(()=>subjectsForGrade(0));
});
test('valida tareas locales, normaliza campos y fechas de calendario válidas',()=>{
  assert.deepEqual(validateSchoolTask(task),task);
  assert.equal(validateSchoolTask({...task,title:'  Tarea  '}).title,'Tarea');
  for(const changes of [{title:'   '},{title:'x'.repeat(121)},{notes:'x'.repeat(501)},{dueDate:'2026-02-30'},{dueDate:'2026-11-07T12:00Z'},{subjectId:'inventado'},{grade:7},{status:'approved'},{priority:'ultra'},{id:'<script>'},{createdAt:'no-date'},{completedAt:'2026-11-06T12:00:00.000Z'}]){
    assert.throws(()=>validateSchoolTask({...task,...changes}),JSON.stringify(changes));
  }
  assert.equal(validateSchoolTask({...task,status:'done',completedAt:'2026-11-07T15:00:00.000Z'}).status,'done');
});
test('resumen separa pendientes, vencidas, próximas y realizadas; orden previsible',()=>{
  const entries=[task,{...task,id:'task-22222',dueDate:'2026-11-06',priority:'low'},{...task,id:'task-33333',dueDate:'2026-11-04',priority:'medium'},{...task,id:'task-44444',dueDate:'2026-11-06',status:'done',completedAt:'2026-11-06T15:00:00.000Z'}];
  const res=summarizeSchoolTasks(entries,new Date(2026,10,6,16));
  assert.equal(res.overdue.length,1);
  assert.equal(res.dueToday.length,1);
  assert.equal(res.completed.length,1);
  assert.equal(res.pending.length,3);
  assert.equal(res.pending[0].id,'task-33333');
  assert.equal(res.nextSevenDays.length,2);
});
test('calendario local respeta meses, año bisiesto y no usa desfase UTC',()=>{
  const nov=monthCalendar(2026,11,[task]);
  assert.equal(nov.monthKey,'2026-11');
  assert.equal(nov.days[0].date,'2026-10-26');
  assert.equal(nov.days.find(d=>d.date==='2026-11-07').tasks.length,1);
  const leap=monthCalendar(2028,2,[]);
  assert.equal(leap.days.filter(d=>d.inMonth).length,29);
  assert.throws(()=>monthCalendar(2026,13,[]));
});
test('importa respaldos anteriores sin tareas y conserva el nuevo registro',()=>{
  const legacy={format:'educacion-x-backup-v1',profile:{name:'Estudiante',grade:4,track:'academy'},attempts:[]};
  assert.deepEqual(validateSchoolBackup(legacy).schoolTasks,[]);
  const upgraded=validateSchoolBackup({...legacy,schoolTasks:[task]});
  assert.equal(upgraded.schoolTasks.length,1);
  assert.throws(()=>validateSchoolBackup({...legacy,schoolTasks:[task,task]}));
  assert.throws(()=>validateSchoolBackup({...legacy,schoolTasks:[{...task,title:'<img>'.repeat(100)}]}));
});
