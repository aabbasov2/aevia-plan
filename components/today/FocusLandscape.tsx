import Image from "next/image";
import type { FocusArtifactStyle } from "@/lib/types";

export function FocusLandscape({ style }: { style: FocusArtifactStyle }) {
  return <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <Image
      src={`/focus-artifacts/${style}-scene-hq.webp`}
      alt=""
      width={1774}
      height={887}
      unoptimized
      priority
      className="absolute bottom-[-2vh] left-1/2 h-auto w-[min(94vw,760px)] max-w-none -translate-x-1/2 opacity-[.55]"
      style={{ maskImage: "radial-gradient(ellipse 75% 75% at 50% 64%, black 45%, transparent 100%)" }}
    />
    <div className="absolute inset-x-0 bottom-0 h-[42vh] bg-gradient-to-t from-[#0b0b0d]/75 via-transparent to-transparent" />
  </div>;
}
