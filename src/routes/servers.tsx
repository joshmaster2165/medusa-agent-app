import { useEffect, useState } from "react";
import { listServers, type ServerEntry } from "../lib/tauri";
import { Shield, ShieldOff, RefreshCw } from "lucide-react";

export default function Servers() {
  const [servers, setServers] = useState<ServerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      setServers(await listServers());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Group by client
  const byClient = servers.reduce<Record<string, ServerEntry[]>>((acc, s) => {
    acc[s.client] = acc[s.client] ?? [];
    acc[s.client].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-secondary">
          Auto-discovered MCP servers across {Object.keys(byClient).length} client(s).
          Each row shows whether the gateway proxy is in front of it.
        </p>
        <button
          onClick={refresh}
          className="flex items-center gap-2 rounded-md border border-border/40 bg-bg-elevated px-3 py-1.5 text-xs hover:bg-bg-elevated/80"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Re-scan
        </button>
      </div>

      {Object.entries(byClient).map(([client, list]) => (
        <div key={client} className="rounded-lg border border-border/30 bg-bg-card">
          <div className="border-b border-border/30 px-5 py-3 text-sm font-semibold">{client}</div>
          <div>
            {list.map((s, i) => (
              <div
                key={`${s.server_name}-${i}`}
                className="flex items-center justify-between border-b border-border/20 px-5 py-3 last:border-b-0"
              >
                <div>
                  <div className="font-mono text-sm">{s.server_name}</div>
                  <div className="mt-1 truncate font-mono text-xs text-ink-secondary">
                    {s.command} {s.args.join(" ")}
                  </div>
                </div>
                <div>
                  {s.gateway_installed ? (
                    <span className="flex items-center gap-1.5 rounded-md bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
                      <Shield className="h-3.5 w-3.5" />
                      Protected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-md bg-accent-warn/10 px-2.5 py-1 text-xs font-bold text-accent-warn">
                      <ShieldOff className="h-3.5 w-3.5" />
                      Bypassed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {servers.length === 0 && !loading && (
        <div className="rounded-lg border border-border/30 bg-bg-card p-12 text-center text-sm text-ink-secondary">
          No MCP servers discovered. Configure one in Claude Desktop, Cursor, or
          another MCP client and click Re-scan.
        </div>
      )}
    </div>
  );
}
