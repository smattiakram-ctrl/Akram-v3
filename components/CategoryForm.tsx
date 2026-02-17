
import React, { useState } from 'react';
import { Category } from '../types';
import ImagePicker from './ImagePicker';
import { X } from 'lucide-react';

interface CategoryFormProps {
  onSave: (category: Category) => void;
  onClose: () => void;
  initialData?: Category;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ onSave, onClose, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [image, setImage] = useState(initialData?.image || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !image) {
      alert('يرجى اختيار صورة وكتابة اسم النوع');
      return;
    }
    onSave({
      id: initialData?.id || Date.now().toString(),
      name,
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
          aria-label="إغلاق"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-black mb-8 text-gray-800 border-r-4 border-blue-600 pr-3 leading-none">
          {initialData ? 'تعديل النوع' : 'إضافة نوع جديد'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">صورة النوع</label>
            <ImagePicker onImageSelected={setImage} initialImage={image} />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">اسم النوع</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
              placeholder="مثال: إلكترونيات، أثاث..."
              required
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-100 active:scale-[0.98]"
            >
              {initialData ? 'تحديث البيانات' : 'حفظ النوع الجديد'}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold text-md hover:bg-gray-200 transition active:scale-[0.98]"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;
