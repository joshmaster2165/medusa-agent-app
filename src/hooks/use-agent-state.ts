/**
 * Global agent state store. Polled every 2s from the daemon's local
 * control endpoint and from the SQLite event store.
 */
import { create } from "zustand";
import {
  type AgentConfig,
  type DaemonStatus,
  loadAgentConfig,
  daemonStatus,
} from "../lib/tauri";

export interface AgentState {
  config_loaded: boolean;
  config: AgentConfig | null;
  daemon: DaemonStatus | null;
  last_refresh: number;
  refresh: () => Promise<AgentState>;
}

export const useAgentState = create<AgentState>((set, get) => ({
  config_loaded: false,
  config: null,
  daemon: null,
  last_refresh: 0,
  refresh: async () => {
    let config: AgentConfig | null = null;
    let daemon: DaemonStatus | null = null;
    try {
      config = await loadAgentConfig();
    } catch {
      // file missing / first-run case — onboarding will surface this
    }
    try {
      daemon = await daemonStatus();
    } catch {
      // daemon unreachable
    }
    set({
      config,
      config_loaded: config !== null,
      daemon,
      last_refresh: Date.now(),
    });
    return get();
  },
}));
