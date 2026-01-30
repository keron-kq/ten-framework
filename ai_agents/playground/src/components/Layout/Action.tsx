"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  apiPing,
  apiStartService,
  apiStopService,
  EMobileActiveTab,
  isEditModeOn,
  MOBILE_ACTIVE_TAB_MAP,
  useAppDispatch,
  useAppSelector,
} from "@/common";
import { LoadingButton } from "@/components/Button/LoadingButton";
import { RemoteGraphSelect } from "@/components/Chat/ChatCfgGraphSelect";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { setAgentConnected, setMobileActiveTab } from "@/store/reducers/global";
import { TrulienceCfgSheet } from "../Chat/ChatCfgTrulienceSetting";
import { GREETING_SCRIPTS_MAP } from "@/data/greetingScripts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

let intervalId: NodeJS.Timeout | null = null;

export default function ActionBar(props: { 
  className?: string; 
  onSpeak?: (text: string) => void;
  vadEnabled?: boolean;
  onVadToggle?: (enabled: boolean) => void;
  vadThreshold?: number;
  vadConsecutive?: number;
  onVadThresholdChange?: (threshold: number) => void;
  onVadConsecutiveChange?: (consecutive: number) => void;
}) {
  const { className, onSpeak, vadEnabled = true, onVadToggle, vadThreshold = 15, vadConsecutive = 2, onVadThresholdChange, onVadConsecutiveChange } = props;
  const dispatch = useAppDispatch();
  const agentConnected = useAppSelector((state) => state.global.agentConnected);
  const channel = useAppSelector((state) => state.global.options.channel);
  const userId = useAppSelector((state) => state.global.options.userId);
  const language = useAppSelector((state) => state.global.language);
  const voiceType = useAppSelector((state) => state.global.voiceType);
  const selectedGraphId = useAppSelector(
    (state) => state.global.selectedGraphId
  );
  const graphList = useAppSelector((state) => state.global.graphList);
  const mobileActiveTab = useAppSelector(
    (state) => state.global.mobileActiveTab
  );
  const [loading, setLoading] = React.useState(false);

  // Get greeting scripts for the selected graph
  // Priority 1: From graph properties (if available via API)
  // Priority 2: From fallback map (for production mode)
  const selectedGraph = graphList.find((g) => g.graph_id === selectedGraphId);
  const mainControlNode = selectedGraph?.nodes?.find(
    (n) => n.name === "main_control"
  );
  
  let greetingScripts = mainControlNode?.property?.greeting_scripts as Array<{
    name: string;
    text: string;
  }>;

  // Fallback if not found in graph properties
  // Note: selectedGraphId might be empty initially, or might not match keys in map exactly if there are prefixes
  // The map keys are like "part2_AIReview", ensuring selectedGraphId matches.
  if (!greetingScripts && selectedGraphId) {
    // Check direct match
    if (GREETING_SCRIPTS_MAP[selectedGraphId]) {
        greetingScripts = GREETING_SCRIPTS_MAP[selectedGraphId];
    } 
    // Check if graph name matches (sometimes id is uuid but name is what we want)
    else if (selectedGraph?.name && GREETING_SCRIPTS_MAP[selectedGraph.name]) {
        greetingScripts = GREETING_SCRIPTS_MAP[selectedGraph.name];
    }
  }

  React.useEffect(() => {
    if (channel) {
      checkAgentConnected();
    }
  }, [channel]);

  const checkAgentConnected = async () => {
    const res: any = await apiPing(channel);
    if (res?.code == 0) {
      dispatch(setAgentConnected(true));
    }
  };

  const onClickConnect = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    if (agentConnected) {
      await apiStopService(channel);
      dispatch(setAgentConnected(false));
      toast.success("Agent disconnected");
      stopPing();
    } else {
      const selectedGraph = graphList.find(
        (graph) => graph.graph_id === selectedGraphId
      );
      if (!selectedGraph) {
        toast.error("Please select a graph first");
        setLoading(false);
        return;
      }

      const res = await apiStartService({
        channel,
        userId,
        graphName: selectedGraph.name,
        language,
        voiceType,
      });
      const { code, msg } = res || {};
      if (code != 0) {
        if (code == "10001") {
          toast.error(
            "The number of users experiencing the program simultaneously has exceeded the limit. Please try again later."
          );
        } else {
          toast.error(`code:${code},msg:${msg}`);
        }
        setLoading(false);
        throw new Error(msg);
      }
      dispatch(setAgentConnected(true));
      toast.success("Agent connected");
      startPing();
    }
    setLoading(false);
  };

  const startPing = () => {
    if (intervalId) {
      stopPing();
    }
    intervalId = setInterval(() => {
      apiPing(channel);
    }, 3000);
  };

  const stopPing = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const onChangeMobileActiveTab = (tab: string) => {
    dispatch(setMobileActiveTab(tab as EMobileActiveTab));
  };

  return (
    <>
      {/* Action Bar */}
      <div
        className={cn(
          "mx-2 mt-2 flex items-center justify-between rounded-t-lg bg-[#181a1d] p-2 md:m-2 md:rounded-lg",
          className
        )}
      >
        {/* -- Description Part */}
        <div className="hidden md:block">
          <span className="font-bold text-sm">Description</span>
          <span className="ml-2 whitespace-nowrap text-muted-foreground text-xs">
            A Realtime Conversational AI Agent powered by RIGOL
          </span>
        </div>

        <div className="flex w-full flex-col justify-between md:flex-row md:items-center md:justify-end">
          {/* -- Tabs Section */}
          <Tabs
            defaultValue={mobileActiveTab}
            className="w-full md:hidden md:flex-row"
            onValueChange={onChangeMobileActiveTab}
          >
            <TabsList className="flex justify-center md:justify-start">
              {Object.values(EMobileActiveTab).map((tab) => (
                <TabsTrigger key={tab} value={tab} className="w-24 text-sm">
                  {MOBILE_ACTIVE_TAB_MAP[tab]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* -- Graph Select Part */}
          <div className="mt-2 flex w-full items-center justify-between gap-2 md:mt-0 md:w-auto md:flex-wrap">
            {/* VAD Control */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-10 min-w-[120px]",
                    vadEnabled ? "border-green-500 text-green-500" : "border-gray-500 text-gray-400"
                  )}
                >
                  {vadEnabled ? "✅ 快速打断" : "默认打断"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-[#1a1a1a] border-[#333]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">快速打断设置</span>
                    <Button
                      size="sm"
                      variant={vadEnabled ? "default" : "outline"}
                      onClick={() => onVadToggle?.(!vadEnabled)}
                      className="h-7 text-xs"
                    >
                      {vadEnabled ? "已启用" : "已禁用"}
                    </Button>
                  </div>

                  {/* Threshold */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span>音量阈值</span>
                      <span className="text-white font-mono">{vadThreshold}</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      value={vadThreshold}
                      onChange={(e) => onVadThresholdChange?.(parseInt(e.target.value))}
                      className="w-full h-2 bg-[#333] rounded-lg"
                      disabled={!vadEnabled}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {vadThreshold < 12 && "非常灵敏"}
                      {vadThreshold >= 12 && vadThreshold <= 18 && "平衡推荐"}
                      {vadThreshold > 18 && vadThreshold <= 30 && "保守抗干扰"}
                      {vadThreshold > 30 && vadThreshold <= 50 && "高度保守"}
                      {vadThreshold > 50 && "极高阈值（强抗噪）"}
                    </div>
                  </div>

                  {/* Consecutive */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span>连续检测次数</span>
                      <span className="text-white font-mono">{vadConsecutive}</span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((val) => (
                        <button
                          key={val}
                          onClick={() => onVadConsecutiveChange?.(val)}
                          className={cn(
                            "flex-1 py-1 rounded text-xs transition-colors",
                            vadConsecutive === val
                              ? "bg-green-600 text-white"
                              : "bg-[#333] text-gray-400 hover:bg-[#444]"
                          )}
                          disabled={!vadEnabled}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      预估延迟: ~{vadConsecutive * 200}ms
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="pt-3 border-t border-[#333]">
                    <div className="text-xs text-gray-400 mb-2">快速预设:</div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          onVadThresholdChange?.(12);
                          onVadConsecutiveChange?.(3);
                        }}
                        className="px-2 py-1 bg-[#333] hover:bg-[#444] rounded text-xs text-white disabled:opacity-50"
                        disabled={!vadEnabled}
                      >
                        灵敏
                      </button>
                      <button
                        onClick={() => {
                          onVadThresholdChange?.(15);
                          onVadConsecutiveChange?.(2);
                        }}
                        className="px-2 py-1 bg-[#333] hover:bg-[#444] rounded text-xs text-white disabled:opacity-50"
                        disabled={!vadEnabled}
                      >
                        平衡⭐
                      </button>
              <button
                onClick={() => {
                  onVadThresholdChange?.(25);
                  onVadConsecutiveChange?.(3);
                }}
                className="px-2 py-1 bg-[#333] hover:bg-[#444] rounded text-xs text-white disabled:opacity-50"
                disabled={!vadEnabled}
              >
                保守
              </button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <RemoteGraphSelect />
            
            {/* Greeting Scripts Buttons */}
            {greetingScripts && greetingScripts.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto max-w-[400px] no-scrollbar">
                {greetingScripts.map((script, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs whitespace-nowrap border-[#FFCC00]/50 text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black z-50 relative cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent bubbling
                        console.log("Greeting button clicked:", script.text);
                        if (onSpeak) {
                            onSpeak(script.text);
                        } else {
                            console.error("onSpeak prop is missing in ActionBar");
                        }
                    }}
                    title={script.text}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    {script.name}
                  </Button>
                ))}
              </div>
            )}

            {isEditModeOn && (
              <>
                <TrulienceCfgSheet />
                {/* <RemoteModuleCfgSheet /> */}
                {/* <RemotePropertyCfgSheet /> */}
              </>
            )}

            {/* -- Action Button */}
            <div className="flex items-center gap-2 md:ml-auto">
              <LoadingButton
                onClick={onClickConnect}
                variant={!agentConnected ? "default" : "destructive"}
                size="sm"
                disabled={!selectedGraphId && !agentConnected}
                className="w-fit min-w-24 shrink-0"
                loading={loading}
                svgProps={{ className: "h-4 w-4 text-muted-foreground" }}
              >
                {loading
                  ? "Connecting"
                  : !agentConnected
                    ? "Connect"
                    : "Disconnect"}
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
