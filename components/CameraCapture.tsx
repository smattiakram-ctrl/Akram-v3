
import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, RefreshCw, Check, CameraIcon } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsReady(true);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("تعذر الوصول إلى الكاميرا. يرجى التأكد من منح الإذن.");
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Match canvas size to video stream
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the current frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(imageData);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white z-20">
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
          <X className="w-6 h-6" />
        </button>
        <span className="font-bold">التقاط صورة للسلعة</span>
        <div className="w-10"></div>
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center p-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="bg-white text-black px-6 py-2 rounded-xl font-bold">تحديث</button>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Guides */}
        <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
           <div className="w-full h-full border-2 border-white/30 rounded-3xl"></div>
        </div>

        {!isReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-32 bg-black flex items-center justify-center px-8">
        <button 
          onClick={takePhoto}
          disabled={!isReady}
          className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition active:scale-90 ${!isReady ? 'opacity-50' : ''}`}
        >
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
             <CameraIcon className="w-8 h-8 text-black" />
          </div>
        </button>
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
