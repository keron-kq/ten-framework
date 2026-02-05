"use client";

import React, { useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

interface ExternalAppWindowProps {
  url: string;
  onClose?: () => void;
  onExpandChange?: (expanded: boolean) => void;
  initialExpanded?: boolean;
}

export const ExternalAppWindow: React.FC<ExternalAppWindowProps> = ({ url, onClose, onExpandChange, initialExpanded = true }) => {
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
        zIndex: isExpanded ? 60 : 25,
        pointerEvents: "auto",
        ...(isExpanded 
          ? {
              // 放大：完全覆盖整个视口
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
            }
          : {
              // 默认：左上角小窗
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
          <span className="text-xs text-white font-medium">web control</span>
        </div>
        
        <div className="flex items-center gap-1" style={{ pointerEvents: "auto" }}>
          {/* Maximize/Minimize Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExpandToggle();
            }}
            className="p-1.5 hover:bg-[#333] rounded transition-colors cursor-pointer"
            title={isExpanded ? "缩小" : "放大"}
            style={{ pointerEvents: "auto" }}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-[#FFCC00]" />
            ) : (
              <Maximize2 className="w-4 h-4 text-[#FFCC00]" />
            )}
          </button>
          
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

      {/* iframe Content */}
      <div className="w-full h-[calc(100%-36px)] relative" style={{ pointerEvents: "auto" }}>
        <iframe
          src={url}
          className="w-full h-full border-0"
          title="External Application"
          // Allow embedded apps to request camera/mic.
          allow="camera; microphone; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          style={{ pointerEvents: "auto" }}
        />
      </div>
    </div>
  );
};
