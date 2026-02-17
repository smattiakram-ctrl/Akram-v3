
import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Upload, X } from 'lucide-react';
import CameraCapture from './CameraCapture';

interface ImagePickerProps {
  onImageSelected: (base64: string) => void;
  initialImage?: string;
}

const ImagePicker: React.FC<ImagePickerProps> = ({ onImageSelected, initialImage }) => {
  const [preview, setPreview] = useState<string | null>(initialImage || null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreview(base64);
        onImageSelected(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = (base64: string) => {
    setPreview(base64);
    onImageSelected(base64);
    setIsCameraOpen(false);
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onImageSelected('');
  };

  return (
    <div className="space-y-3">
      <div 
        className={`relative w-full h-56 rounded-2xl overflow-hidden border-2 border-dashed transition-all flex items-center justify-center bg-gray-50 ${
          preview ? 'border-blue-500' : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <button 
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="text-center p-6">
            <div className="bg-gray-100 p-4 rounded-full inline-block mb-3">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium text-sm">لم يتم اختيار صورة بعد</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setIsCameraOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-3 px-4 rounded-xl font-bold hover:bg-blue-100 transition border border-blue-100"
        >
          <Camera className="w-5 h-5" />
          <span>الكاميرا</span>
        </button>
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-bold hover:bg-gray-200 transition border border-gray-200"
        >
          <Upload className="w-5 h-5" />
          <span>المعرض</span>
        </button>
      </div>

      {/* Internal Camera View */}
      {isCameraOpen && (
        <CameraCapture 
          onCapture={handleCapture}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* Hidden Gallery Input only */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default ImagePicker;
