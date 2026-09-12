import { useEffect, useRef } from "react";

interface FlowingRibbonsProps {
  backgroundColor?: string;
  lineColor?: string;
  animationSpeed?: number;
  className?: string;
}

export default function FlowingRibbons({
  backgroundColor = "transparent",
  lineColor = "rgba(15, 23, 42, 0.08)",
  animationSpeed = 0.3,
  className = "fixed inset-0 -z-10 h-full w-full overflow-hidden pointer-events-none",
}: FlowingRibbonsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reducedData = window.matchMedia("(prefers-reduced-data: reduce)");
    let frameId: number | null = null;

    const resize = () => {
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (timestamp = 0) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const density = width < 640 ? 30 : width < 1200 ? 42 : 54;
      const ribbonWidth = width * 0.85;
      const ribbonOffset = (width - ribbonWidth) / 2;
      const t = timestamp * 0.001 * animationSpeed;

      if (backgroundColor === "transparent") ctx.clearRect(0, 0, width, height);
      else {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 0.5;

      const point = (x: number, y: number, progress: number) => {
        const offsetX = Math.sin(progress * Math.PI * 4 + t * 3) * 24
          + Math.sin(x * 0.014 + y * 0.01 + t) * 8;
        const offsetY = Math.sin(progress * Math.PI * 7 - t * 2.2) * 12;
        return [x + offsetX, y + offsetY] as const;
      };

      for (let i = 0; i < density; i += 1) {
        const x = ribbonOffset + (i / density) * ribbonWidth;
        ctx.beginPath();
        for (let j = 0; j <= density; j += 1) {
          const progress = (j / density) * 1.2 - 0.1;
          const [px, py] = point(x, progress * height, progress);
          if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      for (let j = 0; j < density; j += 1) {
        const progress = (j / density) * 1.2 - 0.1;
        const y = progress * height;
        ctx.beginPath();
        for (let i = 0; i <= density; i += 1) {
          const x = ribbonOffset + (i / density) * ribbonWidth;
          const [px, py] = point(x, y, progress);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    };

    const shouldAnimate = () => !document.hidden && !reducedMotion.matches && !reducedData.matches;
    const tick = (timestamp: number) => {
      draw(timestamp);
      frameId = shouldAnimate() ? requestAnimationFrame(tick) : null;
    };
    const syncAnimation = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      if (shouldAnimate()) frameId = requestAnimationFrame(tick);
      else draw(0);
    };
    const handleResize = () => { resize(); draw(0); };

    resize();
    syncAnimation();
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", syncAnimation);
    reducedMotion.addEventListener("change", syncAnimation);
    reducedData.addEventListener("change", syncAnimation);

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", syncAnimation);
      reducedMotion.removeEventListener("change", syncAnimation);
      reducedData.removeEventListener("change", syncAnimation);
    };
  }, [animationSpeed, backgroundColor, lineColor]);

  return (
    <div className={className} style={{ backgroundColor }} aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full opacity-70" />
    </div>
  );
}
