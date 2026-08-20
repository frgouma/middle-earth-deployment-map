# Middle-earth Deployment Map

Minimal prototype for the interactive deployment-map side project.

## Current scope

- original Middle-earth SVG kept unchanged in `map.svg`
- HTML entry point
- CSS
- vanilla JavaScript
- one temporary “X marks the spot” overlay marker
- mouse-wheel zoom
- drag-to-pan
- zoom in / zoom out / reset buttons

No chapter model, route animation, URL parameters, or final visual design yet.

## Run

Open `index.html` in a browser.

If a browser blocks the local SVG reference under `file://`, serve the folder locally instead, for example:

    python3 -m http.server 8000

Then open:

    http://localhost:8000/

GitHub Pages can serve the same files directly.
