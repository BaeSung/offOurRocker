import { ExternalLink, Clock } from "lucide-react"
import { RockingChairLogo } from "@/components/rocking-chair-logo"
import { Separator } from "@/components/ui/separator"

export function AboutSection() {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Logo & title */}
      <div className="flex flex-col items-center gap-3">
        <RockingChairLogo className="h-16 w-16 text-primary" />
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Off Our Rocker
        </h2>
        <p className="text-xs text-muted-foreground">
          v1.0.0
        </p>
        <p className="text-sm text-secondary-foreground">
          한국 작가를 위한 집필 도구
        </p>
      </div>

      <Separator className="w-full max-w-xs bg-border/60" />

      {/* Credits */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-secondary-foreground">
          <span>만든 이:</span>
          <span className="text-foreground">Off Our Rocker Team</span>
        </div>

        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary transition-colors hover:text-primary/80"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          GitHub
          <ExternalLink className="h-3 w-3" />
        </a>

        <p className="text-xs text-muted-foreground">
          라이선스: MIT
        </p>
      </div>

      <Separator className="w-full max-w-xs bg-border/60" />

      {/* Update info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        자동 업데이트 준비 중
      </div>
    </div>
  )
}
