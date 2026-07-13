export function RobotShield({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={`w-full h-full ${className}`}
      fill="none"
      stroke="currentColor"
    >
      {/* Sparkles / Effects */}
      <path d="M150 40 L155 50 L165 55 L155 60 L150 70 L145 60 L135 55 L145 50 Z" className="text-slate-300 dark:text-zinc-600 animate-pulse" fill="currentColor" stroke="none" />
      <path d="M40 60 L43 65 L48 68 L43 71 L40 76 L37 71 L32 68 L37 65 Z" className="text-slate-300 dark:text-zinc-600 animate-pulse" style={{ animationDelay: "1s" }} fill="currentColor" stroke="none" />

      {/* Robot Head */}
      <rect x="75" y="40" width="50" height="40" rx="8" strokeWidth="4" className="stroke-slate-800 dark:stroke-zinc-200 fill-white dark:fill-zinc-900" />
      
      {/* Antenna */}
      <line x1="100" y1="40" x2="100" y2="25" strokeWidth="4" strokeLinecap="round" className="stroke-slate-800 dark:stroke-zinc-200" />
      <circle cx="100" cy="20" r="4" className="fill-slate-800 dark:fill-zinc-200" />
      
      {/* Eyes */}
      <circle cx="90" cy="55" r="5" className="fill-slate-800 dark:fill-zinc-200" />
      <circle cx="110" cy="55" r="5" className="fill-slate-800 dark:fill-zinc-200" />
      
      {/* Mouth */}
      <line x1="90" y1="68" x2="110" y2="68" strokeWidth="3" strokeLinecap="round" className="stroke-slate-800 dark:stroke-zinc-200" />
      
      {/* Neck */}
      <rect x="90" y="80" width="20" height="10" strokeWidth="4" className="stroke-slate-800 dark:stroke-zinc-200 fill-slate-100 dark:fill-zinc-800" />
      
      {/* Body */}
      <rect x="60" y="90" width="80" height="70" rx="12" strokeWidth="4" className="stroke-slate-800 dark:stroke-zinc-200 fill-white dark:fill-zinc-900" />
      
      {/* Internal Body Lines (Minimalist detail) */}
      <line x1="75" y1="110" x2="125" y2="110" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 6" className="stroke-slate-400 dark:stroke-zinc-600" />
      <line x1="75" y1="130" x2="125" y2="130" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 6" className="stroke-slate-400 dark:stroke-zinc-600" />

      {/* Left Arm */}
      <path d="M60 100 C 40 100, 30 110, 30 130 L 30 150" strokeWidth="4" strokeLinecap="round" fill="none" className="stroke-slate-800 dark:stroke-zinc-200" />
      <circle cx="30" cy="155" r="6" className="fill-slate-800 dark:fill-zinc-200" />

      {/* Right Arm holding Shield */}
      <path d="M140 100 C 160 100, 165 110, 165 125" strokeWidth="4" strokeLinecap="round" fill="none" className="stroke-slate-800 dark:stroke-zinc-200" />
      
      {/* Large Security Shield */}
      <path 
        d="M 165 95 L 130 110 L 130 145 C 130 170, 150 185, 165 195 C 180 185, 200 170, 200 145 L 200 110 Z" 
        strokeWidth="4" 
        strokeLinejoin="round" 
        className="stroke-slate-800 dark:stroke-zinc-200 fill-slate-50 dark:fill-zinc-800/80 backdrop-blur-sm shadow-xl" 
      />
      
      {/* Shield Inner Detail */}
      <path 
        d="M 165 105 L 142 115 L 142 142 C 142 160, 155 172, 165 180 C 175 172, 188 160, 188 142 L 188 115 Z" 
        strokeWidth="2" 
        strokeLinejoin="round" 
        className="stroke-slate-800 dark:stroke-zinc-200 fill-white dark:fill-zinc-900" 
      />
      
      {/* Checkmark inside shield */}
      <path d="M152 145 L 160 155 L 178 135" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="stroke-slate-800 dark:stroke-zinc-200" />
      
    </svg>
  );
}
