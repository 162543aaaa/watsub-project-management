// Custom-crafted in the exact Watsub Brand Style (Neo-Yellow, Vibrant Orange, Deep Purple, and Glassmorphism)
export default function DashboardAnimation() {
  return (
    <div className="relative w-full max-w-[320px] sm:max-w-[380px] aspect-square mx-auto flex items-center justify-center select-none group">
      {/* Ambient Radial Neon Glows */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#D2FA00]/20 via-[#F4622A]/10 to-[#6B3FA0]/20 rounded-full blur-[40px] animate-pulse duration-[6000ms] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-24 h-24 bg-[#3EADD4]/15 rounded-full blur-[30px] animate-bounce duration-[8000ms] pointer-events-none" />
      
      {/* SVG Illustration Container */}
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full drop-shadow-[0_16px_32px_rgba(0,0,0,0.4)] transform hover:scale-[1.02] transition-transform duration-500 ease-out"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D2FA00" />
            <stop offset="50%" stopColor="#F4622A" />
            <stop offset="100%" stopColor="#6B3FA0" />
          </linearGradient>
          <linearGradient id="limeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D2FA00" />
            <stop offset="100%" stopColor="#9ebd00" />
          </linearGradient>
          <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F4622A" />
            <stop offset="100%" stopColor="#b53f12" />
          </linearGradient>
          <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6B3FA0" />
            <stop offset="100%" stopColor="#3d1d66" />
          </linearGradient>
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3EADD4" />
            <stop offset="100%" stopColor="#1e6b85" />
          </linearGradient>
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e1e24" />
            <stop offset="100%" stopColor="#0c0d12" />
          </linearGradient>
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd8bd" />
            <stop offset="100%" stopColor="#f5b993" />
          </linearGradient>
          <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>
          
          {/* Filters for Premium Glow */}
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* 1. Background Abstract Grid & Concentric Circles */}
        <g opacity="0.15">
          <circle cx="250" cy="250" r="220" fill="none" stroke="url(#brandGrad)" strokeWidth="1" strokeDasharray="5 5" className="animate-spin duration-[60000ms]" />
          <circle cx="250" cy="250" r="180" fill="none" stroke="#white" strokeWidth="0.5" />
          <circle cx="250" cy="250" r="140" fill="none" stroke="url(#brandGrad)" strokeWidth="1.5" strokeDasharray="10 20" className="animate-spin duration-[40000ms] reverse" />
        </g>

        {/* 2. Cozy Home Backdrop (Window & Plant) */}
        <g filter="url(#softShadow)">
          {/* Modern Circular Window Frame */}
          <circle cx="250" cy="180" r="90" fill="#13141f" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <path d="M 160 180 L 340 180" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
          <path d="M 250 90 L 250 270" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
          
          {/* Cute Room Plant */}
          <path d="M 90 280 Q 75 220 50 240 Q 40 290 90 280" fill="url(#limeGrad)" opacity="0.8" />
          <path d="M 90 280 Q 110 210 130 230 Q 120 295 90 280" fill="url(#limeGrad)" opacity="0.6" />
          {/* Plant Pot */}
          <path d="M 75 280 L 105 280 L 100 310 L 80 310 Z" fill="#2d2f3d" />
        </g>

        {/* 3. The Modern Casual Chair (Chunky Orange & Bold Silhouette) */}
        <g filter="url(#softShadow)">
          {/* Chair Legs */}
          <line x1="200" y1="330" x2="160" y2="420" stroke="#0e0f14" strokeWidth="8" strokeLinecap="round" />
          <line x1="260" y1="330" x2="290" y2="420" stroke="#0e0f14" strokeWidth="8" strokeLinecap="round" />
          
          {/* Chair Cushion Base */}
          <path d="M 140 330 Q 230 360 320 330 Q 300 310 230 310 Q 160 310 140 330 Z" fill="url(#orangeGrad)" />
          {/* High Ergonomic Backrest */}
          <path d="M 140 330 Q 130 200 170 190 Q 200 180 200 240 Q 200 300 230 310 Z" fill="url(#orangeGrad)" />
        </g>

        {/* 4. The Working Girl (Sleek Minimalist Vector Shape) */}
        <g>
          {/* Girl's Torso & Leg (Sitting Casual) */}
          {/* Jeans / Pants */}
          <path d="M 180 300 Q 220 310 270 310 Q 350 310 370 335 Q 380 350 360 380 Q 340 400 310 370" fill="url(#blueGrad)" />
          {/* Cozy Green/Teal Hoodie */}
          <path d="M 170 240 Q 230 250 250 290 Q 240 320 180 320 Q 160 300 170 240 Z" fill="url(#purpleGrad)" />
          <path d="M 230 240 Q 260 250 270 290" stroke="url(#purpleGrad)" strokeWidth="15" strokeLinecap="round" />

          {/* Skin - Neck */}
          <rect x="187" y="195" width="16" height="25" rx="8" fill="url(#skinGrad)" />
          
          {/* Hair Back */}
          <path d="M 160 190 Q 165 140 205 135 Q 235 145 220 190 Z" fill="url(#hairGrad)" />

          {/* Skin - Face Profile */}
          <path d="M 185 150 Q 215 150 215 175 Q 215 195 195 200 Q 175 195 185 150 Z" fill="url(#skinGrad)" />
          {/* Cute Blush Cheek */}
          <circle cx="202" cy="178" r="6" fill="#F4622A" opacity="0.4" />

          {/* Sleek Stylish Hair Bun / Flowing ponytail */}
          <circle cx="222" cy="142" r="14" fill="url(#hairGrad)" />
          <path d="M 170 145 Q 155 170 150 215 Q 160 220 170 180 Z" fill="url(#hairGrad)" />

          {/* Laptop / Cellphone Screen Glow on Face */}
          <path d="M 215 160 L 260 175 L 260 195 Z" fill="#D2FA00" opacity="0.15" filter="url(#neonGlow)" />
          
          {/* Sleek Arms Holding Phone/Tablet */}
          <path d="M 230 255 Q 275 255 295 240" stroke="url(#skinGrad)" strokeWidth="10" strokeLinecap="round" />
          
          {/* Premium Smartphone (Glassmorphic & Glowing) */}
          <g transform="translate(290, 215) rotate(15)">
            <rect x="0" y="0" width="16" height="32" rx="4" fill="#0c0d12" stroke="url(#limeGrad)" strokeWidth="1.5" />
            {/* Phone Screen Glow */}
            <rect x="2" y="2" width="12" height="28" rx="2" fill="#D2FA00" opacity="0.8" filter="url(#neonGlow)" className="animate-pulse" />
          </g>
        </g>

        {/* 5. Floating Animated Social / Instagram & Chat Icons (representing "social, instagram, cellphone, chat") */}
        <g filter="url(#neonGlow)" className="pointer-events-none">
          {/* 5.1 Chat Bubble 1 (Neon Lime - Left) */}
          <g transform="translate(90, 110)" className="animate-bounce duration-[4000ms]">
            <path d="M 0 10 Q 0 0 10 0 L 70 0 Q 80 0 80 10 L 80 40 Q 80 50 70 50 L 20 50 L 5 60 L 10 50 Q 0 50 0 40 Z" fill="rgba(210,250,0,0.12)" stroke="#D2FA00" strokeWidth="1.5" />
            <circle cx="25" cy="25" r="4" fill="#D2FA00" className="animate-ping" />
            <circle cx="40" cy="25" r="4" fill="#D2FA00" />
            <circle cx="55" cy="25" r="4" fill="#D2FA00" />
          </g>

          {/* 5.2 Instagram Style Heart Bubble (Orange - Right) */}
          <g transform="translate(340, 140)" className="animate-bounce duration-[5000ms] delay-200">
            <path d="M 0 10 Q 0 0 10 0 L 70 0 Q 80 0 80 10 L 80 40 Q 80 50 70 50 L 60 50 L 55 60 L 50 50 Q 0 50 0 40 Z" fill="rgba(244,98,42,0.15)" stroke="#F4622A" strokeWidth="1.5" />
            {/* Heart SVG Path */}
            <path d="M 40 32 C 40 32 33 27 33 22 C 33 18 36 15 40 19 C 44 15 47 18 47 22 C 47 27 40 32 40 32 Z" fill="#F4622A" transform="scale(1.1) translate(-3.5, -4)" />
          </g>

          {/* 5.3 Glowing Sparkles / Star Elements */}
          {/* Sparkle 1 */}
          <path d="M 330 80 Q 330 95 345 95 Q 330 95 330 110 Q 330 95 315 95 Q 330 95 330 80" fill="#D2FA00" className="animate-pulse duration-[2000ms]" />
          {/* Sparkle 2 */}
          <path d="M 120 210 Q 120 220 130 220 Q 120 220 120 230 Q 120 220 110 220 Q 120 220 120 210" fill="#F4622A" className="animate-pulse duration-[3000ms] delay-500" />
          {/* Sparkle 3 */}
          <path d="M 270 50 Q 270 58 278 58 Q 270 58 270 66 Q 270 58 262 58 Q 270 58 270 50" fill="#3EADD4" className="animate-pulse duration-[2500ms]" />
        </g>

        {/* 6. Foreground Elegant Circular Shadow base */}
        <ellipse cx="250" cy="445" rx="140" ry="12" fill="black" opacity="0.4" />
      </svg>

      {/* Decorative Interactive Floating Badge */}
      <div className="absolute bottom-5 right-5 sm:right-10 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-xl hover:scale-105 transition-transform duration-300 pointer-events-auto cursor-help" title="WatSUB! Active Animation">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D2FA00] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D2FA00]"></span>
        </span>
        <span className="text-[10px] sm:text-xs font-semibold text-white/80 tracking-wider uppercase font-sans">
          WFH Active
        </span>
      </div>
    </div>
  );
}
