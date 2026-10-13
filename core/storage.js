const DB_NAME = 'educacion-x-core';
const DB_VERSION = 1;
let connection;

export function openDatabase() {
  if (connection) return connection;
  if (!('indexedDB' in globalThis)) return Promise.reject(new Error('Este navegador no ofrece IndexedDB. No se guardarán datos en memoria temporal.'));
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('profile')) db.createObjectStore('profile');
      if (!db.objectStoreNames.contains('attempts')) {
        const store = db.createObjectStore('attempts', { keyPath: 'id' });
        store.createIndex('topic', 'topic');
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection=null; };
      resolve(db);
    };
    request.onerror = () => { connection = null; reject(request.error || new Error('No se pudo abrir IndexedDB.')); };
    request.onblocked = () => { connection = null; reject(new Error('Cerrá otras pestañas de EDUCACIÓN X para actualizar la base de datos.')); };
  });
  return connection;
}

function transact(storeName, mode, handler) {
  return openDatabase().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error('No se pudo guardar la información.'));
    tx.onabort = () => reject(tx.error || new Error('Se canceló la operación de almacenamiento.'));
    try { handler(store, value => { result = value; }); }
    catch (error) { tx.abort(); reject(error); }
  }));
}

export const getProfile = () => transact('profile','readonly',(store,set) => { store.get('active').onsuccess = e => set(e.target.result || null); });
export const saveProfile = profile => transact('profile','readwrite',(store) => store.put(profile,'active'));
export const getAttempts = () => transact('attempts','readonly',(store,set) => { store.getAll().onsuccess = e => set(e.target.result); });
export const saveAttempt = attempt => transact('attempts','readwrite',(store) => store.add(attempt));
export async function replaceData(profile, attempts) {
  const db = await openDatabase();
  return new Promise((resolve,reject) => {
    const tx = db.transaction(['profile','attempts'],'readwrite');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('No se pudo importar la copia.'));
    tx.onabort = () => reject(tx.error || new Error('Importación cancelada.'));
    tx.objectStore('profile').put(profile,'active');
    const store = tx.objectStore('attempts'); store.clear();
    for (const a of attempts) store.add(a);
  });
}
export async function clearData() {
  const db = await openDatabase();
  return new Promise((resolve,reject) => {
    const tx = db.transaction(['profile','attempts'],'readwrite');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('No se pudo borrar.'));
    tx.objectStore('profile').clear();
    tx.objectStore('attempts').clear();
  });
}
