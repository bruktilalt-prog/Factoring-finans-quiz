"use client";

import { useEffect, useState } from "react";

function TextLogo() {
  return (
    <div>
      <p className="text-xl font-bold tracking-tight text-[#0a3d62] sm:text-2xl">
        FACTORING<span className="font-medium text-[#3d84c7]">FINANS</span>
      </p>
      <p className="text-xs text-slate-400">– Et datterselskap av Brage Finans</p>
    </div>
  );
}

/**
 * Preloads /public/logo.png via a detached Image object (not the rendered
 * <img>) so a missing file never flashes a broken-image icon: hydration
 * timing means the DOM img's own onError can fire before React attaches it.
 * Falls back to a text rendering of the brand until/unless the file loads.
 */
export default function Logo() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setLoaded(true);
    img.onerror = () => setLoaded(false);
    img.src = "/logo.png";
  }, []);

  if (!loaded) {
    return <TextLogo />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Factoring Finans – et datterselskap av Brage Finans"
      className="mx-auto h-9 w-auto sm:h-11"
    />
  );
}
