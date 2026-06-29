"use client";

import dynamic from "next/dynamic";

const MapPanel = dynamic(() => import("./MapPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 text-muted-foreground text-sm gap-2">
      <div className="w-4 h-4 rounded-full border-2 border-[#1e3a5f] border-t-transparent animate-spin" />
      Wczytywanie mapy...
    </div>
  ),
});

export default function MapPanelClient() {
  return <MapPanel />;
}
