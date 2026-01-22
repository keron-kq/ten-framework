"use client";

import React, { useEffect, useRef, useState } from "react";
import DigitalHuman, { DigitalHumanRef } from "@/components/DigitalHuman";

export default function AvatarPage() {
  const digitalHumanRef = useRef<DigitalHumanRef>(null);
  const [started, setStarted] = useState(false);

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
          
        case "stop":
          digitalHumanRef.current?.stopSpeaking();
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
      <div className={`w-full h-full ${!started ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <DigitalHuman ref={digitalHumanRef} className="w-full h-full" autoConnect={false} />
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
      
      <div className="absolute top-2 left-2 z-50 opacity-30 hover:opacity-100 transition-opacity">
        <div className="text-xs text-white bg-black/50 px-2 py-1 rounded border border-white/20">
          🟢 投屏模式 (Slave)
        </div>
      </div>
    </div>
  );
}
