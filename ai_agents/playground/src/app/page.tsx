"use client";

import { IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import dynamic from "next/dynamic";
import React from "react";
import { EMobileActiveTab, useAppSelector, useIsCompactLayout } from "@/common";
import Avatar from "@/components/Agent/AvatarTrulience";
import AuthInitializer from "@/components/authInitializer";
import Action from "@/components/Layout/Action";
import Header from "@/components/Layout/Header";
import { cn } from "@/lib/utils";
import { type IRtcUser, IUserTracks } from "@/manager";

const DynamicRTCCard = dynamic(() => import("@/components/Dynamic/RTCCard"), {
  ssr: false,
});
const DynamicChatCard = dynamic(() => import("@/components/Chat/ChatCard"), {
  ssr: false,
});

import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import ActionBar from "@/components/Layout/Action";

import DigitalHuman, { DigitalHumanRef } from "@/components/DigitalHuman";
import { type IChatItem, EMessageType, EMessageDataType } from "@/types"; // Import types for event handling
import { addChatItem } from "@/store/reducers/global"; // Import action creator
import { useAppDispatch } from "@/common"; // Ensure useAppDispatch is imported

export default function Home() {
  const dispatch = useAppDispatch(); // Add dispatch hook
  const mobileActiveTab = useAppSelector(
    (state) => state.global.mobileActiveTab
  );
  const selectedGraphId = useAppSelector(
    (state) => state.global.selectedGraphId
  );
  const agentConnected = useAppSelector(
    (state) => state.global.agentConnected
  );
  // ... existing selectors ...
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isChatOpen, setIsChatOpen] = React.useState(true); // State for chat area collapse
  const [remoteuser, setRemoteUser] = React.useState<IRtcUser>();
  const [isProjectionMode, setIsProjectionMode] = React.useState(false); // Projection mode state
  const isProjectionModeRef = React.useRef(false); // Ref to track projection mode in closures
  const broadcastChannelRef = React.useRef<BroadcastChannel | null>(null); // Broadcast channel ref
  const digitalHumanRef = React.useRef<DigitalHumanRef>(null);
  const isFirstChunkRef = React.useRef<boolean>(true); // Track if it's the first chunk of a response
  const lastSentTextRef = React.useRef<string>(""); // Track what text we've already sent
  const textBufferRef = React.useRef<string>(""); // Buffer for accumulating text before sending
  const isInterruptedRef = React.useRef<boolean>(false); // Track if we have already interrupted the current turn
  const CHUNK_SIZE = 6; // Balanced chunk size for fluency and latency
  const [vadEnabled, setVadEnabled] = React.useState(true); // VAD enabled by default
  const [vadThreshold, setVadThreshold] = React.useState(15);
  const [vadConsecutive, setVadConsecutive] = React.useState(2);
  const isDigitalHumanSpeakingRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    // Initialize BroadcastChannel
    broadcastChannelRef.current = new BroadcastChannel("avatar_control");
    return () => {
      broadcastChannelRef.current?.close();
    };
  }, []);

  React.useEffect(() => {
    const { rtcManager } = require("../manager/rtc/rtc");
    
    // Listen for text changes (LLM output) to drive Digital Human
    const onTextChanged = (textItem: IChatItem) => {
        console.log("========== onTextChanged FIRED ==========");
        console.log("[page.tsx] Event details:", {
            type: textItem.type,
            typeValue: EMessageType.AGENT,
            isAgent: textItem.type === EMessageType.AGENT,
            text: textItem.text?.substring(0, 50) + "...",
            textLength: textItem.text?.length,
            isFinal: textItem.isFinal
        });
        
        // Reset streaming state when user starts a new conversation
        if (textItem.type === EMessageType.USER) {
            console.log("[page.tsx] ✅ User message detected");
            
            // Reset DH speaking state
            isDigitalHumanSpeakingRef.current = false;
            const { rtcManager } = require("../manager/rtc/rtc");
            rtcManager.setDigitalHumanSpeaking(false);
            
            // Only interrupt ONCE per user turn to avoid spamming the SDK
            if (!isInterruptedRef.current) {
                console.log("[page.tsx] 🛑 FIRST user input detected -> Triggering INTERRUPT");
                
                // INTERRUPT: Stop digital human's current speech
                // Use Ref to check mode inside closure
                if (!isProjectionModeRef.current) {
                    if (digitalHumanRef.current?.isConnected()) {
                        digitalHumanRef.current.stopSpeaking();
                    }
                } else {
                    console.log("[page.tsx] 📡 Sending STOP command to projection");
                    broadcastChannelRef.current?.postMessage({ type: "stop" });
                }
                
                isInterruptedRef.current = true; // Mark as interrupted
            } else {
                console.log("[page.tsx] ⏩ Skipping duplicate interrupt for continuous user input");
            }
            
            // Reset streaming state for next Agent response
            isFirstChunkRef.current = true;
            lastSentTextRef.current = "";
            textBufferRef.current = ""; // Clear buffer
            return; // Don't send user messages to DH
        }
        
        // Only process Agent messages
        if (textItem.type === EMessageType.AGENT) {
            // Reset interrupt flag when Agent starts responding
            if (isFirstChunkRef.current) {
                isInterruptedRef.current = false;
                // CRITICAL: Also reset DH speaking state to ensure VAD works correctly
                isDigitalHumanSpeakingRef.current = false;
                const { rtcManager } = require("../manager/rtc/rtc");
                rtcManager.setDigitalHumanSpeaking(false);
            }

            // Check if Digital Human is connected and ready
            // CRITICAL FIX: In projection mode, local DH is disconnected, so we shouldn't block sending!
            // We use the Ref here to be safe inside closure
            if (!isProjectionModeRef.current && !digitalHumanRef.current?.isConnected()) {
                console.error("[page.tsx] ❌ DH not connected (Local), cannot send text");
                return;
            }
            
            if (textItem.text) {
                    // CRITICAL FIX 2: Detect if a new response has started (current text is shorter than what we've tracked)
                    const currentText = textItem.text || "";
                    
                    if (currentText.length < lastSentTextRef.current.length) {
                        // Text got shorter - this means LLM started a NEW response
                        // Only reset if the difference is significant (not just minor fluctuation)
                        const diff = lastSentTextRef.current.length - currentText.length;
                        
                        if (diff > 10 || currentText.length < 10) {
                            // Significant reset - new response
                            console.log("[page.tsx] 🔄 New response detected (large decrease), resetting");
                            isFirstChunkRef.current = true;
                            lastSentTextRef.current = "";
                            textBufferRef.current = "";
                        } else {
                            // Minor fluctuation - ignore to prevent duplicate playback
                            console.log("[page.tsx] ⏭️ Minor text fluctuation, ignoring");
                            return;
                        }
                    }

                    // CRITICAL FIX: If lastSentText is empty but isFirstChunk is false, force reset
                    if (lastSentTextRef.current === "" && !isFirstChunkRef.current) {
                        console.log("[page.tsx] FORCE RESET: lastSentText is empty but isFirstChunk was false");
                        isFirstChunkRef.current = true;
                    }
                    
                    // Calculate the NEW part (diff)
                    const currentFullText = currentText;
                    const newContent = currentFullText.substring(lastSentTextRef.current.length);
                    const isEnd = textItem.isFinal || false;
                    
                    if (newContent.length === 0 && !isEnd) {
                        return;
                    }
                    
                    // Add new content to buffer
                    textBufferRef.current += newContent;
                    
                    console.log(`[page.tsx] 📝 Text processing:`, {
                        currentLength: currentFullText.length,
                        lastSentLength: lastSentTextRef.current.length,
                        newContent: newContent,
                        bufferNow: textBufferRef.current,
                        isFirstChunk: isFirstChunkRef.current
                    });
                    
                    lastSentTextRef.current = currentFullText;
                    
                    // Determine if we should send now
                    // Optimized strategy: first chunk sends faster (3 chars), subsequent chunks maintain balance (6 chars)
                    const shouldSend = 
                        (isFirstChunkRef.current && textBufferRef.current.length >= 3) || // First chunk: 3 chars for fast response
                        (!isFirstChunkRef.current && textBufferRef.current.length >= 6) || // Subsequent: 6 chars for balance
                        /[，。！？；：、,\.!?;:]/.test(textBufferRef.current) || // Contains punctuation
                        isEnd; // Final chunk - ALWAYS send if it's the end
                    
                    if (!shouldSend) {
                        return;
                    }
                    
                    // Send accumulated buffer
                    const textToSend = textBufferRef.current;
                    const isStart = isFirstChunkRef.current;
                    
                    console.log(`[page.tsx] 📤 SENDING:`, {
                        text: textToSend,
                        isStart: isStart,
                        isEnd: isEnd,
                        textLength: textToSend.length
                    });
                    
                    // Call speak with buffered content
                    if (!isProjectionModeRef.current) {
                        digitalHumanRef.current?.speak(textToSend, isStart, isEnd);
                    } else {
                        console.log(`[page.tsx] 📡 Sending SPEAK command to projection: "${textToSend}"`);
                        broadcastChannelRef.current?.postMessage({
                            type: "speak",
                            payload: { text: textToSend, isStart, isEnd }
                        });
                    }
                    
                    // Update DH speaking state for VAD
                    if (isStart) {
                        isDigitalHumanSpeakingRef.current = true;
                        const { rtcManager } = require("../manager/rtc/rtc");
                        rtcManager.setDigitalHumanSpeaking(true);
                    }
                    if (isEnd) {
                        isDigitalHumanSpeakingRef.current = false;
                        const { rtcManager } = require("../manager/rtc/rtc");
                        rtcManager.setDigitalHumanSpeaking(false);
                    }
                    
                    // Clear buffer and update flags
                    textBufferRef.current = "";
                    
                    if (isStart) {
                        isFirstChunkRef.current = false;
                    }
                    
                    // Reset for next response when this one ends
                    if (isEnd) {
                        console.log("[page.tsx] Response ended, resetting for next turn");
                        isFirstChunkRef.current = true;
                        lastSentTextRef.current = "";
                        textBufferRef.current = "";
                    }
                }
            }
    };

    const onUserSpeaking = () => {
      if (!isProjectionModeRef.current && digitalHumanRef.current?.isConnected() && !isInterruptedRef.current) {
        digitalHumanRef.current.stopSpeaking();
        isDigitalHumanSpeakingRef.current = false;
        rtcManager.setDigitalHumanSpeaking(false);
        isInterruptedRef.current = true;
        setTimeout(() => { isInterruptedRef.current = false; }, 200);
      }
    };

    rtcManager.on("remoteUserChanged", onRemoteUserChanged);
    rtcManager.on("textChanged", onTextChanged);
    rtcManager.on("userSpeaking", onUserSpeaking);
    
    console.log("[page.tsx] ✅ Event listeners attached");

    return () => {
      console.log("[page.tsx] 🔴 Removing event listeners (cleanup)");
      rtcManager.off("remoteUserChanged", onRemoteUserChanged);
      rtcManager.off("textChanged", onTextChanged);
      rtcManager.off("userSpeaking", onUserSpeaking);
    };
  }, []);

  // Enable/disable VAD
  React.useEffect(() => {
    const { rtcManager } = require("../manager/rtc/rtc");
    if (vadEnabled) {
      rtcManager.enableVAD(vadThreshold, vadConsecutive);
    } else {
      rtcManager.disableVAD();
    }
  }, [vadEnabled, vadThreshold, vadConsecutive]);

  // P1 Optimization: Reset all streaming states when graph switches
  React.useEffect(() => {
    console.log("[page.tsx] 🔄 Graph switched, resetting all states");
    isFirstChunkRef.current = true;
    lastSentTextRef.current = "";
    textBufferRef.current = "";
    isInterruptedRef.current = false;
    isDigitalHumanSpeakingRef.current = false;
    
    const { rtcManager } = require("../manager/rtc/rtc");
    rtcManager.setDigitalHumanSpeaking(false);
  }, [selectedGraphId]);

  // P1 Optimization: Preheat digital human SDK when connected
  React.useEffect(() => {
    if (agentConnected && !isProjectionMode && digitalHumanRef.current?.isConnected()) {
      // Delay 500ms to ensure DH is fully ready
      const timer = setTimeout(() => {
        console.log("[page.tsx] 🔥 Preheating digital human SDK");
        // Speak empty string to warm up the SDK pipeline
        digitalHumanRef.current?.speak(" ", true, true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [agentConnected, isProjectionMode]);

  const onRemoteUserChanged = (user: IRtcUser) => {
    // ... existing logic ...
    if (user.audioTrack) {
      setRemoteUser(user);
    }
  };

  const handleVadThresholdChange = (threshold: number) => {
    setVadThreshold(threshold);
    const { rtcManager } = require("../manager/rtc/rtc");
    rtcManager.updateVADThreshold(threshold);
  };

  const handleVadConsecutiveChange = (consecutive: number) => {
    setVadConsecutive(consecutive);
    const { rtcManager } = require("../manager/rtc/rtc");
    rtcManager.updateVADConsecutive(consecutive);
  };

  const handleSpeak = (text: string) => {
    console.log(`[page.tsx] 🎬 Manual speak triggered: "${text.substring(0, 20)}..."`);
    
    // CRITICAL: Reset all streaming states before greeting playback
    isFirstChunkRef.current = true;
    lastSentTextRef.current = "";
    textBufferRef.current = "";
    isInterruptedRef.current = false;
    
    // Add to chat history as an Agent message using dispatch hook
    dispatch(addChatItem({
        userId: "agent",
        text: text,
        data_type: EMessageDataType.TEXT,
        type: EMessageType.AGENT,
        isFinal: true,
        time: Date.now()
    }));

    // Update DH speaking state
    isDigitalHumanSpeakingRef.current = true;
    const { rtcManager } = require("../manager/rtc/rtc");
    rtcManager.setDigitalHumanSpeaking(true);
    
    const estimatedDuration = (text.length / 4 + 1) * 1000;
    setTimeout(() => {
      isDigitalHumanSpeakingRef.current = false;
      rtcManager.setDigitalHumanSpeaking(false);
    }, estimatedDuration);

    if (isProjectionMode) {
        console.log("[page.tsx] 📡 Sending SPEAK command to projection");
        broadcastChannelRef.current?.postMessage({
            type: "speak",
            payload: { text, isStart: true, isEnd: true }
        });
    } else {
        if (digitalHumanRef.current?.isConnected()) {
            digitalHumanRef.current.speak(text, true, true);
        } else {
            console.warn("[page.tsx] ❌ Digital Human not connected, cannot speak");
        }
    }
  };

  return (
    <AuthInitializer>
      <div className="relative mx-auto flex min-h-screen flex-1 flex-col md:h-screen bg-[#0f0f11]">
        <Header className="h-[60px]" />
        
        {/* Action Bar (Connect Button, etc) - Restored */}
        <div className="border-b border-[#2a2a2a] bg-[#181a1d]">
            <ActionBar 
              onSpeak={handleSpeak}
              vadEnabled={vadEnabled}
              onVadToggle={setVadEnabled}
              vadThreshold={vadThreshold}
              vadConsecutive={vadConsecutive}
              onVadThresholdChange={handleVadThresholdChange}
              onVadConsecutiveChange={handleVadConsecutiveChange}
            />
        </div>

        {/* Main Content Area */}
        <div className="flex h-[calc(100vh-120px)] relative overflow-hidden mt-2">
            
            {/* Collapsible Sidebar for RTC Card */}
            <div className={cn(
                "relative transition-all duration-300 ease-in-out bg-[#181a1d] border-r border-[#2a2a2a] ml-2 rounded-lg overflow-hidden",
                isSidebarOpen ? "w-[400px]" : "w-0 border-none"
            )}>
                <div className="h-full w-[400px]">
                   <DynamicRTCCard
                        className={cn(
                        "m-0 flex w-full h-full flex-1 bg-[#181a1d]",
                        {
                            ["hidden md:flex"]: mobileActiveTab === EMobileActiveTab.CHAT,
                        }
                        )}
                    />
                </div>
            </div>

            {/* Sidebar Toggle Button */}
            <div className="absolute top-1/2 -translate-y-1/2 z-20" style={{ left: isSidebarOpen ? "408px" : "16px", transition: "left 0.3s ease-in-out" }}>
                <div className="flex flex-col gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-16 w-4 rounded-full border border-[#FFCC00] bg-[#181a1d] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black shadow-[0_0_10px_rgba(255,204,0,0.2)] transition-all"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    
                    {/* Projection Button */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full border border-[#FFCC00] bg-[#181a1d] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black shadow-[0_0_10px_rgba(255,204,0,0.2)] transition-all"
                        title="打开投屏窗口"
                        onClick={() => {
                            if (!isProjectionMode) {
                                window.open("/avatar", "AvatarProjection", "width=1920,height=1080");
                                digitalHumanRef.current?.disconnect(); // Disconnect local to free up session
                                setIsProjectionMode(true);
                                isProjectionModeRef.current = true; // Update Ref for closure access
                            } else {
                                // Send destroy command to remote window to clean up session
                                broadcastChannelRef.current?.postMessage({ type: "destroy" });
                                setIsProjectionMode(false);
                                isProjectionModeRef.current = false;
                                // User needs to reconnect manually or refresh
                                window.location.reload();
                            }
                        }}
                    >
                        <ExternalLink className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Center Stage: Digital Human Area + Chat */}
            <div className="flex-1 flex flex-col h-full p-2 gap-2 overflow-hidden relative z-10">
                
                {/* Digital Human Placeholder Area - Flexible size based on chat state */}
                <div className={cn(
                    "bg-[#181a1d] rounded-lg border border-[#2a2a2a] relative overflow-hidden shadow-lg transition-all duration-300 flex items-center justify-center",
                    isChatOpen ? "flex-[4]" : "flex-1"
                )}>
                     {/* Tech Grid Background Effect */}
                     <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                         backgroundImage: 'linear-gradient(#FFCC00 1px, transparent 1px), linear-gradient(90deg, #FFCC00 1px, transparent 1px)',
                         backgroundSize: '40px 40px'
                     }}></div>
                     
                     {/* Digital Human Component - Relative positioning to allow centering */}
                     {/* FIX: Keep DigitalHuman mounted but hidden to avoid SDK cleanup crashes */}
                     <div className={`w-full h-full ${isProjectionMode ? 'hidden' : 'block'}`}>
                        <DigitalHuman ref={digitalHumanRef} className="w-full h-full" />
                     </div>

                     {isProjectionMode && (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#FFCC00]">
                            <ExternalLink className="w-16 h-16 mb-4 animate-pulse" />
                            <div className="text-xl font-bold">投屏模式运行中</div>
                            <div className="text-sm opacity-70 mt-2">数字人已在独立窗口显示</div>
                            <Button 
                                variant="ghost" 
                                className="mt-4 border border-[#FFCC00]/50 hover:bg-[#FFCC00] hover:text-black"
                                onClick={() => {
                                    console.log("[page.tsx] 📡 Sending DESTROY command to projection");
                                    broadcastChannelRef.current?.postMessage({ type: "destroy" });
                                    setIsProjectionMode(false);
                                    isProjectionModeRef.current = false;
                                    // Give some time for remote to cleanup before local refresh
                                    setTimeout(() => window.location.reload(), 500);
                                }}
                            >
                                退出投屏并刷新
                            </Button>
                        </div>
                     )}
                </div>

                {/* Chat Area Toggle Button */}
                <div className="relative h-0">
                    <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-20">
                        <Button
                            variant="outline"
                            size="icon"
                            className="w-16 h-4 rounded-full border border-[#FFCC00] bg-[#181a1d] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black shadow-[0_0_10px_rgba(255,204,0,0.2)] transition-all"
                            onClick={() => setIsChatOpen(!isChatOpen)}
                        >
                            {isChatOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                        </Button>
                    </div>
                </div>

                {/* Chat Area (Bottom Half) - Collapsible */}
                <div className={cn(
                    "transition-all duration-300 ease-in-out overflow-hidden",
                    isChatOpen ? "flex-[1.5] min-h-0" : "h-0 flex-none"
                )}>
                    <DynamicChatCard
                        className={cn(
                            "h-full w-full rounded-lg bg-[#181a1d] border border-[#2a2a2a]",
                            {
                            ["hidden md:flex"]:
                                mobileActiveTab === EMobileActiveTab.AGENT,
                            }
                        )}
                    />
                </div>
            </div>
        </div>
      </div>
    </AuthInitializer>
  );
}
