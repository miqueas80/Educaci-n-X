from playwright.sync_api import sync_playwright
from pathlib import Path
import json,sys,os

url=os.environ.get('EDUX_TEST_URL','http://127.0.0.1:8080/')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1280,'height':900},accept_downloads=True)
    page=context.new_page(); issues=[]
    page.on('pageerror', lambda e: issues.append(str(e)))
    page.goto(url,wait_until='networkidle',timeout=20000)
    assert page.get_by_text('Tu aprendizaje empieza acá.').count()==1,page.content()[:500]
    page.locator('#student-name').fill('Estudiante prueba')
    page.locator('#student-grade').select_option('2')
    page.locator('#setup-form button[type=submit]').click()
    page.locator('.topbar').wait_for(timeout=7000)
    assert page.locator('h1').first.inner_text().startswith('¡Hola')
    print('OK: creación de perfil local')
    page.screenshot(path='/mnt/data/educacion-x-core-preview.png',full_page=True)
    page.locator('[data-action="lesson"][data-topic="enteros"]').first.click()
    assert page.get_by_text('Los números enteros incluyen').count()
    page.locator('[data-action="tutor-prompt"][data-prompt="ejemplo"]').click()
    assert 'Veamos un ejemplo' in page.locator('.tutor-message').inner_text()
    print('OK: lección y tutor por reglas offline')
    page.locator('[data-action="start-practice"]').click()
    ids=[]
    for i in range(5):
        prompt=page.locator('.question').inner_text()
        d=page.evaluate('async (prompt) => {const m=await import("./data/curriculum.js");const q=m.QUESTIONS.find(q=>q.prompt===prompt);return {id:q.id,answer:q.answer}}',prompt)
        ids.append(d['id'])
        page.locator('#answer').fill(str(d['answer']))
        page.locator('#answer-form button[type="submit"]').click()
        assert '¡Bien resuelto!' in page.locator('.feedback').inner_text(),page.content()[:2000]
        assert f'pregunta {i+1} de 5' in page.locator('.tag').inner_text().lower()
        page.locator('[data-action="next-question"]').click()
    assert len(set(ids))==5,ids
    assert 'Respondiste 5 de 5' in page.locator('h1').first.inner_text()
    print('OK: 5 ejercicios correctos, feedback, dominio y cierre')
    page.locator('[data-action="go-progress"]').click()
    assert 'Dominado' in page.locator('.page').inner_text()
    page.locator('[data-action="navigate"][data-view="path"]').first.click()
    page.locator('[data-action="track"][data-track="academy"]').first.click()
    assert 'Dominado' in page.locator('.page').inner_text()
    print('OK: progreso compartido al cambiar de recorrido')
    page.reload(wait_until='networkidle')
    assert 'Estudiante prueba' in page.locator('.topbar').inner_text()
    page.locator('[data-action="navigate"][data-view="diagnostic"]').first.click()
    page.locator('[data-action="start-diagnostic"]').click()
    for i in range(5):
        prompt=page.locator('.question').inner_text()
        d=page.evaluate('async (prompt) => {const m=await import("./data/curriculum.js");const q=m.QUESTIONS.find(q=>q.prompt===prompt);return {answer:q.answer}}',prompt)
        page.locator('#answer').fill(str(d['answer']))
        page.locator('#answer-form button[type="submit"]').click()
        page.locator('[data-action="next-question"]').click()
    assert 'Respondiste 5 de 5' in page.locator('h1').first.inner_text()
    print('OK: diagnóstico 5 áreas, recarga con IndexedDB')
    page.locator('[data-action="navigate"][data-view="settings"]').first.click()
    with page.expect_download() as download:
        page.locator('[data-action="export"]').click()
    target='/mnt/data/educacion-x-core/tests/export-smoke.json'
    download.value.save_as(target)
    with open(target) as f: backup=json.load(f)
    assert backup['format']=='educacion-x-backup-v1' and len(backup['attempts'])==10
    print('OK: exportación de respaldo JSON')
    # Servicio worker: el controlador tras recarga debe funcionar en desconexión real de red.
    page.reload(wait_until='networkidle')
    page.wait_for_function('navigator.serviceWorker.controller !== null',timeout=15000)
    context.set_offline(True)
    page.reload(wait_until='domcontentloaded',timeout=12000)
    assert page.locator('h1').count()>0 and 'Sin red' in page.locator('#connection').inner_text()
    page.locator('[data-action="navigate"][data-view="math"]').first.click()
    assert page.get_by_text('Fracciones y decimales').count()>0
    print('OK: recarga offline y navegación sin servidor')
    context.set_offline(False)
    m=context.new_page();m.set_viewport_size({'width':390,'height':844});m.goto(url,wait_until='networkidle')
    m.locator('.mobile-nav').wait_for(timeout=7000)
    assert m.locator('.mobile-nav').is_visible()
    m.screenshot(path='/mnt/data/educacion-x-core-mobile.png',full_page=True)
    print('OK: interfaz móvil')
    print('JS errors:',issues)
    assert not issues,issues
    browser.close()
print('BROWSER_SMOKE_PASS')
