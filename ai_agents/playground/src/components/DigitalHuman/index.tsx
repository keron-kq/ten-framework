"use client";

import Script from "next/script";
import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import axios from "axios"; // Explicitly import axios

interface XmovAvatarConfig {
  containerId: string;
  appId: string;
  appSecret: string;
  gatewayServer: string;
  hardwareAcceleration?: string;
  onWidgetEvent?: (data: any) => void;
  proxyWidget?: Record<string, (data: any) => void>;
  onNetworkInfo?: (networkInfo: any) => void;
  onMessage?: (message: any) => void;
  onStateChange?: (state: string) => void;
  onStatusChange?: (status: any) => void;
  onStateRenderChange?: (state: string, duration: number) => void;
  onVoiceStateChange?: (status: string) => void;
  onDownloadProgress?: (progressEvent: any) => void; // Add this critical callback
  enableLogger?: boolean;
}

// Declare global type for the external SDK
declare global {
  interface Window {
    XmovAvatar: new (config: XmovAvatarConfig) => any;
  }
}

export interface DigitalHumanRef {
  speak: (text: string, isStart?: boolean, isEnd?: boolean) => void;
  isConnected: () => boolean;
  connect: () => void; // New explicit connect method
  disconnect: () => void;
  reconnect: () => void;
  stopSpeaking: () => void;
  updateSubtitle: (text: string) => void;
}

const DigitalHuman = forwardRef<DigitalHumanRef, { className?: string; autoConnect?: boolean; showConnectionButton?: boolean }>(
  ({ className, autoConnect = true, showConnectionButton = true }, ref) => {
    const [sdkReady, setSdkReady] = useState(false);
    const [instance, setInstance] = useState<any>(null);
    const [status, setStatus] = useState<string>("init");
    const [subtitle, setSubtitle] = useState<string>("");
    const containerId = "xmov-container";

    // Polyfill for potential SDK bug (windows vs window)
    useEffect(() => {
        if (typeof window !== "undefined") {
            // Polyfill windows
            if (!(window as any).windows) {
                console.log("[DigitalHuman] Applying polyfill: window.windows = window");
                (window as any).windows = window;
            }
            
            // Polyfill global axios if SDK depends on it
            if (!(window as any).axios) {
                 console.log("[DigitalHuman] Applying polyfill: window.axios");
                 (window as any).axios = axios;
            }

            // Dynamically load SDK script
            if (!window.XmovAvatar) {
                console.log("[DigitalHuman] Loading SDK script...");
                const script = document.createElement('script');
                script.src = 'https://media.xingyun3d.com/xingyun3d/general/litesdk/xmovAvatar@latest.js';
                script.async = true;
                script.onload = () => {
                    console.log("[DigitalHuman] SDK script loaded successfully");
                    setSdkReady(true);
                };
                script.onerror = () => {
                    console.error("[DigitalHuman] Failed to load SDK script");
                    setStatus("error");
                };
                document.body.appendChild(script);
            } else {
                console.log("[DigitalHuman] SDK already loaded");
                setSdkReady(true);
            }
        }
    }, []);

    // Auto-init SDK when ready (Run once, only if autoConnect is true)
    useEffect(() => {
        if (sdkReady && !instance && autoConnect) {
            console.log("[DigitalHuman] SDK ready, auto-initializing...");
            initSDK();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sdkReady, autoConnect]); // Add autoConnect dependency

    // Poll instance status using getStatus() method
    useEffect(() => {
        if (!instance) return;
        
        const interval = setInterval(() => {
            try {
                // Check if instance still exists and wasn't destroyed
                if (!instance || !instance.getStatus) {
                    clearInterval(interval);
                    return;
                }
                
                if (typeof instance.getStatus === 'function') {
                    const currentStatus = instance.getStatus();
                    console.log("[DigitalHuman] Polling getStatus():", currentStatus);
                    
                    // Status enum: online=0, offline=1, network_on=2, network_off=3, close=4, invisible=5, visible=6, stopped=7
                    if (currentStatus === 0 || currentStatus === 6) { // online or visible
                        console.log("[DigitalHuman] Status polling detected ready state!");
                        setStatus("connected");
                        clearInterval(interval);
                    }
                }
            } catch (e) {
                console.error("[DigitalHuman] getStatus error:", e);
                clearInterval(interval); // Stop polling on error
            }
        }, 1000);

        return () => {
            console.log("[DigitalHuman] Cleaning up status polling interval");
            clearInterval(interval);
        };
    }, [instance]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      speak: (text: string, isStart: boolean = true, isEnd: boolean = true) => {
        if (instance && status === "connected") {
          // Streaming speak logic with isStart/isEnd flags
          try {
             if (instance && typeof instance.speak === 'function') {
                 console.log(`[DigitalHuman] speak("${text}", start=${isStart}, end=${isEnd})`);
                 instance.speak(text, isStart, isEnd);
             }
          } catch (e) {
              console.error("[DigitalHuman] Speak error", e);
          }
        } else {
          console.warn("[DigitalHuman] Not connected, cannot speak:", text);
        }
      },
      isConnected: () => status === "connected",
      disconnect: () => {
        console.log("[DigitalHuman] Disconnecting...");
        if (instance && typeof instance.destroy === 'function') {
          try {
            instance.destroy();
            setInstance(null);
            setStatus("init");
            console.log("[DigitalHuman] Disconnected successfully");
          } catch (e) {
            console.error("[DigitalHuman] Disconnect error:", e);
          }
        }
      },
      reconnect: () => {
        console.log("[DigitalHuman] Reconnecting...");
        if (instance) {
          if (typeof instance.destroy === 'function') {
            instance.destroy();
          }
          setInstance(null);
        }
        setTimeout(() => {
          initSDK();
        }, 500);
      },
      connect: () => {
        console.log("[DigitalHuman] Manual connect called");
        if (!instance) {
            initSDK();
        }
      },
      stopSpeaking: () => {
        console.log("[DigitalHuman] Stopping current speech (interrupt)");
        if (instance && status === "connected") {
          try {
            // Try to stop current speech and return to idle
            if (typeof instance.idle === 'function') {
              instance.idle();
              console.log("[DigitalHuman] Interrupted, returned to idle state");
            }
          } catch (e) {
            console.error("[DigitalHuman] Stop speaking error:", e);
          }
        }
      },
      updateSubtitle: (text: string) => {
        setSubtitle(text);
      }
    }));

    const initSDK = async () => {
      // Prevent multiple simultaneous initializations
      if (instance) {
        console.warn("[DigitalHuman] SDK already initializing or initialized, skipping");
        return;
      }
      
      if (!window.XmovAvatar) {
        console.error("[DigitalHuman] SDK not loaded");
        return;
      }

      console.log("[DigitalHuman] Initializing SDK...");
      setStatus("connecting"); // Set status to show we're trying
      
      try {
        const avatar = new window.XmovAvatar({
          containerId: `#${containerId}`,
          appId: "a2ad3f117e18462cac18c782c9eebe52",
          appSecret: "05b0d048939049ebb1ccb50fe72bde0b",
          gatewayServer: "https://nebula-agent.xingyun3d.com/user/v1/ttsa/session",
          hardwareAcceleration: "prefer-hardware",
          enableLogger: true,
          
          // Mock axios-like onDownloadProgress if missing, as SDK seems to rely on it internally
          // This error "Cannot read properties of undefined (reading 'onDownloadProgress')" suggests 
          // the SDK expects an axios-like config object or global axios, or the parameters we passed are triggering a path 
          // where it tries to access this property on a missing object.
          // Since we can't easily patch the SDK's internal fetcher, let's verify if we need to pass a specific structure 
          // or if it depends on global axios.
          // Another possibility: `headers` is optional but if omitted, SDK might fail to init default config.
          // Let's explicitly pass an empty headers object as per doc example.
          
          // headers: {}, // REMOVE headers completely as per CSDN example, SDK handles auth internally via appId/Secret
          onDownloadProgress: (progressEvent: any) => {
            // Critical callback that SDK expects during init()
            console.log("[DigitalHuman] Download progress:", progressEvent);
          },
          onMessage: (message: any) => {
            console.log("[DigitalHuman] onMessage:", message);
          },
          onStateChange: (state: string) => {
            console.log("[DigitalHuman] State:", state);
            if (state === "ready" || state === "idle") { 
                setStatus("connected");
            }
          },
          onStatusChange: (s: any) => {
             console.log("[DigitalHuman] Status:", s);
          },
          onVoiceStateChange: (s: string) => {
              console.log("[DigitalHuman] Voice State:", s);
          }
        });

        setInstance(avatar);
        console.log("[DigitalHuman] Instance created, waiting for ready state...");
        
        // DEBUG: List all methods on the instance
        console.log("[DigitalHuman] Instance methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(avatar)));
        console.log("[DigitalHuman] Instance properties:", Object.keys(avatar));
        console.log("[DigitalHuman] Full instance:", avatar);

        // EXPERIMENT: According to reference code, we should call init() NOT start()
        setTimeout(async () => {
            const status1 = avatar.getStatus();
            console.log("[DigitalHuman] Status after 2s (no manual init):", status1);
            
            if (status1 === -1 || status1 === 1 || status1 === 4 || status1 === 7) { // uninitialized(-1), offline(1), close(4), stopped(7)
                console.log("[DigitalHuman] Status requires initialization, calling avatar.init()...");
                try {
                    if (typeof avatar.init === 'function') {
                        // CRITICAL: init() requires a config object with callbacks!
                        const initResult = await avatar.init({
                            onDownloadProgress: (prog: number) => {
                                console.log("[DigitalHuman] Download progress:", prog, "%");
                                // Update status when download completes
                                if (prog >= 100) {
                                    console.log("[DigitalHuman] Download complete!");
                                    setStatus("connected");
                                }
                            },
                            onError: (err: any) => {
                                console.error("[DigitalHuman] Init error callback:", err);
                                setStatus("error");
                            },
                            onClose: () => {
                                console.log("[DigitalHuman] Connection closed");
                                setStatus("init");
                            }
                        });
                        console.log("[DigitalHuman] init() completed, result:", initResult);
                        
                        // After init completes, optionally call idle() to ensure visibility
                        setTimeout(() => {
                            if (typeof avatar.idle === 'function') {
                                console.log("[DigitalHuman] Calling avatar.idle() after init...");
                                avatar.idle();
                            }
                        }, 1000);
                    }
                } catch (initErr) {
                    console.error("[DigitalHuman] init() error:", initErr);
                    setStatus("error");
                }
            }
        }, 2000);
        
      } catch (e) {
        console.error("[DigitalHuman] Constructor failed", e);
        setStatus("error");
      }
    };

    return (
      <div className={`relative w-full h-full flex items-center justify-center ${className || ''}`}>
        {/* Connection Toggle Button - Top Right with link icon */}
        {showConnectionButton && (
        <button 
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (status === "connected" && instance) {
                    // Disconnect
                    console.log("[DigitalHuman] User requested disconnect");
                    if (typeof instance.destroy === 'function') {
                        instance.destroy();
                        setInstance(null);
                        setStatus("init");
                    }
                } else {
                    // Show "Under Development" message instead of reconnecting
                    console.log("[DigitalHuman] Reconnect feature under development");
                    alert("重新连接功能开发中，请刷新页面以重新加载数字人");
                }
            }}
            style={{ 
                position: 'absolute', 
                top: '20px', 
                right: '20px', 
                zIndex: 50,
                pointerEvents: 'auto'
            }}
            className="px-3 py-2 bg-[#181a1d] border border-[#FFCC00] text-[#FFCC00] font-bold rounded hover:bg-[#FFCC00] hover:text-black transition-all shadow-lg cursor-pointer flex items-center gap-2"
            title={status === "connected" ? "断开数字人" : "连接数字人"}
        >
            {status === "connected" ? (
                <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-xs">已连接</span>
                </>
            ) : (
                <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
                    </svg>
                    <span className="text-xs">{sdkReady ? '点击连接' : '加载中...'}</span>
                </>
            )}
        </button>
        )}
        
        {/* Container for the Digital Human Canvas - Pure container for SDK, no React children */}
        <div 
            id={containerId} 
            className="w-full h-full bg-gradient-to-b from-black/30 to-black/10 hide-sdk-subtitle"
            style={{ 
                width: "100%", 
                height: "100%",
                position: "relative",
                pointerEvents: "none",
                zIndex: 1
            }}
        />
        
        {/* Hide SDK built-in subtitle with comprehensive selectors */}
        <style jsx global>{`
          /* Hide all possible SDK subtitle elements */
          #xmov-container div[style*="position: absolute"][style*="bottom"],
          #xmov-container div[style*="text-align: center"],
          #xmov-container [class*="subtitle"],
          #xmov-container [class*="caption"],
          #xmov-container [class*="text"],
          #xmov-container [id*="subtitle"],
          .xmov-subtitle,
          .ttsa-subtitle,
          .avatar-subtitle {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }
          
          /* Only allow our custom subtitle to show */
          #xmov-container {
            overflow: hidden;
          }
        `}</style>

        {/* RIGOL Logo Overlay - Top Left */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none opacity-80">
            <div className="flex items-center gap-2">
                {/* RIGOL Logo Placeholder */}
                <div className="h-10 flex items-center">
                    <span className="text-3xl font-bold tracking-widest text-[#FFCC00]">RIGOL</span>
                    <span className="ml-3 text-sm text-white/70 border-l border-white/30 pl-3">AI FORUM 2026</span>
                </div>
            </div>
        </div>

        {/* Optional Watermark - Bottom Right */}
        <div className="absolute bottom-4 right-4 z-20 pointer-events-none opacity-50">
            <div className="text-[10px] text-white/50 font-mono">
                POWERED BY TEN FRAMEWORK
            </div>
        </div>

        {/* Status Indicator - Overlay (Outside SDK container to avoid DOM conflicts) */}
        {status !== "connected" && (
            <div className="absolute inset-0 flex items-center justify-center text-yellow-500 z-10 pointer-events-none">
                <div className="bg-black/70 px-6 py-3 rounded-lg border border-yellow-500/50 backdrop-blur-sm pointer-events-auto">
                    <div className="text-xl font-mono">Status: {status}</div>
                    {!sdkReady && <div className="text-sm mt-1">Loading SDK...</div>}
                </div>
            </div>
        )}

        {/* Subtitle Area - Bottom */}
        {subtitle && status === "connected" && (
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ zIndex: 100 }}>
                <div className="bg-gradient-to-t from-black/70 via-black/40 to-transparent px-4 py-2 pb-3">
                    <div className="text-center text-white text-sm leading-relaxed tracking-wide" 
                         style={{ 
                           textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                           fontWeight: 400
                         }}>
                        {subtitle}
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }
);

DigitalHuman.displayName = "DigitalHuman";

export default DigitalHuman;
