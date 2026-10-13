"""Prueba visual de UI en Chromium con IndexedDB simulado por restricciones de navegación del entorno.
NO sustituye la prueba de IndexedDB y Service Worker en localhost/HTTPS real.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
base=Path(__file__).resolve().parent.parent
js=''
for file in ['data/curriculum.js','core/pedagogy.js','core/tutor.js','core/storage.js','app.js']:
    part=(base/file).read_text()
    part=re.sub(r'^import .*?;\s*$', '',part, flags=re.M)
    part=re.sub(r'\bexport\s+(?=(const|function|async|class|let)\b)','',part)
    js+='\n'+part
mock='''
Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:{open(){
  const db={objectStoreNames:{contains:()=>true},transaction(names,mode){
    const tx={};let requests=0;
    function finish(){setTimeout(()=>{if(tx.oncomplete)tx.oncomplete()},5)}
    tx.objectStore=(name)=>({
      get(key){const q={};requests++;setTimeout(()=>{if(q.onsuccess)q.onsuccess({target:{result:records[name].get(key)}});finish()},0);return q},
      getAll(){const q={};requests++;setTimeout(()=>{if(q.onsuccess)q.onsuccess({target:{result:[...records[name].values()]}});finish()},0);return q},
      put(obj,key){records[name].set(key,obj);finish()},add(obj){records[name].set(obj.id,obj);finish()},clear(){records[name].clear();finish()}
    });
    return tx;
  }};
  const req={};setTimeout(()=>{req.result=db;req.onsuccess?.()},0);return req;
}}});
const records={profile:new Map(),attempts:new Map()};
'''
html=(base/'index.html').read_text()
html=re.sub(r'<link rel="stylesheet"[^>]*>', f'<style>{(base/"styles.css").read_text()}</style>',html)
html=re.sub(r'<script type="module" src="\./app\.js"></script>',lambda _: f'<script>{mock}\n{js}</script>',html)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1280,'height':880})
    page=context.new_page();issues=[]
    page.on('pageerror',lambda e:issues.append(str(e)))
    page.set_content(html,wait_until='load')
    page.get_by_text('Tu aprendizaje empieza acá.').wait_for(timeout=8000)
    page.locator('#student-name').fill('Estudiante prueba')
    page.locator('#setup-form button[type=submit]').click()
    page.locator('.topbar').wait_for(timeout=5000)
    assert page.locator('h1').first.inner_text().startswith('¡Hola')
    page.screenshot(path='/mnt/data/educacion-x-core-preview.png',full_page=True)
    print('PASS: onboarding y dashboard')
    page.locator('[data-action="lesson"][data-topic="enteros"]').first.click()
    page.locator('[data-action="tutor-prompt"][data-prompt="ejemplo"]').click()
    assert 'Trabajemos con un ejemplo' in page.locator('.tutor-message').inner_text()
    page.locator('[data-action="start-practice"]').click()
    questions=page.evaluate('QUESTIONS')
    for i in range(5):
        prompt=page.locator('.question').inner_text()
        question=next(q for q in questions if q['prompt']==prompt)
        page.locator('#answer').fill(str(question['answer']))
        page.locator('#answer-form button[type=submit]').click()
        assert '¡Bien resuelto!' in page.locator('.feedback').inner_text(timeout=2000)
        assert f'pregunta {i+1} de 5' in page.locator('.tag').inner_text().lower()
        page.locator('[data-action="next-question"]').click()
    assert 'Respondiste 5 de 5' in page.locator('h1').first.inner_text()
    print('PASS: 5 ejercicios y feedback')
    page.locator('[data-action="go-progress"]').click()
    assert 'Dominado' in page.locator('.page').inner_text()
    page.locator('[data-action="navigate"][data-view="path"]').first.click()
    page.locator('[data-action="track"][data-track="academy"]').first.click()
    assert 'Dominado' in page.locator('.page').inner_text()
    print('PASS: progreso compartido')
    page.locator('[data-action="navigate"][data-view="diagnostic"]').first.click()
    page.locator('[data-action="start-diagnostic"]').click()
    for i in range(7):
        prompt=page.locator('.question').inner_text()
        question=next(q for q in questions if q['prompt']==prompt)
        page.locator('#answer').fill(str(question['answer']))
        page.locator('#answer-form button[type=submit]').click()
        page.locator('[data-action="next-question"]').click()
    assert 'Respondiste 7 de 7' in page.locator('h1').first.inner_text()
    print('PASS: diagnóstico')
    page.locator('[data-action="navigate"][data-view="settings"]').first.click()
    page.locator('[data-action="navigate"][data-view="home"]').first.click()
    assert '5/5' not in page.locator('.page').inner_text() # Solo enteros dominado.
    print('PASS: navegación/settings')
    m=context.new_page();m.set_viewport_size({'width':390,'height':844});m.set_content(html,wait_until='load')
    m.get_by_text('Tu aprendizaje empieza acá.').wait_for()
    m.locator('#setup-form button[type=submit]').click()
    m.locator('.mobile-nav').wait_for(timeout=5000)
    assert m.locator('.mobile-nav').is_visible()
    m.screenshot(path='/mnt/data/educacion-x-core-mobile.png',full_page=True)
    print('PASS: mobile UI')
    assert not issues,issues
    browser.close()
print('UI_SMOKE_SIMULATED_PASS')
