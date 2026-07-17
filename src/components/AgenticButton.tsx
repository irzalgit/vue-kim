import React, { useState } from 'react';

export interface AgenticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'amber' | 'emerald' | 'cyber-blue';
  loading?: boolean;
  pulse?: boolean;
  glow?: boolean;
}

export default function AgenticButton({
  children = 'Agentic',
  variant = 'amber',
  loading = false,
  pulse = true,
  glow = true,
  className = '',
  style,
  disabled,
  onClick,
  ...props
}: AgenticButtonProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  // Define colors based on variant
  const colors = {
    amber: {
      primary: '#d97706', // amber-600
      glow: 'rgba(217, 119, 6, 0.4)',
      text: '#fbbf24', // amber-400
      border: 'rgba(217, 119, 6, 0.3)',
      borderHover: 'rgba(245, 158, 11, 0.8)',
      dot: '#fbbf24',
    },
    emerald: {
      primary: '#059669', // emerald-600
      glow: 'rgba(5, 150, 105, 0.4)',
      text: '#34d399', // emerald-400
      border: 'rgba(5, 150, 105, 0.3)',
      borderHover: 'rgba(16, 185, 129, 0.8)',
      dot: '#34d399',
    },
    'cyber-blue': {
      primary: '#2563eb', // blue-600
      glow: 'rgba(37, 99, 235, 0.4)',
      text: '#60a5fa', // blue-400
      border: 'rgba(37, 99, 235, 0.3)',
      borderHover: 'rgba(96, 165, 250, 0.8)',
      dot: '#60a5fa',
    },
  }[variant];

  return (
    <>
      {/* Injected custom styles for cybernetic animations */}
      <style>{`
        @keyframes agentic-scan {
          0% { top: -100%; }
          50% { top: 100%; }
          100% { top: 100%; }
        }
        @keyframes agentic-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes agentic-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .agentic-glow-shadow {
          box-shadow: 0 0 15px ${colors.glow}, inset 0 0 8px rgba(255,255,255,0.05);
        }
        .agentic-scan-line {
          position: absolute;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, transparent, ${colors.text}, transparent);
          opacity: 0.4;
          pointer-events: none;
          animation: agentic-scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>

      <button
        type="button"
        disabled={disabled || loading}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-lg px-6 py-3 font-mono text-sm font-medium tracking-wider text-white transition-all duration-300 ${
          disabled || loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-95'
        } ${className}`}
        style={{
          background: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: `1px solid ${isHovered ? colors.borderHover : colors.border}`,
          boxShadow: glow && isHovered ? `0 0 20px ${colors.glow}, inset 0 0 10px rgba(255,255,255,0.05)` : 'inset 0 0 5px rgba(255,255,255,0.02)',
          transform: isHovered && !(disabled || loading) ? 'translateY(-1px)' : 'translateY(0)',
          ...style,
        }}
        {...props}
      >
        {/* Futuristic Laser Scan Line on Hover */}
        {isHovered && !(disabled || loading) && <div className="agentic-scan-line" />}

        {/* Diagonal Corner Accents */}
        <span
          className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l transition-colors duration-300"
          style={{ borderColor: isHovered ? colors.text : colors.border }}
        />
        <span
          className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r transition-colors duration-300"
          style={{ borderColor: isHovered ? colors.text : colors.border }}
        />

        {/* Neural/Active Status Dot */}
        {pulse && (
          <span className="relative flex h-2 w-2 items-center justify-center">
            {loading ? (
              // Spinner during loading state
              <span
                className="absolute h-3 w-3 rounded-full border-2 border-t-transparent animate-spin"
                style={{
                  borderColor: `${colors.dot} transparent transparent transparent`,
                  animation: 'agentic-spin 0.8s linear infinite',
                }}
              />
            ) : (
              <>
                <span
                  className="absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{
                    backgroundColor: colors.dot,
                    animation: 'agentic-pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: colors.dot }}
                />
              </>
            )}
          </span>
        )}

        {/* Button Content */}
        <span className="relative z-10 select-none">
          {loading ? 'Processing...' : children}
        </span>

        {/* Specular Glare/Highlight Overlay */}
        <span
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.08) 0%, transparent 75%)',
          }}
        />
      </button>
    </>
  );
}