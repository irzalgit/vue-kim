import { useRef } from 'react';
import AmberCascades from './AmberCascades';
import LiquidGlassButton from '../components/LiquidGlassButton';
import LandingVisitCounter from '../components/LandingVisitCounter';
import { heroConfig } from '../config';

export default function Hero() {
  const titleRef = useRef<HTMLHeadingElement>(null);

  if (!heroConfig.title) {
    return null;
  }

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
      style={{ height: '100vh' }}
    >
      <AmberCascades />

      <div
        className="relative z-10 flex flex-col justify-between pointer-events-none"
        style={{
          height: '100%',
          padding: '28vh 5vw 8vh',
        }}
      >
        <div>
          <h1
            ref={titleRef}
            className="text-white"
            style={{
              fontFamily: "'GeistMono', monospace",
              fontWeight: 400,
              fontSize: 'clamp(48px, 6vw, 96px)',
              lineHeight: 1.0,
              letterSpacing: '-3px',
              textShadow: '0 4px 24px rgba(0,0,0,0.8)',
              marginBottom: 'clamp(32px, 4vw, 56px)',
              width: 'fit-content',
            }}
          >
            Portal
            <br />
            Matematika
          </h1>
          <div className="pointer-events-auto -mt-5 mb-6">
            <LandingVisitCounter />
          </div>
        </div>

        {heroConfig.ctaText && (
          <div
            className="pointer-events-auto"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <LiquidGlassButton
              onClick={() => {
                document
                  .querySelector('#curriculum')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {heroConfig.ctaText}
            </LiquidGlassButton>

            <a
              href="./soal175.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-full text-white font-medium bg-blue-600/80 hover:bg-blue-600 hover:scale-105 backdrop-blur-md transition-all duration-300 no-underline shadow-lg shadow-blue-500/25 flex items-center gap-2"
              style={{
                fontFamily: "'GeistMono', monospace",
                fontSize: '15px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              <span>📝 Buka Soal 175</span>
            </a>

            <a
              href="./soal150.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-full text-white font-medium bg-indigo-600/80 hover:bg-indigo-600 hover:scale-105 backdrop-blur-md transition-all duration-300 no-underline shadow-lg shadow-indigo-500/25 flex items-center gap-2"
              style={{
                fontFamily: "'GeistMono', monospace",
                fontSize: '15px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              <span>📘 Soal 150 SMP</span>
            </a>

            <a
              href="./soal150.apk"
              download="soal150.apk"
              className="px-6 py-3 rounded-full text-white font-medium bg-orange-600/80 hover:bg-orange-600 hover:scale-105 backdrop-blur-md transition-all duration-300 no-underline shadow-lg shadow-orange-500/25 flex items-center gap-2"
              style={{
                fontFamily: "'GeistMono', monospace",
                fontSize: '15px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              <span>⬇️ Download APK</span>
            </a>

            <a
              href="./soal120.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-full text-white font-medium bg-green-600/80 hover:bg-green-600 hover:scale-105 backdrop-blur-md transition-all duration-300 no-underline shadow-lg shadow-green-500/25 flex items-center gap-2"
              style={{
                fontFamily: "'GeistMono', monospace",
                fontSize: '15px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              <span>📗 Soal 120 SD</span>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}