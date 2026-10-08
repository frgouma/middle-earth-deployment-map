#!/usr/bin/env python3
"""Render a JSON-backed SVG diagram, optionally with an embedded editor."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
import math
from pathlib import Path
import sys
import textwrap
from typing import Any
import xml.etree.ElementTree as ET

SVG = "http://www.w3.org/2000/svg"
XHTML = "http://www.w3.org/1999/xhtml"
ET.register_namespace("", SVG)
ET.register_namespace("html", XHTML)
BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DIAGRAM = BASE_DIR / "diagram.json"
DEFAULT_CSS = BASE_DIR / "styles.css"
VIEWER_SCRIPT_PATH = BASE_DIR / "viewer.js"
EDITOR_SCRIPT_PATH = BASE_DIR / "editor.js"
ELEMENT_CLASSES = {"title", "subtitle", "cluster", "box", "note"}
# Palette membership has one source of truth.  The derived groups deliberately
# distinguish normal editor choices from values accepted for old diagram data.
PALETTE_MEMBERSHIP = {
    "shared": ("neutral", "blue", "amber", "purple"),
    "layout_compatibility": ("green",),
    "route_only": ("red",),
}
LAYOUT_EDITOR_COLORS = PALETTE_MEMBERSHIP["shared"]
LAYOUT_ACCEPTED_COLORS = frozenset(
    PALETTE_MEMBERSHIP["shared"] + PALETTE_MEMBERSHIP["layout_compatibility"]
)
ROUTE_EDITOR_COLORS = PALETTE_MEMBERSHIP["shared"] + PALETTE_MEMBERSHIP["route_only"]
ROUTE_ACCEPTED_COLORS = frozenset(ROUTE_EDITOR_COLORS)
ROUTE_TYPES = {"deployment", "runtime"}


def _javascript_source(path: Path) -> str:
    """Load a generation-time JavaScript dependency beside this module."""
    return path.read_text(encoding="utf-8")


class DiagramError(ValueError):
    """A useful, user-facing validation error."""


def _strict_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DiagramError(f"duplicate JSON key: {key!r}")
        result[key] = value
    return result


def _number(value: Any, location: str, *, positive: bool = False) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise DiagramError(f"{location} must be a number")
    number = float(value)
    if not math.isfinite(number):
        raise DiagramError(f"{location} must be finite")
    if positive and number <= 0:
        raise DiagramError(f"{location} must be greater than zero")
    return number


def _num(value: float | int) -> str:
    number = float(value)
    return str(int(number)) if number.is_integer() else f"{number:.10g}"


@dataclass(frozen=True)
class Canvas:
    width: float
    height: float
    text_scale: float = 1.0

    @classmethod
    def from_json(cls, value: Any) -> "Canvas":
        if not isinstance(value, dict):
            raise DiagramError("canvas must be an object")
        return cls(
            _number(value.get("width"), "canvas.width", positive=True),
            _number(value.get("height"), "canvas.height", positive=True),
            _number(value.get("text_scale", 1.0), "canvas.text_scale", positive=True),
        )

    def to_json(self) -> dict[str, int | float]:
        return {
            "width": int(self.width) if self.width.is_integer() else self.width,
            "height": int(self.height) if self.height.is_integer() else self.height,
            "text_scale": self.text_scale,
        }


@dataclass(frozen=True)
class DiagramElement:
    element_id: str
    data: dict[str, Any]

    @classmethod
    def from_json(cls, key: str, value: Any) -> "DiagramElement":
        where = f"elements.{key}"
        if not isinstance(value, dict):
            raise DiagramError(f"{where} must be an object")
        element_id = value.get("id", key)
        if not isinstance(element_id, str) or not element_id:
            raise DiagramError(f"{where}.id must be a non-empty string")
        if element_id != key:
            raise DiagramError(f"{where}.id must match its object key")
        element_class = value.get("class")
        if element_class not in ELEMENT_CLASSES:
            raise DiagramError(f"{where}.class must be one of {sorted(ELEMENT_CLASSES)}")
        _number(value.get("x"), f"{where}.x")
        _number(value.get("y"), f"{where}.y")
        if element_class in {"box", "cluster"}:
            _number(value.get("width"), f"{where}.width", positive=True)
            _number(value.get("height"), f"{where}.height", positive=True)
        elif "width" in value:
            _number(value["width"], f"{where}.width", positive=True)
        if element_class not in {"box", "cluster"} and "height" in value:
            _number(value["height"], f"{where}.height", positive=True)
        if "color" in value and value["color"] not in LAYOUT_ACCEPTED_COLORS:
            raise DiagramError(f"{where}.color must be one of {sorted(LAYOUT_ACCEPTED_COLORS)}")
        if "font_size" in value:
            _number(value["font_size"], f"{where}.font_size", positive=True)
        for field in ("title", "body", "text", "hover", "parent"):
            if field in value and not isinstance(value[field], str):
                raise DiagramError(f"{where}.{field} must be a string")
        return cls(element_id, dict(value))

    @property
    def element_class(self) -> str:
        return str(self.data["class"])

    @property
    def parent(self) -> str | None:
        return self.data.get("parent")


@dataclass(frozen=True)
class Route:
    route_id: str
    data: dict[str, Any]

    @classmethod
    def from_json(cls, key: str, value: Any) -> "Route":
        where = f"routes.{key}"
        if not key:
            raise DiagramError("route IDs must be non-empty strings")
        if not isinstance(value, dict):
            raise DiagramError(f"{where} must be an object")
        route_type = value.get("type")
        if route_type not in (None, "") and route_type not in ROUTE_TYPES:
            raise DiagramError(f"{where}.type must be deployment, runtime, or omitted")
        if "label" in value and not isinstance(value["label"], str):
            raise DiagramError(f"{where}.label must be a string")
        if "color" in value and value["color"] not in ROUTE_ACCEPTED_COLORS:
            raise DiagramError(f"{where}.color must be one of {sorted(ROUTE_ACCEPTED_COLORS)}")
        points = value.get("points")
        if not isinstance(points, list):
            raise DiagramError(f"{where}.points must be an array")
        for index, point in enumerate(points):
            point_where = f"{where}.points[{index}]"
            if not isinstance(point, dict):
                raise DiagramError(f"{point_where} must be an object")
            _number(point.get("x"), f"{point_where}.x")
            _number(point.get("y"), f"{point_where}.y")
        return cls(key, dict(value))


@dataclass(frozen=True)
class Diagram:
    canvas: Canvas
    elements: dict[str, DiagramElement]
    routes: dict[str, Route]

    @classmethod
    def load(cls, path: Path) -> "Diagram":
        try:
            with path.open("r", encoding="utf-8") as source:
                raw = json.load(source, object_pairs_hook=_strict_object)
        except json.JSONDecodeError as exc:
            raise DiagramError(f"invalid JSON in {path}: {exc}") from exc
        if not isinstance(raw, dict):
            raise DiagramError("diagram.json must contain one top-level object")
        if any(key not in raw for key in ("canvas", "elements", "routes")):
            raise DiagramError("diagram.json requires canvas, elements, and routes")
        if not isinstance(raw["elements"], dict):
            raise DiagramError("elements must be an object keyed by element ID")
        if not isinstance(raw["routes"], dict):
            raise DiagramError("routes must be an object keyed by route ID")
        elements = {key: DiagramElement.from_json(key, value) for key, value in raw["elements"].items()}
        routes = {key: Route.from_json(key, value) for key, value in raw["routes"].items()}
        diagram = cls(Canvas.from_json(raw["canvas"]), elements, routes)
        diagram._validate_parents()
        return diagram

    def _validate_parents(self) -> None:
        for element in self.elements.values():
            parent = element.parent
            if parent is None:
                continue
            if not parent or parent not in self.elements:
                raise DiagramError(f"elements.{element.element_id}.parent references missing element {parent!r}")
            if self.elements[parent].element_class != "cluster":
                raise DiagramError(f"elements.{element.element_id}.parent {parent!r} is not a cluster")
        state: dict[str, int] = {}

        def visit(element_id: str, trail: list[str]) -> None:
            if state.get(element_id) == 1:
                raise DiagramError(f"parent cycle detected: {' -> '.join(trail + [element_id])}")
            if state.get(element_id) == 2:
                return
            state[element_id] = 1
            parent = self.elements[element_id].parent
            if parent is not None:
                visit(parent, trail + [element_id])
            state[element_id] = 2

        for element_id in self.elements:
            visit(element_id, [])

    def depth(self, element_id: str) -> int:
        result = 0
        parent = self.elements[element_id].parent
        while parent is not None:
            result += 1
            parent = self.elements[parent].parent
        return result

    def to_json(self) -> dict[str, Any]:
        return {
            "canvas": self.canvas.to_json(),
            "elements": {key: dict(value.data) for key, value in self.elements.items()},
            "routes": {key: dict(value.data) for key, value in self.routes.items()},
        }


def _svg(parent: ET.Element, tag: str, attrs: dict[str, Any] | None = None) -> ET.Element:
    return ET.SubElement(parent, f"{{{SVG}}}{tag}", {key: str(value) for key, value in (attrs or {}).items()})


def _wrap(value: str, width: float | None, font_size: float) -> list[str]:
    if not value:
        return []
    if width is None:
        return value.splitlines() or [value]
    limit = max(7, int(width / max(font_size * 0.55, 1)))
    lines: list[str] = []
    for raw in value.splitlines() or [""]:
        lines.extend(textwrap.wrap(raw, width=limit, break_long_words=False, break_on_hyphens=False) or [""])
    return lines


def _text(parent: ET.Element, value: str, x: float, y: float, css_class: str, *,
          width: float | None = None, font_size: float = 32, anchor: str = "middle") -> None:
    lines = _wrap(value, width, font_size)
    line_height = font_size * 1.18
    node = _svg(parent, "text", {"x": x, "y": y, "class": css_class, "text-anchor": anchor})
    first_y = y - (len(lines) - 1) * line_height / 2
    for index, line in enumerate(lines):
        span = _svg(node, "tspan", {"x": x, "y": first_y + index * line_height})
        span.text = line


def _element_group(parent: ET.Element, element: DiagramElement, extra: str) -> ET.Element:
    data = element.data
    attrs: dict[str, Any] = {
        "class": f"diagram-element element-{element.element_class} palette-{data.get('color', 'neutral')} {extra}",
        "data-element-id": element.element_id,
        "data-editable": "true",
    }
    if "font_size" in data:
        attrs["style"] = f"--element-font-size:{_num(data['font_size'])}px"
    group = _svg(parent, "g", attrs)
    if data.get("hover"):
        title = _svg(group, "title")
        title.text = data["hover"]
    return group


def _path(points: list[dict[str, Any]]) -> str:
    if not points:
        return ""
    return " ".join(
        [("M" if index == 0 else "L") + f" {_num(point['x'])} {_num(point['y'])}"
         for index, point in enumerate(points)]
    )


def _route_label_position(points: list[dict[str, Any]]) -> tuple[float, float]:
    """Place the label above the midpoint of the route's longest segment."""
    start, end = max(
        zip(points, points[1:]),
        key=lambda pair: (pair[1]["x"] - pair[0]["x"]) ** 2 + (pair[1]["y"] - pair[0]["y"]) ** 2,
    )
    return ((start["x"] + end["x"]) / 2, (start["y"] + end["y"]) / 2 - 28)


def _route_classes(route: Route) -> str:
    color = route.data.get("color")
    color_classes = f" palette-{color} route-colored route-color-{color}" if color else ""
    return f"diagram-route route-{route.data.get('type', 'untyped')}{color_classes}"


def _add_route_label(group: ET.Element, route_id: str, data: dict[str, Any], text_scale: float = 1.0) -> None:
    label = data.get("label") or f"Route {route_id}"
    x, y = _route_label_position(data["points"])
    width = max(100 * text_scale, len(label) * 14 * text_scale + 28 * text_scale)
    label_group = _svg(group, "g", {"class": "route-label", "aria-hidden": "true"})
    _svg(label_group, "rect", {"x": _num(x - width / 2), "y": _num(y - 24 * text_scale),
        "width": _num(width), "height": _num(44 * text_scale)})
    text = _svg(label_group, "text", {"x": _num(x), "y": _num(y + 8 * text_scale), "text-anchor": "middle"})
    text.text = label


def render_svg(diagram: Diagram, css: str, *, editor: bool) -> ET.ElementTree:
    width, height = diagram.canvas.width, diagram.canvas.height
    text_scale = diagram.canvas.text_scale
    if editor:
        # Editor chrome uses browser-viewport coordinates.  The nested SVG below
        # retains the diagram's fixed logical coordinate system.
        root = ET.Element(f"{{{SVG}}}svg", {
            "width": "100%", "height": "100%",
            "style": f"display:block;width:100vw;height:100vh;overflow:visible;--text-scale:{_num(text_scale)}",
            "version": "1.1", "preserveAspectRatio": "xMidYMid meet",
            "class": "editor-state-idle", "data-editor": "true",
        })
    else:
        # Keep the clean renderer byte-for-byte stable when regenerated.
        root = ET.Element(f"{{{SVG}}}svg", {
            "width": _num(width), "height": _num(height), "viewBox": f"0 0 {_num(width)} {_num(height)}",
            "version": "1.1", "preserveAspectRatio": "xMidYMid meet",
            "class": "clean-render", "data-editor": "false", "style": f"--text-scale:{_num(text_scale)}",
        })
    defs = _svg(root, "defs")
    style = _svg(defs, "style", {"type": "text/css", "data-source": "styles.css"})
    style.text = css
    marker_classes = {
        "arrow-default": "route-arrow-default",
        "arrow-deployment": "route-arrow-deployment",
        "arrow-runtime": "route-arrow-runtime",
        **{f"arrow-{color}": f"route-arrow-semantic palette-{color}" for color in sorted(ROUTE_ACCEPTED_COLORS)},
    }
    for marker_id, marker_class in marker_classes.items():
        marker = _svg(defs, "marker", {"id": marker_id, "markerWidth": 12, "markerHeight": 10,
            "refX": 11, "refY": 5, "orient": "auto", "markerUnits": "strokeWidth",
            "class": marker_class})
        _svg(marker, "path", {"class": "route-arrowhead", "d": "M 0 0 L 12 5 L 0 10 z"})
    canvas_parent = root
    if editor:
        canvas_parent = _svg(root, "svg", {"id": "diagram-canvas", "x": 0, "y": 0,
            "width": _num(width), "height": _num(height), "viewBox": f"0 0 {_num(width)} {_num(height)}"})
    _svg(canvas_parent, "rect", {"class": "canvas-background", "x": 0, "y": 0, "width": _num(width), "height": _num(height)})
    content = _svg(canvas_parent, "g", {"id": "diagram-content"})
    cluster_fills = _svg(content, "g", {"id": "cluster-fills"})
    routes = _svg(content, "g", {"id": "routes-layer"})
    boxes = _svg(content, "g", {"id": "boxes-layer"})
    cluster_labels = _svg(content, "g", {"id": "cluster-labels"})
    texts = _svg(content, "g", {"id": "text-layer"})
    clusters = sorted((e for e in diagram.elements.values() if e.element_class == "cluster"),
                      key=lambda e: (diagram.depth(e.element_id), e.element_id))
    for element in clusters:
        data = element.data
        group = _element_group(cluster_fills, element, "cluster-fill")
        _svg(group, "rect", {"class": "cluster-surface", "x": _num(data["x"]), "y": _num(data["y"]),
            "width": _num(data["width"]), "height": _num(data["height"])})
    for route in diagram.routes.values():
        points = route.data["points"]
        if len(points) < 2:
            continue
        group = _svg(routes, "g", {"class": _route_classes(route),
            "data-route-id": route.route_id})
        title = _svg(group, "title")
        title.text = route.data.get("label") or f"Route {route.route_id}"
        path_data = _path(points)
        _svg(group, "path", {"class": "route-path", "d": path_data})
        _svg(group, "path", {"class": "route-hit", "d": path_data})
        _add_route_label(group, route.route_id, route.data, text_scale)
    box_elements = sorted((e for e in diagram.elements.values() if e.element_class == "box"),
                          key=lambda e: (diagram.depth(e.element_id), e.element_id))
    for element in box_elements:
        data = element.data
        group = _element_group(boxes, element, "box-content")
        _svg(group, "rect", {"class": "element-surface", "x": _num(data["x"]), "y": _num(data["y"]),
            "width": _num(data["width"]), "height": _num(data["height"])})
        title_value, body_value = data.get("title", ""), data.get("body", "")
        font_size = float(data.get("font_size", 36)) * text_scale
        title_lines = _wrap(title_value, data["width"] - 50, font_size)
        body_size = font_size * 0.88
        body_lines = _wrap(body_value, data["width"] - 50, body_size)
        title_height = len(title_lines) * font_size * 1.15
        body_height = len(body_lines) * body_size * 1.18
        gap = 16 * text_scale if title_lines and body_lines else 0
        top = data["y"] + (data["height"] - title_height - body_height - gap) / 2
        center_x = data["x"] + data["width"] / 2
        if title_lines:
            _text(group, title_value, center_x, top + title_height / 2, "box-title",
                  width=data["width"] - 50, font_size=font_size)
        if body_lines:
            _text(group, body_value, center_x, top + title_height + gap + body_height / 2, "box-body",
                  width=data["width"] - 50, font_size=body_size)
    for element in clusters:
        data = element.data
        if not data.get("title"):
            continue
        group = _element_group(cluster_labels, element, "cluster-label-content")
        font_size = float(data.get("font_size", 38)) * text_scale
        lines = _wrap(data["title"], data["width"] - 60, font_size)
        _text(group, data["title"], data["x"] + 30,
              data["y"] + 52 + (len(lines) - 1) * font_size * .55, "cluster-title",
              width=data["width"] - 60, font_size=font_size, anchor="start")
    defaults = {"title": 76, "subtitle": 42, "note": 30}
    for element in diagram.elements.values():
        if element.element_class not in defaults:
            continue
        data = element.data
        group = _element_group(texts, element, "text-content")
        font_size = float(data.get("font_size", defaults[element.element_class])) * text_scale
        _text(group, data.get("text", data.get("title", "")), data["x"], data["y"],
              f"element-{element.element_class}", width=data.get("width"), font_size=font_size,
              anchor="middle" if element.element_class == "note" else "start")
    if editor:
        _add_editor(root, diagram)
    else:
        script = _svg(root, "script", {"type": "application/ecmascript"})
        script.text = _javascript_source(VIEWER_SCRIPT_PATH)
    return ET.ElementTree(root)


def _color_options(colors: tuple[str, ...], *, legacy_default: bool = False) -> str:
    options = ['<option value="">Default (legacy)</option>'] if legacy_default else []
    options.extend(
        f'<option value="{color}">{color.title() if legacy_default else color}</option>'
        for color in colors
    )
    return "".join(options)


LAYOUT_COLOR_OPTIONS = _color_options(LAYOUT_EDITOR_COLORS)
ROUTE_COLOR_OPTIONS = _color_options(ROUTE_EDITOR_COLORS, legacy_default=True)


PANEL_XML = f"""
<div xmlns="{XHTML}" id="editor-panel-shell" class="editor-panel-shell" data-state="idle">
 <div id="editor-drag-handle" class="editor-drag-handle">Diagram editor — drag here</div>
 <div class="editor-tabs" id="editor-toolbar"><button id="begin-create-element" type="button">Create element</button><button id="begin-create-route" type="button">Create route</button><button id="begin-preview" type="button">Preview</button><button id="deselect" type="button" hidden="hidden">Deselect</button><button id="export-json" type="button">Export JSON</button></div>
 <div class="editor-tabs" id="preview-toolbar" hidden="hidden"><button id="exit-preview" type="button">Return to editor</button></div>
 <div class="editor-panel-body">
   <section class="document-settings"><h3>Document settings</h3><div class="editor-grid"><label for="canvas-width">Canvas width</label><input id="canvas-width" type="number" step="any" min="0.01"/><label for="canvas-height">Canvas height</label><input id="canvas-height" type="number" step="any" min="0.01"/><label for="document-text-scale">Text size (%)</label><input id="document-text-scale" type="number" step="1" min="1"/> </div><div id="document-settings-status" class="editor-status"/></section>
   <section class="editor-zoom" aria-label="Editor zoom"><h3>Editor zoom</h3><div class="editor-actions"><button id="zoom-out" type="button" title="Zoom out">−</button><output id="zoom-display" for="zoom-out zoom-in">100%</output><button id="zoom-in" type="button" title="Zoom in">+</button><button id="fit-canvas" type="button">Fit to canvas</button></div></section>
   <div id="editor-idle" class="editor-state"><p class="editor-status">Select an element or route in the diagram to edit it.</p><p class="preview-copy">Export downloads the current diagram as a JSON file.</p></div>
   <div id="element-edit" class="editor-state"><h3>Selected element</h3><div id="element-empty" class="editor-status">Editing element.</div>
    <div class="editor-grid">
     <label for="el-id" data-field="id">ID</label><input id="el-id" data-field="id" type="text"/><label for="el-class" data-field="class">Class</label><select id="el-class" data-field="class"><option>title</option><option>subtitle</option><option>cluster</option><option>box</option><option>note</option></select>
     <label for="el-parent" data-field="parent">Parent</label><select id="el-parent" data-field="parent"/><label for="el-color" data-field="color">Color</label><select id="el-color" data-field="color">{LAYOUT_COLOR_OPTIONS}</select>
     <label for="el-title" data-field="text">Title / text</label><textarea id="el-title" data-field="text"/><label for="el-body" data-field="body">Body</label><textarea id="el-body" data-field="body"/><label for="el-hover" data-field="hover">Hover</label><textarea id="el-hover" data-field="hover"/>
     <label for="el-x" data-field="x">x</label><input id="el-x" data-field="x" type="number" step="any"/><label for="el-y" data-field="y">y</label><input id="el-y" data-field="y" type="number" step="any"/><label for="el-width" data-field="width">width</label><input id="el-width" data-field="width" type="number" step="any" min="1"/><label for="el-height" data-field="height">height</label><input id="el-height" data-field="height" type="number" step="any" min="1"/><label for="el-font-size" data-field="fontSize">font size</label><input id="el-font-size" data-field="fontSize" type="number" step="any" min="1" placeholder="CSS default"/>
    </div><div class="editor-actions"><button id="duplicate-element" type="button">Duplicate</button><button id="delete-element" type="button">Delete</button></div><div id="element-status" class="editor-status"/></div>
   <div id="element-create" class="editor-state"><h3>Create element</h3>
    <div class="editor-grid">
     <label for="new-id" data-field="id">Unique ID</label><input id="new-id" data-field="id" type="text"/><label for="new-class" data-field="class">Class</label><select id="new-class" data-field="class"><option>box</option><option>cluster</option><option>title</option><option>subtitle</option><option>note</option></select>
     <label for="new-parent" data-field="parent">Parent</label><select id="new-parent" data-field="parent"/><label for="new-color" data-field="color">Color</label><select id="new-color" data-field="color">{LAYOUT_COLOR_OPTIONS}</select>
     <label for="new-title" data-field="text">Title / text</label><textarea id="new-title" data-field="text"/><label for="new-body" data-field="body">Body</label><textarea id="new-body" data-field="body"/><label for="new-x" data-field="x">x</label><input id="new-x" data-field="x" type="number" step="any" value="200"/><label for="new-y" data-field="y">y</label><input id="new-y" data-field="y" type="number" step="any" value="200"/><label for="new-width" data-field="width">width</label><input id="new-width" data-field="width" type="number" step="any" value="420" min="1"/><label for="new-height" data-field="height">height</label><input id="new-height" data-field="height" type="number" step="any" value="160" min="1"/>
    </div><div class="editor-actions"><button id="create-element" type="button">Create element</button><button id="cancel-create-element" type="button">Cancel</button></div><div id="element-create-status" class="editor-status"/></div>
   <div id="route-create" class="editor-state"><h3>Create route</h3><div class="editor-grid"><label for="route-new-id">New route ID</label><input id="route-new-id" type="text" placeholder="route-id"/><label for="route-new-type">Type</label><select id="route-new-type"><option value="">Unspecified</option><option value="deployment">deployment</option><option value="runtime">runtime</option></select><label for="route-new-color">Color</label><select id="route-new-color">{ROUTE_COLOR_OPTIONS}</select><label for="route-new-label">Label</label><input id="route-new-label" type="text"/></div><div class="editor-actions"><button id="create-route" type="button">Create route</button><button id="cancel-create-route" type="button">Cancel</button></div><div id="route-create-status" class="editor-status"/></div>
   <div id="route-edit" class="editor-state"><h3>Editing route</h3><div class="editor-grid"><label for="route-select">Active editing route</label><select id="route-select"/><label for="route-type">Type</label><select id="route-type"><option value="">Unspecified</option><option value="deployment">deployment</option><option value="runtime">runtime</option></select><label for="route-color">Color</label><select id="route-color">{ROUTE_COLOR_OPTIONS}</select><label for="route-label">Label</label><input id="route-label" type="text"/><label for="point-x">Point x</label><input id="point-x" type="number" step="any"/><label for="point-y">Point y</label><input id="point-y" type="number" step="any"/></div>
    <div class="editor-actions"><button id="toggle-place-points" type="button">Place route points</button><button id="undo-point" type="button">Undo point</button><button id="insert-point" type="button">Insert bend</button><button id="delete-point" type="button">Delete point</button><button id="clear-route" type="button">Clear route</button><button id="delete-route" type="button">Delete route</button></div><div id="route-status" class="editor-status"/></div>
  <section id="preview-state" class="editor-state"><h3>Preview</h3><p class="preview-copy">Hover a route to reveal its label. Click routes to toggle persistent highlights; press Escape to clear them all. Empty canvas clicks do not change the selected routes.</p></section>
 </div>
</div>
"""



def _add_editor(root: ET.Element, diagram: Diagram) -> None:
    panel_width = min(980.0, diagram.canvas.width - 40)
    foreign = _svg(root, "foreignObject", {"id": "diagram-editor-panel",
        "x": max(20.0, diagram.canvas.width - panel_width - 30), "y": 30,
        "width": panel_width, "height": min(1760.0, diagram.canvas.height - 60)})
    foreign.append(ET.fromstring(PANEL_XML))
    data = _svg(root, "script", {"id": "diagram-data", "type": "application/json"})
    data.text = json.dumps(diagram.to_json(), ensure_ascii=False).replace("<", "\\u003c")
    script = _svg(root, "script", {"type": "application/ecmascript"})
    palette = {
        "layoutAccepted": sorted(LAYOUT_ACCEPTED_COLORS),
        "layoutCompatibility": list(PALETTE_MEMBERSHIP["layout_compatibility"]),
        "routeAccepted": list(ROUTE_EDITOR_COLORS),
    }
    script.text = _javascript_source(EDITOR_SCRIPT_PATH).replace(
        "__PALETTE_MEMBERSHIP__", json.dumps(palette)
    )



def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--editor", action="store_true", help="embed the interactive editor")
    parser.add_argument("--diagram", type=Path, default=DEFAULT_DIAGRAM, help="diagram JSON input")
    parser.add_argument("--css", type=Path, default=DEFAULT_CSS, help="diagram CSS input")
    parser.add_argument("--output", type=Path, help="output SVG path")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    output = args.output or Path("diagram_editor.svg" if args.editor else "diagram.svg")
    try:
        diagram = Diagram.load(args.diagram)
        css = args.css.read_text(encoding="utf-8")
        if not css.strip():
            raise DiagramError(f"CSS file is empty: {args.css}")
        tree = render_svg(diagram, css, editor=args.editor)
        output.parent.mkdir(parents=True, exist_ok=True)
        tree.write(output, encoding="utf-8", xml_declaration=True)
    except (DiagramError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
