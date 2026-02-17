
import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import ImagePicker from './ImagePicker';
import { X, ScanBarcode, Tag, BadgePercent } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';

interface ProductFormProps {
  categories: Category[];
  onSave: (product: Product) => void;
  onClose: () => void;
  initialData?: Product;
  defaultCategoryId?: string;
}

const ProductForm: React.FC<ProductFormProps> = ({ 
  categories, 
  onSave, 
  onClose, 
  initialData, 
  defaultCategoryId 
}) => {
  // تحليل السعر الأولي إذا كان موجوداً (تفصيل/جملة)
  const initialRetail = initialData?.price.split('/')[0] || '';
  const initialWholesale = initialData?.price.split('/')[1] || '';

  const [name, setName] = useState(initialData?.name || '');
  const [retailPrice, setRetailPrice] = useState(initialRetail);
  const [wholesalePrice, setWholesalePrice] = useState(initialWholesale);
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || '0');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || defaultCategoryId || (categories.length > 0 ? categories[0].id : ''));
  const [barcode, setBarcode] = useState(initialData?.barcode || '');
  const [image, setImage] = useState(initialData?.image || '');
  const [isScanning, setIsScanning] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !retailPrice || !categoryId || !image || !quantity) {
      alert('يرجى ملء جميع الحقول الإلزامية واختيار صورة');
      return;
    }

    // دمج السعرين في نص واحد: تفصيل/جملة
    const finalPrice = wholesalePrice ? `${retailPrice}/${wholesalePrice}` : retailPrice;

    onSave({
      id: initialData?.id || Date.now().toString(),
      name,
      price: finalPrice,
      quantity: parseInt(quantity, 10),
      categoryId,
      barcode,
      image
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-[2rem] w-full max-w-md p-8 relative shadow-2xl animate-in zoom-in-95 duration-200 my-8">
        <button 
          onClick={onClose} 
          className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-black mb-8 text-gray-800 border-r-4 border-green-600 pr-3 leading-none">
          {initialData ? 'تعديل السلعة' : 'إضافة سلعة جديدة'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">صورة المنتج</label>
            <ImagePicker onImageSelected={setImage} initialImage={image} />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">اسم المنتج</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-bold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-blue-700 flex items-center gap-1">
                <Tag className="w-3 h-3" /> سعر التفصيل
              </label>
              <input 
                type="text" 
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
                placeholder="مثال: 2400"
                className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-black text-blue-700"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-600 flex items-center gap-1">
                <BadgePercent className="w-3 h-3" /> سعر الجملة
              </label>
              <input 
                type="text" 
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value)}
                placeholder="مثال: 2200"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">الكمية</label>
              <input 
                type="number" 
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-bold"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">النوع</label>
              <select 
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-bold"
                required
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">الباركود</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono transition text-left"
                dir="ltr"
                placeholder="00000000"
              />
              <button 
                type="button"
                onClick={() => setIsScanning(true)}
                className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition"
              >
                <ScanBarcode className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button 
              type="submit"
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-lg hover:bg-green-700 transition shadow-xl shadow-green-100 active:scale-[0.98]"
            >
              {initialData ? 'تحديث البيانات' : 'حفظ السلعة'}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold text-md hover:bg-gray-200 transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>

      {isScanning && (
        <BarcodeScanner 
          onScan={(code) => {
            setBarcode(code);
            setIsScanning(false);
          }}
          onClose={() => setIsScanning(false)}
        />
      )}
    </div>
  );
};

export default ProductForm;
