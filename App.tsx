
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

  // المزامنة التلقائية (هادئة)
  useEffect(() => {
    if (user && !isLoading) {
      const timer = setTimeout(() => {
        db.syncToCloud(user.email, { categories, products, sales, earnings: totalEarnings });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [categories, products, sales, totalEarnings, user, isLoading]);

  const handleLogin = async (newUser: User) => {
    setIsLoading(true);
    db.saveUser(newUser);
    setUser(newUser);
    const cloudData = await db.fetchFromCloud(newUser.email);
    if (cloudData) {
      await db.overwriteLocalData(cloudData);
    } else {
      await db.clearAllLocalData();
    }
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

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 font-['Cairo']">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={() => setIsSidebarOpen(false)}></div>}
      
      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white z-[70] shadow-2xl transition-all duration-500 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl text-white"><Package className="w-6 h-6" /></div>
              <h2 className="text-2xl font-black text-blue-900 leading-none">الإعدادات</h2>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
          </div>
          <nav className="flex-1 space-y-4">
            <button onClick={() => { setView('HOME'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-bold transition-all ${view === 'HOME' ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
              <Home className="w-6 h-6" /> لوحة التحكم
            </button>
            <button onClick={() => { setView('SALES_LOG'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-5 rounded-3xl font-bold transition-all ${view === 'SALES_LOG' ? 'bg-orange-50 text-orange-700' : 'text-gray-500'}`}>
              <History className="w-6 h-6" /> سجل العمليات
            </button>
          </nav>
          <div className="pt-8 border-t space-y-4">
             <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white">
                <p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest">الحساب النشط</p>
                <div className="flex items-center gap-3">
                  <img src={user.picture} className="w-10 h-10 rounded-full border-2 border-white/20" />
                  <span className="font-bold truncate text-sm">{user.name}</span>
                </div>
             </div>
             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 p-5 text-red-500 font-black bg-red-50 rounded-3xl hover:bg-red-100 transition active:scale-95">
              <CloudOff className="w-5 h-5" /> تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

      {/* Header with Enhanced Search */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-gray-100 shadow-sm gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-900 bg-slate-50 rounded-xl hover:bg-slate-100 transition"><Menu className="w-6 h-6" /></button>
          <h1 className="text-lg font-black text-blue-700 md:block hidden tracking-tighter">NABIL Inventory</h1>
        </div>
        
        <div className="flex-1 max-w-xl relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="ابحث بالاسم أو الباركود..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if(view === 'HOME' && e.target.value) setView('SEARCH');
              else if(view === 'SEARCH' && !e.target.value) setView('HOME');
            }}
            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
           <button onClick={() => setShowAuthModal(true)} className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-blue-50 shadow-sm hover:scale-105 transition active:scale-95">
             <img src={user.picture} className="w-full h-full object-cover" />
           </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {(view === 'HOME' || view === 'SEARCH') && (
          <div className="space-y-10">
             {view === 'HOME' && !searchQuery && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                     <TrendingUp className="absolute top-[-20px] left-[-20px] w-40 h-40 opacity-10 group-hover:scale-110 transition-transform" />
                     <p className="text-blue-100 text-[10px] font-black uppercase mb-1">إجمالي الفائدة</p>
                     <div className="text-3xl font-black">{totalEarnings.toLocaleString('fr-DZ')} <span className="text-sm">د.ج</span></div>
                  </div>
                  <div className="bg-white p-8 rounded-[3rem] border shadow-xl flex flex-col justify-center border-slate-50">
                     <p className="text-slate-400 text-[10px] font-black uppercase mb-1">قيمة المخزن</p>
                     <p className="text-2xl font-black text-slate-900">{totalInventoryValue.toLocaleString('fr-DZ')} <span className="text-xs">د.ج</span></p>
                  </div>
                  <div className="bg-white p-8 rounded-[3rem] border shadow-xl flex flex-col justify-center border-slate-50">
                     <p className="text-slate-400 text-[10px] font-black uppercase mb-1">إجمالي السلع</p>
                     <p className="text-2xl font-black text-slate-900">{products.length} <span className="text-xs">سلعة</span></p>
                  </div>
               </div>
             )}

             {view === 'HOME' && !searchQuery && (
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button onClick={() => setShowProductForm(true)} className="p-6 bg-green-500 text-white rounded-[2.5rem] font-black flex flex-col items-center gap-3 shadow-lg active:scale-95 transition hover:bg-green-600">
                     <Plus className="w-8 h-8" /> <span>إضافة سلعة</span>
                  </button>
                  <button onClick={() => setIsScanning(true)} className="p-6 bg-blue-500 text-white rounded-[2.5rem] font-black flex flex-col items-center gap-3 shadow-lg active:scale-95 transition hover:bg-blue-600">
                     <Camera className="w-8 h-8" /> <span>مسح باركود</span>
                  </button>
                  <button onClick={() => setShowSaleDialog(true)} className="p-6 bg-orange-500 text-white rounded-[2.5rem] font-black flex flex-col items-center gap-3 shadow-lg active:scale-95 transition hover:bg-orange-600">
                     <ShoppingCart className="w-8 h-8" /> <span>عملية بيع</span>
                  </button>
                  <button onClick={() => setShowCategoryForm(true)} className="p-6 bg-slate-800 text-white rounded-[2.5rem] font-black flex flex-col items-center gap-3 shadow-lg active:scale-95 transition hover:bg-slate-900">
                     <LayoutGrid className="w-8 h-8" /> <span>صنف جديد</span>
                  </button>
               </div>
             )}

             <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-900 flex items-center justify-between">
                  {searchQuery ? `نتائج البحث (${filteredProducts.length})` : 'الأصناف الرئيسية'}
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">إلغاء البحث</button>}
                </h3>
                
                {searchQuery ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-in slide-in-from-bottom-4">
                    {filteredProducts.map(p => (
                      <div key={p.id} className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all">
                        <div className="aspect-square relative overflow-hidden bg-slate-50">
                          <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute bottom-3 right-3 bg-blue-600 text-white text-[10px] px-4 py-1.5 rounded-full font-black">{p.quantity} قطعة</div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                          <h4 className="font-black text-slate-900 mb-2 truncate text-sm">{p.name}</h4>
                          <div className="text-xl font-black text-blue-700 mb-6">{p.price.split('/')[0]} <span className="text-[10px]">د.ج</span></div>
                          <div className="flex gap-2 mt-auto">
                            <button onClick={() => { setEditingProduct(p); setShowProductForm(true); }} className="p-3 bg-blue-50 text-blue-500 rounded-2xl flex-1 flex justify-center hover:bg-blue-500 hover:text-white transition-all"><Edit className="w-5 h-5" /></button>
                            <button onClick={(e) => handleDeleteProduct(e, p.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl flex-1 flex justify-center hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {categories.map(c => (
                      <div key={c.id} className="group bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all cursor-pointer active:scale-[0.98]" onClick={() => { setSelectedCategoryId(c.id); setView('CATEGORY_DETAIL'); }}>
                        <div className="aspect-square relative overflow-hidden">
                          <button onClick={(e) => handleDeleteCategory(e, c.id)} className="absolute top-3 left-3 z-10 p-2 bg-red-50/80 backdrop-blur-sm text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-500 hover:text-white"><Trash2 className="w-4 h-4" /></button>
                          <img src={c.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="p-5 text-center">
                          <p className="font-black text-slate-800 text-sm truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">{products.filter(p => p.categoryId === c.id).length} سلع</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        )}

        {view === 'SALES_LOG' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView('HOME')} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition"><ChevronLeft className="w-6 h-6 rotate-180" /></button>
              <h2 className="text-2xl font-black text-slate-900">سجل العمليات</h2>
            </div>
            {sales.length === 0 ? (
              <div className="text-center py-20 text-slate-300 font-bold">لا توجد مبيعات مسجلة بعد</div>
            ) : sales.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex items-center justify-between hover:border-orange-200 transition-colors">
                <div className="flex items-center gap-6">
                  <img src={s.productImage} className="w-16 h-16 rounded-2xl object-cover border" />
                  <div>
                    <h4 className="font-black text-slate-900">{s.productName}</h4>
                    <span className="text-[10px] text-slate-400 font-black"><Clock className="w-3 h-3 inline" /> {new Date(s.timestamp).toLocaleTimeString('ar-DZ')}</span>
                  </div>
                </div>
                <div className="text-left font-black text-xl text-green-600">+{s.soldAtPrice.toLocaleString('fr-DZ')} د.ج</div>
              </div>
            ))}
          </div>
        )}

        {view === 'CATEGORY_DETAIL' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => { setView('HOME'); setSelectedCategoryId(null); }} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition"><ChevronLeft className="w-6 h-6 rotate-180" /></button>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{categories.find(c => c.id === selectedCategoryId)?.name}</h2>
                  <p className="text-slate-400 font-bold text-sm">يحتوي هذا الصنف على {filteredProducts.length} سلع</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowProductForm(true)} 
                  className="bg-blue-600 text-white px-6 py-4 rounded-3xl font-black text-sm flex items-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition"
                >
                  <Plus className="w-6 h-6" /> إضافة سلعة هنا
                </button>
                <button onClick={() => setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')} className="p-4 bg-white rounded-2xl border text-slate-600 hover:bg-slate-50 transition"><SortAsc className={`w-6 h-6 ${sortOrder === 'DESC' ? 'rotate-180' : ''}`} /></button>
              </div>
            </div>
            
            {filteredProducts.length === 0 ? (
              <div className="text-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                 <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                 <p className="text-slate-400 font-bold">لا توجد سلع في هذا الصنف حالياً</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredProducts.map(p => (
                  <div key={p.id} className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all duration-300">
                    <div className="aspect-square relative overflow-hidden bg-slate-50">
                      <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute bottom-3 right-3 bg-blue-600 text-white text-[10px] px-4 py-1.5 rounded-full font-black shadow-lg shadow-blue-900/20">{p.quantity} قطعة</div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h4 className="font-black text-slate-900 mb-2 truncate text-sm">{p.name}</h4>
                      <div className="text-xl font-black text-blue-700 mb-6">{p.price.split('/')[0]} <span className="text-[10px]">د.ج</span></div>
                      <div className="flex gap-2 mt-auto">
                        <button onClick={() => { setEditingProduct(p); setShowProductForm(true); }} className="p-3 bg-blue-50 text-blue-500 rounded-2xl flex-1 flex justify-center hover:bg-blue-500 hover:text-white transition-all"><Edit className="w-5 h-5" /></button>
                        <button onClick={(e) => handleDeleteProduct(e, p.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl flex-1 flex justify-center hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global Modals */}
      {showCategoryForm && <CategoryForm onSave={handleAddCategory} onClose={() => {setShowCategoryForm(false); setEditingCategory(null);}} initialData={editingCategory || undefined} />}
      {showProductForm && <ProductForm categories={categories} onSave={handleAddProduct} onClose={() => {setShowProductForm(false); setEditingProduct(null);}} initialData={editingProduct || undefined} defaultCategoryId={selectedCategoryId || undefined} />}
      {isScanning && <BarcodeScanner onScan={(code) => { setView('SEARCH'); setSearchQuery(code); setIsScanning(false); }} onClose={() => setIsScanning(false)} />}
      {showSaleDialog && <SaleDialog products={products} onSale={handleSale} onClose={() => setShowSaleDialog(false)} />}
      {showAuthModal && <AuthModal user={user} onLogin={handleLogin} onLogout={handleLogout} onSync={handleManualSync} onClose={() => setShowAuthModal(false)} isSyncing={isSyncing} categories={categories} products={products} onImport={handleImport} />}
      
      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 inset-x-0 h-20 bg-white/95 backdrop-blur-md border-t flex items-center justify-around md:hidden z-50 px-4">
         <button onClick={() => {setView('HOME'); setSelectedCategoryId(null); setSearchQuery('');}} className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-colors ${view === 'HOME' ? 'text-blue-600' : 'text-gray-400'}`}>
            <Home className="w-6 h-6" /> <span className="text-[8px] font-black uppercase">الرئيسية</span>
         </button>
         <button onClick={() => setShowSaleDialog(true)} className="w-14 h-14 bg-orange-500 text-white rounded-[1.5rem] shadow-xl shadow-orange-200 flex items-center justify-center -translate-y-6 border-4 border-[#f8fafc] active:scale-90 transition transform duration-200">
            <ShoppingCart className="w-7 h-7" />
         </button>
         <button onClick={() => setView('SALES_LOG')} className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-colors ${view === 'SALES_LOG' ? 'text-orange-600' : 'text-gray-400'}`}>
            <History className="w-6 h-6" /> <span className="text-[8px] font-black uppercase">السجلات</span>
         </button>
      </div>
    </div>
  );
};

export default App;
