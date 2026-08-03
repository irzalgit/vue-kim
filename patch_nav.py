path = "src/sections/Navigation.tsx"
with open(path, "r") as f:
    content = f.read()

results = []

old1 = "import { siteConfig, navigationConfig } from '../config';"
new1 = """import { siteConfig, navigationConfig } from '../config';
import logo from '../assets/logo.png';"""
results.append(("import logo", old1 in content))
content = content.replace(old1, new1)

old2 = '''      <a
        href="#hero"
        onClick={(e) => handleClick(e, '#hero')}
        className="text-white no-underline"
        style={{
          fontFamily: "'GeistMono', monospace",
          fontSize: 18,
          fontWeight: 400,
          letterSpacing: '-0.5px',
        }}
      >
        {siteConfig.brandName}
      </a>'''
new2 = '''      <a
        href="#hero"
        onClick={(e) => handleClick(e, '#hero')}
        className="text-white no-underline"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: "'GeistMono', monospace",
          fontSize: 18,
          fontWeight: 400,
          letterSpacing: '-0.5px',
        }}
      >
        <img src={logo} alt={siteConfig.brandName} style={{ height: 32, width: 32, objectFit: 'contain' }} />
        {siteConfig.brandName}
      </a>'''
results.append(("logo + teks di navbar", old2 in content))
content = content.replace(old2, new2)

with open(path, "w") as f:
    f.write(content)

for name, ok in results:
    print(f"{name}: {'OK' if ok else 'TIDAK COCOK'}")
