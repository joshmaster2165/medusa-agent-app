import { useEffect, useState } from "react";
import { checkUpdates } from "../lib/tauri";
import { CheckCircle2, Download, Loader2 } from "lucide-react";

export default function Updates() {
  const [info, setInfo] = useState<{
    current: string;
    latest: string;
    has_update: boolean;
    release_notes: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      setInfo(await checkUpdates());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading || !info) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking for updates…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/30 bg-bg-card p-6">
        {info.has_update ? (
          <>
            <div className="flex items-center gap-3">
              <Download className="h-6 w-6 text-accent" />
              <div>
                <h2 className="text-lg font-semibold">
                  Update available: v{info.latest}
                </h2>
                <p className="text-xs text-ink-secondary">
                  Currently installed: v{info.current}
                </p>
              </div>
            </div>
            <button className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-bold text-bg-deep hover:brightness-110">
              Install Now
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-accent" />
            <div>
              <h2 className="text-lg font-semibold">You're up to date</h2>
              <p className="text-xs text-ink-secondary">v{info.current}</p>
            </div>
          </div>
        )}
      </div>

      {info.release_notes && (
        <div className="rounded-lg border border-border/30 bg-bg-card">
          <div className="border-b border-border/30 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-secondary">
            Release Notes — v{info.latest}
          </div>
          <pre className="whitespace-pre-wrap p-5 font-mono text-xs text-ink-primary">
            {info.release_notes}
          </pre>
        </div>
      )}
    </div>
  );
}
