"use client";

import React, { useEffect, useRef, useState } from "react";
import DigitalHuman, { DigitalHumanRef } from "@/components/DigitalHuman";
import { ExternalAppWindow } from "@/components/ExternalAppWindow";
import { Monitor } from "lucide-react";

export default function AvatarPage() {
  const digitalHumanRef = useRef<DigitalHumanRef>(null);
  const [started, setStarted] = useState(false);
  const [subtitle, setSubtitle] = useState<string>("");
  const [showExternalApp, setShowExternalApp] = useState(false);
  const [externalAppExpanded, setExternalAppExpanded] = useState(false);

  useEffect(() => {
    // Initialize BroadcastChannel
    const channel = new BroadcastChannel("avatar_control");

    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      console.log(`[AvatarPage] Received message: ${type}`, payload);

      if (!digitalHumanRef.current?.isConnected() && type !== "destroy") {
        console.warn("[AvatarPage] Digital Human not connected yet (msg ignored)");
        return;
      }

      switch (type) {
        case "speak":
          // payload: { text, isStart, isEnd }
          // Just forward to SDK directly
          digitalHumanRef.current?.speak(payload.text, payload.isStart, payload.isEnd);
          break;
          
        case "subtitle":
          // payload: { text }
          setSubtitle(payload.text || "");
          break;
          
        case "external_app":
          // payload: { show }
          setShowExternalApp(payload.show);
          break;
          
        case "stop":
          digitalHumanRef.current?.stopSpeaking();
          setSubtitle(""); // Clear subtitle on stop
          break;
          
        case "destroy":
          console.log("[AvatarPage] Received destroy command");
          digitalHumanRef.current?.disconnect();
          break;
          
        default:
          break;
      }
    };
    
    // Notify opener that we are alive (optional)
    channel.postMessage({ type: "avatar_window_ready" });

    return () => {
      channel.close();
    };
  }, [started]);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative flex flex-col items-center justify-center">
      
      {/* Digital Human is always mounted but hidden until started */}
      <div className={`w-full h-full relative ${!started ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <DigitalHuman 
            ref={digitalHumanRef} 
            className="w-full h-full" 
            autoConnect={false} 
            showConnectionButton={false}
            isPiPMode={externalAppExpanded}
          />
          
          {/* External App Window (投屏模式) */}
          {showExternalApp && (
            <ExternalAppWindow 
              url="http://172.18.26.49/control.html"
              onClose={() => {
                setShowExternalApp(false);
                setExternalAppExpanded(false);
              }}
              onExpandChange={setExternalAppExpanded}
            />
          )}
          
          {/* External App Toggle Button (投屏模式) */}
          {started && (
            <button
              onClick={() => setShowExternalApp(!showExternalApp)}
              className={`absolute top-4 right-4 z-50 p-2 rounded-full transition-all ${
                showExternalApp
                  ? "bg-green-500/20 border-2 border-green-500 text-green-500"
                  : "bg-[#181a1d] border-2 border-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black"
              }`}
              style={{ pointerEvents: "auto" }}
              title={showExternalApp ? "关闭外部应用" : "显示外部应用"}
            >
              <Monitor className="w-5 h-5" />
            </button>
          )}
          
          {/* Subtitle for Projection Mode */}
          {subtitle && (
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ zIndex: 100 }}>
                <div className="bg-gradient-to-t from-black/70 via-black/40 to-transparent px-6 py-3 pb-4">
                    <div className="text-center text-white text-xl leading-relaxed tracking-wide" 
                         style={{ 
                           textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                           fontWeight: 400
                         }}>
                        {subtitle}
                    </div>
                </div>
            </div>
          )}
      </div>

      {/* Start Overlay - Keep mounted but hidden to avoid React DOM conflicts */}
      <div 
        className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50"
        style={{ display: started ? 'none' : 'flex' }}
      >
            <button 
                onClick={async () => {
                    // 1. Try to get mic permission first to unlock browser restriction
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        stream.getTracks().forEach(track => track.stop());
                        console.log("[AvatarPage] Mic permission granted");
                    } catch (e) {
                        console.warn("[AvatarPage] Mic permission failed, SDK might fail:", e);
                    }

                    // 2. Update state to show DH
                    setStarted(true);
                    
                    // 3. Trigger connect manually (since autoConnect=false)
                    // No destroy needed, just clean init
                    setTimeout(() => digitalHumanRef.current?.connect(), 500);
                }}
                className="group relative px-6 py-3 bg-[#181a1d] text-[#FFCC00] font-mono text-sm border border-[#FFCC00]/50 rounded hover:bg-[#FFCC00] hover:text-black transition-all shadow-[0_0_20px_rgba(255,204,0,0.1)] hover:shadow-[0_0_30px_rgba(255,204,0,0.4)] flex items-center gap-3 overflow-hidden"
            >
                <span className="relative z-10">INITIALIZE PROJECTION</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFCC00]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </button>
      </div>
      
    </div>
  );
}
