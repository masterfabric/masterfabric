import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const AvatarGroupContext = React.createContext<{ inGroup: boolean }>({ inGroup: false })

const avatarVariants = cva(
  "relative inline-flex items-center justify-center rounded-full font-semibold text-white overflow-visible",
  {
    variants: {
      size: {
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm",
        lg: "w-12 h-12 text-base",
        xl: "w-16 h-16 text-xl",
        "2xl": "w-20 h-20 text-2xl",
      },
      statusBorder: {
        online: "border-[3px] border-green-500",
        away: "border-[3px] border-yellow-500",
        offline: "border-[3px] border-gray-400",
        none: "",
      },
    },
    defaultVariants: {
      size: "md",
      statusBorder: "none",
    },
  }
)

const statusIndicatorVariants = cva(
  "absolute rounded-full border-2 border-white z-10",
  {
    variants: {
      size: {
        sm: "w-2.5 h-2.5 -bottom-0.5 -right-0.5",
        md: "w-3 h-3 -bottom-0.5 -right-0.5",
        lg: "w-3.5 h-3.5 -bottom-0.5 -right-0.5",
        xl: "w-4 h-4 -bottom-0.5 -right-0.5",
        "2xl": "w-5 h-5 -bottom-0.5 -right-0.5",
      },
      status: {
        online: "bg-green-500",
        away: "bg-yellow-500",
        offline: "bg-gray-400",
      },
    },
    defaultVariants: {
      size: "md",
      status: "offline",
    },
  }
)

const loadingSpinnerVariants = cva(
  "absolute inset-0 rounded-full flex items-center justify-center",
  {
    variants: {
      size: {
        sm: "",
        md: "",
        lg: "",
        xl: "",
        "2xl": "",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string
  alt?: string
  name?: string
  status?: "online" | "offline" | "away"
  fallback?: string
  loading?: boolean
}

const getInitials = (name?: string, fallback?: string): string => {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.charAt(0).toUpperCase()
  }
  if (fallback) {
    return fallback.charAt(0).toUpperCase()
  }
  return "?"
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, name, status, size, fallback, loading, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false)
    const initials = getInitials(name, fallback)
    const { inGroup } = React.useContext(AvatarGroupContext)
    const showStatusIndicator = !inGroup && status && !loading
    const statusBorder = inGroup && status && !loading ? status : "none"

    // Calculate spinner size based on avatar size
    const getSpinnerSize = () => {
      switch (size) {
        case "sm": return { outer: 8, inner: 6, stroke: 1.5 }
        case "md": return { outer: 10, inner: 7, stroke: 2 }
        case "lg": return { outer: 12, inner: 8, stroke: 2 }
        case "xl": return { outer: 16, inner: 11, stroke: 2.5 }
        case "2xl": return { outer: 20, inner: 14, stroke: 3 }
        default: return { outer: 10, inner: 7, stroke: 2 }
      }
    }

    const spinnerSize = getSpinnerSize()

    return (
      <div
        ref={ref}
        className={cn(avatarVariants({ size, statusBorder }), className)}
        {...props}
      >
        <div className="w-full h-full rounded-full overflow-hidden relative">
          {src && !imageError ? (
            <img
              src={src}
              alt={alt || name || "Avatar"}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              {initials}
            </div>
          )}
          {loading && (
            <div className={cn(loadingSpinnerVariants({ size }), "bg-black/30 backdrop-blur-[2px]")}>
              <div className="relative" style={{ width: spinnerSize.outer, height: spinnerSize.outer }}>
                {/* Outer static circle */}
                <svg
                  className="absolute inset-0"
                  width={spinnerSize.outer}
                  height={spinnerSize.outer}
                  viewBox={`0 0 ${spinnerSize.outer} ${spinnerSize.outer}`}
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx={spinnerSize.outer / 2}
                    cy={spinnerSize.outer / 2}
                    r={(spinnerSize.outer - spinnerSize.stroke) / 2}
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth={spinnerSize.stroke}
                    fill="none"
                  />
                </svg>
                {/* Inner rotating arc - Cupertino style (60% arc) */}
                <svg
                  className="absolute inset-0 animate-spin"
                  width={spinnerSize.outer}
                  height={spinnerSize.outer}
                  viewBox={`0 0 ${spinnerSize.outer} ${spinnerSize.outer}`}
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ animationDuration: '0.8s' }}
                >
                  <circle
                    cx={spinnerSize.outer / 2}
                    cy={spinnerSize.outer / 2}
                    r={(spinnerSize.outer - spinnerSize.stroke) / 2}
                    stroke="rgba(255, 255, 255, 0.95)"
                    strokeWidth={spinnerSize.stroke}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${Math.PI * (spinnerSize.outer - spinnerSize.stroke) * 0.6} ${Math.PI * (spinnerSize.outer - spinnerSize.stroke) * 0.4}`}
                    transform={`rotate(-90 ${spinnerSize.outer / 2} ${spinnerSize.outer / 2})`}
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
        {showStatusIndicator && (
          <span
            className={cn(statusIndicatorVariants({ size, status }))}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    )
  }
)
Avatar.displayName = "Avatar"

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, children, max, ...props }, ref) => {
    const avatars = React.Children.toArray(children)
    const visibleAvatars = max ? avatars.slice(0, max) : avatars
    const remainingCount = max ? avatars.length - max : 0

    return (
      <AvatarGroupContext.Provider value={{ inGroup: true }}>
        <div
          ref={ref}
          className={cn("flex items-center", className)}
          {...props}
        >
          <div className="flex -space-x-2">
            {visibleAvatars.map((avatar, index) => (
              <div key={index} className="ring-2 ring-background">
                {avatar}
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="ring-2 ring-background">
                <div className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-semibold text-foreground">
                  +{remainingCount}
                </div>
              </div>
            )}
          </div>
        </div>
      </AvatarGroupContext.Provider>
    )
  }
)
AvatarGroup.displayName = "AvatarGroup"

export { Avatar, AvatarGroup, avatarVariants }

