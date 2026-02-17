import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Plus, Search, Trash2, Edit, Camera, LayoutGrid, 
  ShoppingCart, Tag, User as UserIcon, RefreshCw, Menu, History, Home, X, Percent, Clock, CloudOff, LogIn, TrendingUp, Package, Layers, ChevronLeft,
  SortAsc
} from "lucide-react";

import { Category, Product, ViewState, User, SaleRecord } from "./types";
import * as db from "./db";
import CategoryForm from "./components/CategoryForm";
import ProductForm from "./components/ProductForm";
import BarcodeScanner from "./components/BarcodeScanner";
import SaleDialog from "./components/SaleDialog";
import AuthModal from "./components/AuthModal";
import { auth, googleProvider } from "./firebase.config";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(db.getUser());
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);

  const [view, setView] = useState<ViewState>("HOME");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
  const [isLoading, setIsLoading] = useState(true);

  // الاشتراك في Realtime Firebase
  const subscribeRealtime = useCallback((uid: string) => {
    const unsubCats = db.subscribeToCollection(uid, "categories", setCategories);
    const unsubProds = db.subscribeToCollection(uid, "products", setProducts);
    const unsubSales = db.subscribeToCollection(uid, "sales", setSales);
    return () => {
      unsubCats(); unsubProds(); unsubSales();
    };
  }, []);

  // تسجيل الدخول باستخدام Google
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const userData: User = {
        name: fbUser.displayName || "مستخدم",
        email: fbUser.email || "",
        picture: fbUser.photoURL || "",
        uid: fbUser.uid
      };
      setUser(userData);
      db.saveUser(userData);

      // جلب البيانات من Cloud إذا وجدت
      const cloudData = await db.fetchFromCloud(userData.uid);
      if (cloudData) {
        await db.clearAllLocalData();
        for (const item of cloudData.categories || []) await db.saveItem("categories", item);
        for (const item of cloudData.products || []) await db.saveItem("products", item);
        for (const item of cloudData.sales || []) await db.saveItem("sales", item);
        db.saveEarnings(cloudData.earnings || 0);
      }

      // الاشتراك في Realtime
      subscribeRealtime(userData.uid);
    } catch (err) {
      console.error(err);
      alert("فشل تسجيل الدخول، حاول مرة أخرى.");
    } finally {
      setIsLoading(false);
      setShowAuthModal(false);
    }
  };

  // المراقبة التلقائية لتغير حالة المصادقة
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) handleLogin();
    });
    return () => unsubscribe();
  }, []);

  // تحميل البيانات المحلية عند بدء التطبيق
  useEffect(() => {
    const loadLocal = async () => {
      if (!user) { setIsLoading(false); return; }
      const [cats, prods, salesLog, earnings] = await Promise.all([
        db.getAll<Category>("categories"),
        db.getAll<Product>("products"),
        db.getAll<SaleRecord>("sales"),
        db.getEarnings()
      ]);
      setCategories(cats || []);
      setProducts(prods || []);
      setSales((salesLog || []).sort((a,b)=>b.timestamp-a.timestamp));
      setTotalEarnings(earnings || 0);
      setIsLoading(false);
    };
    loadLocal();
  }, [user]);

  // ===================== التعامل مع المبيعات =====================
  const handleSale = async (productId: string, qty: number, price: number) => {
    const product = products.find(p=>p.id===productId); if(!product) return;
    const sale: SaleRecord = {
      id: Date.now().toString(),
      productId,
      productName: product.name,
      productImage: product.image,
      quantity: qty,
      soldAtPrice: price,
      timestamp: Date.now()
    };
    await db.saveItem("sales", sale);
    setSales(prev => [sale, ...prev]);
    const newEarnings = totalEarnings + (price*qty);
    db.saveEarnings(newEarnings); setTotalEarnings(newEarnings);

    const newQty = product.quantity - qty;
    if(newQty<=0){
      await db.deleteItem("products", productId);
      setProducts(prev => prev.filter(p=>p.id!==productId));
    } else {
      const updated = {...product, quantity:newQty};
      await db.saveItem("products", updated);
      setProducts(prev => prev.map(p=>p.id===productId?updated:p));
    }
    setShowSaleDialog(false);
  };

  // ===================== بقية الدوال (حذف، إضافة منتجات/تصنيفات) =====================
  const handleAddCategory = async (cat: Category) => {
    await db.saveItem("categories", cat);
    setCategories(prev => [...prev.filter(c=>c.id!==cat.id), cat]);
    setShowCategoryForm(false); setEditingCategory(null);
  };

  const handleAddProduct = async (prod: Product) => {
    await db.saveItem("products", prod);
    setProducts(prev => [...prev.filter(p=>p.id!==prod.id), prod]);
    setShowProductForm(false); setEditingProduct(null);
  };

  const handleDeleteProduct = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm("حذف السلعة؟")){ await db.deleteItem("products",id); setProducts(prev=>prev.filter(p=>p.id!==id)); }
  };

  const handleDeleteCategory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm("حذف هذا النوع وجميع سلعه؟")){
      const related = products.filter(p=>p.categoryId===id);
      for(const p of related) await db.deleteItem("products",p.id);
      await db.deleteItem("categories",id);
      setCategories(prev=>prev.filter(c=>c.id!==id));
      setProducts(prev=>prev.filter(p=>p.categoryId!==id));
      if(selectedCategoryId===id){ setView("HOME"); setSelectedCategoryId(null); }
    }
  };

  // ===================== حساب القيم =====================
  const totalInventoryValue = useMemo(()=>{
    return products.reduce((sum,p)=>{
      const price = parseFloat(p.price.split("/")[0].replace(/[^\d.]/g,""))||0;
      return sum + price*p.quantity;
    },0);
  }, [products]);

  const filteredProducts = useMemo(()=>{
    let list = products;
    if(view==="CATEGORY_DETAIL" && selectedCategoryId) list=list.filter(p=>p.categoryId===selectedCategoryId);
    if(searchQuery){ const q=searchQuery.toLowerCase(); list=list.filter(p=>p.name.toLowerCase().includes(q)||p.barcode.includes(q)); }
    return list.sort((a,b)=>sortOrder==="ASC"?a.name.localeCompare(b.name):b.name.localeCompare(a.name));
  }, [products, view, selectedCategoryId, searchQuery, sortOrder]);

  if(isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><RefreshCw className="w-10 h-10 text-blue-600 animate-spin"/></div>;

  if(!user){
    return <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-3xl font-black mb-6">NABIL Inventory</h1>
      <button onClick={()=>setShowAuthModal(true)} className="px-6 py-4 bg-blue-600 text-white rounded-xl font-bold">تسجيل الدخول باستخدام Google</button>
      {showAuthModal && <AuthModal user={null} onLogin={handleLogin} onClose={()=>setShowAuthModal(false)} isSyncing={false} categories={[]} products={[]} onImport={()=>{}} onLogout={()=>{}} onSync={()=>{}} />}
    </div>;
  }

  // ===================== الواجهة الرئيسية =====================
  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 font-['Cairo']">
      {/* يمكنك إضافة باقي واجهة المستخدم كما في الكود القديم */}
      <header className="p-6 bg-white shadow">مرحباً {user.name}</header>
      <main className="p-6">
        <h2>الأرباح الإجمالية: {totalEarnings}</h2>
        <h2>قيمة المخزون: {totalInventoryValue}</h2>
        <button onClick={()=>setShowSaleDialog(true)}>عملية بيع</button>
      </main>
      {showCategoryForm && <CategoryForm onSave={handleAddCategory} onClose={()=>{setShowCategoryForm(false); setEditingCategory(null);}} initialData={editingCategory||undefined}/>}
      {showProductForm && <ProductForm categories={categories} onSave={handleAddProduct} onClose={()=>{setShowProductForm(false); setEditingProduct(null);}} initialData={editingProduct||undefined} defaultCategoryId={selectedCategoryId||undefined}/>}
      {isScanning && <BarcodeScanner onScan={(code)=>{ setView("SEARCH"); setSearchQuery(code); setIsScanning(false); }} onClose={()=>setIsScanning(false)}/>}
      {showSaleDialog && <SaleDialog products={products} onSale={handleSale} onClose={()=>setShowSaleDialog(false)}/>}
    </div>
  );
};

export default App;
