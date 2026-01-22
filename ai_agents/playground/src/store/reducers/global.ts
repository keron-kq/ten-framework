import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  COLOR_LIST,
  DEFAULT_OPTIONS,
  DEFAULT_TRULIENCE_OPTIONS,
  EMobileActiveTab,
  isEditModeOn,
} from "@/common/constant";
import type { AddonDef, Graph } from "@/common/graph";
import { useAppSelector } from "@/common/hooks";
import {
  apiFetchGraphDetails,
  apiFetchGraphs,
  apiFetchInstalledAddons,
  apiLoadApp,
  apiReloadPackage,
  apiSaveProperty,
  apiUpdateGraph,
} from "@/common/request";
import {
  setOptionsToLocal,
  setTrulienceSettingsToLocal,
} from "@/common/storage";
import type {
  IChatItem,
  IOptions,
  ITrulienceSettings,
  Language,
  VoiceType,
} from "@/types";

export interface InitialState {
  options: IOptions;
  roomConnected: boolean;
  agentConnected: boolean;
  rtmConnected: boolean;
  themeColor: string;
  language: Language;
  voiceType: VoiceType;
  chatItems: IChatItem[];
  selectedGraphId: string;
  graphList: Graph[];
  graphMap: Record<string, Graph>;
  addonModules: AddonDef.Module[]; // addon modules
  mobileActiveTab: EMobileActiveTab;
  trulienceSettings: ITrulienceSettings;
}

const getInitialState = (): InitialState => {
  return {
    options: DEFAULT_OPTIONS,
    themeColor: COLOR_LIST[0].active,
    roomConnected: false,
    agentConnected: false,
    rtmConnected: false,
    language: "en-US",
    voiceType: "male",
    chatItems: [],
    selectedGraphId: "",
    graphList: [],
    graphMap: {},
    addonModules: [],
    mobileActiveTab: EMobileActiveTab.AGENT,
    trulienceSettings: DEFAULT_TRULIENCE_OPTIONS,
  };
};

export const globalSlice = createSlice({
  name: "global",
  initialState: getInitialState(),
  reducers: {
    setOptions: (state, action: PayloadAction<Partial<IOptions>>) => {
      state.options = { ...state.options, ...action.payload };
      setOptionsToLocal(state.options);
    },
    setTrulienceSettings: (
      state,
      action: PayloadAction<ITrulienceSettings>
    ) => {
      state.trulienceSettings = {
        ...state.trulienceSettings,
        ...action.payload,
      };
      setTrulienceSettingsToLocal(state.trulienceSettings);
    },
    setThemeColor: (state, action: PayloadAction<string>) => {
      state.themeColor = action.payload;
      document.documentElement.style.setProperty(
        "--theme-color",
        action.payload
      );
    },
    setRoomConnected: (state, action: PayloadAction<boolean>) => {
      state.roomConnected = action.payload;
    },
    setRtmConnected: (state, action: PayloadAction<boolean>) => {
      state.rtmConnected = action.payload;
    },
    addChatItem: (state, action: PayloadAction<IChatItem>) => {
      const { userId, text, isFinal, type, time } = action.payload;
      const LastFinalIndex = state.chatItems.findLastIndex((el) => {
        return el.userId == userId && el.isFinal;
      });
      const LastNonFinalIndex = state.chatItems.findLastIndex((el) => {
        return el.userId == userId && !el.isFinal;
      });
      const LastFinalItem = state.chatItems[LastFinalIndex];
      const LastNonFinalItem = state.chatItems[LastNonFinalIndex];
      if (LastFinalItem) {
        // has last final Item
        if (time <= LastFinalItem.time) {
          // discard
          console.log(
            "[test] addChatItem, time < last final item, discard!:",
            text,
            isFinal,
            type
          );
          return;
        } else {
          if (LastNonFinalItem) {
            console.log(
              "[test] addChatItem, update last item(none final):",
              text,
              isFinal,
              type
            );
            state.chatItems[LastNonFinalIndex] = action.payload;
          } else {
            console.log(
              "[test] addChatItem, add new item:",
              text,
              isFinal,
              type
            );
            state.chatItems.push(action.payload);
          }
        }
      } else {
        // no last final Item
        if (LastNonFinalItem) {
          console.log(
            "[test] addChatItem, update last item(none final):",
            text,
            isFinal,
            type
          );
          state.chatItems[LastNonFinalIndex] = action.payload;
        } else {
          console.log("[test] addChatItem, add new item:", text, isFinal, type);
          state.chatItems.push(action.payload);
        }
      }
      state.chatItems.sort((a, b) => a.time - b.time);
    },
    setAgentConnected: (state, action: PayloadAction<boolean>) => {
      state.agentConnected = action.payload;
    },
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
    },
    setSelectedGraphId: (state, action: PayloadAction<string>) => {
      state.selectedGraphId = action.payload;
    },
    setGraphList: (state, action: PayloadAction<Graph[]>) => {
      state.graphList = action.payload;
    },
    setVoiceType: (state, action: PayloadAction<VoiceType>) => {
      state.voiceType = action.payload;
    },
    setMobileActiveTab: (state, action: PayloadAction<EMobileActiveTab>) => {
      state.mobileActiveTab = action.payload;
    },
    reset: (state) => {
      Object.assign(state, getInitialState());
      document.documentElement.style.setProperty(
        "--theme-color",
        COLOR_LIST[0].active
      );
    },
    setGraph: (state, action: PayloadAction<Graph>) => {
      const graphMap = JSON.parse(JSON.stringify(state.graphMap));
      graphMap[action.payload.graph_id] = action.payload;
      state.graphMap = graphMap;
    },
    setAddonModules: (state, action: PayloadAction<Record<string, any>[]>) => {
      state.addonModules = JSON.parse(JSON.stringify(action.payload));
    },
  },
});

// Initialize graph data
let initializeGraphData: any;
// Fetch graph details
let fetchGraphDetails: any;

// if (isEditModeOn) {
//   // only for development, below requests depend on dev-server
//   initializeGraphData = createAsyncThunk(
//     "global/initializeGraphData",
//     async (_, { dispatch }) => {
//       try {
//         await apiReloadPackage();
//       } catch (error) {
//         console.warn("Error reloading package:", error);
//       }
//       await apiLoadApp();
//       const [fetchedGraphs, modules] = await Promise.all([
//         apiFetchGraphs(),
//         apiFetchInstalledAddons(),
//       ]);
//       dispatch(setGraphList(fetchedGraphs.map((graph) => graph)));
//       dispatch(setAddonModules(modules));
//     }
//   );
//   fetchGraphDetails = createAsyncThunk(
//     "global/fetchGraphDetails",
//     async (graph: Graph, { dispatch }) => {
//       const updatedGraph = await apiFetchGraphDetails(graph);
//       dispatch(setGraph(updatedGraph));
//     }
//   );
// } else {
initializeGraphData = createAsyncThunk(
  "global/initializeGraphData",
  async (_, { dispatch }) => {
    // Fetch basic graph list
    const fetchedGraphs = await apiFetchGraphs();
    
    // In production mode, we need to populate properties (like greeting_scripts) manually
    // since apiFetchGraphs only returns basic info.
    // We'll try to fetch details for each graph if possible, or fallback to a hardcoded map if endpoints fail.
    // Since /graphs/detail endpoints are failing in production, we might need to rely on what apiFetchGraphs returns.
    // If apiFetchGraphs returns empty nodes, we have a problem.
    
    // WORKAROUND: If nodes are empty, we can't get properties.
    // However, the `Action.tsx` relies on `graphList` having nodes.
    // Let's check if we can get the full graph list from a different endpoint or if we need to mock it for now.
    
    // Actually, let's try to see if we can get the property.json content directly via an API?
    // Probably not exposed.
    
    // Let's assume for now we can't get dynamic properties in production without the dev server.
    // BUT, we can hardcode the greeting scripts in the frontend as a fallback map if they are missing from the graph object.
    // This is safer than trying to fix the backend API right now.
    
    dispatch(setGraphList(fetchedGraphs.map((graph) => graph)));
  }
);
fetchGraphDetails = createAsyncThunk(
  "global/fetchGraphDetails",
  async (graphId: string, { dispatch }) => {
    // Do nothing in production
    return;
  }
);
// }

// Update a graph
export const updateGraph = createAsyncThunk(
  "global/updateGraph",
  async (
    { graph, updates }: { graph: Graph; updates: Partial<Graph> },
    { dispatch, rejectWithValue }
  ) => {
    try {
      await apiUpdateGraph(graph.graph_id, updates);
      // await apiSaveProperty();
      const updatedGraph = await apiFetchGraphDetails(graph);
      dispatch(setGraph(updatedGraph));
      return updatedGraph; // Optionally return the updated graph
    } catch (error: any) {
      // Handle error gracefully
      console.error("Error updating graph:", error);
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const {
  reset,
  setOptions,
  setRoomConnected,
  setAgentConnected,
  setRtmConnected,
  setVoiceType,
  addChatItem,
  setThemeColor,
  setLanguage,
  setSelectedGraphId,
  setGraphList,
  setMobileActiveTab,
  setGraph,
  setAddonModules,
  setTrulienceSettings,
} = globalSlice.actions;

export { initializeGraphData, fetchGraphDetails };

export default globalSlice.reducer;
