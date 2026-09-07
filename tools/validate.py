"""Run from anywhere: python tools/validate.py. Standard library only."""
from pathlib import Path
from html.parser import HTMLParser
import re
import sys

root = Path(__file__).resolve().parents[1]
web = root / 'dist' if (root / 'dist/index.html').exists() else root
errors = []

class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.ids, self.anchors = [], set(), []
    def handle_starttag(self, tag, attrs):
        props = dict(attrs)
        if 'id' in props:
            if props['id'] in self.ids: errors.append('Duplicate ID: ' + props['id'])
            self.ids.add(props['id'])
        for key in ('src', 'href'):
            value = props.get(key, '')
            if value.startswith('#'):
                self.anchors.append(value[1:])
            elif value and not re.match(r'^(?:[a-z]+:|//)', value):
                self.refs.append(value)

parser = References()
parser.feed((web / 'index.html').read_text())
for reference in parser.refs:
    if not (web / reference).is_file(): errors.append('Missing HTML asset: ' + reference)
for anchor in parser.anchors:
    if anchor not in parser.ids: errors.append('Missing anchor target: ' + anchor)
for css in (web / 'css').glob('*.css'):
    for reference in re.findall(r'url\([\'\"]?([^\'\")]+)', css.read_text()):
        if not reference.startswith(('data:', 'https:')) and not (css.parent / reference).is_file():
            errors.append('Missing CSS asset: ' + reference)
for name in ('hero-couple.png', 'ceremony-chair.png'):
    path = web / 'assets/images' / name
    if not path.is_file() or path.stat().st_size < 1000: errors.append('Missing/empty artwork: ' + name)
if errors:
    print('\n'.join(errors)); sys.exit(1)
print('PASS: local assets, stylesheets, scripts, fonts, IDs and navigation anchors are present.')
