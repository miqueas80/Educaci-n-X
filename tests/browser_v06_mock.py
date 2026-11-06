"""Smoke de interfaces con almacén en memoria: NO valida IndexedDB real ni Service Worker."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re, json
base=Path(__file__).resolve().parent.parent
js=''
for file in ['data/curriculum.js','core/pedagogy.js','core/tutor.js','core/academy.js','core/dialogue.js','core/review.js','core/planner.js','core/school.js','core/storage.js','app.js']:
    s=(base/file).read_text()
    s=re.sub(r'^import .*?;\s*$','',s,flags=re.M)
    s=re.sub(r'\bexport\s+(?=(const|function|async|class|let)\b)','',s)
    js+='\n'+s
mock='''
const records={profile:new Map(),attempts:new Map(),planner:new Map(),studyEntries:new Map(),schoolTasks:new Map()};
Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:{open(){
  const db={objectStoreNames:{contains:()=>true},transaction(){
    const tx={};function finish(){setTimeout(()=>tx.oncomplete?.(),5)}
    tx.objectStore=name=>({
      get(key){const q={};setTimeout(()=>{q.onsuccess?.({target:{result:records[name].get(key)}});finish()},0);return q},
      getAll(){const q={};setTimeout(()=>{q.onsuccess?.({target:{result:[...records[name].values()]}});finish()},0);return q},
      put(obj,key){records[name].set(key??obj.id,obj);finish()},
      add(obj){records[name].set(obj.id,obj);finish()},
      delete(id){records[name].delete(id);finish()},
      clear(){records[name].clear();finish()}
    });return tx;
  }};
  const req={};setTimeout(()=>{req.result=db;req.onsuccess?.()},0);return req;
}}});
'''
html=(base/'index.html').read_text()
html=re.sub(r'<link rel="stylesheet"[^>]*>',lambda _:f'<style>{(base/"styles.css").read_text()}</style>',html)
html=re.sub(r'<script type="module" src="\./app\.js"></script>',lambda _: f'<script>{mock}\n{js}</script>',html)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1280,'height':900},locale='es-AR',accept_downloads=True)
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load')
    page.locator('#student-name').fill('Estudiante prueba')
    page.get_by_role('button',name='Entrar a EDUCACIÓN X →').click()
    page.get_by_role('heading',name='¡Hola, Estudiante prueba!').wait_for()
    page.locator('button[data-view="school"]').first.click()
    page.get_by_role('heading',name='Mis materias de 1.º año').wait_for()
    page.get_by_role('button',name='+ Tarea').first.click()
    page.get_by_role('heading',name='Mis tareas y entregas').wait_for()
    page.locator('#task-title').fill('Informe de Biología')
    page.locator('#task-subject').select_option('biologia')
    page.locator('#task-date').fill('2026-11-10')
    page.locator('#task-priority').select_option('high')
    page.locator('#task-notes').fill('<script>alert(1)</script> Esquema de ADN')
    page.get_by_role('button',name='Agregar tarea').click()
    page.wait_for_function('app.schoolTasks.length === 1')
    assert page.locator('.school-task').count()==1
    assert page.locator('.school-task script').count()==0
    page.screenshot(path='/mnt/data/EDX-v0.6-tareas-desktop.png',full_page=True)
    page.locator('button[data-view="calendar"]').first.click()
    page.get_by_role('heading',name='Mi calendario escolar').wait_for()
    page.evaluate("()=>{app.calendarMonth={year:2026,month:11};app.selectedCalendarDay='2026-11-10';render()}")
    assert page.get_by_role('heading',name='Entregas del 2026-11-10').count()==1
    assert page.locator('.school-task').count()==1
    page.screenshot(path='/mnt/data/EDX-v0.6-calendario-desktop.png',full_page=True)
    page.locator('button[data-action="edit-task"]').click()
    page.locator('#task-title').fill('Informe corregido')
    page.get_by_role('button',name='Guardar cambios').click()
    page.wait_for_function("app.schoolTasks[0].title === 'Informe corregido'")
    page.locator('button[data-action="toggle-task"]').first.click()
    page.wait_for_function("app.schoolTasks[0].status === 'done'")
    page.get_by_role('button',name='Finalizadas').click()
    assert page.locator('.school-task').count()==1
    assert page.evaluate('records.schoolTasks.size')==1
    with page.expect_download() as d:
        page.locator('button[data-view="settings"]').first.click()
        page.get_by_role('button',name='Descargar copia JSON').click()
    dest='/mnt/data/EDX-v0.6-browser-mock-respaldo.json'
    d.value.save_as(dest)
    payload=json.loads(Path(dest).read_text())
    assert len(payload['schoolTasks'])==1
    assert payload['schoolTasks'][0]['status']=='done'
    page.locator('button[data-view="schoolTasks"]').first.click()
    page.get_by_role('button',name='Finalizadas').click()
    page.locator('button[data-action="toggle-task"]').click()
    page.wait_for_function("app.schoolTasks[0].status === 'pending'")
    page.on('dialog',lambda d:d.accept())
    page.get_by_role('button',name='Pendientes').click()
    page.locator('button[data-action="delete-task"]').click()
    page.wait_for_function('app.schoolTasks.length === 0')
    mobile=context.new_page();mobile.set_viewport_size({'width':390,'height':844});mobile.on('pageerror',lambda e:errors.append(str(e)))
    mobile.set_content(html,wait_until='load')
    mobile.get_by_role('button',name='Entrar a EDUCACIÓN X →').click()
    mobile.locator('.mobile-nav button[data-view="schoolTasks"]').click()
    mobile.get_by_role('heading',name='Mis tareas y entregas').wait_for()
    mobile.screenshot(path='/mnt/data/EDX-v0.6-mobile.png',full_page=True)
    width=mobile.evaluate('()=>({doc:document.documentElement.scrollWidth,w:innerWidth})')
    assert width['doc']<=width['w']+2,width
    assert not errors,errors
    print(json.dumps({'status':'PASS','checks':['onboarding','subject list','task create/edit/complete/reopen/delete','date calendar','escaped notes','backup JSON','mobile UI'],'browser_errors':errors},ensure_ascii=False))
    browser.close()
