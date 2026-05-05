/**
 * Polls recent events from the local SQLite store every 2 seconds.
 * Optionally filters by verdict.
 */
import { useEffect, useState } from "react";
import { recentEvents, eventStats, type GatewayEvent } from "../lib/tauri";

export function useEvents(limit = 50, verdictFilter?: string) {
  const [events, setEvents] = useState<GatewayEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const next = await recentEvents(limit, verdictFilter);
        if (!cancelled) {
          setEvents(next);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [limit, verdictFilter]);

  return { events, loading };
}

export function useEventStats() {
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    blocks_24h: number;
    events_24h: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const next = await eventStats();
        if (!cancelled) setStats(next);
      } catch {
        // ignore
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return stats;
}
