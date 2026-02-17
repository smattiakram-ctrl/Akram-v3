
const DB_NAME = 'NabilInventoryDB';
const DB_VERSION = 3; 
const DB_PREFIX = 'NabilInventory_';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('categories')) db.createObjectStore('categories', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('products')) db.createObjectStore('products', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('sales')) db.createObjectStore('sales', { keyPath: 'id' });
    };
  });
};

export const clearAllLocalData = async (): Promise<void> => {
  try {
    const dbInstance = await openDB();
    const stores = ['categories', 'products', 'sales'];
    const tx = dbInstance.transaction(stores, 'readwrite');
    stores.forEach(store => tx.objectStore(store).clear());
    localStorage.removeItem(DB_PREFIX + 'TOTAL_EARNINGS');
    
    return new Promise((resolve, reject) => { 
      tx.oncomplete = () => {
        dbInstance.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      // Safety timeout
      setTimeout(resolve, 1000);
    });
  } catch (e) {
    console.error("Cleanup failed", e);
    localStorage.clear();
  }
};

export const getAll = async <T>(storeName: string): Promise<T[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const saveItem = async <T extends { id: string }>(storeName: string, item: T): Promise<void> => {
  const dbInstance = await openDB();
  const transaction = dbInstance.transaction(storeName, 'readwrite');
  transaction.objectStore(storeName).put(item);
  return new Promise((resolve) => { transaction.oncomplete = () => resolve(); });
};

export const deleteItem = async (storeName: string, id: string): Promise<void> => {
  const dbInstance = await openDB();
  const transaction = dbInstance.transaction(storeName, 'readwrite');
  transaction.objectStore(storeName).delete(id);
  return new Promise((resolve) => { transaction.oncomplete = () => resolve(); });
};

export const saveEarnings = (amount: number): void => {
  localStorage.setItem(DB_PREFIX + 'TOTAL_EARNINGS', amount.toString());
};

export const getEarnings = (): number => {
  const val = localStorage.getItem(DB_PREFIX + 'TOTAL_EARNINGS');
  return val ? parseFloat(val) : 0;
};

export const syncToCloud = async (email: string, data: any): Promise<void> => {
  if (!email) return;
  const cloudKey = `USER_CLOUD_DATA_${email.toLowerCase()}`;
  localStorage.setItem(cloudKey, JSON.stringify({ ...data, lastSync: Date.now() }));
};

export const fetchFromCloud = async (email: string): Promise<any | null> => {
  if (!email) return null;
  const cloudKey = `USER_CLOUD_DATA_${email.toLowerCase()}`;
  const data = localStorage.getItem(cloudKey);
  return data ? JSON.parse(data) : null;
};

export const saveUser = (user: any): void => {
  localStorage.setItem(DB_PREFIX + 'CURRENT_USER', JSON.stringify(user));
};

export const getUser = (): any | null => {
  const user = localStorage.getItem(DB_PREFIX + 'CURRENT_USER');
  return user ? JSON.parse(user) : null;
};

export const logoutUser = async (): Promise<void> => {
  try {
    await clearAllLocalData();
  } finally {
    localStorage.removeItem(DB_PREFIX + 'CURRENT_USER');
    // Full clear of specific DB related keys
    Object.keys(localStorage).forEach(key => {
      if(key.startsWith(DB_PREFIX)) localStorage.removeItem(key);
    });
  }
};

export const overwriteLocalData = async (data: any): Promise<void> => {
  await clearAllLocalData();
  const dbInstance = await openDB();
  const tx = dbInstance.transaction(['categories', 'products', 'sales'], 'readwrite');
  if (data.categories) data.categories.forEach((c: any) => tx.objectStore('categories').put(c));
  if (data.products) data.products.forEach((p: any) => tx.objectStore('products').put(p));
  if (data.sales) data.sales.forEach((s: any) => tx.objectStore('sales').put(s));
  if (data.earnings !== undefined) saveEarnings(data.earnings);
  return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
};

export const exportDataAsJSON = (data: any): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nabil_inventory_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
