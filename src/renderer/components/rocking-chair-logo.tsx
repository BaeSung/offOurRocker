export function RockingChairLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ transform: "rotate(-12deg)" }}
      aria-hidden="true"
    >
      {/* Back rest - curved */}
      <path
        d="M20 10 C20 7, 22 5, 26 4 L34 4 C38 5, 40 7, 40 10 L40 30 L20 30 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Back rest slats */}
      <line x1="24" y1="9" x2="24" y2="28" stroke="currentColor" strokeWidth="1.2" />
      <line x1="30" y1="7" x2="30" y2="28" stroke="currentColor" strokeWidth="1.2" />
      <line x1="36" y1="9" x2="36" y2="28" stroke="currentColor" strokeWidth="1.2" />

      {/* Seat - slightly angled thick plank */}
      <path
        d="M14 30 L46 30 L48 34 L12 34 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Left armrest */}
      <path
        d="M20 14 C16 14, 13 16, 13 20 L13 30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Armrest top surface left */}
      <path
        d="M13 20 L13 18 C13 15, 16 13, 20 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Right armrest */}
      <path
        d="M40 14 C44 14, 47 16, 47 20 L47 30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Armrest top surface right */}
      <path
        d="M47 20 L47 18 C47 15, 44 13, 40 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Front left leg */}
      <line x1="15" y1="34" x2="12" y2="46" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* Front right leg */}
      <line x1="45" y1="34" x2="48" y2="46" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* Rear left leg */}
      <line x1="20" y1="34" x2="17" y2="46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Rear right leg */}
      <line x1="40" y1="34" x2="43" y2="46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

      {/* Rocker - smooth curved runner */}
      <path
        d="M6 50 Q16 42, 30 42 Q44 42, 58 50"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Second rocker line for thickness */}
      <path
        d="M7 52 Q17 44.5, 30 44.5 Q43 44.5, 57 52"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
