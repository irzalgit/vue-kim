import { footerConfig } from '../config';
import {
  ClipboardCheck,
  Bot,
  Calendar,
  ShoppingBag,
  ShieldCheck,
  Hash,
  Sigma,
  Triangle,
  Shapes,
  PieChart,
  type LucideIcon,
} from 'lucide-react';

const FOOTER_LINK_ICONS: Record<string, LucideIcon> = {
  "Simulasi TKA": ClipboardCheck,
  "AI Tutor": Bot,
  "Jadwal Belajar": Calendar,
  "Jualan Poster": ShoppingBag,
  "Admin Panel": ShieldCheck,
  "Teori Bilangan": Hash,
  "Aljabar": Sigma,
  "Trigonometri": Triangle,
  "Geometri": Shapes,
  "Data & Peluang": PieChart,
};

export default function Footer() {
  if (!footerConfig.heading && footerConfig.columns.length === 0) {
    return null;
  }

  return (
    <footer
      id="footer"
      style={{
        padding: '150px 5vw 60px',
        background: '#0a0a0a',
        position: 'relative',
        zIndex: 2,
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {footerConfig.heading && (
          <h2
            style={{
              fontFamily: "'EB Garamond', serif",
              fontWeight: 400,
              fontSize: 'clamp(40px, 5vw, 80px)',
              lineHeight: 1.1,
              letterSpacing: '-1.44px',
              color: '#ffffff',
              marginBottom: 80,
            }}
          >
            {footerConfig.heading}
          </h2>
        )}

        {footerConfig.columns.length > 0 && (
          <div
            className="grid grid-cols-1 md:grid-cols-2"
            style={{ gap: 60, marginBottom: 120 }}
          >
            {footerConfig.columns.map((column, colIndex) => (
              <div key={colIndex} className="flex flex-col" style={{ gap: 16 }}>
                {column.title && (
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                      fontWeight: 300,
                      letterSpacing: '3px',
                      textTransform: 'uppercase',
                      color: '#dadada',
                      opacity: 0.4,
                      marginBottom: 8,
                    }}
                  >
                    {column.title}
                  </span>
                )}
                {column.links.map((link) => {
                  const Icon = FOOTER_LINK_ICONS[link];
                  let href = "#";
                  if (link === "Jualan Poster") href = "#/shop";
                  else if (link === "Admin Panel") href = "/admin.html";
                  return (
                    <a
                      key={link}
                      href={href}
                      className="nav-link"
                      style={{
                        width: 'fit-content',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      {Icon && <Icon size={14} strokeWidth={1.75} style={{ opacity: 0.6, flexShrink: 0 }} />}
                      {link}
                    </a>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div
          className="flex flex-col md:flex-row items-start md:items-center justify-between"
          style={{
            paddingTop: 24,
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            gap: 16,
          }}
        >
          {footerConfig.copyright && (
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 200,
                fontSize: 12,
                color: '#dadada',
                opacity: 0.4,
              }}
            >
              {footerConfig.copyright}
            </span>
          )}
          {footerConfig.bottomLinks.length > 0 && (
            <div className="flex items-center" style={{ gap: 24 }}>
              {footerConfig.bottomLinks.map((bottomLink) => (
                <a
                  key={bottomLink.label}
                  href={bottomLink.href || '#'}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 200,
                    fontSize: 12,
                    color: '#dadada',
                    opacity: 0.4,
                    textDecoration: 'none',
                    transition: 'opacity 0.3s',
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '0.8'; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0.4'; }}
                >
                  {bottomLink.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
