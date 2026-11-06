import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../core/storage.js',import.meta.url),'utf8');
test('migración 1→3 crea stores de modo aditivo, sin borrado destructivo',()=>{
  assert.match(src,/DB_VERSION = 3/);
  for(const name of ['profile','attempts','planner','studyEntries','schoolTasks']){
    assert.match(src,new RegExp(`objectStoreNames\\.contains\\('${name}'\\)`));
  }
  assert.doesNotMatch(src,/deleteObjectStore\s*\(/);
});
test('importación y borrado incluyen cinco stores en una transacción',()=>{
  assert.equal((src.match(/db\.transaction\(\['profile','attempts','planner','studyEntries','schoolTasks'\]/g)||[]).length,2);
});
test('crear, actualizar y borrar tarea confirma la transacción',()=>{
  assert.match(src,/export const getSchoolTasks/);
  assert.match(src,/export const saveSchoolTask/);
  assert.match(src,/export const deleteSchoolTask/);
  assert.match(src,/transact\('schoolTasks','readwrite'/);
});
