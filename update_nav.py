import os

path = 'src/components/TopNav.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'linear-gradient(90deg, hsl(222 47% 9%), hsl(222 50% 11%))': '#000000',
    '1px solid hsl(222 47% 15%)': '1px solid rgba(255, 255, 255, 0.1)',
    '0 2px 20px hsl(0 0% 0% / 0.25)': '0 2px 20px rgba(0,0,0,0.5)',
    'text-white leading-tight': 'text-transparent bg-clip-text bg-gradient-to-r from-[#FC5A03] to-[#FFC700] leading-tight font-extrabold',
    'hsl(191 91% 37% / 0.18)': 'rgba(252, 90, 3, 0.15)',
    'hsl(191 91% 37% / 0.15)': 'rgba(252, 90, 3, 0.15)',
    'hsl(191 91% 37% / 0.2)': 'rgba(252, 90, 3, 0.15)',
    'hsl(191 91% 37% / 0.25)': 'rgba(252, 90, 3, 0.25)',
    'hsl(191 91% 65%)': '#FC5A03',
    'hsl(191 91% 70%)': '#FC5A03',
    'hsl(191 91% 45%)': '#FC5A03',
    'hsl(191 91% 60%)': '#FC5A03',
    'hsl(191 91% 55%)': '#FC5A03',
    'hsl(0 84% 60%)': '#FC5A03',
    'hsl(222 47% 10%)': '#000000',
    'linear-gradient(180deg, hsl(222 47% 10%), hsl(222 50% 8%))': '#000000',
    'hsl(222 47% 20%)': 'rgba(255, 255, 255, 0.1)',
    'hsl(215 20% 62%)': '#FFC700',
    'hsl(215 20% 60%)': '#FFC700',
    'hsl(215 20% 70%)': '#FFC700',
    'hsl(215 20% 88%)': '#FFC700',
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

css_path = 'src/index.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

css_content = css_content.replace('color: hsl(215 20% 62%);', 'color: #FFC700;')
css_content = css_content.replace('background: hsl(215 20% 100% / 0.07);', 'background: rgba(255, 199, 0, 0.1);')
css_content = css_content.replace('color: hsl(215 20% 88%);', 'color: #FFC700;')

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css_content)

print('Success')
