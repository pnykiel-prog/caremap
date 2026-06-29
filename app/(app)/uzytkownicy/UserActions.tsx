"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, PauseCircle } from "lucide-react";

interface Props {
  userId: string;
  mode?: "approve" | "suspend";
}

export default function UserActions({ userId, mode = "approve" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const updateStatus = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (mode === "suspend") {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => updateStatus("SUSPENDED")}
        title="Zawieś konto"
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <PauseCircle size={12} />
        Zawieś
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={loading}
        onClick={() => updateStatus("ACTIVE")}
        title="Akceptuj"
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
      >
        <Check size={12} />
        Akceptuj
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => updateStatus("REJECTED")}
        title="Odrzuć"
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        <X size={12} />
        Odrzuć
      </button>
    </div>
  );
}
