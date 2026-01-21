
const state = {
    elements: [],
    selectedId: null,
    idCounter: 1
};

const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 50;

let isPanning = false;
let panStart = { x: 0, y: 0 };
let active = null;

const viewport = {
    x: 0,
    y: 0,
    scale: 1
};
const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 1200;

const myCanvas = document.getElementById("myCanvas");
const addRectBtn = document.getElementById("figrectangle");
const addTextBtn = document.getElementById("figtext");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const deleteBtn = document.getElementById("deleteBtn");
const widthInput = document.getElementById("sidebar-width");
const heightInput = document.getElementById("sidebar-height");
const STORAGE_KEY = "figma_dom_editor_v2";

function setupCanvasSize() {
    myCanvas.style.width = CANVAS_WIDTH + "px";
    myCanvas.style.height = CANVAS_HEIGHT + "px";
}

function createElementData(type) {
    const width = type === "text" ? 80 : 120;
    const height = type === "text" ? 30 : 80;

    return {
        id: `el_${state.idCounter++}`,
        type,
        x: 600,
        y: 400,
        width,
        height,
        rotation: 0,
        text: type === "text" ? "Text" : "",
        background: type === "text" ? "transparent" : "#ffffff",
        borderColor: type === "text" ? "transparent" : "#00ffff",
        color: type === "text" ? '#000000' : '#ffffff',
        borderRadius: type === "text" ? undefined : 0,
        fontSize: type === "text" ? 16 : undefined,
        zIndex: state.idCounter
    };
}
function applyViewportTransform() {
    myCanvas.style.transform = `
        translate(${viewport.x}px, ${viewport.y}px)
        scale(${viewport.scale})
    `;
    myCanvas.style.transformOrigin = "0 0";
}

function centerCanvas() {
    const rect = canvasViewport.getBoundingClientRect();

    viewport.x = (rect.width - CANVAS_WIDTH) / 2;
    viewport.y = (rect.height - CANVAS_HEIGHT) / 2;
    viewport.scale = 1;
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
        Object.assign(state, JSON.parse(raw));
    } catch {
        console.warn("Invalid saved data");
    }
}

function pushHistory() {
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
}

function render() {
    applyViewportTransform();
    myCanvas.innerHTML = "";

    state.elements.forEach(el => {
        const node = document.createElement("div");
        node.className = `editor-element ${el.type}`;
        node.dataset.id = el.id;

        Object.assign(node.style, {
            position: "absolute",
            left: el.x + "px",
            top: el.y + "px",
            width: el.width + "px",
            height: el.height + "px",
            background: el.background,
            border: `2px solid ${el.borderColor}`,
            borderRadius: el.type !== "text"
                ? (el.borderRadius || 0) + "px"
                : "0px",
            zIndex: el.zIndex,
            userSelect: "none",
            transform: `rotate(${el.rotation || 0}deg)`,
            transformOrigin: "center center"
        });


        if (el.type === "text") {
            node.textContent = el.text;
            Object.assign(node.style, {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: (el.fontSize || 16) + "px", // ✅ APPLY FONT SIZE
                color: el.color || "#ffffff"
            });
            node
        }
        if (el.id === state.selectedId) {
            node.classList.add("selected-element");
            node.appendChild(createResizeHandle());
        }

        myCanvas.appendChild(node);

    });
    updateSidebar();
    updatePropertiesSidebar();
}
function createResizeHandle() {
    const wrapper = document.createElement("div");

    const rotate = document.createElement("div");
    rotate.className = "rotate-handle";
    rotate.dataset.handle = "rotate";
    Object.assign(rotate.style, {
        width: "14px",
        height: "14px",
        position: "absolute",
        top: "-35px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#f1c40f",
        border: "2px solid #fff",
        borderRadius: "50%",
        cursor: "grab",
        zIndex: 200
    });
    wrapper.appendChild(rotate);

    const positions = [
        { class: "nw", style: { left: "-7px", top: "-7px", cursor: "nwse-resize" } },
        { class: "ne", style: { right: "-7px", top: "-7px", cursor: "nesw-resize" } },
        { class: "sw", style: { left: "-7px", bottom: "-7px", cursor: "nesw-resize" } },
        { class: "se", style: { right: "-7px", bottom: "-7px", cursor: "nwse-resize" } },
    ];

    positions.forEach(pos => {
        const h = document.createElement("div");
        h.className = `resize-handle handle-${pos.class}`;
        h.dataset.handle = pos.class;
        Object.assign(h.style, {
            width: "14px",
            height: "14px",
            position: "absolute",
            background: "#3498db",
            border: "2px solid #fff",
            borderRadius: "50%",
            zIndex: 100,
            ...pos.style
        });
        wrapper.appendChild(h);
    });

    return wrapper;
}
function undo() {
    if (!undoStack.length) return;
    redoStack.push(JSON.stringify(state));
    Object.assign(state, JSON.parse(undoStack.pop()));
    saveState();
    render();
}

function redo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.stringify(state));
    Object.assign(state, JSON.parse(redoStack.pop()));
    saveState();
    render();
}

function selectElement(id) {
    state.selectedId = id;
    saveState();
    render();
}

function resizeElement(el, dx, dy, handle, canvasRect) {
    const MIN_W = 30;
    const MIN_H = 20;

    if (handle.includes("e")) {
        el.width = clamp(el.width + dx, MIN_W, canvasRect.width - el.x);
    }

    if (handle.includes("s")) {
        el.height = clamp(el.height + dy, MIN_H, canvasRect.height - el.y);
    }

    if (handle.includes("w")) {
        const newWidth = clamp(el.width - dx, MIN_W, el.x + el.width);
        el.x += el.width - newWidth;
        el.width = newWidth;
    }

    if (handle.includes("n")) {
        const newHeight = clamp(el.height - dy, MIN_H, el.y + el.height);
        el.y += el.height - newHeight;
        el.height = newHeight;
    }
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

myCanvas.addEventListener("mousedown", e => {
    const node = e.target.closest(".editor-element");
    if (!node) {
        state.selectedId = null;
        saveState();
        render();
        return
    }
    pushHistory();
    selectElement(node.dataset.id);
    const handle = e.target.dataset.handle;
    active = {
        id: node.dataset.id,
        mode: handle === "rotate" ? "rotate" : handle ? "resize" : "move",
        handle,
        startX: e.clientX,
        startY: e.clientY
    };
});

window.addEventListener("mousemove", e => {
    if (!active) return;

    const el = state.elements.find(x => x.id === active.id);
    if (!el) return;

    const canvasRect = myCanvas.getBoundingClientRect();

    if (active.mode === "rotate") {
        const centerX = el.x + el.width / 2;
        const centerY = el.y + el.height / 2;

        const angle =
            Math.atan2(
                e.clientY - canvasRect.top - centerY,
                e.clientX - canvasRect.left - centerX
            ) * (180 / Math.PI);

        el.rotation = Math.round(angle);
    }
    else {
        const dx = e.clientX - active.startX;
        const dy = e.clientY - active.startY;

        if (active.mode === "move") {
            el.x = clamp(el.x + dx, 0, canvasRect.width - el.width);
            el.y = clamp(el.y + dy, 0, canvasRect.height - el.height);
        } else {
            resizeElement(el, dx, dy, active.handle, canvasRect);
        }

        active.startX = e.clientX;
        active.startY = e.clientY;
    }

    render();
});

window.addEventListener("mouseup", () => {
    if (active) saveState();
    active = null;
});


addRectBtn.onclick = () => {
    pushHistory();
    state.elements.push(createElementData("rectangle"));
    normalizeZIndex();
    saveState();
    render();
};

addTextBtn.onclick = () => {
    pushHistory();
    state.elements.push(createElementData("text"));
    normalizeZIndex();
    saveState();
    render();
};
function deleteSelected() {
    if (!state.selectedId) return;
    pushHistory();
    state.elements = state.elements.filter(el => el.id !== state.selectedId);
    state.selectedId = null;
    saveState();
    render();
}

deleteBtn?.addEventListener("click", deleteSelected);

function updateSidebar() {
    const sidebar = document.querySelector(".leftsidebar ul");
    if (!sidebar) return;

    sidebar.innerHTML = "";

    // Render from TOP to BOTTOM (reverse order)
    [...state.elements].reverse().forEach((el, visualIndex) => {
        const realIndex = state.elements.length - 1 - visualIndex;

        const li = document.createElement("li");
        li.className = `
            flex items-center justify-between gap-2
            p-2 border cursor-pointer
            ${el.id === state.selectedId ? "bg-blue-600 text-white" : ""}
        `;

        // Label
        const label = document.createElement("span");
        label.textContent = `${el.type} (${el.id})`;
        label.onclick = () => selectElement(el.id);

        // Controls
        const controls = document.createElement("div");
        controls.className = "flex gap-1";

        const upBtn = document.createElement("button");
        upBtn.textContent = "▲";
        upBtn.onclick = (e) => {
            e.stopPropagation();
            moveLayerUp(realIndex);
        };

        const downBtn = document.createElement("button");
        downBtn.textContent = "▼";
        downBtn.onclick = (e) => {
            e.stopPropagation();
            moveLayerDown(realIndex);
        };

        controls.appendChild(upBtn);
        controls.appendChild(downBtn);

        li.appendChild(label);
        li.appendChild(controls);

        sidebar.appendChild(li);
    });
}
function moveLayerUp(index) {
    if (index >= state.elements.length - 1) return;

    pushHistory();

    const temp = state.elements[index];
    state.elements[index] = state.elements[index + 1];
    state.elements[index + 1] = temp;

    normalizeZIndex();
    saveState();
    render();
}

function moveLayerDown(index) {
    if (index <= 0) return;

    pushHistory();

    const temp = state.elements[index];
    state.elements[index] = state.elements[index - 1];
    state.elements[index - 1] = temp;

    normalizeZIndex();
    saveState();
    render();
}
function getSelected() {
    return state.elements.find(el => el.id === state.selectedId);
}

// Show/hide and update the text edit section in the sidebar based on selection
function updateTextEditSection() {
    const el = getSelected();
    const textSection = document.getElementById('text-edit-section');
    const textcolorSection = document.getElementById('text-color-section');

    if (!textSection) return;


    if (el && el.type === 'text') {
        textSection.style.display = '';
        textcolorSection.style.display = ''
        // Also update the input's value to match state
        const input = textSection.querySelector('#sidebar-text-content');
        if (input) input.value = el.text;
    } else {
        textSection.style.display = 'none';
        textcolorSection.style.display = 'none';

    }
}

const _orig_updateSidebar = updateSidebar;
updateSidebar = function () {
    _orig_updateSidebar();
    updateTextEditSection();
};
const _orig_updatePropertiesSidebar = updatePropertiesSidebar;
updatePropertiesSidebar = function () {
    _orig_updatePropertiesSidebar();
    updateTextEditSection();
};


function updatePropertiesSidebar() {
    const el = getSelected();
    if (!el) return;
    const rotateInput = document.getElementById("sidebar-rotate");
    const bgcolor = document.getElementById("sidebar-bgcolor");
    const bgcolorvalue = document.getElementById("sidebar-color-value");
    const text = document.getElementById("sidebar-text-content");
    const textcolor = document.getElementById('sidebar-text-color')
    const fontSizeInput = document.getElementById("sidebar-font-size");
    const bordercolorvalue = document.getElementById('sidebar-border-color-value')
    if (el.type === "text" && fontSizeInput) {
        fontSizeInput.value = el.fontSize || 16;
    }
    const radiusInput = document.getElementById("sidebar-border-radius");
    const radiusSection = document.getElementById("border-radius-section");
    const divproperties = document.getElementById('divproperties')

    if (radiusSection && radiusInput) {
        if (el.type !== "text") {
            radiusSection.style.display = "";
            radiusInput.value = el.borderRadius || 0;
        } else {
            radiusSection.style.display = "none";
        }
    }

    if (rotateInput) rotateInput.value = el.rotation || 0;
    if (bgcolorvalue) bgcolorvalue.textContent = el.background;
    if (bgcolor && el.type !== "text") bgcolor.value = el.background;
    if (bordercolorvalue) bordercolorvalue.textContent = el.borderColor
    if (text && el.type === "text") textcolor.value = el.color;
    if (text && el.type === "text") text.value = el.text;
    if (widthInput) {
        widthInput.value = el.width;
        divproperties.style.display = ''
    }
    if (heightInput) heightInput.value = el.height;
}
function normalizeZIndex() {
    state.elements.forEach((el, index) => {
        el.zIndex = index + 1;
    });
}


widthInput.addEventListener('input', function (e) {
    const el = getSelected();
    if (!el) return;
    pushHistory();
    el.width = Number(e.target.value);
    saveState();
    render();
    updatePropertiesSidebar();
});
heightInput.addEventListener('input', function (e) {
    const el = getSelected();
    if (!el) return;
    pushHistory();
    el.height = Number(e.target.value);
    saveState();
    render();
    updatePropertiesSidebar();
})


function updateSidebarColorValue(val) {
    const colorValueEl = document.getElementById("sidebar-color-value");
    if (colorValueEl) colorValueEl.textContent = val || 'none';
}

const sidebarBgColorInput = document.getElementById("sidebar-bgcolor");
if (sidebarBgColorInput) {
    sidebarBgColorInput.addEventListener("input", e => {
        const el = getSelected();
        if (!el) return;
        pushHistory();
        el.background = e.target.value;
        saveState();
        render();
        updateSidebarColorValue(e.target.value);
    });
}

const sidebarBgColorNoneBtn = document.getElementById("sidebar-bgcolor-none");
if (sidebarBgColorNoneBtn) {
    sidebarBgColorNoneBtn.addEventListener("click", () => {
        const el = getSelected();
        if (!el) return;
        pushHistory();
        el.background = "transparent";
        saveState();
        render();
        if (sidebarBgColorInput) sidebarBgColorInput.value = "#ffffff"; // fallback, so browser doesn't reset
        updateSidebarColorValue('none');
    });
}
const sidebarBorderColorInput = document.getElementById("sidebar-border-color");
const sidebordercolorvalue = document.getElementById('sidebar-border-color-value')

if (sidebarBorderColorInput) {
    sidebarBorderColorInput.addEventListener("input", e => {
        const el = getSelected();
        if (!el) return;
        pushHistory();
        el.borderColor = e.target.value;
        saveState();
        render();
    });
}

const sidebarBorderColorNoneBtn = document.getElementById("sidebar-border-color-none");
if (sidebarBorderColorNoneBtn) {
    sidebarBorderColorNoneBtn.addEventListener("click", () => {
        const el = getSelected();
        if (!el) return;
        pushHistory();
        if (el.type == 'text') {
            el.borderColor = "transparent";
        } else {
            el.borderColor = "transparent";
        }
        saveState();
        render();
        if (sidebarBorderColorInput) sidebarBorderColorInput.value = "#000000"; // fallback, so browser doesn't reset input to nothing
    });
}

(function patchBorderColorUpdate() {
    const _orig_updatePropertiesSidebar = updatePropertiesSidebar;
    updatePropertiesSidebar = function () {
        _orig_updatePropertiesSidebar.apply(this, arguments);
        const el = getSelected();
        if (el && sidebarBorderColorInput) {
            sidebarBorderColorInput.value = el.borderColor || "#000000";
            sidebordercolorvalue.textContent = el.borderColor || "#000000";
        }
    };
})();

const _orig_render_forBorder = render;
render = function () {
    _orig_render_forBorder.apply(this, arguments);
    state.elements.forEach(el => {
        if (typeof el.borderColor !== "undefined") {
            const node = document.querySelector(`.editor-element[data-id="${el.id}"]`);
            if (node) {
                node.style.borderColor = el.borderColor;
                if (!node.style.borderStyle) node.style.borderStyle = "solid";
                if (!node.style.borderWidth) node.style.borderWidth = "2px";
            }
        }
        if (el.background === "transparent") {
            const node = document.querySelector(`.editor-element[data-id="${el.id}"]`);
            if (node) node.style.background = "transparent";
        }
    });
};

const sidebarTextColorInput = document.getElementById("sidebar-text-color");
if (sidebarTextColorInput) {
    sidebarTextColorInput.addEventListener("input", e => {
        const el = getSelected();
        if (!el || el.type !== "text") return;
        pushHistory();
        el.color = e.target.value;
        saveState();
        render();
    });
}

(function patchTextColorUpdate() {
    const _orig_updatePropertiesSidebar = updatePropertiesSidebar;
    updatePropertiesSidebar = function () {
        _orig_updatePropertiesSidebar.apply(this, arguments);
        const el = getSelected();
        if (el && el.type === "text" && sidebarTextColorInput) {
            sidebarTextColorInput.value = el.color || "#ffffff";
        }
    };
})();
const _orig_render = render;
render = function () {
    _orig_render.apply(this, arguments);
    state.elements.forEach(el => {
        if (el.type === "text" && el.color) {
            const node = document.querySelector(`.editor-element[data-id="${el.id}"]`);
            if (node) node.style.color = el.color;
        }
        // Handle transparent background (if user set background to "transparent")
        if (el.background === "transparent") {
            const node = document.querySelector(`.editor-element[data-id="${el.id}"]`);
            if (node) node.style.background = "transparent";
        }
    });
};
document.getElementById("sidebar-text-content")?.addEventListener("input", e => {
    const el = getSelected();
    if (!el || el.type !== "text") return;
    pushHistory();
    el.text = e.target.value;
    saveState();
    render();
});
document.getElementById("sidebar-rotate")?.addEventListener("input", e => {
    const el = getSelected();
    if (!el) return;
    pushHistory();
    el.rotation = Number(e.target.value) || 0;
    saveState();
    render();
});
const KEYBOARD_MOVE_STEP = 5;

document.addEventListener("keydown", function (e) {
    if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" ||
            document.activeElement.tagName === "TEXTAREA" ||
            document.activeElement.isContentEditable)
    ) return;

    // Ctrl+Z = Undo
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
    }
    // Ctrl+Y = Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
    }

    const el = getSelected();
    if (!el) return;

    const canvasRect = myCanvas.getBoundingClientRect();
    let moved = false;

    switch (e.key) {
        case "Delete":
            deleteSelected();
            return;

        case "ArrowUp":
            el.y = clamp(
                el.y - KEYBOARD_MOVE_STEP,
                0,
                canvasRect.height - el.height
            );
            moved = true;
            break;

        case "ArrowDown":
            el.y = clamp(
                el.y + KEYBOARD_MOVE_STEP,
                0,
                canvasRect.height - el.height
            );
            moved = true;
            break;

        case "ArrowLeft":
            el.x = clamp(
                el.x - KEYBOARD_MOVE_STEP,
                0,
                canvasRect.width - el.width
            );
            moved = true;
            break;

        case "ArrowRight":
            el.x = clamp(
                el.x + KEYBOARD_MOVE_STEP,
                0,
                canvasRect.width - el.width
            );
            moved = true;
            break;

    }

    if (moved) {
        e.preventDefault();
        pushHistory();
        saveState();
        render();
    }
});

undoBtn?.addEventListener("click", undo);
redoBtn?.addEventListener("click", redo);


document.getElementById("sidebar-border-radius")?.addEventListener("input", e => {
    const el = getSelected();
    if (!el || el.type === "text") return;

    pushHistory();
    el.borderRadius = Math.max(0, Number(e.target.value) || 0);
    saveState();
    render();
});

document.getElementById("sidebar-font-size")?.addEventListener("input", e => {
    const el = getSelected();
    if (!el || el.type !== "text") return;

    pushHistory();
    el.fontSize = Math.max(8, Number(e.target.value) || 16);
    saveState();
    render();
});

window.addEventListener("keydown", e => {
    if (e.key === "Control") {
        myCanvas.style.cursor = "pointer";
    }
});

window.addEventListener("keyup", e => {
    if (e.key === "Control") {
        myCanvas.style.cursor = "default";
        isPanning = false;
    }
});

myCanvas.addEventListener("mousedown", e => {
    if (e.key === "Control" || e.button === 1 || e.ctrlKey) {
        isPanning = true;
        panStart.x = e.clientX - viewport.x;
        panStart.y = e.clientY - viewport.y;
        e.preventDefault();
    }
});

window.addEventListener("mousemove", e => {
    if (!isPanning) return;

    // Get canvas viewport boundaries
    const canvasContainer = document.getElementById('canvasViewport');

    // Calculate new viewport.x and viewport.y
    let newX = e.clientX - panStart.x;
    let newY = e.clientY - panStart.y;
    const maxPanX = 0;
    const minPanX = -(myCanvas.offsetWidth * viewport.scale - canvasContainer.offsetWidth);
    if (myCanvas.offsetWidth * viewport.scale > canvasContainer.offsetWidth) {
        newX = Math.min(maxPanX, Math.max(newX, minPanX));
    } else {
        newX = 0;
    }

    const maxPanY = 0;
    const minPanY = -(myCanvas.offsetHeight * viewport.scale - canvasContainer.offsetHeight);
    if (myCanvas.offsetHeight * viewport.scale > canvasContainer.offsetHeight) {
        newY = Math.min(maxPanY, Math.max(newY, minPanY));
    } else {
        newY = 0;
    }

    viewport.x = newX;
    viewport.y = newY;
    render();
});

window.addEventListener("mouseup", () => {
    isPanning = false;
});
myCanvas.addEventListener("wheel", e => {
    e.preventDefault();

    const minScale = 0.8;
    const maxScale = 2.5;
    const zoomFactor = 0.08; // Less than 0.1 for finer control
    let sensitivity = zoomFactor;
    if (e.ctrlKey) sensitivity = zoomFactor * 2;

    const scaleDirection = e.deltaY < 0 ? 1 : -1;
    let newScale = viewport.scale + scaleDirection * sensitivity;

    // Clamp so can't zoom in/out too much
    newScale = clamp(newScale, minScale, maxScale);

    const rect = myCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    viewport.x -= mouseX * (newScale - viewport.scale);
    viewport.y -= mouseY * (newScale - viewport.scale);

    viewport.scale = newScale;
    render();
}, { passive: false });

window.addEventListener("DOMContentLoaded", () => {
    loadState();
    setupCanvasSize();
    centerCanvas();
    normalizeZIndex();
    render();
});

function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
function exportAsJSON() {
    const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        canvas: {
            width: myCanvas.clientWidth,
            height: myCanvas.clientHeight
        },
        elements: state.elements
    };

    const json = JSON.stringify(exportData, null, 2);
    downloadFile("design.json", json, "application/json");
}
function exportAsHTML() {
    const canvasWidth = myCanvas.clientWidth;
    const canvasHeight = myCanvas.clientHeight;

    const elementsHTML = state.elements.map(el => {
        // Basic style properties with safeguards/defaults for missing values
        const x = typeof el.x === 'number' ? el.x : 0;
        const y = typeof el.y === 'number' ? el.y : 0;
        const width = typeof el.width === 'number' ? el.width : 100;
        const height = typeof el.height === 'number' ? el.height : 100;
        const background = el.background || "transparent";
        const borderColor = el.borderColor || "transparent";
        const zIndex = typeof el.zIndex === 'number' ? el.zIndex : 1;
        const rotation = typeof el.rotation === 'number' ? el.rotation : 0;
        const borderRadius = typeof el.borderRadius === 'number' ? `${el.borderRadius}px` : "0px";

        const baseStyles = [
            `position: absolute`,
            `left: ${x}px`,
            `top: ${y}px`,
            `width: ${width}px`,
            `height: ${height}px`,
            `background: ${background}`,
            `border: 2px solid ${borderColor}`,
            `z-index: ${zIndex}`,
            `transform: rotate(${rotation}deg)`,
            `transform-origin: center center`,
            `box-sizing: border-box`,
            `border-radius: ${borderRadius}`
        ].join("; ");

        if (el.type === "text") {
            // Text element: handle font size, color, bold, font family, letter spacing (if available)
            const fontSize = typeof el.fontSize === 'number' ? el.fontSize + "px" : "18px";
            const color = el.color || "#fff";
            const fontWeight = el.fontWeight || "bold";
            const fontFamily = el.fontFamily || "sans-serif";
            const letterSpacing = typeof el.letterSpacing === 'number' ? `${el.letterSpacing}px` : "normal";
            // Padding for aesthetics
            const padding = typeof el.padding === 'number' ? `${el.padding}px` : "4px 8px";

            return `
                <div style="${baseStyles};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: ${fontWeight};
                    color: ${color};
                    font-size: ${fontSize};
                    font-family: ${fontFamily};
                    letter-spacing: ${letterSpacing};
                    padding: ${padding};
                    text-align: center;
                    word-break: break-word;
                    overflow: hidden;
                ">
                    ${el.text ?? ""}
                </div>
            `;
        }

        // Rectangle or other supported shapes
        return `<div style="${baseStyles}"></div>`;
    }).join("\n");

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Exported Design</title>
</head>
<body style="margin:0; padding:0;">
    <div style="
        position: relative;
        width: ${canvasWidth}px;
        height: ${canvasHeight}px;
        background: #f0f0f0;
        overflow: hidden;
    ">
        ${elementsHTML}
    </div>
</body>
</html>
    `.trim();

    downloadFile("design.html", html, "text/html");
}
document.getElementById("exportJsonBtn")?.addEventListener("click", exportAsJSON);
document.getElementById("exportHtmlBtn")?.addEventListener("click", exportAsHTML);


const feature = document.getElementById('feature')
const closebtn = document.getElementById('feaclosebtn')
const featurebtn = document.getElementById('featurebtn')
closebtn.addEventListener('click', () => {
    feature.classList.add('hidden')

})
featurebtn.addEventListener('click', () => {
    feature.classList.remove('hidden')
})