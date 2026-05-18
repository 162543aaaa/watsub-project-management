import loadingWebm from "@/assets/loading.webm";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-56 h-56 sm:w-72 sm:h-72 flex items-center justify-center">
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
      <div className="w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
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
