// src/db.ts
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
} from "firebase/firestore";
import { db } from "./firebase.config";

// ===== COLLECTIONS =====
const productsRef = collection(db, "products");
const categoriesRef = collection(db, "categories");
const salesRef = collection(db, "sales");

// ===== PRODUCTS =====
export const addProduct = async (product: any) => await addDoc(productsRef, product);
export const getProducts = async () => {
  const snapshot = await getDocs(productsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const updateProduct = async (id: string, data: any) => await updateDoc(doc(db, "products", id), data);
export const deleteProduct = async (id: string) => await deleteDoc(doc(db, "products", id));
export const getProductByBarcode = async (barcode: string) => {
  const q = query(productsRef, where("barcode", "==", barcode));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ===== CATEGORIES =====
export const addCategory = async (category: any) => await addDoc(categoriesRef, category);
export const getCategories = async () => {
  const snapshot = await getDocs(categoriesRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const updateCategory = async (id: string, data: any) => await updateDoc(doc(db, "categories", id), data);
export const deleteCategory = async (id: string) => await deleteDoc(doc(db, "categories", id));

// ===== SALES =====
export const addSale = async (sale: any) => await addDoc(salesRef, sale);
export const getSales = async () => {
  const snapshot = await getDocs(salesRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const updateSale = async (id: string, data: any) => await updateDoc(doc(db, "sales", id), data);
export const deleteSale = async (id: string) => await deleteDoc(doc(db, "sales", id));

// ===== OPTIONAL: Export or Earnings يمكنك إضافتها لاحقًا إذا أحببت =====
