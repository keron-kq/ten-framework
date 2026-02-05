"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function QRCodePage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const qrCodeUrl = process.env.NEXT_PUBLIC_QR_CODE_PATH || "/pictures/QR.png";

  useEffect(() => {
    // 自动尝试全屏
    const timer = setTimeout(() => {
      if (document.fullscreenEnabled) {
        document.documentElement.requestFullscreen?.().catch(err => {
          console.log("Fullscreen request failed:", err);
        });
      }
    }, 100);

    // 监听全屏状态变化
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // 监听 ESC 键退出
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center relative">
      {/* QR Code Image */}
      <div className="relative w-full h-full flex items-center justify-center p-8">
        <img
          src={qrCodeUrl}
          alt="扫码观看"
          className="max-w-full max-h-full object-contain"
          style={{ maxWidth: "800px", maxHeight: "800px" }}
        />
      </div>
      
      {/* Instructions */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center">
        <div className="bg-black/70 px-6 py-3 rounded-lg border border-[#FFCC00]/50 backdrop-blur-sm">
          <div className="text-2xl font-bold text-[#FFCC00] mb-2">扫码观看实时示波器屏幕</div>
          <div className="text-sm text-white/70">按 F 进入全屏 | 按 ESC 退出全屏</div>
        </div>
      </div>

      {/* Fullscreen Toggle Button */}
      {!isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-[#FFCC00] text-black font-bold rounded-lg hover:bg-[#FFD700] transition-all shadow-lg"
        >
          点击进入全屏
        </button>
      )}
      
      {/* RIGOL Branding */}
      <div className="absolute bottom-4 right-4 text-[#FFCC00] text-sm opacity-50">
        RIGOL AI FORUM 2026
      </div>
    </div>
  );
}
