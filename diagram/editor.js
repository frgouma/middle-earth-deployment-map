
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const HTML_NS = 'http://www.w3.org/1999/xhtml';
  const svg = document.documentElement;
  const diagramCanvas = document.getElementById('diagram-canvas');
  const panelObject = document.getElementById('diagram-editor-panel');
  const panel = document.getElementById('editor-panel-shell');
  const state = JSON.parse(document.getElementById('diagram-data').textContent);
  const palette = __PALETTE_MEMBERSHIP__;
  let editorState = 'idle', selectedElement = null, editingRouteId = null;
  const inspectedRouteIds = new Set();
  let selectedPoint = null, placingRoutePoints = false, gesture = null, panelDrag = null;
  let suppressClick = false, editorZoom = 1;
  const MIN_EDITOR_ZOOM = 0.1, MAX_EDITOR_ZOOM = 2;

  // These are editor capabilities, not schema restrictions.  Existing fields
  // remain in state when a class does not render them.
  const ELEMENT_CAPABILITIES = {
    box: ['id', 'class', 'parent', 'color', 'text', 'body', 'hover', 'x', 'y', 'width', 'height', 'fontSize'],
    cluster: ['id', 'class', 'parent', 'color', 'text', 'hover', 'x', 'y', 'width', 'height', 'fontSize'],
    title: ['id', 'class', 'parent', 'text', 'hover', 'x', 'y', 'width', 'height', 'fontSize'],
    subtitle: ['id', 'class', 'parent', 'text', 'hover', 'x', 'y', 'width', 'height', 'fontSize'],
    note: ['id', 'class', 'parent', 'text', 'hover', 'x', 'y', 'width', 'height', 'fontSize']
  };
  if (!state.canvas || typeof state.canvas !== 'object') state.canvas = {};
  if (finite(state.canvas.text_scale) === null || Number(state.canvas.text_scale) <= 0) state.canvas.text_scale = 1;

  function byId(id) { return document.getElementById(id); }
  function finite(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
  function rounded(value) { return Number(Number(value).toFixed(2)); }
  function textScale() {
    const scale = state.canvas && finite(state.canvas.text_scale);
    return scale !== null && scale > 0 ? scale : 1;
  }
  function scaledFontSize(value) { return value * textScale(); }
  function applyTextScale() { svg.style.setProperty('--text-scale', textScale()); }
  function applyCanvasGeometry() {
    const width = Number(state.canvas.width), height = Number(state.canvas.height);
    diagramCanvas.setAttribute('width', rounded(width * editorZoom));
    diagramCanvas.setAttribute('height', rounded(height * editorZoom));
    diagramCanvas.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    const background = diagramCanvas.querySelector('.canvas-background');
    if (background) { background.setAttribute('width', width); background.setAttribute('height', height); }
  }
  function updateZoomDisplay() { byId('zoom-display').value = Math.round(editorZoom * 100) + '%'; byId('zoom-display').textContent = Math.round(editorZoom * 100) + '%'; }
  function setEditorZoom(value) {
    editorZoom = Math.max(MIN_EDITOR_ZOOM, Math.min(MAX_EDITOR_ZOOM, value));
    applyCanvasGeometry(); updateZoomDisplay();
  }
  function node(name, attrs) {
    const result = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (key) { result.setAttribute(key, attrs[key]); });
    return result;
  }
  function htmlNode(name) { return document.createElementNS(HTML_NS, name); }
  function colorLabel(color) { return color.charAt(0).toUpperCase() + color.slice(1); }
  function setLayoutColor(select, color) {
    Array.from(select.options).filter(function (option) { return option.dataset.compatibility === 'true'; })
      .forEach(function (option) { option.remove(); });
    if (palette.layoutCompatibility.indexOf(color) !== -1) {
      const option = htmlNode('option'); option.value = color;
      option.textContent = colorLabel(color) + ' (legacy)'; option.dataset.compatibility = 'true';
      select.appendChild(option);
    }
    select.value = color;
  }
  function screenPoint(target, evt) {
    const p = target.createSVGPoint(); p.x = evt.clientX; p.y = evt.clientY;
    const matrix = target.getScreenCTM(); return matrix ? p.matrixTransform(matrix.inverse()) : null;
  }
  // Diagram gestures remain in the nested, fixed logical canvas.  The panel
  // instead uses the outer SVG's browser-viewport coordinate system.
  function point(evt) { return screenPoint(diagramCanvas, evt); }
  function viewportPoint(evt) { return screenPoint(svg, evt); }
  function viewportBounds() {
    const first = viewportPoint({clientX: 0, clientY: 0});
    const second = viewportPoint({clientX: window.innerWidth, clientY: window.innerHeight});
    if (!first || !second) return null;
    return {left: Math.min(first.x, second.x), top: Math.min(first.y, second.y),
      right: Math.max(first.x, second.x), bottom: Math.max(first.y, second.y)};
  }
  function panelPosition(x, y) {
    const bounds = viewportBounds();
    if (!bounds) return {x: x, y: y};
    const width = Number(panelObject.getAttribute('width'));
    const handleWidth = Math.min(width, 120), handleHeight = Math.min(Number(panelObject.getAttribute('height')), 72);
    return {x: rounded(Math.max(bounds.left - width + handleWidth, Math.min(bounds.right - handleWidth, x))),
      y: rounded(Math.max(bounds.top, Math.min(bounds.bottom - handleHeight, y)))};
  }
  function movePanel(x, y) {
    const position = panelPosition(x, y);
    panelObject.setAttribute('x', position.x); panelObject.setAttribute('y', position.y);
  }
  function orthogonalPoint(previous, candidate) {
    return Math.abs(candidate.x - previous.x) >= Math.abs(candidate.y - previous.y)
      ? {x: candidate.x, y: previous.y}
      : {x: previous.x, y: candidate.y};
  }
  function inPanel(evt) {
    const path = evt.composedPath ? evt.composedPath() : [];
    return path.indexOf(panel) !== -1 || path.indexOf(panelObject) !== -1;
  }
  function status(id, message) { byId(id).textContent = message || ''; }
  function pathData(points) {
    return (points || []).map(function (p, i) { return (i ? 'L ' : 'M ') + p.x + ' ' + p.y; }).join(' ');
  }
  function isRouteHighlighted(id) {
    return (editorState === 'editing-route' && editingRouteId === id) ||
      (editorState === 'preview' && inspectedRouteIds.has(id));
  }
  function clearInspectedRoutes() { inspectedRouteIds.clear(); }
  function toggleInspectedRoute(routeId) {
    if (inspectedRouteIds.has(routeId)) inspectedRouteIds.delete(routeId);
    else inspectedRouteIds.add(routeId);
  }
  function routeClasses(id, route) {
    const color = route.color;
    const colored = color ? ' palette-' + color + ' route-colored route-color-' + color : '';
    return 'diagram-route route-' + (route.type || 'untyped') + colored +
      (isRouteHighlighted(id) ? ' route-highlighted' : '');
  }
  function routeLabelPosition(points) {
    let best = null, bestLength = -1;
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index], end = points[index + 1];
      const length = Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2);
      if (length > bestLength) { bestLength = length; best = [start, end]; }
    }
    return {x: (best[0].x + best[1].x) / 2, y: (best[0].y + best[1].y) / 2 - 28 * textScale()};
  }
  function addRouteLabel(group, id, route) {
    const value = route.label || 'Route ' + id, position = routeLabelPosition(route.points);
    const scale = textScale(), width = Math.max(100 * scale, value.length * 14 * scale + 28 * scale);
    const label = node('g', {class: 'route-label', 'aria-hidden': 'true'});
    label.appendChild(node('rect', {x: position.x - width / 2, y: position.y - 24 * scale, width: width, height: 44 * scale}));
    const text = node('text', {x: position.x, y: position.y + 8 * scale, 'text-anchor': 'middle'});
    text.textContent = value; label.appendChild(text); group.appendChild(label);
  }
  function depth(id) {
    let n = 0, parent = state.elements[id] && state.elements[id].parent;
    const seen = new Set();
    while (parent && state.elements[parent] && !seen.has(parent)) {
      seen.add(parent); n += 1; parent = state.elements[parent].parent;
    }
    return n;
  }
  function wrap(value, width, fontSize) {
    const result = [];
    String(value || '').split('\n').forEach(function (paragraph) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      const limit = width ? Math.max(7, Math.floor(width / (fontSize * .55))) : 100000;
      if (!words.length) { result.push(''); return; }
      let line = '';
      words.forEach(function (word) {
        if (line && (line + ' ' + word).length > limit) { result.push(line); line = word; }
        else line = line ? line + ' ' + word : word;
      });
      result.push(line);
    });
    return result;
  }
  function addText(parent, value, x, y, cssClass, width, fontSize, anchor) {
    const text = node('text', {x: x, y: y, 'class': cssClass, 'text-anchor': anchor || 'middle'});
    const lines = wrap(value, width, fontSize), lineHeight = fontSize * 1.18;
    const firstY = y - (lines.length - 1) * lineHeight / 2;
    lines.forEach(function (line, index) {
      const span = node('tspan', {x: x, y: firstY + index * lineHeight});
      span.textContent = line; text.appendChild(span);
    });
    parent.appendChild(text); return lines;
  }
  function addLayer(parent, id) { const layer = node('g', {id: id}); parent.appendChild(layer); return layer; }
  function elementGroup(parent, id, extra) {
    const el = state.elements[id];
    const group = node('g', {
      'class': 'diagram-element element-' + el.class + ' palette-' + (el.color || 'neutral') + ' ' + extra,
      'data-element-id': id, 'data-editable': 'true'
    });
    if (el.font_size) group.setAttribute('style', '--element-font-size:' + el.font_size + 'px');
    if (el.hover) { const title = node('title'); title.textContent = el.hover; group.appendChild(title); }
    if (selectedElement === id) group.classList.add('element-selected');
    parent.appendChild(group); return group;
  }

  function render() {
    const content = byId('diagram-content');
    while (content.firstChild) content.removeChild(content.firstChild);
    const clusterFills = addLayer(content, 'cluster-fills');
    const routeLayer = addLayer(content, 'routes-layer');
    const boxLayer = addLayer(content, 'boxes-layer');
    const clusterLabels = addLayer(content, 'cluster-labels');
    const textLayer = addLayer(content, 'text-layer');
    const overlay = addLayer(content, 'editor-overlay-layer');
    overlay.setAttribute('class', 'editor-overlay ' +
      (editorState === 'editing-route' ? 'route-overlay' : 'element-overlay'));
    const ids = Object.keys(state.elements);
    const clusters = ids.filter(function (id) { return state.elements[id].class === 'cluster'; })
      .sort(function (a, b) { return depth(a) - depth(b) || a.localeCompare(b); });

    clusters.forEach(function (id) {
      const el = state.elements[id], group = elementGroup(clusterFills, id, 'cluster-fill');
      group.appendChild(node('rect', {class: 'cluster-surface', x: el.x, y: el.y, width: el.width, height: el.height}));
    });
    Object.keys(state.routes).forEach(function (id) {
      const route = state.routes[id]; if (!route.points || route.points.length < 2) return;
      const group = node('g', {'class': routeClasses(id, route), 'data-route-id': id});
      const title = node('title'); title.textContent = route.label || 'Route ' + id; group.appendChild(title);
      const d = pathData(route.points);
      group.appendChild(node('path', {class: 'route-path', d: d}));
      group.appendChild(node('path', {class: 'route-hit', d: d}));
      addRouteLabel(group, id, route); routeLayer.appendChild(group);
    });
    ids.filter(function (id) { return state.elements[id].class === 'box'; })
      .sort(function (a, b) { return depth(a) - depth(b) || a.localeCompare(b); })
      .forEach(function (id) {
        const el = state.elements[id], group = elementGroup(boxLayer, id, 'box-content');
        group.appendChild(node('rect', {class: 'element-surface', x: el.x, y: el.y, width: el.width, height: el.height}));
        const fs = scaledFontSize(Number(el.font_size || 36)), titleLines = wrap(el.title || '', el.width - 50, fs);
        const bodyFs = fs * .88, bodyLines = wrap(el.body || '', el.width - 50, bodyFs);
        const titleHeight = (el.title ? titleLines.length : 0) * fs * 1.15;
        const bodyHeight = (el.body ? bodyLines.length : 0) * bodyFs * 1.18;
        const gap = el.title && el.body ? 16 * textScale() : 0;
        const top = el.y + (el.height - titleHeight - bodyHeight - gap) / 2, cx = el.x + el.width / 2;
        if (el.title) addText(group, el.title, cx, top + titleHeight / 2, 'box-title', el.width - 50, fs);
        if (el.body) addText(group, el.body, cx, top + titleHeight + gap + bodyHeight / 2, 'box-body', el.width - 50, bodyFs);
      });
    clusters.forEach(function (id) {
      const el = state.elements[id]; if (!el.title) return;
      const group = elementGroup(clusterLabels, id, 'cluster-label-content'), fs = scaledFontSize(Number(el.font_size || 38));
      const lines = wrap(el.title, el.width - 60, fs);
      addText(group, el.title, el.x + 30, el.y + 52 + (lines.length - 1) * fs * .55,
        'cluster-title', el.width - 60, fs, 'start');
    });
    ids.filter(function (id) { return ['title', 'subtitle', 'note'].indexOf(state.elements[id].class) !== -1; })
      .forEach(function (id) {
        const el = state.elements[id], group = elementGroup(textLayer, id, 'text-content');
        const fs = scaledFontSize(Number(el.font_size || {title: 76, subtitle: 42, note: 30}[el.class]));
        addText(group, el.text || el.title || '', el.x, el.y, 'element-' + el.class,
          el.width, fs, el.class === 'note' ? 'middle' : 'start');
      });
    if (editorState === 'editing-element' && selectedElement && state.elements[selectedElement]) renderElementOverlay(overlay);
    if (editorState === 'editing-route' && editingRouteId && state.routes[editingRouteId]) renderRouteOverlay(overlay);
  }

  function textBounds(el) {
    const fs = scaledFontSize(Number(el.font_size || {title: 76, subtitle: 42, note: 30}[el.class] || 32));
    const width = Number(el.width || Math.max(260, String(el.text || el.title || '').length * fs * .55));
    const height = Number(el.height || fs * 1.35);
    return el.class === 'note' ? {x: el.x - width / 2, y: el.y - height / 2, width: width, height: height}
      : {x: el.x, y: el.y - height, width: width, height: height};
  }
  function renderElementOverlay(overlay) {
    const el = state.elements[selectedElement];
    const box = ['box', 'cluster'].indexOf(el.class) !== -1 ? el : textBounds(el);
    overlay.appendChild(node('rect', {class: 'selection-outline', x: box.x, y: box.y,
      width: box.width, height: box.height}));
    if (['box', 'cluster'].indexOf(el.class) === -1) return;
    [['nw', el.x, el.y], ['ne', el.x + el.width, el.y], ['se', el.x + el.width, el.y + el.height],
     ['sw', el.x, el.y + el.height]].forEach(function (item) {
      overlay.appendChild(node('rect', {class: 'resize-handle', 'data-corner': item[0],
        x: item[1] - 13, y: item[2] - 13, width: 26, height: 26}));
    });
  }
  function renderRouteOverlay(overlay) {
    state.routes[editingRouteId].points.forEach(function (p, index) {
      overlay.appendChild(node('circle', {class: 'route-point' + (selectedPoint === index ? ' point-selected' : ''),
        'data-point-index': index, cx: p.x, cy: p.y, r: 15}));
      const label = node('text', {class: 'route-point-label', x: p.x + 22, y: p.y - 20});
      label.textContent = String(index + 1); overlay.appendChild(label);
    });
  }
  function descendants(id) {
    const result = [];
    function visit(parent) {
      Object.keys(state.elements).forEach(function (candidate) {
        if (state.elements[candidate].parent === parent) { result.push(candidate); visit(candidate); }
      });
    }
    visit(id); return result;
  }
  function elementTarget(target) {
    const group = target && target.closest ? target.closest('[data-element-id]') : null;
    return group ? group.getAttribute('data-element-id') : null;
  }
  function routeTarget(target) {
    const group = target && target.closest ? target.closest('[data-route-id]') : null;
    return group ? group.getAttribute('data-route-id') : null;
  }

  svg.addEventListener('pointerdown', function (evt) {
    if (inPanel(evt)) return;
    const p = point(evt); if (!p) return;
    if (editorState === 'preview') return;
    if (editorState === 'editing-route' && placingRoutePoints && editingRouteId) {
      evt.stopPropagation(); return;
    }
    const marker = evt.target.closest && evt.target.closest('.route-point');
    if (marker && editingRouteId && editorState === 'editing-route') {
      selectedPoint = Number(marker.dataset.pointIndex);
      const current = state.routes[editingRouteId].points[selectedPoint];
      gesture = {kind: 'point', start: p, origin: {x: current.x, y: current.y}};
      populatePointFields(); render(); evt.preventDefault(); return;
    }
    if (editorState === 'editing-route') {
      const routeId = routeTarget(evt.target);
      if (routeId === editingRouteId) {
        const origins = state.routes[routeId].points.map(function (routePoint) {
          return {x: routePoint.x, y: routePoint.y};
        });
        gesture = {kind: 'route-move', start: p, clientX: evt.clientX, clientY: evt.clientY,
          routeId: routeId, origins: origins, moved: false};
        evt.preventDefault();
      }
      return;
    }
    const handle = evt.target.closest && evt.target.closest('.resize-handle');
    if (handle && selectedElement && editorState === 'editing-element') {
      const el = state.elements[selectedElement];
      gesture = {kind: 'resize', id: selectedElement, corner: handle.dataset.corner, start: p,
        geometry: {x: el.x, y: el.y, width: el.width, height: el.height}};
      evt.preventDefault(); return;
    }
    const elementId = elementTarget(evt.target);
    if (editorState === 'editing-element') {
      if (elementId !== selectedElement) return;
      const moving = [elementId].concat(state.elements[elementId].class === 'cluster' ? descendants(elementId) : []), origins = {};
      moving.forEach(function (key) { origins[key] = {x: state.elements[key].x, y: state.elements[key].y}; });
      gesture = {kind: 'move', start: p, moving: moving, origins: origins};
      evt.preventDefault(); return;
    }
    if (editorState !== 'idle') return;
    const routeId = routeTarget(evt.target);
    if (routeId) {
      selectEditingRoute(routeId); evt.preventDefault(); return;
    }
    if (elementId) {
      selectElement(elementId);
      const moving = [elementId].concat(state.elements[elementId].class === 'cluster' ? descendants(elementId) : []), origins = {};
      moving.forEach(function (key) { origins[key] = {x: state.elements[key].x, y: state.elements[key].y}; });
      gesture = {kind: 'move', start: p, moving: moving, origins: origins};
      evt.preventDefault(); return;
    }
  }, true);
  document.addEventListener('pointermove', function (evt) {
    if (panelDrag) {
      const p = viewportPoint(evt); if (!p) return;
      movePanel(p.x - panelDrag.dx, p.y - panelDrag.dy);
      panelDrag.moved = true; evt.preventDefault(); return;
    }
    if (!gesture) return;
    const p = point(evt); if (!p) return;
    let dx = p.x - gesture.start.x, dy = p.y - gesture.start.y;
    if (gesture.kind === 'move') {
      gesture.moving.forEach(function (id) {
        state.elements[id].x = rounded(gesture.origins[id].x + dx);
        state.elements[id].y = rounded(gesture.origins[id].y + dy);
      });
    } else if (gesture.kind === 'resize') {
      const el = state.elements[gesture.id], g = gesture.geometry, min = 40;
      if (gesture.corner.indexOf('e') !== -1) el.width = Math.max(min, rounded(g.width + dx));
      if (gesture.corner.indexOf('s') !== -1) el.height = Math.max(min, rounded(g.height + dy));
      if (gesture.corner.indexOf('w') !== -1) { el.x = Math.min(g.x + g.width - min, rounded(g.x + dx)); el.width = rounded(g.width + g.x - el.x); }
      if (gesture.corner.indexOf('n') !== -1) { el.y = Math.min(g.y + g.height - min, rounded(g.y + dy)); el.height = rounded(g.height + g.y - el.y); }
    } else if (gesture.kind === 'point' && editingRouteId !== null && selectedPoint !== null) {
      const candidate = {x: rounded(p.x), y: rounded(p.y)};
      const previous = selectedPoint > 0 ? state.routes[editingRouteId].points[selectedPoint - 1] : null;
      const next = evt.shiftKey && previous ? orthogonalPoint(previous, candidate) : candidate;
      const target = state.routes[editingRouteId].points[selectedPoint];
      target.x = next.x; target.y = next.y;
    } else if (gesture.kind === 'route-move' && state.routes[gesture.routeId]) {
      if (!gesture.moved && Math.hypot(evt.clientX - gesture.clientX, evt.clientY - gesture.clientY) < 3) return;
      gesture.moved = true;
      const translationX = rounded(dx), translationY = rounded(dy);
      state.routes[gesture.routeId].points.forEach(function (routePoint, index) {
        routePoint.x = gesture.origins[index].x + translationX;
        routePoint.y = gesture.origins[index].y + translationY;
      });
    }
    render(); populateGeometryFields(); populateRouteEditor(); evt.preventDefault();
  }, true);
  document.addEventListener('pointerup', function () {
    gesture = null;
    if (panelDrag) { if (panelDrag.moved) suppressClick = true; panelDrag = null; }
  }, true);
  document.addEventListener('pointercancel', function () { gesture = null; panelDrag = null; }, true);
  byId('editor-drag-handle').addEventListener('pointerdown', function (evt) {
    const p = viewportPoint(evt); if (!p) return;
    panelDrag = {dx: p.x - Number(panelObject.getAttribute('x')),
      dy: p.y - Number(panelObject.getAttribute('y')), moved: false};
    evt.preventDefault(); evt.stopPropagation();
  });
  window.addEventListener('resize', function () {
    movePanel(Number(panelObject.getAttribute('x')), Number(panelObject.getAttribute('y')));
  });
  function fitCanvas() {
    const margin = 24, panelBounds = panelObject.getBoundingClientRect();
    let availableWidth = Math.max(160, window.innerWidth - margin * 2);
    const availableHeight = Math.max(160, window.innerHeight - margin * 2);
    if (panelBounds.width && panelBounds.height && panelBounds.bottom > margin && panelBounds.top < window.innerHeight - margin) {
      if (panelBounds.left >= window.innerWidth / 2) availableWidth = Math.max(160, panelBounds.left - margin);
      else if (panelBounds.right <= window.innerWidth / 2) availableWidth = Math.max(160, window.innerWidth - panelBounds.right - margin);
    }
    setEditorZoom(Math.min(availableWidth / Number(state.canvas.width), availableHeight / Number(state.canvas.height)));
  }
  byId('zoom-out').addEventListener('click', function () { setEditorZoom(rounded(editorZoom - 0.1)); });
  byId('zoom-in').addEventListener('click', function () { setEditorZoom(rounded(editorZoom + 0.1)); });
  byId('fit-canvas').addEventListener('click', fitCanvas);

  function setEditorState(next) {
    editorState = next;
    svg.setAttribute('class', 'editor-state-' + editorState);
    panel.dataset.state = editorState;
    byId('preview-toolbar').hidden = editorState !== 'preview';
  }
  function updatePanelState() {
    setEditorState(editorState);
    const showTopLevelActions = editorState === 'idle';
    byId('begin-create-element').hidden = !showTopLevelActions;
    byId('begin-create-route').hidden = !showTopLevelActions;
    byId('begin-preview').hidden = !showTopLevelActions;
    byId('deselect').hidden = editorState !== 'editing-element' && editorState !== 'editing-route';
    byId('toggle-place-points').textContent = placingRoutePoints ? 'Finish placing points' : 'Place route points';
    populateDocumentSettings(); populateElementPanel(); populateRouteEditor(); updateZoomDisplay();
  }
  function clearEditing() {
    selectedElement = null; editingRouteId = null; selectedPoint = null; placingRoutePoints = false;
    gesture = null; editorState = 'idle'; refreshRoutes(); updatePanelState(); render();
  }
  byId('deselect').addEventListener('click', clearEditing);
  function populateDocumentSettings() {
    byId('canvas-width').value = state.canvas.width;
    byId('canvas-height').value = state.canvas.height;
    byId('document-text-scale').value = rounded(textScale() * 100);
  }
  [['canvas-width', 'width'], ['canvas-height', 'height']].forEach(function (pair) {
    byId(pair[0]).addEventListener('input', function () {
      const value = finite(this.value);
      if (value === null || value <= 0) {
        status('document-settings-status', 'Canvas dimensions must be positive finite numbers.'); return;
      }
      state.canvas[pair[1]] = value;
      applyCanvasGeometry(); render(); status('document-settings-status', 'Canvas updated. Existing geometry is unchanged.');
    });
  });
  byId('document-text-scale').addEventListener('input', function () {
    const percentage = finite(this.value);
    if (percentage === null || percentage <= 0) {
      status('document-settings-status', 'Text size must be a positive percentage.'); return;
    }
    state.canvas.text_scale = percentage / 100;
    applyTextScale(); render(); status('document-settings-status', 'Text size updated.');
  });
  byId('begin-preview').addEventListener('click', function () {
    selectedElement = null; editingRouteId = null; selectedPoint = null; placingRoutePoints = false;
    editorState = 'preview'; updatePanelState(); render();
  });
  byId('exit-preview').addEventListener('click', function () {
    clearInspectedRoutes(); editorState = 'idle'; updatePanelState(); render();
  });
  function parentOptions(select, selected, excluded) {
    while (select.firstChild) select.removeChild(select.firstChild);
    const blank = htmlNode('option'); blank.value = ''; blank.textContent = '— none —';
    select.appendChild(blank);
    Object.keys(state.elements).filter(function (id) {
      return state.elements[id].class === 'cluster' && (!excluded ||
        (id !== excluded && descendants(excluded).indexOf(id) === -1));
    }).sort().forEach(function (id) {
      const option = htmlNode('option'); option.value = id; option.textContent = id;
      select.appendChild(option);
    });
    select.value = selected || '';
  }
  function hasElementCapability(elementClass, field) {
    return (ELEMENT_CAPABILITIES[elementClass] || []).indexOf(field) !== -1;
  }
  function setElementFieldVisibility(sectionId, elementClass) {
    const section = byId(sectionId);
    section.querySelectorAll('[data-field]').forEach(function (field) {
      field.hidden = !hasElementCapability(elementClass, field.dataset.field);
    });
  }
  function beginCreateElement() {
    selectedElement = null; editingRouteId = null; selectedPoint = null; placingRoutePoints = false;
    editorState = 'creating-element'; status('element-create-status', '');
    parentOptions(byId('new-parent'), byId('new-parent').value, null);
    setElementFieldVisibility('element-create', byId('new-class').value);
    updatePanelState(); render();
  }
  function cancelCreateElement() {
    editorState = 'idle'; status('element-create-status', ''); updatePanelState(); render();
  }
  function selectElement(id) {
    selectedElement = id; editingRouteId = null; selectedPoint = null; placingRoutePoints = false;
    editorState = 'editing-element'; refreshRoutes(); updatePanelState(); render();
  }
  function populateElementPanel() {
    const el = selectedElement && state.elements[selectedElement];
    byId('element-empty').textContent = el ? 'Editing ' + selectedElement : 'Click an element to edit it.';
    ['el-id','el-class','el-parent','el-color','el-title','el-body','el-hover','el-x','el-y',
     'el-width','el-height','el-font-size'].forEach(function (id) { byId(id).disabled = !el; });
    parentOptions(byId('new-parent'), byId('new-parent').value, null);
    setElementFieldVisibility('element-create', byId('new-class').value);
    if (!el) return;
    byId('el-id').value = selectedElement; byId('el-class').value = el.class;
    parentOptions(byId('el-parent'), el.parent, selectedElement);
    setLayoutColor(byId('el-color'), el.color || 'neutral');
    byId('el-title').value = ['title','subtitle','note'].indexOf(el.class) !== -1 ? (el.text || '') : (el.title || '');
    byId('el-body').value = el.body || ''; byId('el-hover').value = el.hover || '';
    setElementFieldVisibility('element-edit', el.class); populateGeometryFields();
  }
  function populateGeometryFields() {
    const el = selectedElement && state.elements[selectedElement]; if (!el) return;
    byId('el-x').value = el.x; byId('el-y').value = el.y;
    byId('el-width').value = el.width === undefined ? '' : el.width;
    byId('el-height').value = el.height === undefined ? '' : el.height;
    byId('el-font-size').value = el.font_size === undefined ? '' : el.font_size;
    byId('el-width').disabled = !hasElementCapability(el.class, 'width');
    byId('el-height').disabled = !hasElementCapability(el.class, 'height');
  }
  function optional(obj, key, value) { if (value) obj[key] = value; else delete obj[key]; }
  function updateElementText() {
    const el = selectedElement && state.elements[selectedElement]; if (!el) return;
    if (['title','subtitle','note'].indexOf(el.class) !== -1) {
      optional(el, 'text', byId('el-title').value);
    } else optional(el, 'title', byId('el-title').value);
    if (hasElementCapability(el.class, 'body')) optional(el, 'body', byId('el-body').value);
    if (hasElementCapability(el.class, 'hover')) optional(el, 'hover', byId('el-hover').value);
    render();
  }
  ['el-title','el-body','el-hover'].forEach(function (id) {
    byId(id).addEventListener('input', updateElementText);
  });
  byId('el-color').addEventListener('change', function () {
    if (selectedElement && hasElementCapability(state.elements[selectedElement].class, 'color')) {
      state.elements[selectedElement].color = this.value; render();
    }
  });
  byId('el-parent').addEventListener('change', function () {
    if (!selectedElement) return;
    if (this.value) state.elements[selectedElement].parent = this.value;
    else delete state.elements[selectedElement].parent;
    render();
  });
  byId('el-class').addEventListener('change', function () {
    if (!selectedElement) return;
    const el = state.elements[selectedElement], old = el.class; el.class = this.value;
    if (old === 'cluster' && el.class !== 'cluster') Object.keys(state.elements).forEach(function (id) {
      if (state.elements[id].parent === selectedElement) delete state.elements[id].parent;
    });
    if (el.class === 'box' || el.class === 'cluster') {
      el.width = Number(el.width || 420); el.height = Number(el.height || 160);
    }
    if (['title','subtitle','note'].indexOf(el.class) !== -1) el.text = el.text || el.title || '';
    populateElementPanel(); render();
  });
  byId('el-id').addEventListener('change', function () {
    if (!selectedElement) return;
    const next = this.value.trim();
    if (!next || (state.elements[next] && next !== selectedElement)) {
      status('element-status', 'ID must be non-empty and unique.'); this.value = selectedElement; return;
    }
    const old = selectedElement, el = state.elements[old]; delete state.elements[old];
    el.id = next; state.elements[next] = el;
    Object.keys(state.elements).forEach(function (id) {
      if (state.elements[id].parent === old) state.elements[id].parent = next;
    });
    selectedElement = next; populateElementPanel(); render();
    status('element-status', 'Renamed ' + old + ' to ' + next + '.');
  });
  [['el-x','x'],['el-y','y'],['el-width','width'],['el-height','height']].forEach(function (pair) {
    byId(pair[0]).addEventListener('input', function () {
      const el = selectedElement && state.elements[selectedElement], value = finite(this.value);
      if (!el || !hasElementCapability(el.class, pair[1]) || value === null ||
          (['width','height'].indexOf(pair[1]) !== -1 && value <= 0)) return;
      const delta = value - Number(el[pair[1]] || 0); el[pair[1]] = value;
      if (['x','y'].indexOf(pair[1]) !== -1 && el.class === 'cluster') descendants(selectedElement).forEach(function (id) {
        state.elements[id][pair[1]] = rounded(state.elements[id][pair[1]] + delta);
      });
      render();
    });
  });
  byId('el-font-size').addEventListener('input', function () {
    const el = selectedElement && state.elements[selectedElement];
    if (!el || !hasElementCapability(el.class, 'fontSize')) return;
    const value = finite(this.value); if (value && value > 0) el.font_size = value; else delete el.font_size; render();
  });
  function copyId(base) {
    let id = base + '-copy', n = 2;
    while (state.elements[id]) { id = base + '-copy-' + n; n += 1; }
    return id;
  }
  byId('duplicate-element').addEventListener('click', function () {
    if (!selectedElement) return;
    const copy = JSON.parse(JSON.stringify(state.elements[selectedElement])), id = copyId(selectedElement);
    copy.id = id; copy.x = Number(copy.x) + 40; copy.y = Number(copy.y) + 40;
    state.elements[id] = copy; selectElement(id); status('element-status', 'Created ' + id + '.');
  });
  function deleteSelectedElement() {
    if (!selectedElement) return;
    const id = selectedElement, parent = state.elements[id].parent;
    Object.keys(state.elements).forEach(function (key) {
      if (state.elements[key].parent === id) {
        if (parent) state.elements[key].parent = parent; else delete state.elements[key].parent;
      }
    });
    delete state.elements[id]; clearEditing();
  }
  byId('delete-element').addEventListener('click', deleteSelectedElement);
  byId('begin-create-element').addEventListener('click', beginCreateElement);
  byId('cancel-create-element').addEventListener('click', cancelCreateElement);
  byId('new-class').addEventListener('change', function () {
    setElementFieldVisibility('element-create', this.value);
  });
  byId('create-element').addEventListener('click', function () {
    const id = byId('new-id').value.trim(), cls = byId('new-class').value;
    if (!id || state.elements[id]) { status('element-create-status', 'New element ID must be non-empty and unique.'); return; }
    const x = finite(byId('new-x').value), y = finite(byId('new-y').value);
    if (x === null || y === null) { status('element-create-status', 'New element x and y must be numeric.'); return; }
    const el = {id: id, class: cls, x: x, y: y}, parent = byId('new-parent').value;
    if (parent) el.parent = parent;
    if (hasElementCapability(cls, 'width')) {
      const width = finite(byId('new-width').value), height = finite(byId('new-height').value);
      if (width === null || height === null || width <= 0 || height <= 0) {
        status('element-create-status', 'Width and height must be positive.'); return;
      }
      el.width = width; el.height = height;
    }
    if (hasElementCapability(cls, 'color')) el.color = byId('new-color').value;
    if (['title','subtitle','note'].indexOf(cls) !== -1) optional(el, 'text', byId('new-title').value);
    else optional(el, 'title', byId('new-title').value);
    if (hasElementCapability(cls, 'body')) optional(el, 'body', byId('new-body').value);
    state.elements[id] = el; byId('new-id').value = ''; selectElement(id);
    status('element-status', 'Created ' + id + '.');
  });

  function refreshRoutes() {
    const select = byId('route-select'); while (select.firstChild) select.removeChild(select.firstChild);
    const blank = htmlNode('option'); blank.value = ''; blank.textContent = '— select —';
    select.appendChild(blank);
    Object.keys(state.routes).sort().forEach(function (id) {
      const option = htmlNode('option'); option.value = id; option.textContent = id;
      select.appendChild(option);
    });
    select.value = editingRouteId || '';
  }
  function beginCreateRoute() {
    selectedElement = null; editingRouteId = null; selectedPoint = null; placingRoutePoints = false;
    editorState = 'creating-route';
    byId('route-new-id').value = ''; byId('route-new-type').value = '';
    byId('route-new-color').value = 'neutral'; byId('route-new-label').value = '';
    status('route-create-status', ''); refreshRoutes(); updatePanelState(); render();
  }
  function cancelCreateRoute() {
    editorState = 'idle'; byId('route-new-id').value = ''; status('route-create-status', '');
    updatePanelState(); render();
  }
  function selectEditingRoute(id) {
    selectedElement = null; editingRouteId = id; selectedPoint = null; placingRoutePoints = false;
    editorState = 'editing-route'; refreshRoutes(); updatePanelState(); render();
  }
  function populateRouteEditor() {
    const route = editingRouteId && state.routes[editingRouteId];
    ['route-type','route-color','route-label'].forEach(function (id) { byId(id).disabled = !route; });
    if (!route) {
      byId('route-type').value = ''; byId('route-color').value = ''; byId('route-label').value = '';
      populatePointFields(); return;
    }
    byId('route-type').value = route.type || ''; byId('route-color').value = route.color || '';
    byId('route-label').value = route.label || ''; populatePointFields();
  }
  function populatePointFields() {
    const route = editingRouteId && state.routes[editingRouteId];
    const p = route && selectedPoint !== null ? route.points[selectedPoint] : null;
    byId('point-x').disabled = !p; byId('point-y').disabled = !p;
    byId('point-x').value = p ? p.x : ''; byId('point-y').value = p ? p.y : '';
  }
  byId('route-select').addEventListener('change', function () {
    if (this.value) selectEditingRoute(this.value);
    else { clearEditing(); }
  });
  byId('begin-create-route').addEventListener('click', beginCreateRoute);
  byId('cancel-create-route').addEventListener('click', cancelCreateRoute);
  byId('create-route').addEventListener('click', function () {
    const id = byId('route-new-id').value.trim();
    if (!id || state.routes[id]) { status('route-create-status', 'Route ID must be non-empty and unique.'); return; }
    const route = {points: [], color: byId('route-new-color').value || 'neutral'};
    optional(route, 'type', byId('route-new-type').value);
    optional(route, 'label', byId('route-new-label').value);
    state.routes[id] = route; byId('route-new-id').value = '';
    editingRouteId = id; selectedElement = null; selectedPoint = null; placingRoutePoints = true;
    editorState = 'editing-route'; refreshRoutes(); updatePanelState(); render();
    status('route-status', 'Click on the diagram to place route points. Hold Shift to keep the next segment horizontal or vertical.');
  });
  byId('route-type').addEventListener('change', function () {
    if (!editingRouteId) return;
    if (this.value) state.routes[editingRouteId].type = this.value; else delete state.routes[editingRouteId].type;
    render();
  });
  byId('route-color').addEventListener('change', function () {
    if (!editingRouteId) return;
    if (this.value) state.routes[editingRouteId].color = this.value; else delete state.routes[editingRouteId].color;
    render();
  });
  byId('route-label').addEventListener('input', function () {
    if (editingRouteId) { optional(state.routes[editingRouteId], 'label', this.value); render(); }
  });
  byId('toggle-place-points').addEventListener('click', function () {
    if (!editingRouteId) { status('route-status', 'Select or create a route first.'); return; }
    placingRoutePoints = !placingRoutePoints;
    updatePanelState();
    status('route-status', placingRoutePoints
      ? 'Click on the diagram to place route points. Hold Shift to keep the next segment horizontal or vertical.'
      : 'Finished placing route points.');
  });
  byId('undo-point').addEventListener('click', function () {
    if (!editingRouteId) return; state.routes[editingRouteId].points.pop(); selectedPoint = null; populateRouteEditor(); render();
  });
  byId('clear-route').addEventListener('click', function () {
    if (!editingRouteId) return; state.routes[editingRouteId].points = []; selectedPoint = null; populateRouteEditor(); render();
  });
  function deleteEditingRoute() {
    if (!editingRouteId) return;
    delete state.routes[editingRouteId]; clearEditing();
  }
  function deleteSelectedPoint() {
    if (!editingRouteId || selectedPoint === null) return;
    state.routes[editingRouteId].points.splice(selectedPoint, 1); selectedPoint = null; populateRouteEditor(); render();
  }
  byId('delete-route').addEventListener('click', deleteEditingRoute);
  byId('delete-point').addEventListener('click', deleteSelectedPoint);
  byId('insert-point').addEventListener('click', function () {
    if (!editingRouteId || selectedPoint === null) { status('route-status', 'Select a point marker first.'); return; }
    const points = state.routes[editingRouteId].points, current = points[selectedPoint], next = points[selectedPoint + 1];
    const inserted = next ? {x: rounded((current.x + next.x) / 2), y: rounded((current.y + next.y) / 2)}
      : {x: rounded(current.x + 50), y: current.y};
    points.splice(selectedPoint + 1, 0, inserted); selectedPoint += 1; populateRouteEditor(); render();
  });
  [['point-x','x'],['point-y','y']].forEach(function (pair) {
    byId(pair[0]).addEventListener('input', function () {
      if (!editingRouteId || selectedPoint === null) return;
      const value = finite(this.value); if (value === null) return;
      state.routes[editingRouteId].points[selectedPoint][pair[1]] = value;
      render();
    });
  });
  function isEditableControl(target) {
    return Boolean(target && (target.isContentEditable || (target.closest &&
      target.closest('input, textarea, select, button, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'))));
  }
  document.addEventListener('keydown', function (evt) {
    if (editorState === 'preview') {
      if (evt.key === 'Escape') {
        clearInspectedRoutes(); render(); evt.preventDefault();
      }
      return;
    }
    if (editorState === 'creating-element') {
      if (evt.key === 'Escape') {
        cancelCreateElement(); evt.preventDefault();
      }
      return;
    }
    if (editorState === 'creating-route') {
      if (evt.key === 'Escape') { cancelCreateRoute(); evt.preventDefault(); }
      return;
    }
    if (editorState === 'idle') return;
    if (evt.key === 'Escape') {
      if (editorState === 'editing-route' && placingRoutePoints) {
        placingRoutePoints = false;
        status('route-status', 'Finished placing route points.');
      } else {
        if (gesture && gesture.kind === 'point' && editingRouteId && selectedPoint !== null) {
          const point = state.routes[editingRouteId].points[selectedPoint];
          point.x = gesture.origin.x; point.y = gesture.origin.y;
        }
        if (gesture && gesture.kind === 'route-move' && state.routes[gesture.routeId]) {
          state.routes[gesture.routeId].points.forEach(function (point, index) {
            point.x = gesture.origins[index].x; point.y = gesture.origins[index].y;
          });
        }
        clearEditing(); evt.preventDefault(); return;
      }
      updatePanelState(); render(); evt.preventDefault(); return;
    }
    if (isEditableControl(evt.target)) return;
    if ((evt.key === 'Delete' || evt.key === 'Backspace') && editorState === 'editing-element') {
      deleteSelectedElement(); evt.preventDefault(); return;
    }
    if ((evt.key === 'Delete' || evt.key === 'Backspace') && editorState === 'editing-route' && !placingRoutePoints) {
      if (selectedPoint !== null) deleteSelectedPoint(); else deleteEditingRoute();
      evt.preventDefault(); return;
    }
    if (editingRouteId && selectedPoint !== null &&
        ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(evt.key) !== -1) {
      const point = state.routes[editingRouteId].points[selectedPoint], amount = evt.shiftKey ? 10 : 1;
      if (evt.key === 'ArrowLeft') point.x = rounded(point.x - amount);
      if (evt.key === 'ArrowRight') point.x = rounded(point.x + amount);
      if (evt.key === 'ArrowUp') point.y = rounded(point.y - amount);
      if (evt.key === 'ArrowDown') point.y = rounded(point.y + amount);
      populateRouteEditor(); render(); evt.preventDefault();
    }
  });
  svg.addEventListener('click', function (evt) {
    if (suppressClick) { suppressClick = false; return; }
    if (inPanel(evt)) return;
    if (editorState === 'preview') {
      const routeId = routeTarget(evt.target);
      if (!routeId) return;
      toggleInspectedRoute(routeId);
      render(); return;
    }
    if (editorState === 'editing-route' && placingRoutePoints && editingRouteId) {
      const p = point(evt); if (!p) return;
      const points = state.routes[editingRouteId].points;
      const candidate = {x: rounded(p.x), y: rounded(p.y)}, previous = points[points.length - 1];
      points.push(evt.shiftKey && previous ? orthogonalPoint(previous, candidate) : candidate);
      selectedPoint = state.routes[editingRouteId].points.length - 1;
      populateRouteEditor(); render();
      const count = state.routes[editingRouteId].points.length;
      status('route-status', editingRouteId + ': ' + count + (count === 1 ? ' point. ' : ' points. ') +
        'Click on the diagram to place route points. Hold Shift to keep the next segment horizontal or vertical.');
      evt.preventDefault(); evt.stopPropagation(); return;
    }
  }, true);

  function validateExport() {
    if (!Number.isFinite(Number(state.canvas.width)) || Number(state.canvas.width) <= 0 ||
        !Number.isFinite(Number(state.canvas.height)) || Number(state.canvas.height) <= 0) {
      throw new Error('canvas dimensions must be positive finite numbers');
    }
    if (!Number.isFinite(Number(state.canvas.text_scale)) || Number(state.canvas.text_scale) <= 0) {
      throw new Error('text scale must be a positive finite number');
    }
    const classes = ['title','subtitle','cluster','box','note'];
    Object.keys(state.elements).forEach(function (id) {
      const el = state.elements[id];
      if (el.id !== id) throw new Error('element key/id mismatch for ' + id);
      if (classes.indexOf(el.class) === -1) throw new Error('unsupported class for ' + id);
      if (el.color && palette.layoutAccepted.indexOf(el.color) === -1) {
        throw new Error('unsupported color for element ' + id);
      }
      if (!Number.isFinite(Number(el.x)) || !Number.isFinite(Number(el.y))) throw new Error('invalid geometry for ' + id);
      if (el.parent && (!state.elements[el.parent] || state.elements[el.parent].class !== 'cluster')) throw new Error('invalid parent for ' + id);
    });
    Object.keys(state.routes).forEach(function (id) {
      if (state.routes[id].color && palette.routeAccepted.indexOf(state.routes[id].color) === -1) {
        throw new Error('unsupported color for route ' + id);
      }
      state.routes[id].points.forEach(function (p) {
        if (!Number.isFinite(Number(p.x)) || !Number.isFinite(Number(p.y))) throw new Error('invalid point in route ' + id);
      });
    });
  }
  function documentJson() {
    validateExport(); const elements = {}, routes = {};
    Object.keys(state.elements).sort().forEach(function (id) { elements[id] = state.elements[id]; });
    Object.keys(state.routes).sort().forEach(function (id) { routes[id] = state.routes[id]; });
    return JSON.stringify({canvas: {width: state.canvas.width, height: state.canvas.height, text_scale: state.canvas.text_scale},
      elements: elements, routes: routes}, null, 2) + '\n';
  }
  function messageTarget() {
    if (editorState === 'creating-route') return 'route-create-status';
    if (editorState === 'editing-route') return 'route-status';
    if (editorState === 'creating-element') return 'element-create-status';
    return 'element-status';
  }
  byId('export-json').addEventListener('click', function () {
    try {
      const blob = new Blob([documentJson()], {type: 'application/json'}), link = htmlNode('a');
      const url = URL.createObjectURL(blob); link.href = url; link.download = 'diagram.json';
      panel.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (error) { status(messageTarget(), 'Cannot export: ' + error.message); }
  });
  applyTextScale(); setEditorZoom(1); refreshRoutes(); updatePanelState(); render();
  window.requestAnimationFrame(function () {
    movePanel(Number(panelObject.getAttribute('x')), Number(panelObject.getAttribute('y')));
  });
})();
