import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
test('PWA declara assets locales e iconos existentes',()=>{
  const manifest=JSON.parse(readFileSync(join(ROOT,'manifest.webmanifest'),'utf8'));
  assert.equal(manifest.display,'standalone');
  assert.equal(manifest.start_url,'./index.html');
  for(const icon of manifest.icons)assert.ok(existsSync(join(ROOT,icon.src)));
  const sw=readFileSync(join(ROOT,'sw.js'),'utf8');
  for(const resource of ['index.html','styles.css','app.js','core/storage.js','core/pedagogy.js','core/tutor.js','core/academy.js','core/dialogue.js','data/curriculum.js']) {
    assert.ok(existsSync(join(ROOT,resource)));
    assert.ok(sw.includes(resource),`Ausente del SW: ${resource}`);
  }
});
test('no existen recursos CDN requeridos para arrancar',()=>{
  const html=readFileSync(join(ROOT,'index.html'),'utf8');
  const scripts=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(x=>x[1]);
  assert.ok(scripts.length>0);
  assert.ok(scripts.every(s=>s.startsWith('./')),scripts.join(','));
});
