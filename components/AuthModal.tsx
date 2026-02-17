
import React, { useState, useRef } from 'react';
import { User, SaleRecord } from '../types';
import { X, Cloud, LogOut, User as UserIcon, Mail, Download, Upload, CheckCircle2, RefreshCcw } from 'lucide-react';
import * as db from '../db';

interface AuthModalProps {
  user: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
  onSync: () => void;
  onClose: () => void;
  isSyncing: boolean;
  categories: any[];
  products: any[];
  onImport: (data: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ user, onLogin, onLogout, onSync, onClose, isSyncing, categories, products, onImport }) => {
  const [emailInput, setEmailInput] = useState('');
  const [showManualLogin, setShowManualLogin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMockGoogleLogin = () => {
    if (!emailInput.includes('@')) {
      alert('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    const mockUser: User = {
      email: emailInput.toLowerCase(),
      name: emailInput.split('@')[0],
      picture: `https://ui-avatars.com/api/?name=${emailInput}&background=1d4ed8&color=fff`,
    };
    onLogin(mockUser);
  };

  const handleExport = async () => {
    // جلب كافة البيانات بما فيها سجل المبيعات للتصدير
    const sales = await db.getAll<SaleRecord>('sales');
    const earnings = db.getEarnings();
    
    db.exportDataAsJSON({ 
      categories, 
      products, 
      sales,
      earnings,
      exportDate: new Date().toISOString() 
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (json.categories && json.products) {
            onImport(json);
          } else {
            alert('ملف غير صالح. يرجى اختيار ملف نسخة احتياطية من تطبيق نبيل.');
          }
        } catch (err) {
          alert('خطأ في قراءة الملف.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 left-6 z-20 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-800 transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-100 p-3 rounded-2xl">
              <Cloud className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 leading-tight">الحساب السحابي</h2>
              <p className="text-xs text-gray-500 font-bold">مزامنة وحماية بيانات مخزنك</p>
            </div>
          </div>

          {user ? (
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-[2rem] flex items-center gap-4 border border-blue-100">
                <img src={user.picture} className="w-16 h-16 rounded-full border-4 border-white shadow-sm" alt={user.name} />
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-black text-gray-800 truncate">{user.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold truncate">{user.email}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 font-black uppercase">
                    <CheckCircle2 className="w-3 h-3" /> حسابك متصل
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={onSync}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition shadow-xl shadow-blue-100 disabled:opacity-50"
                >
                  <RefreshCcw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                  مزامنة سحابية فورية
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleExport}
                    className="flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 border border-gray-100 transition"
                  >
                    <Upload className="w-4 h-4" /> تصدير نسخة
                  </button>
                  <button 
                    onClick={handleImportClick}
                    className="flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 border border-gray-100 transition"
                  >
                    <Download className="w-4 h-4" /> استيراد بيانات
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition"
                >
                  <LogOut className="w-5 h-5" /> تسجيل الخروج
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                   <UserIcon className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 text-sm font-medium px-4">قم بتسجيل الدخول لحماية بياناتك من الحذف عند تحديث المتصفح أو تغيير الهاتف.</p>
              </div>

              {!showManualLogin ? (
                <button 
                  onClick={() => setShowManualLogin(true)}
                  className="w-full flex items-center justify-center gap-3 py-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition active:scale-95"
                >
                  <img src="https://www.svgrepo.com/show/355037/google.svg" className="w-6 h-6" alt="Google" />
                  تسجيل الدخول عبر Gmail
                </button>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="relative">
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type="email" 
                      placeholder="بريدك الإلكتروني" 
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pr-12 pl-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold text-sm transition focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button 
                    onClick={handleMockGoogleLogin}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition"
                  >
                    دخول ومزامنة
                  </button>
                  <button onClick={() => setShowManualLogin(false)} className="w-full text-xs font-bold text-gray-400">إلغاء</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
    </div>
  );
};

export default AuthModal;
