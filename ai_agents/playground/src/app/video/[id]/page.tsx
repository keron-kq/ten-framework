"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";

export default function VideoPage() {
  const params = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoId = params.id as string;
  
  // 从环境变量获取视频路径
  const videoUrls: Record<string, string> = {
    "1": process.env.NEXT_PUBLIC_VIDEO_1_PATH || "/videos/MV.mp4",
    "2": process.env.NEXT_PUBLIC_VIDEO_2_PATH || "/videos/aihistory.mp4"  // 修复默认值
  };
  
  const videoUrl = videoUrls[videoId] || "/videos/MV.mp4";
  
  console.log("[VideoPage] Video ID:", videoId);
  console.log("[VideoPage] Video URL:", videoUrl);
  console.log("[VideoPage] ENV VAR 1:", process.env.NEXT_PUBLIC_VIDEO_1_PATH);
  console.log("[VideoPage] ENV VAR 2:", process.env.NEXT_PUBLIC_VIDEO_2_PATH);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 监听视频加载完成
    const handleCanPlay = () => {
      console.log("[VideoPage] Video can play, requesting fullscreen");
      
      // 先播放
      video.play().catch(err => console.log("Auto-play blocked:", err));
      
      // 视频加载完成后立即请求全屏
      setTimeout(() => {
        if (document.fullscreenEnabled) {
          // 尝试视频元素全屏
          if (video.requestFullscreen) {
            video.requestFullscreen().then(() => {
              console.log("[VideoPage] Video fullscreen success");
            }).catch(err => {
              console.log("[VideoPage] Video fullscreen failed:", err);
              // 备用：整个文档全屏
              document.documentElement.requestFullscreen?.().catch(e => {
                console.log("[VideoPage] Document fullscreen also failed:", e);
              });
            });
          }
        }
      }, 100);
    };

    // 添加事件监听
    video.addEventListener('canplay', handleCanPlay, { once: true });
    
    // 如果视频已经可以播放（缓存），手动触发
    if (video.readyState >= 3) {
      handleCanPlay();
    }

    // 监听视频结束
    const handleEnded = () => {
      console.log("[VideoPage] Video ended");
      // 视频结束后退出全屏
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };

    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoUrl]);

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (video && !document.fullscreenElement) {
      video.requestFullscreen?.().catch(() => {
        document.documentElement.requestFullscreen?.();
      });
    }
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain cursor-pointer"
        controls
        style={{ maxWidth: "100%", maxHeight: "100%" }}
        onClick={handleVideoClick}
      />
      
      {/* 提示文字 */}
      <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-2 rounded">
        按 ESC 退出全屏 | 按 F 进入全屏
      </div>
    </div>
  );
}
