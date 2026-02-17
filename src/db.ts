// src/db.ts

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where
} from "firebase/firestore";
import { db } from "./firebase.config";

/* =======================
   PRODUCTS
======================= */

const productsRef = collection(db, "products");

export const addProduct = async (product: any) =>
  await addDoc(productsRef, product);

export const getProducts = async () => {
  const snapshot = await getDocs(productsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateProduct = async (id: string, data: any) =>
  await updateDoc(doc(db, "products", id), data);

export const deleteProduct = async (id: string) =>
  await deleteDoc(doc(db, "products", id));

export const getProductByBarcode = async (barcode: string) => {
  const q = query(productsRef, where("barcode", "==", barcode));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Realtime
export const subscribeProducts = (callback: (products: any[]) => void) => {
  return onSnapshot(productsRef, (snapshot) => {
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(products);
  });
};


/* =======================
   CATEGORIES
======================= */

const categoriesRef = collection(db, "categories");

export const addCategory = async (category: any) =>
  await addDoc(categoriesRef, category);

export const getCategories = async () => {
  const snapshot = await getDocs(categoriesRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateCategory = async (id: string, data: any) =>
  await updateDoc(doc(db, "categories", id), data);

export const deleteCategory = async (id: string) =>
  await deleteDoc(doc(db, "categories", id));

// Realtime
export const subscribeCategories = (callback: (categories: any[]) => void) => {
  return onSnapshot(categoriesRef, (snapshot) => {
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(categories);
  });
};


/* =======================
   SALES
======================= */

const salesRef = collection(db, "sales");

export const addSale = async (sale: any) =>
  await addDoc(salesRef, sale);

export const getSales = async () => {
  const snapshot = await getDocs(salesRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateSale = async (id: string, data: any) =>
  await updateDoc(doc(db, "sales", id), data);

export const deleteSale = async (id: string) =>
  await deleteDoc(doc(db, "sales", id));

// Realtime
export const subscribeSales = (callback: (sales: any[]) => void) => {
  return onSnapshot(salesRef, (snapshot) => {
    const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(sales);
  });
};


/* =======================
   TOTAL EARNINGS
======================= */

// نحسب الأرباح مباشرة من المبيعات
export const subscribeTotalEarnings = (callback: (total: number) => void) => {
  return onSnapshot(salesRef, (snapshot) => {
    let total = 0;
    snapshot.docs.forEach(doc => {
      const data: any = doc.data();
      total += data.amount || 0;
    });
    callback(total);
  });
};
