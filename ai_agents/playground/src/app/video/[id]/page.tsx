"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function VideoPage() {
  const params = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoId = params.id as string;
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const videoUrls: Record<string, string> = {
    "1": process.env.NEXT_PUBLIC_VIDEO_1_PATH || "/videos/MV.mp4",
    "2": process.env.NEXT_PUBLIC_VIDEO_2_PATH || "/videos/aihistory.mp4"
  };
  
  const videoUrl = videoUrls[videoId] || "/videos/MV.mp4";

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      
      // 退出全屏时暂停视频
      if (!fs && videoRef.current) {
        videoRef.current.pause();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // 自动播放
    const video = videoRef.current;
    if (video) {
      video.play().catch(err => console.log("Auto-play blocked:", err));
    }

    const handleEnded = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
    video?.addEventListener('ended', handleEnded);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      video?.removeEventListener('ended', handleEnded);
    };
  }, []);

  // 三角按钮：仅全屏功能
  const handleFullscreen = () => {
    if (document.fullscreenEnabled) {
      document.documentElement.requestFullscreen?.().catch(err => {
        console.log("Fullscreen failed:", err);
      });
    }
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center relative">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        controls
      />
      
      {/* 右上角全屏播放按钮（仅在非全屏时显示） */}
      {!isFullscreen && (
        <button 
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-[#FFCC00] text-black rounded-full hover:bg-[#FFD700] transition-all flex items-center justify-center shadow-lg"
          onClick={handleFullscreen}
          title="全屏播放"
        >
          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
      )}
    </div>
  );
}
