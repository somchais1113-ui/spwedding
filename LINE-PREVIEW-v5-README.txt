SP Wedding — LINE Preview v5 ROUTE FIX

ROOT CAUSE FIXED:
The Vercel build script previously published only index.html, css, js and assets.
share.html and the share/ folder existed in the ZIP, but were not copied into the
configured Vercel outputDirectory (public), so Vercel returned 404.

This version fixes tools/build-web.cjs and vercel.json routing.

After Production deploy, test in this order:
1. https://spwedding-teal.vercel.app/card
2. https://spwedding-teal.vercel.app/assets/images/sp-wedding-line-preview-20260911-a.jpg
3. view-source:https://spwedding-teal.vercel.app/card and search for og:image
4. Then send https://spwedding-teal.vercel.app/card as a NEW LINE message.

No Code.gs or Environment Variable changes are required.
