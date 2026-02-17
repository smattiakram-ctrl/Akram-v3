import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Search, Trash2, Edit, Camera, LayoutGrid, 
  ShoppingCart, Tag, User as UserIcon, RefreshCw, Menu, History, Home, X, Percent, Clock, CloudOff, LogIn, TrendingUp, Package, Layers, ChevronLeft,
  SortAsc
} from 'lucide-react';
import { Category, Product, ViewState, User, SaleRecord } from './types';
import * as db from './db';
import CategoryForm from './components/CategoryForm';
import ProductForm from './components/ProductForm';
import BarcodeScanner from './components/BarcodeScanner';
import SaleDialog from './components/SaleDialog';
import AuthModal from './components/AuthModal';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(db.getUser());
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  
  const [view, setView] = useState<ViewState>('HOME');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [isLoading, setIsLoading] = useState(true);

  // ====== Load Local Data ======
  const loadLocalData = useCallback(async () => {
    if (!user) {
      setCategories([]);
      setProducts([]);
      setSales([]);
      setTotalEarnings(0);
      setIsLoading(false);
      return;
    }
    try {
      const [cats, prods, salesLog, earnings] = await Promise.all([
        db.getAll<Category>('categories'),
        db.getAll<Product>('products'),
        db.getAll<SaleRecord>('sales'),
        db.getEarnings()
      ]);
      setCategories(cats || []);
      setProducts(prods || []);
      setSales((salesLog || []).sort((a, b) => b.timestamp - a.timestamp));
      setTotalEarnings(earnings || 0);
    } catch (e) {
      console.error("Data load failed", e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData]);

  // ====== Realtime Firebase Subscriptions ======
  useEffect(() => {
    if (!user) return;

    const unsubscribeCategories = db.subscribeToCategories((cats) => setCategories(cats));
    const unsubscribeProducts = db.subscribeToProducts((prods) => setProducts(prods));
    const unsubscribeSales = db.subscribeToSales((salesLog) => setSales(salesLog.sort((a, b) => b.timestamp - a.timestamp)));
    const unsubscribeEarnings = db.subscribeToEarnings((earnings) => setTotalEarnings(earnings));

    return () => {
      unsubscribeCategories();
      unsubscribeProducts();
      unsubscribeSales();
      unsubscribeEarnings();
    };
  }, [user]);

  // ====== Silent Cloud Sync ======
  useEffect(() => {
    if (user && !isLoading) {
      const timer = setTimeout(() => {
        db.syncToCloud(user.email, { categories, products, sales, earnings: totalEarnings });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [categories, products, sales, totalEarnings, user, isLoading]);

  // ====== Authentication ======
  const handleLogin = async (newUser: User) => {
    setIsLoading(true);
    db.saveUser(newUser);
    setUser(newUser);
    const cloudData = await db.fetchFromCloud(newUser.email);
    if (cloudData) await db.overwriteLocalData(cloudData);
    else await db.clearAllLocalData();
    await loadLocalData();
    setShowAuthModal(false);
  };

  const handleLogout = async () => {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟ سيتم مسح البيانات المحلية لحماية خصوصيتك.')) {
      try {
        await db.logoutUser();
      } finally {
        window.location.reload();
      }
    }
  };

  const handleManualSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await db.syncToCloud(user.email, { categories, products, sales, earnings: totalEarnings });
      alert('تمت المزامنة السحابية بنجاح ✅');
    } catch (e) {
      alert('فشلت المزامنة، يرجى المحاولة لاحقاً');
    } finally {
      setIsSyncing(false);
    }
  };

  // ====== Category & Product Handlers ======
  const handleAddCategory = async (cat: Category) => {
    await db.saveItem('categories', cat);
    setCategories(prev => [...prev.filter(c => c.id !== cat.id), cat]);
    setShowCategoryForm(false);
    setEditingCategory(null);
  };

  const handleAddProduct = async (prod: Product) => {
    await db.saveItem('products', prod);
    setProducts(prev => [...prev.filter(p => p.id !== prod.id), prod]);
    setShowProductForm(false);
    setEditingProduct(null);
  };

  // ====== Sale Handler ======
  const handleSale = async (productId: string, qty: number, price: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const sale: SaleRecord = {
      id: Date.now().toString(),
      productId,
      productName: product.name,
      productImage: product.image,
      quantity: qty,
      soldAtPrice: price,
      timestamp: Date.now()
    };

    await db.saveItem('sales', sale);

    const newEarnings = totalEarnings + (price * qty);
    db.saveEarnings(newEarnings);
    setTotalEarnings(newEarnings);

    setSales(prev => [sale, ...prev]);

    const newQty = product.quantity - qty;
    if (newQty <= 0) {
      await db.deleteItem('products', productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } else {
      const updated = { ...product, quantity: newQty };
      await db.saveItem('products', updated);
      setProducts(prev => prev.map(p => p.id === productId ? updated : p));
    }

    setShowSaleDialog(false);
  };

  // ====== Delete Handlers ======
  const handleDeleteProduct = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('حذف السلعة؟')) {
      await db.deleteItem('products', id);
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleDeleteCategory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('حذف هذا النوع وجميع سلعه؟')) {
      const related = products.filter(p => p.categoryId === id);
      for (const p of related) await db.deleteItem('products', p.id);
      await db.deleteItem('categories', id);
      setCategories(prev => prev.filter(c => c.id !== id));
      setProducts(prev => prev.filter(p => p.categoryId !== id));
      if (selectedCategoryId === id) { setView('HOME'); setSelectedCategoryId(null); }
    }
  };

  const handleImport = async (data: any) => {
    try {
      setIsSyncing(true);
      await db.overwriteLocalData(data);
      await loadLocalData();
      alert('تم استيراد البيانات بنجاح!');
      setShowAuthModal(false);
    } catch (err) {
      console.error('Import failed', err);
      alert('فشل استيراد البيانات.');
    } finally {
      setIsSyncing(false);
    }
  };

  // ====== Derived States ======
  const totalInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => {
      const price = parseFloat(p.price.split('/')[0].replace(/[^\d.]/g, '')) || 0;
      return sum + (price * p.quantity);
    }, 0);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (view === 'CATEGORY_DETAIL' && selectedCategoryId) {
      list = list.filter(p => p.categoryId === selectedCategoryId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q));
    }
    return list.sort((a, b) => sortOrder === 'ASC' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  }, [products, view, selectedCategoryId, searchQuery, sortOrder]);

  // ====== Loading & Auth UI ======
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><RefreshCw className="w-10 h-10 text-blue-600 animate-spin" /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden font-['Cairo']">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/10 blur-[100px] rounded-full"></div>
        <div className="relative z-10 max-w-sm">
          <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[4rem] border border-white/10 mb-10 shadow-2xl">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3">
              <Package className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white mb-3">NABIL Cloud</h1>
            <p className="text-gray-400 font-medium leading-relaxed">أدر تجارتك بذكاء. مخزنك سحابي بالكامل، ومرتبط بحسابك فقط.</p>
          </div>
          <button onClick={() => setShowAuthModal(true)} className="w-full bg-white text-blue-900 py-6 rounded-3xl font-black text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
            <LogIn className="w-6 h-6" /> تسجيل الدخول للبدء
          </button>
        </div>
        {showAuthModal && <AuthModal user={null} onLogin={handleLogin} onLogout={() => {}} onSync={() => {}} onClose={() => setShowAuthModal(false)} isSyncing={false} categories={[]} products={[]} onImport={() => {}} />}
      </div>
    );
  }

  // ====== Rest of your UI (same as original) ======
  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 font-['Cairo']">
      {/* The rest of your UI (sidebar, header, main, modals, bottom nav) remains unchanged */}
      {/* Copy everything from your original App.tsx starting from <div className="fixed top-0 right-0 ... */}
      {/* Only change is إضافة الـ useEffect للـ Realtime كما في الأعلى */}
    </div>
  );
};

export default App;
