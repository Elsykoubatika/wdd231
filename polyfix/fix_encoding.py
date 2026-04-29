import os
import re

def to_bytes(s):
    # Mapping for CP1252 characters that are outside U+0000-U+00FF
    mapping = {
        0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
        0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
        0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
        0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
        0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
        0x017e: 0x9e, 0x0178: 0x9f
    }
    b = bytearray()
    for char in s:
        cp = ord(char)
        if cp in mapping:
            b.append(mapping[cp])
        elif cp < 256:
            b.append(cp)
        else:
            raise ValueError(f"Cannot map {hex(cp)}")
    return bytes(b)

def fix_mojibake(text):
    def repl(m):
        s = m.group(0)
        try:
            # Manually convert to bytes based on CP1252 mapping
            return to_bytes(s).decode('utf-8')
        except Exception:
            return s
            
    # Match any sequence of non-ASCII characters.
    return re.sub(r'[^\x00-\x7f]+', repl, text)

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = fix_mojibake(content)
        
        # Final cleanup for double-encoded things or symbols
        manual = {
            'âš™ï¸ ': '⚙️',
            'â†’': '→',
            'mÂ²': 'm²',
        }
        for k, v in manual.items():
            new_content = new_content.replace(k, v)
            
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Fixed: {filepath}')
    except Exception as e:
        print(f'Error processing {filepath}: {e}')

directory = r'e:\wdd231\polyfix'
for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.html'):
            filepath = os.path.join(root, file)
            process_file(filepath)
print('Done!')
