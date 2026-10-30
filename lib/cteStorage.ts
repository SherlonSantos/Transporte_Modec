import { CteIngestionModel, CteSlaConfig } from './cteTypes';

const CTE_DB_NAME = 'modec_cte_db';
const CTE_DB_VERSION = 1;
const CTE_STORE_NAME = 'cte_data_store';
const CTE_MODEL_KEY = 'current_cte_model';

function openCteDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste navegador'));
      return;
    }
    const request = window.indexedDB.open(CTE_DB_NAME, CTE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CTE_STORE_NAME)) {
        db.createObjectStore(CTE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Salva o modelo de dados de CT-e no IndexedDB com fallback para localStorage
 */
export async function saveCteModelToStorage(model: CteIngestionModel): Promise<void> {
  try {
    const db = await openCteDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CTE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CTE_STORE_NAME);
      store.clear();
      const req = store.put(model, CTE_MODEL_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Falha ao salvar no IndexedDB, tentando fallback localStorage', e);
    try {
      localStorage.setItem(CTE_MODEL_KEY, JSON.stringify(model));
    } catch (lsErr) {
      console.error('Falha ao salvar no localStorage também', lsErr);
    }
  }
}

/**
 * Carrega o modelo de dados de CT-e do IndexedDB ou localStorage
 */
export async function loadCteModelFromStorage(): Promise<CteIngestionModel | null> {
  try {
    const db = await openCteDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(CTE_STORE_NAME, 'readonly');
      const store = tx.objectStore(CTE_STORE_NAME);
      const req = store.get(CTE_MODEL_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    try {
      const saved = localStorage.getItem(CTE_MODEL_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }
}

/**
 * Limpa os dados persistidos de CT-e do IndexedDB e localStorage
 */
export async function clearCteModelFromStorage(): Promise<void> {
  try {
    const db = await openCteDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(CTE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CTE_STORE_NAME);
      const req = store.delete(CTE_MODEL_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
  try {
    localStorage.removeItem(CTE_MODEL_KEY);
  } catch {}
}

/**
 * Salva e carrega configurações de SLA por etapa
 */
export function saveCteSlaConfigs(configs: Record<number, CteSlaConfig>): void {
  try {
    localStorage.setItem('modec_cte_sla_configs', JSON.stringify(configs));
  } catch (e) {
    console.error('Erro ao salvar SLA de CT-e no localStorage', e);
  }
}

export function loadCteSlaConfigs(): Record<number, CteSlaConfig> | null {
  try {
    const saved = localStorage.getItem('modec_cte_sla_configs');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Erro ao carregar SLA de CT-e do localStorage', e);
  }
  return null;
}
