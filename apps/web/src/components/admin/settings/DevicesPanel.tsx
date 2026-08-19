import { useEffect, useState } from "react";
import { useAdminApi } from "../../../contexts/AdminApiContext";
import { adminFetch, toErrorMessage } from "../../../lib/adminApi";

interface Device {
  id: string;
  name: string;
  pairedAt: string;
  lastSeenAt: string | null;
}

interface PairingCode {
  code: string;
  expiresAt: string;
}

export default function DevicesPanel() {
  const { baseUrl, onError } = useAdminApi();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pairing, setPairing] = useState<PairingCode | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const data = await adminFetch<{ devices: Device[] }>(baseUrl, "/api/admin/devices", {
        errorMessage: "Failed to load devices",
      });
      setDevices(data.devices);
    } catch (err) {
      onError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pairing) return;
    const tick = () => {
      const left = Math.max(0, Math.round((new Date(pairing.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setPairing(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pairing]);

  async function generateCode() {
    setGenerating(true);
    try {
      const data = await adminFetch<PairingCode>(baseUrl, "/api/admin/devices/pairing-code", {
        method: "POST",
        errorMessage: "Failed to generate code",
      });
      setPairing(data);
    } catch (err) {
      onError(toErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  async function revoke(id: string, name: string) {
    if (!confirm(`Revoke "${name}"? It will stop being able to log attendance immediately.`)) return;
    try {
      await adminFetch(baseUrl, `/api/admin/devices/${id}`, {
        method: "DELETE",
        errorMessage: "Failed to revoke device",
      });
      await load();
    } catch (err) {
      onError(toErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-card rounded-xl border border-border p-4 lg:p-6">
        <h2 className="text-lg lg:text-xl font-bold text-foreground mb-1">Kiosk Devices</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Only paired devices can log attendance — this is what stops check-ins from anywhere
          other than your physical kiosk. Generate a code here and enter it on the kiosk screen
          to pair it.
        </p>

        {pairing ? (
          <div className="text-center py-6 bg-background border border-border rounded-xl">
            <p className="text-xs text-muted-foreground mb-2">Enter this code on the kiosk</p>
            <p className="text-4xl font-bold tracking-[0.3em] text-foreground font-mono">{pairing.code}</p>
            <p className="text-xs text-muted-foreground mt-3">Expires in {secondsLeft}s</p>
          </div>
        ) : (
          <button
            onClick={generateCode}
            disabled={generating}
            className="w-full bg-primary hover:opacity-90 text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Pairing Code"}
          </button>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 lg:p-6">
        <h3 className="text-sm font-bold text-foreground mb-3">Paired Devices</h3>
        {loading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>
        ) : devices.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No devices paired yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-foreground text-sm">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Paired {new Date(d.pairedAt).toLocaleDateString()}
                    {d.lastSeenAt && ` · Last seen ${new Date(d.lastSeenAt).toLocaleString()}`}
                  </div>
                </div>
                <button
                  onClick={() => revoke(d.id, d.name)}
                  className="px-3 py-1.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-xs font-medium"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
