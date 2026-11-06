"""Chromium E2E real: IndexedDB v2->v3, gestor, calendario, respaldo, offline y móvil."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
import os
ROOT=Path(__file__).resolve().parent.parent
URL=os.environ.get('EDX_TEST_URL','http://127.0.0.1:8765/')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    context=browser.new_context(viewport={'width':1280,'height':850},locale='es-AR',accept_downloads=True)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL+'seed-original',wait_until='domcontentloaded')
    page.evaluate('''async () => new Promise((resolve,reject) => {
      const req=indexedDB.open('educacion-x-core',2);
      req.onupgradeneeded=()=>{const db=req.result;db.createObjectStore('profile');db.createObjectStore('attempts',{keyPath:'id'});db.createObjectStore('planner');db.createObjectStore('studyEntries',{keyPath:'id'});};
      req.onerror=()=>reject(req.error);
      req.onsuccess=()=>{const db=req.result;const tx=db.transaction(['profile','attempts','planner','studyEntries'],'readwrite');
        tx.objectStore('profile').put({name:'Estudiante 4º',grade:4,track:'support'},'active');
        tx.objectStore('attempts').put({id:'historical-1',questionId:'ent-1',topic:'enteros',mode:'practice',track:'support',correct:true,answer:'1',date:'2026-11-01T11:00:00.000Z'});
        tx.objectStore('planner').put({weeklyGoalMinutes:180,sessionMinutes:30,days:[1,3,5]},'active');
        tx.objectStore('studyEntries').put({id:'study-before',topicId:'enteros',date:'2026-11-01',minutes:30});
        tx.oncomplete=()=>{db.close();resolve(true);}; tx.onerror=()=>reject(tx.error);
      };
    })''')
    page.goto(URL,wait_until='networkidle')
    page.get_by_text('¡Hola, Estudiante 4º!').wait_for()
    stores=page.evaluate('''async()=>{let db=await new Promise((resolve,reject)=>{let r=indexedDB.open('educacion-x-core');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const a=[db.version,[...db.objectStoreNames]];db.close();return a}''')
    assert stores[0]==3 and 'schoolTasks' in stores[1],stores
    page.locator('button[data-view="planner"]').first.click()
    assert page.locator('#weekly-goal').input_value()=='180'
    page.locator('button[data-view="school"]').first.click()
    page.get_by_role('heading',name='Mis materias de 4.º año').wait_for()
    page.get_by_role('button',name='+ Tarea').first.click()
    page.get_by_role('heading',name='Mis tareas y entregas').wait_for()
    page.locator('#task-title').fill('Informe de laboratorio')
    page.locator('#task-subject').select_option('biologia')
    page.locator('#task-date').fill('2026-11-10')
    page.locator('#task-priority').select_option('high')
    page.locator('#task-notes').fill('Preparar informe: <script>alert(1)</script>')
    page.get_by_role('button',name='Agregar tarea').click()
    page.get_by_text('Informe de laboratorio').last.wait_for()
    assert page.locator('.school-task').count()==1
    assert page.locator('.school-task script').count()==0
    page.screenshot(path='/mnt/data/EDX-v0.6-tareas-desktop.png',full_page=True)
    page.locator('button[data-view="calendar"]').first.click()
    page.get_by_role('heading',name='Mi calendario escolar').wait_for()
    # Navigate to month of seeded task regardless of local runtime clock.
    page.evaluate('''()=>{app.calendarMonth={year:2026,month:11};app.selectedCalendarDay='2026-11-10';render()}''')
    assert page.get_by_role('heading',name='Entregas del 2026-11-10').count()==1
    assert page.locator('.school-task').count()==1
    page.screenshot(path='/mnt/data/EDX-v0.6-calendario-desktop.png',full_page=True)
    page.reload(wait_until='networkidle')
    page.locator('button[data-view="schoolTasks"]').first.click()
    assert page.locator('.school-task').count()==1
    page.locator('button[data-action="edit-task"]').click()
    page.locator('#task-title').fill('Informe actualizado')
    page.get_by_role('button',name='Guardar cambios').click()
    page.locator('.school-task').get_by_text('Informe actualizado').wait_for()
    page.locator('button[data-action="toggle-task"]').click()
    page.get_by_role('button',name='Finalizadas').click()
    assert page.locator('.school-task').count()==1
    with page.expect_download() as download:
        page.locator('button[data-view="settings"]').first.click()
        page.get_by_role('button',name='Descargar copia JSON').click()
    dest='/mnt/data/EDX-v0.6-browser-respaldo.json'
    download.value.save_as(dest)
    backup=json.loads(Path(dest).read_text())
    assert len(backup['schoolTasks'])==1 and backup['schoolTasks'][0]['status']=='done'
    assert len(backup['attempts'])==1 and len(backup['studyEntries'])==1
    page.reload(wait_until='networkidle')
    page.wait_for_function('navigator.serviceWorker && !!navigator.serviceWorker.controller',timeout=15000)
    context.set_offline(True)
    page.reload(wait_until='domcontentloaded')
    page.locator('button[data-view="schoolTasks"]').first.click()
    page.get_by_role('button',name='Finalizadas').click()
    page.get_by_text('Informe actualizado').last.wait_for()
    context.set_offline(False)
    page.locator('button[data-action="toggle-task"]').first.click()
    page.get_by_role('button',name='Pendientes').click()
    assert page.locator('.school-task').count()==1
    page.on('dialog',lambda dialog:dialog.accept())
    page.locator('button[data-action="delete-task"]').click()
    assert page.locator('.school-task').count()==0
    mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,locale='es-AR')
    m=mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)))
    m.goto(URL,wait_until='networkidle')
    m.locator('#student-name').fill('Alumno móvil')
    m.get_by_role('button',name='Entrar a EDUCACIÓN X →').click()
    m.locator('.mobile-nav button[data-view="schoolTasks"]').click()
    m.get_by_role('heading',name='Mis tareas y entregas').wait_for()
    m.screenshot(path='/mnt/data/EDX-v0.6-mobile.png',full_page=True)
    width=m.evaluate('''()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth})''')
    assert width['scroll']<=width['inner']+2,width
    assert not errors,errors
    print(json.dumps({'result':'PASS','test_cases':['migration v2 to v3','legacy profile/attempts/studyEntries retained','create','edit','complete','reopen','delete','calendar','backup','offline service worker','mobile no horizontal overflow','XSS rendering escaped'],'db_version':stores[0],'browser_errors':errors},ensure_ascii=False))
    browser.close()
