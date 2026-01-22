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

let intervalId: NodeJS.Timeout | null = null;

export default function ActionBar(props: { className?: string; onSpeak?: (text: string) => void }) {
  const { className, onSpeak } = props;
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
