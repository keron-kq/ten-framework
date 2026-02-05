"use client";

import React, { useState } from "react";
import { Minimize2, X } from "lucide-react";

interface MediaWindowProps {
  type: "iframe" | "video";
  url: string;
  title: string;
  onClose?: () => void;
  onExpandChange?: (expanded: boolean) => void;
  initialExpanded?: boolean;
}

export const MediaWindow: React.FC<MediaWindowProps> = ({ 
  type, 
  url, 
  title,
  onClose, 
  onExpandChange, 
  initialExpanded = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  
  const handleExpandToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandChange?.(newExpanded);
  };

  return (
    <div
      className={`absolute bg-[#181a1d] border-2 border-[#FFCC00] rounded-lg shadow-2xl overflow-hidden transition-all duration-300`}
      style={{
        zIndex: 60,
        pointerEvents: "auto",
        ...(isExpanded 
          ? {
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
            }
          : {
              top: "64px",
              left: "16px",
              width: "320px",
              height: "200px"
            }
        )
      }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-[#222] px-3 py-2 border-b border-[#FFCC00]/30" style={{ pointerEvents: "auto" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-white font-medium">{title}</span>
        </div>
        
        <div className="flex items-center gap-1" style={{ pointerEvents: "auto" }}>
          {/* Minimize Button (只在放大时显示) */}
          {isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExpandToggle();
              }}
              className="p-1.5 hover:bg-[#333] rounded transition-colors cursor-pointer"
              title="缩小"
              style={{ pointerEvents: "auto" }}
            >
              <Minimize2 className="w-4 h-4 text-[#FFCC00]" />
            </button>
          )}
          
          {/* Close Button */}
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 hover:bg-red-500/20 rounded transition-colors cursor-pointer"
              title="关闭"
              style={{ pointerEvents: "auto" }}
            >
              <X className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="w-full h-[calc(100%-36px)] relative bg-black" style={{ pointerEvents: "auto" }}>
        {type === "iframe" ? (
          <iframe
            src={url}
            className="w-full h-full border-0"
            title={title}
            sandbox="allow-scripts allow-same-origin allow-forms"
            style={{ pointerEvents: "auto" }}
          />
        ) : (
          <video
            src={url}
            className="w-full h-full object-contain"
            controls
            autoPlay
            style={{ pointerEvents: "auto" }}
          />
        )}
      </div>
    </div>
  );
};
