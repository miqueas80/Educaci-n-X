"""Smoke real contra servidor localhost: IndexedDB + Service Worker + offline.
Requiere Python playwright y Chromium instalados. No altera datos de producción.
"""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
address = f'http://127.0.0.1:{server.server_address[1]}/'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        context = browser.new_context(service_workers='allow')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(address)
        page.locator('#student-name').fill('Prueba Local')
        page.locator('#setup-form button[type=submit]').click()
        page.locator('.topbar').wait_for()
        page.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.controller || false", timeout=15000)
        page.wait_for_function("caches.has('educacion-x-core-v3')", timeout=10000)
        page.locator('[data-action="navigate"][data-view="academy"]').first.click()
        assert 'Unidad 1' in page.locator('.page').inner_text()
        assert page.locator('[data-action="start-assessment"][data-unit="numeros"]').is_disabled()
        page.locator('[data-action="lesson"][data-topic="potencias"]').first.click()
        page.locator('[data-action="tutor-prompt"][data-prompt="guiame paso a paso"]').click()
        assert 'Paso 1 de' in page.locator('.tutor-message').inner_text()
        page.locator('[data-action="tutor-prompt"][data-prompt="siguiente"]').click()
        assert 'Paso 2 de' in page.locator('.tutor-message').inner_text()
        page.locator('[data-action="tutor-prompt"][data-prompt="mi avance"]').click()
        assert '0 ejercicios de práctica' in page.locator('.tutor-message').inner_text()
        page.locator('[data-action="start-practice"]').click()
        page.locator('#answer').fill('1')
        page.locator('#answer-form button[type=submit]').click()
        assert page.locator('.feedback').is_visible()
        page.reload()
        page.locator('[data-action="navigate"][data-view="progress"]').first.click()
        assert '1' in page.locator('.page').inner_text()
        page.locator('[data-action="navigate"][data-view="path"]').first.click()
        page.locator('[data-action="track"][data-track="academy"]').first.click()
        page.locator('[data-action="navigate"][data-view="progress"]').first.click()
        assert '1' in page.locator('.page').inner_text()
        context.set_offline(True)
        page.goto(address, wait_until='domcontentloaded')
        page.locator('.topbar').wait_for()
        assert 'Prueba Local' in page.locator('.topbar').inner_text()
        page.locator('[data-action="navigate"][data-view="math"]').first.click()
        assert 'Funciones lineales' in page.locator('.page').inner_text()
        page.locator('[data-action="lesson"][data-topic="funciones"]').first.click()
        page.locator('[data-action="tutor-prompt"][data-prompt="ejemplo"]').click()
        assert 'Trabajemos con un ejemplo' in page.locator('.tutor-message').inner_text()
        assert not errors, errors
        print('PASS real: IndexedDB, PWA, persistencia, dos recorridos, tutor y navegación offline')
        browser.close()
finally:
    server.shutdown()
