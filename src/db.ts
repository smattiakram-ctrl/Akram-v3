import { auth, db } from "./firebase.config";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  onSnapshot
} from "firebase/firestore";

// IndexedDB المحلي
const DB_NAME = "NabilInventoryDB";
const DB_VERSION = 3;
const DB_PREFIX = "NabilInventory_";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("categories")) db.createObjectStore("categories", { keyPath: "id" });
      if (!db.objectStoreNames.contains("products")) db.createObjectStore("products", { keyPath: "id" });
      if (!db.objectStoreNames.contains("sales")) db.createObjectStore("sales", { keyPath: "id" });
    };
  });
};

// دوال IndexedDB كما قبل
export const getAll = async <T>(storeName: string): Promise<T[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const saveItem = async <T extends { id: string }>(storeName: string, item: T): Promise<void> => {
  const dbInstance = await openDB();
  const transaction = dbInstance.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).put(item);
  return new Promise((resolve) => { transaction.oncomplete = () => resolve(); });
};

export const deleteItem = async (storeName: string, id: string): Promise<void> => {
  const dbInstance = await openDB();
  const transaction = dbInstance.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).delete(id);
  return new Promise((resolve) => { transaction.oncomplete = () => resolve(); });
};

export const saveEarnings = (amount: number): void => {
  localStorage.setItem(DB_PREFIX + "TOTAL_EARNINGS", amount.toString());
};

export const getEarnings = (): number => {
  const val = localStorage.getItem(DB_PREFIX + "TOTAL_EARNINGS");
  return val ? parseFloat(val) : 0;
};

export const saveUser = (user: any): void => {
  localStorage.setItem(DB_PREFIX + "CURRENT_USER", JSON.stringify(user));
};

export const getUser = (): any | null => {
  const user = localStorage.getItem(DB_PREFIX + "CURRENT_USER");
  return user ? JSON.parse(user) : null;
};

export const clearAllLocalData = async (): Promise<void> => {
  const dbInstance = await openDB();
  const stores = ["categories", "products", "sales"];
  const tx = dbInstance.transaction(stores, "readwrite");
  stores.forEach(store => tx.objectStore(store).clear());
  localStorage.removeItem(DB_PREFIX + "TOTAL_EARNINGS");
  return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
};

// ================== Firebase Cloud ==================

// مزامنة إلى Firebase لكل مستخدم
export const syncToCloud = async (userId: string, data: any) => {
  if (!userId) return;
  const userDoc = doc(db, "users", userId);
  await setDoc(userDoc, { ...data, lastSync: Date.now() });
};

// جلب البيانات من Firebase لكل مستخدم
export const fetchFromCloud = async (userId: string) => {
  if (!userId) return null;
  const userDoc = doc(db, "users", userId);
  const docSnap = await getDoc(userDoc);
  return docSnap.exists() ? docSnap.data() : null;
};

// الاشتراك في Realtime updates لكل Collection
export const subscribeToCollection = (userId: string, collectionName: string, callback: (data: any[]) => void) => {
  const colRef = collection(db, "users", userId, collectionName);
  return onSnapshot(colRef, (snapshot) => {
    const items: any[] = [];
    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    callback(items);
  });
};
