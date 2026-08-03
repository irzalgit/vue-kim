path = "src/sections/Footer.tsx"
with open(path, "r") as f:
    content = f.read()

results = []

old1 = "import { footerConfig } from '../config';"
new1 = """import { footerConfig } from '../config';
import {
  ClipboardCheck,
  Bot,
  Calendar,
  BarChart3,
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
  "Analisis Performa": BarChart3,
  "Teori Bilangan": Hash,
  "Aljabar": Sigma,
  "Trigonometri": Triangle,
  "Geometri": Shapes,
  "Data & Peluang": PieChart,
};"""

results.append(("import ikon", old1 in content))
content = content.replace(old1, new1)

old2 = """                {column.links.map((link) => (
                  <a
                    key={link}
                    href="#"
                    className="nav-link"
                    style={{ width: 'fit-content' }}
                  >
                    {link}
                  </a>
                ))}"""

new2 = """                {column.links.map((link) => {
                  const Icon = FOOTER_LINK_ICONS[link];
                  return (
                    <a
                      key={link}
                      href="#"
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
                })}"""

results.append(("render ikon di link", old2 in content))
content = content.replace(old2, new2)

with open(path, "w") as f:
    f.write(content)

for name, ok in results:
    print(f"{name}: {'OK' if ok else 'TIDAK COCOK'}")
