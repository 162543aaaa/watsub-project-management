import loadingWebm from "@/assets/loading.webm";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-32 h-32 sm:w-48 sm:h-48 flex items-center justify-center">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-contain"
          style={{ imageRendering: "-webkit-optimize-contrast", transform: "translateZ(0)" }}
        >
          <source src={loadingWebm} type="video/webm" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}

export function GlobalLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="w-32 h-32 sm:w-48 sm:h-48 flex items-center justify-center">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-contain"
          style={{ imageRendering: "-webkit-optimize-contrast", transform: "translateZ(0)" }}
        >
          <source src={loadingWebm} type="video/webm" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}
