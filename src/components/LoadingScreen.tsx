export default function LoadingScreen() {
  return (
    <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-6 animate-pulse duration-[3000ms]">
      <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center">
        {/* Glow behind loading */}
        <div className="absolute inset-0 bg-[#D2FA00]/10 rounded-full blur-[25px] pointer-events-none animate-pulse" />
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(210,250,0,0.15)]"
        >
          <source src="/loading.webm" type="video/webm" />
          Your browser does not support the video tag.
        </video>
      </div>
      <p className="text-[11px] font-black tracking-[0.25em] text-[#D2FA00] uppercase mt-4 animate-pulse">
        LOADING DATA
      </p>
    </div>
  );
}

export function GlobalLoadingScreen() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-6">
      <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
        {/* Glow behind loading */}
        <div className="absolute inset-0 bg-[#D2FA00]/12 rounded-full blur-[35px] pointer-events-none animate-pulse duration-[2000ms]" />
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(210,250,0,0.2)]"
        >
          <source src="/loading.webm" type="video/webm" />
          Your browser does not support the video tag.
        </video>
      </div>
      <p className="text-[11px] font-black tracking-[0.3em] text-[#D2FA00] uppercase mt-5 animate-pulse">
        WATSUB IS INITIALIZING
      </p>
    </div>
  );
}
