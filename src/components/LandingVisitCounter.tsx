import { useEffect, useState } from "react";

const API_URL = "https://math315-counter.vercel.app/api/landing-visit";

type VisitStats = {
  total: number;
  online: number;
};

function getVisitSessionId(): string {
  const key = "__math315_landing_visit_sid";

  try {
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = `visit_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      sessionStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return `visit_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  }
}

export default function LandingVisitCounter() {
  const [stats, setStats] = useState<VisitStats | null>(null);

  useEffect(() => {
    let active = true;
    const sessionId = getVisitSessionId();

    const updateStats = async () => {
      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) throw new Error("Counter API tidak tersedia");
        const data = await response.json();

        if (active && data.success) {
          setStats({
            total: Number(data.total) || 0,
            online: Number(data.online) || 0,
          });
        }
      } catch (error) {
        console.warn("[LandingVisitCounter]", error);
      }
    };

    void updateStats();
    const timer = window.setInterval(updateStats, 30_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div
      aria-label="Statistik kunjungan Portal Matematika"
      className="pointer-events-auto flex flex-wrap items-center gap-2 sm:gap-3 text-white"
    >
      <div className="rounded-lg border border-white/20 bg-black/50 px-3 py-2 backdrop-blur-md">
        <div className="text-[11px] sm:text-xs text-white/75">
          Total kunjungan
        </div>
        <div className="text-sm sm:text-base font-semibold">
          {stats ? stats.total.toLocaleString("id-ID") : "…"}
        </div>
        <div className="text-[10px] text-white/60">
          Sejak 27 Oktober 2026
        </div>
      </div>

      <div className="rounded-lg border border-white/20 bg-black/50 px-3 py-2 backdrop-blur-md">
        <div className="text-[11px] sm:text-xs text-white/75">
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-400" />
          Online saat ini
        </div>
        <div className="text-sm sm:text-base font-semibold">
          {stats ? stats.online.toLocaleString("id-ID") : "…"}
        </div>
        <div className="text-[10px] text-white/60">
          Pengunjung aktif
        </div>
      </div>
    </div>
  );
}
