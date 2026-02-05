"use client";

import React, { useEffect, useRef, useState } from "react";
import DigitalHuman, { DigitalHumanRef } from "@/components/DigitalHuman";
import { ExternalAppWindow } from "@/components/ExternalAppWindow";
import { MediaWindow } from "@/components/MediaWindow";
import { Monitor, Globe, Play, QrCode, Hand, TestTube, FileText } from "lucide-react";

export default function AvatarPage() {
  const digitalHumanRef = useRef<DigitalHumanRef>(null);
  const [started, setStarted] = useState(false);
  const [showExternalApp, setShowExternalApp] = useState(false);
  const [showExternalApp2, setShowExternalApp2] = useState(false);
  const [showGestureApp, setShowGestureApp] = useState(false);
  const [showConsistencyApp, setShowConsistencyApp] = useState(false);
  const [showInteractiveHTML, setShowInteractiveHTML] = useState(false);
  const [showDS7000, setShowDS7000] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [externalAppExpanded, setExternalAppExpanded] = useState(false);
  const [externalApp2Expanded, setExternalApp2Expanded] = useState(false);
  const [gestureAppExpanded, setGestureAppExpanded] = useState(false);
  const [consistencyAppExpanded, setConsistencyAppExpanded] = useState(false);
  const [interactiveHTMLExpanded, setInteractiveHTMLExpanded] = useState(false);
  const [ds7000Expanded, setDS7000Expanded] = useState(false);
  const [qrCodeExpanded, setQRCodeExpanded] = useState(false);
  
  const handlePlayVideo = (videoId: string) => {
    window.open(`/video/${videoId}`, `Video${videoId}`, "width=1920,height=1080");
  };

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
          
        case "external_app":
          // payload: { show }
          setShowExternalApp(payload.show);
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
      <div className={`w-full h-full relative ${!started ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <DigitalHuman 
            ref={digitalHumanRef} 
            className="w-full h-full" 
            autoConnect={false} 
            showConnectionButton={false}
            isPiPMode={externalAppExpanded || externalApp2Expanded || gestureAppExpanded || consistencyAppExpanded || interactiveHTMLExpanded || ds7000Expanded || qrCodeExpanded}
          />
          
          {/* External App Window 1 (Web Control) */}
          {showExternalApp && (
            <ExternalAppWindow 
              url="http://aidemo.rigol.com:3000/"
              onClose={() => {
                setShowExternalApp(false);
                setExternalAppExpanded(false);
              }}
              onExpandChange={setExternalAppExpanded}
            />
          )}
          
          {/* External App Window 2 */}
          {showExternalApp2 && (
            <MediaWindow 
              type="iframe"
              url="http://172.18.33.34:8000/"
              title="外部应用"
              onClose={() => {
                setShowExternalApp2(false);
                setExternalApp2Expanded(false);
              }}
              onExpandChange={setExternalApp2Expanded}
              initialExpanded={true}
            />
          )}
          
          {/* Gesture Recognition App */}
          {showGestureApp && (
            <MediaWindow 
              type="iframe"
              url="http://172.18.33.34:5173"
              title="手势识别"
              onClose={() => {
                setShowGestureApp(false);
                setGestureAppExpanded(false);
              }}
              onExpandChange={setGestureAppExpanded}
              initialExpanded={true}
            />
          )}
          
          {/* Consistency Test App */}
          {showConsistencyApp && (
            <MediaWindow 
              type="iframe"
              url="http://172.18.33.34:5000/"
              title="一致性测试"
              onClose={() => {
                setShowConsistencyApp(false);
                setConsistencyAppExpanded(false);
              }}
              onExpandChange={setConsistencyAppExpanded}
              initialExpanded={true}
            />
          )}
          
          {/* Interactive HTML Page */}
          {showInteractiveHTML && (
            <MediaWindow 
              type="iframe"
              url="/html/interactive.html"
              title="交互页面"
              onClose={() => {
                setShowInteractiveHTML(false);
                setInteractiveHTMLExpanded(false);
              }}
              onExpandChange={setInteractiveHTMLExpanded}
              initialExpanded={true}
            />
          )}
          
          {/* DS7000 App */}
          {showDS7000 && (
            <MediaWindow 
              type="iframe"
              url="http://172.18.24.199/control.html"
              title="DS7000"
              onClose={() => {
                setShowDS7000(false);
                setDS7000Expanded(false);
              }}
              onExpandChange={setDS7000Expanded}
              initialExpanded={true}
            />
          )}
          
          {/* QR Code Display */}
          {showQRCode && (
            <MediaWindow 
              type="iframe"
              url="/qrcode"
              title="扫码观看"
              onClose={() => {
                setShowQRCode(false);
                setQRCodeExpanded(false);
              }}
              onExpandChange={setQRCodeExpanded}
              initialExpanded={true}
            />
          )}

          {/* Control Buttons (投屏模式右侧) */}
          {started && (
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
              {/* 1. Video 2 (aihistory) */}
              <button
                onClick={() => handlePlayVideo("2")}
                className="p-2 rounded-full bg-[#181a1d] border-2 border-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black transition-all"
                style={{ pointerEvents: "auto" }}
                title="aihistory"
              >
                <Play className="w-5 h-5 fill-[#FFCC00]" />
              </button>
              
              {/* 2. Video 1 (MV) */}
              <button
                onClick={() => handlePlayVideo("1")}
                className="p-2 rounded-full bg-[#181a1d] border-2 border-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black transition-all"
                style={{ pointerEvents: "auto" }}
                title="MV"
              >
                <Play className="w-5 h-5" />
              </button>
              
              {/* 3. External App 2 (人脸检测) */}
              <button
                onClick={() => {
                  const newState = !showExternalApp2;
                  setShowExternalApp2(newState);
                  setExternalApp2Expanded(newState);
                }}
                className={`p-2 rounded-full transition-all ${
                  showExternalApp2
                    ? "bg-green-500/20 border-2 border-green-500 text-green-500"
                    : "bg-[#181a1d] border-2 border-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black"
                }`}
                style={{ pointerEvents: "auto" }}
                title="人脸检测"
              >
                <Globe className="w-5 h-5" />
              </button>
              
              {/* 4. QR Code */}
              <button
                onClick={() => {
                  const newState = !showQRCode;
                  setShowQRCode(newState);
                  setQRCodeExpanded(newState);
                }}
                className={`p-2 rounded-full transition-all ${
                  showQRCode
                    ? "bg-green-500/20 border-2 border-green-500 text-green-500"
                    : "bg-[#181a1d] border-2 border-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black"
                }`}
                style={{ pointerEvents: "auto" }}
                title="显示二维码"
              >
                <QrCode className="w-5 h-5" />
              </button>
              
              {/* 5. Web Control */}
              <button
                onClick={() => {
                  const newState = !showExternalApp;
                  setShowExternalApp(newState);
                  setExternalAppExpanded(newState);
                }}
                className={`p-2 rounded-full transition-all ${
                  showExternalApp
                    ? "bg-green-500/20 border-2 border-green-500 text-green-500"
                    : "bg-[#181a1d] border-2 border-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black"
                }`}
                style={{ pointerEvents: "auto" }}
                title="Web Control"
              >
                <Monitor className="w-5 h-5" />
              </button>
              
              {/* 6. Gesture Recognition (手势识别) */}
              <button
                onClick={() => {
                  const newState = !showGestureApp;
                  setShowGestureApp(newState);
                  setGestureAppExpanded(newState);
                }}
                className={`p-2 rounded-full transition-all ${
                  showGestureApp
                    ? "bg-green-500/20 border-2 border-green-500 text-green-500"
                    : "bg-[#181a1d] border-2 border-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black"
                }`}
                style={{ pointerEvents: "auto" }}
                title="手势识别"
              >
                <Hand className="w-5 h-5" />
              </button>
              
              {/* 7. Interactive HTML (插线检测) */}
              <button
                onClick={() => {
                  const newState = !showInteractiveHTML;
                  setShowInteractiveHTML(newState);
                  setInteractiveHTMLExpanded(newState);
                }}
                className={`p-2 rounded-full transition-all ${
                  showInteractiveHTML
                    ? "bg-green-500/20 border-2 border-green-500 text-green-500"
                    : "bg-[#181a1d] border-2 border-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black"
                }`}
                style={{ pointerEvents: "auto" }}
                title="插线检测"
              >
                <FileText className="w-5 h-5" />
              </button>
              
              {/* 8. DS70000 */}
              <button
                onClick={() => {
                  const newState = !showDS7000;
                  setShowDS7000(newState);
                  setDS7000Expanded(newState);
                }}
                className={`p-2 rounded-full transition-all ${
                  showDS7000
                    ? "bg-green-500/20 border-2 border-green-500 text-green-500"
                    : "bg-[#181a1d] border-2 border-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black"
                }`}
                style={{ pointerEvents: "auto" }}
                title="DS70000"
              >
                <Monitor className="w-5 h-5" />
              </button>
              
              {/* 9. Consistency Test (一致性测试) */}
              <button
                onClick={() => {
                  const newState = !showConsistencyApp;
                  setShowConsistencyApp(newState);
                  setConsistencyAppExpanded(newState);
                }}
                className={`p-2 rounded-full transition-all ${
                  showConsistencyApp
                    ? "bg-green-500/20 border-2 border-green-500 text-green-500"
                    : "bg-[#181a1d] border-2 border-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black"
                }`}
                style={{ pointerEvents: "auto" }}
                title="一致性测试"
              >
                <TestTube className="w-5 h-5" />
              </button>
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
