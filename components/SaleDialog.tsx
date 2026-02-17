
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { X, Search, Camera, ShoppingCart, Minus, Plus, AlertCircle, CheckCircle2, ArrowLeft, Tag, DollarSign, RefreshCw } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';

interface SaleDialogProps {
  products: Product[];
  onSale: (productId: string, quantity: number, soldAtPrice: number) => void;
  onClose: () => void;
}

const SaleDialog: React.FC<SaleDialogProps> = ({ products, onSale, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [identifiedProduct, setIdentifiedProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [soldAtPrice, setSoldAtPrice] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setIdentifiedProduct(null);
      return;
    }
    
    const found = products.find(p => 
      p.barcode === searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setIdentifiedProduct(found || null);
  }, [searchQuery, products]);

  const handleIdentifyConfirm = () => {
    if (identifiedProduct) {
      setSelectedProduct(identifiedProduct);
      setQuantity(1);
      const retail = identifiedProduct.price.split('/')[0].replace(/[^\d.]/g, '');
      setSoldAtPrice(retail);
    }
  };

  const handleSaleFinalConfirm = async () => {
    if (selectedProduct && !isProcessing) {
      const priceVal = parseFloat(soldAtPrice);
      if (isNaN(priceVal) || priceVal <= 0) {
        alert('يرجى إدخال سعر بيع صحيح');
        return;
      }
      if (quantity > selectedProduct.quantity) {
        alert('الكمية المطلوبة أكبر من المتوفرة في المخزن!');
        return;
      }
      
      setIsProcessing(true);
      try {
        await onSale(selectedProduct.id, quantity, priceVal);
        // التابع handleSale في App سيقوم بإغلاق هذا الحوار
      } catch (err) {
        setIsProcessing(false);
        alert('حدث خطأ أثناء إتمام البيع.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-300">
        {/* زر إغلاق دائم ومسؤول */}
        <button 
          onClick={onClose}
          className="absolute top-6 left-6 z-30 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-800 transition shadow-sm active:scale-95"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-orange-100 p-3 rounded-2xl">
              <ShoppingCart className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 leading-tight">بيع سلعة</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">تتبع مبيعاتك وأرباحك بدقة</p>
            </div>
          </div>

          {!selectedProduct ? (
            <div className="space-y-6">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="امسح الباركود أو اكتب الاسم..."
                    className="w-full pr-10 pl-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition text-sm font-bold"
                    autoFocus
                  />
                </div>
                <button 
                  onClick={() => setIsScanning(true)}
                  className="bg-orange-500 text-white p-4 rounded-2xl shadow-lg shadow-orange-100 active:scale-95 transition"
                >
                  <Camera className="w-6 h-6" />
                </button>
              </div>

              {identifiedProduct ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="bg-blue-50 border-2 border-blue-200 p-5 rounded-[2rem] space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md bg-white border border-blue-100">
                        <img src={identifiedProduct.image} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-black text-gray-800 text-lg leading-tight">{identifiedProduct.name}</h4>
                        <p className="text-blue-700 font-black text-sm flex items-center gap-1 mt-1">
                          <Tag className="w-3 h-3" /> {identifiedProduct.price.split('/')[0]} د.ج
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">المتوفر: {identifiedProduct.quantity} قطعة</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleIdentifyConfirm}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      تأكيد السلعة للمتابعة
                    </button>
                  </div>
                </div>
              ) : searchQuery && (
                <div className="text-center py-10 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                  <AlertCircle className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-400 font-bold">هذه السلعة غير موجودة في مخزنك</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
              <div className="bg-gray-50 p-6 rounded-[2rem] text-center border-b-4 border-orange-500 relative">
                 <button 
                   onClick={() => setSelectedProduct(null)}
                   className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
                 >
                   <ArrowLeft className="w-4 h-4" />
                 </button>
                 <h3 className="font-black text-gray-800 text-xl mb-1 leading-tight">{selectedProduct.name}</h3>
                 <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-gray-400 font-bold uppercase">السعر المرجعي:</span>
                    <span className="text-gray-600 font-black">{selectedProduct.price.split('/')[0]} د.ج</span>
                 </div>
              </div>

              <div className="space-y-4">
                <label className="block text-center text-sm font-bold text-gray-600 uppercase tracking-tighter">سعر البيع الفعلي (د.ج)</label>
                <div className="relative">
                   <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 w-5 h-5" />
                   <input 
                     type="number"
                     value={soldAtPrice}
                     onChange={(e) => setSoldAtPrice(e.target.value)}
                     placeholder="أدخل السعر..."
                     className="w-full pr-12 pl-4 py-4 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition text-xl font-black text-orange-700 text-center"
                   />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-center text-sm font-bold text-gray-600 uppercase tracking-tighter">الكمية المباعة</label>
                <div className="flex items-center justify-between bg-white border-2 border-gray-100 p-2 rounded-3xl shadow-inner">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-2xl text-gray-600 hover:bg-gray-200 transition active:scale-95"
                  >
                    <Minus className="w-6 h-6" />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-black text-gray-800 leading-none">{quantity}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">من أصل {selectedProduct.quantity}</span>
                  </div>
                  <button 
                    onClick={() => setQuantity(Math.min(selectedProduct.quantity, quantity + 1))}
                    className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-2xl text-gray-600 hover:bg-gray-200 transition active:scale-95"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="bg-green-50 p-5 rounded-[2rem] border border-green-100 flex justify-between items-center group">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-green-800 uppercase tracking-wider">إجمالي عملية البيع</span>
                    <span className="text-2xl font-black text-green-600 leading-none mt-1">
                      {((parseFloat(soldAtPrice) || 0) * quantity).toLocaleString('fr-DZ')} <span className="text-xs">د.ج</span>
                    </span>
                 </div>
                 <CheckCircle2 className="w-8 h-8 text-green-200 group-hover:text-green-400 transition-colors" />
              </div>

              <button 
                onClick={handleSaleFinalConfirm}
                disabled={isProcessing}
                className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black text-xl hover:bg-orange-700 transition shadow-xl shadow-orange-100 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    جاري التسجيل...
                  </>
                ) : (
                  'تأكيد البيع وإضافة للأرباح'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {isScanning && (
        <BarcodeScanner 
          onScan={(code) => {
            setSearchQuery(code);
            setIsScanning(false);
          }}
          onClose={() => setIsScanning(false)}
        />
      )}
    </div>
  );
};

export default SaleDialog;
