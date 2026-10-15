import { IngestionModel } from './types';

const DB_NAME = 'modec_transport_db';
const DB_VERSION = 1;
const STORE_NAME = 'data_store';
const MODEL_KEY = 'current_ingestion_model';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves the ingested model to IndexedDB with automatic fallback to localStorage
 */
export async function saveModelToStorage(model: IngestionModel): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      const req = store.put(model, MODEL_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to save model to IndexedDB, trying localStorage fallback', e);
    try {
      localStorage.setItem(MODEL_KEY, JSON.stringify(model));
    } catch (lsErr) {
      console.error('Failed to save to localStorage as well', lsErr);
    }
  }
}

/**
 * Loads the saved model from IndexedDB (or localStorage fallback)
 */
export async function loadModelFromStorage(): Promise<IngestionModel | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(MODEL_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    try {
      const saved = localStorage.getItem(MODEL_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }
}

/**
 * Clears the saved model from IndexedDB and localStorage
 */
export async function clearModelFromStorage(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(MODEL_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
  try {
    localStorage.removeItem(MODEL_KEY);
  } catch {}
}
