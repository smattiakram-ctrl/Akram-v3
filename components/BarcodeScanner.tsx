
import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader";

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(scannerId);
    scannerRef.current = html5QrCode;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_39,
      ]
    };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        // Stop scanning on success
        html5QrCode.stop().then(() => {
          onScan(decodedText);
        }).catch(() => {
          onScan(decodedText);
        });
      },
      (errorMessage) => {
        // This callback is called on every frame where no code is found
      }
    ).then(() => {
      setIsInitializing(false);
    }).catch((err) => {
      console.error(err);
      setError('تعذر الوصول إلى الكاميرا. يرجى التأكد من منح الأذونات واختيار متصفح يدعم الكاميرا.');
      setIsInitializing(false);
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan]);

  const handleManualEntry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const barcode = formData.get('barcode') as string;
    if (barcode) onScan(barcode);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 left-6 z-20 p-2 bg-white/80 hover:bg-white rounded-full text-gray-800 shadow-md transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="aspect-square bg-gray-900 flex items-center justify-center relative overflow-hidden">
          <div id={scannerId} className="w-full h-full"></div>
          
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900 z-10">
              <RefreshCw className="w-10 h-10 animate-spin mb-4 text-blue-400" />
              <p className="font-bold">جاري تشغيل الكاميرا...</p>
            </div>
          )}

          {!error && !isInitializing && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-blue-500 rounded-2xl">
                <div className="scanner-laser"></div>
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl -m-1"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl -m-1"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl -m-1"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl -m-1"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900 p-8 text-center">
              <AlertCircle className="w-16 h-16 mb-4 text-red-500" />
              <p className="text-lg font-bold mb-2">خطأ في الكاميرا</p>
              <p className="text-gray-400 text-sm mb-6">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="bg-white text-gray-900 px-6 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> تحديث الصفحة
              </button>
            </div>
          )}
        </div>

        <div className="p-8">
          <h3 className="text-xl font-black mb-2 text-gray-800">مسح الباركود أو QR</h3>
          <p className="text-sm text-gray-500 mb-6">وجه الكاميرا نحو الرمز ليتم التعرف عليه تلقائياً.</p>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400 font-bold">أو الإدخال يدوياً</span>
            </div>
          </div>

          <form onSubmit={handleManualEntry} className="mt-6 flex gap-2">
            <input 
              name="barcode"
              type="text" 
              placeholder="أدخل الرمز هنا..." 
              className="flex-1 px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-left"
              dir="ltr"
              autoFocus
            />
            <button 
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
            >
              تأكيد
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
