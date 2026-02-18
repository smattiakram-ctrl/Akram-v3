const DB_NAME = 'NabilInventoryDB';
const DB_VERSION = 3; 
const DB_PREFIX = 'NabilInventory_';

// إعدادات Google Drive الخاصة بك
const CLIENT_ID = '193989877512-vekucvd5hbb801cgnsb4nsju1u8gbo4a.apps.googleusercontent.com';

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

// وظيفة حفظ البيانات في Google Drive
export const syncToCloud = async (email: string, data: any): Promise<void> => {
  if (!email || !window.gapi?.client?.drive) return;
  try {
    const fileName = 'nabil_inventory_backup.json';
    const listResponse = await window.gapi.client.drive.files.list({
      q: `name='${fileName}' and spaces='appDataFolder'`,
      spaces: 'appDataFolder'
    });

    const fileId = listResponse.result.files?.[0]?.id;
    const metadata = { name: fileName, parents: ['appDataFolder'] };
    const content = JSON.stringify(data);
    
    const boundary = 'foo_bar_baz';
    const body = `--${boundary}\nContent-Type: application/json; charset=UTF-8\n\n${JSON.stringify(metadata)}\n--${boundary}\nContent-Type: application/json\n\n${content}\n--${boundary}--`;

    const path = fileId ? `/upload/drive/v3/files/${fileId}?uploadType=multipart` : '/upload/drive/v3/files?uploadType=multipart';
    const method = fileId ? 'PATCH' : 'POST';

    await window.gapi.client.request({
      path, method,
      params: { uploadType: 'multipart' },
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body
    });
  } catch (e) {
    console.error("خطأ في المزامنة السحابية", e);
  }
};

// وظيفة جلب البيانات من Google Drive
export const fetchFromCloud = async (email: string): Promise<any | null> => {
  if (!email || !window.gapi?.client?.drive) return null;
  try {
    const listResponse = await window.gapi.client.drive.files.list({
      q: "name='nabil_inventory_backup.json' and spaces='appDataFolder'",
      spaces: 'appDataFolder'
    });
    const fileId = listResponse.result.files?.[0]?.id;
    if (!fileId) return null;

    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    });
    return response.result;
  } catch (e) {
    console.error("خطأ في جلب البيانات السحابية", e);
    return null;
  }
};

// بقية الوظائف الأساسية كما هي لضمان عمل التطبيق محلياً
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

export const saveUser = (user: any): void => {
  localStorage.setItem(DB_PREFIX + 'CURRENT_USER', JSON.stringify(user));
};

export const getUser = (): any | null => {
  const user = localStorage.getItem(DB_PREFIX + 'CURRENT_USER');
  return user ? JSON.parse(user) : null;
};

export const logoutUser = async (): Promise<void> => {
  try {
    const dbInstance = await openDB();
    const stores = ['categories', 'products', 'sales'];
    const tx = dbInstance.transaction(stores, 'readwrite');
    stores.forEach(store => tx.objectStore(store).clear());
    localStorage.removeItem(DB_PREFIX + 'TOTAL_EARNINGS');
  } finally {
    localStorage.removeItem(DB_PREFIX + 'CURRENT_USER');
  }
};

export const overwriteLocalData = async (data: any): Promise<void> => {
  const dbInstance = await openDB();
  const tx = dbInstance.transaction(['categories', 'products', 'sales'], 'readwrite');
  if (data.categories) data.categories.forEach((c: any) => tx.objectStore('categories').put(c));
  if (data.products) data.products.forEach((p: any) => tx.objectStore('products').put(p));
  if (data.sales) data.sales.forEach((s: any) => tx.objectStore('sales').put(s));
  if (data.earnings !== undefined) saveEarnings(data.earnings);
  return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
};
        
