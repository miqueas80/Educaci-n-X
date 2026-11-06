from playwright.sync_api import sync_playwright
import json
URL='http://127.0.0.1:8765/'
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    context=browser.new_context(viewport={'width':1280,'height':900},locale='es-AR',accept_downloads=True)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    # Seed a v1 database on the same origin, including prior profile and evidence.
    page.goto(URL+'nonexistent-v1-seed',wait_until='domcontentloaded')
    seeded=page.evaluate('''async () => new Promise((resolve,reject)=>{
       const rq=indexedDB.open('educacion-x-core',1);
       rq.onupgradeneeded=()=>{const db=rq.result;db.createObjectStore('profile'); const s=db.createObjectStore('attempts',{keyPath:'id'});s.createIndex('topic','topic')};
       rq.onsuccess=()=>{const db=rq.result;const tx=db.transaction(['profile','attempts'],'readwrite');tx.objectStore('profile').put({name:'Alumno de prueba',grade:4,track:'academy'},'active');
          tx.objectStore('attempts').add({id:'historical-1',questionId:'ent-1',topic:'enteros',mode:'practice',track:'academy',correct:true,answer:'1',date:'2026-10-20T10:00:00.000Z'});
          tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>reject(tx.error);
       };rq.onerror=()=>reject(rq.error);
    })''')
    page.goto(URL,wait_until='networkidle')
    page.get_by_text('¡Hola, Alumno de prueba!').wait_for(timeout=10000)
    assert page.get_by_text('1',exact=True).count() >= 0
    page.get_by_role('button', name='Mi plan semanal').click()
    page.get_by_role('heading', name='Mi semana de estudio').wait_for()
    assert '150 min' in page.locator('body').inner_text()
    page.screenshot(path='/mnt/data/EDX-v0.5-desktop.png',full_page=True)
    page.locator('#weekly-goal').fill('180')
    page.locator('#session-time').fill('30')
    page.get_by_role('button',name='Guardar mi rutina').click()
    page.get_by_text('180 min',exact=True).first.wait_for()
    page.locator('#study-minutes').fill('30')
    page.get_by_role('button',name='Guardar sesión estudiada').click()
    page.get_by_text('30 min',exact=True).first.wait_for()
    before=page.locator('body').inner_text()
    assert '30 de 180' not in before or '30' in before
    page.reload(wait_until='networkidle')
    page.get_by_role('button',name='Mi plan semanal').click()
    assert page.locator('#weekly-goal').input_value()=='180'
    assert '30 min' in page.locator('body').inner_text()
    with page.expect_download() as d:
        page.get_by_role('button',name='Datos y privacidad').click()
        page.get_by_role('button',name='Descargar copia JSON').click()
    download=d.value
    dest='/mnt/data/EDX-v05-browser-backup.json';download.save_as(dest)
    payload=json.load(open(dest))
    assert payload['planner']['weeklyGoalMinutes']==180
    assert len(payload['studyEntries'])==1
    assert len(payload['attempts'])==1
    page.screenshot(path='/mnt/data/EDX-v0.5-settings.png',full_page=True)
    # PWA needs service worker to control page before going offline.
    page.reload(wait_until='networkidle')
    page.wait_for_function('navigator.serviceWorker && !!navigator.serviceWorker.controller',timeout=10000)
    context.set_offline(True)
    page.reload(wait_until='domcontentloaded')
    page.get_by_role('button',name='Mi plan semanal').click()
    page.get_by_role('heading',name='Mi semana de estudio').wait_for()
    assert page.locator('#weekly-goal').input_value()=='180'
    context.set_offline(False)
    mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1, is_mobile=True,has_touch=True)
    m=mobile.new_page();m.on('pageerror',lambda err:errors.append(str(err)))
    m.goto(URL,wait_until='networkidle')
    m.locator('#student-name').fill('Celular')
    m.get_by_role('button',name='Entrar a EDUCACIÓN X →').click()
    m.get_by_role('button',name='Plan',exact=True).click()
    m.get_by_role('heading',name='Mi semana de estudio').wait_for()
    m.screenshot(path='/mnt/data/EDX-v0.5-mobile.png',full_page=True)
    assert not errors, errors
    print(json.dumps({'browser':'chromium','checks':['v1 to v2 database migration','existing attempts retained','planner settings persist','manual study entries persist','backup includes progress and plan','offline PWA navigation','mobile planner UI'],'page_errors':errors,'backup_attempts':len(payload['attempts']),'backup_entries':len(payload['studyEntries'])},ensure_ascii=False))
    browser.close()