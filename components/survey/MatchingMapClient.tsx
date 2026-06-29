"use client";

import dynamic from "next/dynamic";
import type { SeniorLocation, ProviderMarker } from "./MatchingMap";

const MatchingMap = dynamic(() => import("./MatchingMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 text-muted-foreground text-sm gap-2 bg-white border border-gray-200 rounded-xl">
      <div className="w-4 h-4 rounded-full border-2 border-[#1e3a5f] border-t-transparent animate-spin" />
      Wczytywanie mapy dopasowania…
    </div>
  ),
});

interface Props {
  senior: SeniorLocation;
  providers: ProviderMarker[];
}

export default function MatchingMapClient({ senior, providers }: Props) {
  return <MatchingMap senior={senior} providers={providers} />;
}
