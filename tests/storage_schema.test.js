import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../core/storage.js',import.meta.url),'utf8');

test('la migración 1→2 crea nuevos stores de manera aditiva',()=>{
  assert.match(src,/DB_VERSION = 2/);
  for(const name of ['profile','attempts','planner','studyEntries']) {
    assert.match(src,new RegExp(`objectStoreNames\\.contains\\('${name}'\\)`));
  }
  assert.doesNotMatch(src,/deleteObjectStore\s*\(/);
});
test('importación y borrado incluyen los cuatro stores en transacción',()=>{
  assert.equal((src.match(/db\.transaction\(\['profile','attempts','planner','studyEntries'\]/g)||[]).length,2);
});