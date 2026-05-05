/**
 * Watches for new block/coach events in the local SQLite store and
 * fires native OS notifications via Tauri's notification plugin.
 *
 * Behavior:
 * - On first run, asks the user for notification permission.
 * - Polls events every 3 seconds; only fires for new events newer
 *   than the last seen timestamp (kept in-memory + localStorage so
 *   we don't double-fire on app restart).
 * - Respects the user's "notification level" setting:
 *     "all"      — every block + coach
 *     "critical" — only blocks + critical agent_self_events (default)
 *     "off"      — never fires
 */
import { useEffect, useRef } from "react";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { recentEvents } from "../lib/tauri";

const LAST_SEEN_KEY = "medusa.last_notified_ts";
const NOTIF_LEVEL_KEY = "medusa.notif_level";

type NotifLevel = "all" | "critical" | "off";

function getLevel(): NotifLevel {
  return (localStorage.getItem(NOTIF_LEVEL_KEY) as NotifLevel) || "critical";
}

export function setNotificationLevel(level: NotifLevel) {
  localStorage.setItem(NOTIF_LEVEL_KEY, level);
}

export function useNotifications() {
  const lastSeen = useRef<string>(localStorage.getItem(LAST_SEEN_KEY) || "");

  useEffect(() => {
    // Permission flow on mount.
    (async () => {
      try {
        let granted = await isPermissionGranted();
        if (!granted) {
          const r = await requestPermission();
          granted = r === "granted";
        }
        if (!granted) return;
      } catch {
        return;
      }
    })();

    let cancelled = false;
    const tick = async () => {
      const level = getLevel();
      if (level === "off") return;

      try {
        const events = await recentEvents(20);
        const fresh = events.filter((e) => e.timestamp > lastSeen.current);
        if (fresh.length === 0) return;

        // Update the watermark before firing — we want at-most-once
        // delivery, even if a notification fails.
        const newest = fresh.reduce(
          (a, b) => (a.timestamp > b.timestamp ? a : b),
        ).timestamp;
        lastSeen.current = newest;
        localStorage.setItem(LAST_SEEN_KEY, newest);

        for (const e of fresh) {
          const isBlock = e.verdict === "block" || e.verdict === "redact";
          const isCoach = e.verdict === "coach";
          const isCritical = e.message_type === "agent_self_event" && e.verdict === "critical";

          let shouldFire = false;
          if (level === "all") {
            shouldFire = isBlock || isCoach || isCritical;
          } else if (level === "critical") {
            shouldFire = isBlock || isCritical;
          }
          if (!shouldFire) continue;

          const title = isCritical
            ? `Medusa — ${e.rule_name || "critical"}`
            : isBlock
              ? "Medusa blocked a request"
              : "Medusa coached a request";
          const body =
            e.reason ||
            `${e.tool_name || e.message_type} on ${e.server_name || "—"}`;

          try {
            sendNotification({ title, body });
          } catch {
            // ignore; the platform may not support notifications
          }
        }
      } catch {
        // poll error — try again next tick
      }
    };

    const id = setInterval(() => {
      if (!cancelled) tick();
    }, 3000);
    tick();

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
}
