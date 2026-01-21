# Figma-like Web Design Editor

A simple, interactive web-based design tool inspired by Figma that lets you visually compose, arrange, and customize elements (rectangles, text, etc.) on a canvas. 

## 🚀 Features

- **Interactive Canvas**
  - Visually add, select, drag, and arrange rectangles and text boxes on a large canvas.

- **Layer Management**
  - See and re-order layers on the sidebar for easy management of overlapping elements.

- **Element Properties Panel**
  - Adjust properties of each element, including:
    - Width & Height
    - Rotation
    - Z-Index (layer order)
    - Background color (with transparency support)
    - Border color & Border radius (for rectangles)
    - Edit text content, font size, and text color (for text elements)
  - Live preview as you modify values.

- **Keyboard Shortcuts**
  - `Ctrl` + `mouse drag` or `middle mouse drag` to pan the canvas.
  - Undo and Redo buttons for quick changes.

- **Canvas Pan & Zoom**
  - Zoom in/out smoothly with mouse wheel, focusing around the cursor.
  - Pan/view the canvas by dragging (with `Ctrl` key or middle mouse).

- **Export**
  - Export your work as **JSON** (re-import/edit later).
  - Export as **HTML** for use in websites or projects—rendered as a static HTML layout.

- **Persistent State (Local)**
  - Saves progress in browser automatically; reload to continue your work.

- **Live Preview & Drag-and-Drop**
  - See updates instantly as you drag/move/resize or edit elements.

## ✨ How To Use

1. Click the Rectangle or Text icon in the header to add a new element.
2. Select an element to edit its properties in the sidebar.
3. Drag elements to reposition them on the canvas.
4. Use Undo/Redo to revert changes.
5. Zoom in/out with your mouse wheel (hold `Ctrl` for faster zoom).
6. Pan the canvas by holding `Ctrl` (or using the middle mouse button) while dragging.
7. Use the sidebar to edit colors, size, rotation, or layer order.
8. Export your design as JSON or HTML from the right sidebar.

## 🛠 Technologies

- HTML, CSS (Tailwind), JS
- No frameworks, fully client-side, and runs in your browser.
- No canvas and svg engine use

## ⚡ Demo

Just open `index.html` in your browser!

## 📝 Notes

- Not a full-featured Figma alternative—meant for rapid prototyping or simple UIs.
- All data is kept locally in your browser (using `localStorage`).

# Enjoy designing!
