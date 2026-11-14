/**
 * Comparador de Vídeo S2 — interface do node (ComfyUI).
 *
 * Porte do Comparador_De_Video_S2.html: dois vídeos sobrepostos, divisor
 * arrastável estilo antes/depois, play/pause e barra de progresso sincronizados,
 * mute de A, de B e de tudo. Os vídeos vêm das entradas VIDEO do node (via
 * /view) ou de arquivos soltos/escolhidos aqui mesmo (blob local, sem upload).
 */
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_CLASS = "ComparadorVideoS2";
const STYLE_ID = "cvs2-style";
const MIN_HEIGHT = 280;

/* ---------------------------------------------------------------- estilo */

const CSS = `
.cvs2, .cvs2 * { box-sizing: border-box; }
.cvs2 {
  --ink: #ededf0;
  --ink-dim: #8c8c96;
  --border: #242229;
  --btn-bg: #16151a;
  --btn-bg-hover: #1d1c22;
  --accent-a: #ff9d5c;
  --accent-b: #3fd3cf;
  position: relative;
  width: 100%;
  height: 100%;
  min-height: ${MIN_HEIGHT}px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px;
  overflow: hidden;
  border-radius: 10px;
  background: radial-gradient(ellipse at top, #131318, #08080a 65%);
  color: var(--ink);
  font-family: "Segoe UI Variable Text", "Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.25;
  text-align: left;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}
.cvs2:fullscreen { padding: 24px; gap: 18px; border-radius: 0; }
.cvs2 button { font: inherit; margin: 0; }
.cvs2 button:focus-visible,
.cvs2 input[type=range]:focus-visible { outline: 2px solid var(--ink-dim); outline-offset: 2px; }

.cvs2 .cvs2-area {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cvs2 .cvs2-stage {
  position: relative;
  flex: none;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.55);
  touch-action: none;
}
.cvs2 .cvs2-stage.ready { cursor: ew-resize; }

.cvs2 .cvs2-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: contain;
  display: block;
  background: #000;
  pointer-events: none;
}
.cvs2 .cvs2-layer.cvs2-b { clip-path: inset(0 0 0 50%); }

.cvs2 .cvs2-divider {
  position: absolute;
  top: 0; bottom: 0;
  left: 50%;
  width: 2px;
  background: var(--ink);
  box-shadow: 0 0 14px rgba(237, 237, 240, 0.4);
  cursor: ew-resize;
  z-index: 5;
  transform: translateX(-1px);
  display: none;
}
.cvs2 .cvs2-stage.ready .cvs2-divider { display: block; }
.cvs2 .cvs2-handle {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 40px; height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, var(--accent-a) 50%, var(--accent-b) 50%);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5);
}
.cvs2 .cvs2-handle svg { width: 18px; height: 18px; color: #0b0b0e; }

.cvs2 .cvs2-tag {
  position: absolute;
  top: 14px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 20px;
  background: rgba(10, 10, 14, 0.7);
  backdrop-filter: blur(6px);
  border: 1px solid var(--border);
  z-index: 4;
  pointer-events: none;
}
.cvs2 .cvs2-tag.a { left: 14px; border-color: var(--accent-a); color: var(--accent-a); }
.cvs2 .cvs2-tag.b { right: 14px; border-color: var(--accent-b); color: var(--accent-b); }

.cvs2 .cvs2-drop {
  position: absolute;
  top: 0; bottom: 0;
  width: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #121116;
  border: 1px dashed var(--border);
  color: var(--ink-dim);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  z-index: 6;
  text-align: center;
  padding: 20px;
}
.cvs2 .cvs2-drop.left { left: 0; }
.cvs2 .cvs2-drop.right { left: 50%; }
.cvs2 .cvs2-drop.hidden { display: none; }
.cvs2 .cvs2-drop:hover, .cvs2 .cvs2-drop.dragover { background: #17161c; }
.cvs2 .cvs2-drop.left:hover, .cvs2 .cvs2-drop.left.dragover { border-color: var(--accent-a); }
.cvs2 .cvs2-drop.right:hover, .cvs2 .cvs2-drop.right.dragover { border-color: var(--accent-b); }
.cvs2 .cvs2-drop svg { width: 26px; height: 26px; opacity: 0.6; }
.cvs2 .cvs2-dz-label { font-weight: 700; font-size: 14px; }
.cvs2 .cvs2-drop.left .cvs2-dz-label { color: var(--accent-a); }
.cvs2 .cvs2-drop.right .cvs2-dz-label { color: var(--accent-b); }
.cvs2 .cvs2-dz-sub { font-size: 12.5px; }
.cvs2 .cvs2-drop input[type=file] { display: none; }

.cvs2 .cvs2-swap {
  position: absolute;
  bottom: 14px;
  z-index: 4;
  display: none;
  background: rgba(10, 10, 14, 0.7);
  border: 1px solid var(--border);
  color: var(--ink-dim);
  font-size: 11.5px;
  padding: 5px 11px;
  border-radius: 20px;
  cursor: pointer;
  backdrop-filter: blur(6px);
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, border-color 0.15s;
}
.cvs2 .cvs2-stage:hover .cvs2-swap { opacity: 1; }
.cvs2 .cvs2-swap:hover { color: var(--ink); border-color: #3a3940; }
.cvs2 .cvs2-swap.a { left: 14px; }
.cvs2 .cvs2-swap.b { right: 14px; }
.cvs2 .cvs2-stage.has-a .cvs2-swap.a,
.cvs2 .cvs2-stage.has-b .cvs2-swap.b { display: block; }

.cvs2 .cvs2-msg {
  position: absolute;
  top: 14px; left: 50%;
  transform: translateX(-50%);
  max-width: 56%;
  padding: 5px 12px;
  border-radius: 14px;
  background: rgba(10, 10, 14, 0.9);
  border: 1px solid #6a3636;
  color: #ffb4b4;
  font-size: 12px;
  text-align: center;
  z-index: 8;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
}
.cvs2 .cvs2-msg.show { opacity: 1; }

.cvs2 .cvs2-controls {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px 14px;
  flex-wrap: wrap;
}
.cvs2 .cvs2-icon-btn {
  width: 38px; height: 38px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--btn-bg);
  color: var(--ink);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.15s, transform 0.1s, background 0.15s;
}
.cvs2 .cvs2-icon-btn:hover { border-color: #3a3940; background: var(--btn-bg-hover); }
.cvs2 .cvs2-icon-btn:active { transform: scale(0.94); }
.cvs2 .cvs2-icon-btn.active { border-color: var(--ink); }
.cvs2 .cvs2-icon-btn svg { width: 17px; height: 17px; }
.cvs2 .cvs2-icon-btn.cvs2-sm { width: 34px; height: 34px; }
.cvs2 .cvs2-icon-btn.cvs2-sm svg { width: 16px; height: 16px; }

.cvs2 .cvs2-seek-row {
  flex: 1 1 200px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 160px;
}
.cvs2 .cvs2-time {
  font-variant-numeric: tabular-nums;
  font-size: 12.8px;
  color: var(--ink-dim);
  white-space: nowrap;
}
.cvs2 input[type=range] {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  min-width: 0;
  height: 18px;
  margin: 0;
  padding: 0;
  border-radius: 2px;
  background: linear-gradient(var(--border), var(--border)) center / 100% 4px no-repeat;
  outline: none;
  cursor: pointer;
}
.cvs2 input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--ink);
  cursor: pointer;
  box-shadow: 0 0 0 4px rgba(237, 237, 240, 0.15);
}
.cvs2 input[type=range]::-moz-range-thumb {
  width: 14px; height: 14px;
  border: none;
  border-radius: 50%;
  background: var(--ink);
  cursor: pointer;
  box-shadow: 0 0 0 4px rgba(237, 237, 240, 0.15);
}

.cvs2 .cvs2-mute-group, .cvs2 .cvs2-tools { display: flex; gap: 8px; flex-shrink: 0; }
.cvs2 .cvs2-mute-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--btn-bg);
  color: var(--ink-dim);
  font-size: 12.8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, border-color 0.15s, color 0.15s;
}
.cvs2 .cvs2-mute-btn svg { width: 15px; height: 15px; flex-shrink: 0; }
.cvs2 .cvs2-mute-btn:hover { border-color: #3a3940; }
.cvs2 .cvs2-mute-btn.muted { opacity: 0.45; }
.cvs2 .cvs2-mute-btn.side-a:not(.muted) { border-color: var(--accent-a); color: var(--accent-a); }
.cvs2 .cvs2-mute-btn.side-b:not(.muted) { border-color: var(--accent-b); color: var(--accent-b); }
.cvs2 .cvs2-mute-btn.side-all:not(.muted) { border-color: #3a3940; color: var(--ink); }
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/* ---------------------------------------------------------------- ícones */

const ICON = {
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
  volOn:
    '<path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M16 8.5a4 4 0 010 7" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M18.6 6a7.5 7.5 0 010 12" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.6"/>',
  volOff:
    '<path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  expand:
    '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  collapse:
    '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
};

const SVG_UPLOAD =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 16V4M12 4l-4 4M12 4l4 4"/><path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3"/></svg>';
const SVG_HANDLE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/></svg>';
const STROKE_ICON_ATTRS =
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const SVG_LOOP = `<svg viewBox="0 0 24 24" ${STROKE_ICON_ATTRS}><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>`;

/* --------------------------------------------------------------- helpers */

function fmtTime(t) {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

const VIDEO_EXT = /\.(mp4|m4v|webm|mov|mkv|ogv|avi)$/i;
function isVideoFile(file) {
  return !!file && ((file.type || "").startsWith("video/") || VIDEO_EXT.test(file.name || ""));
}

function playSafe(video) {
  try {
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch (_) {
    /* sem fonte carregada */
  }
}

/* ---------------------------------------------------------------- viewer */

class ComparadorViewer {
  constructor({ getAutoplay = () => false, onLoopChange = () => {} } = {}) {
    this.getAutoplay = getAutoplay;
    this.onLoopChange = onLoopChange;

    this.loaded = { A: false, B: false };
    this.blobUrls = { A: null, B: null };
    this.divider = 50;
    this.duration = 0;
    this.ar = 16 / 9;
    this.dragging = false;
    this.isSeeking = false;
    this.wasPlaying = false;
    this.pendingAutoplay = false;
    this.loop = false;
    this.raf = 0;
    this.toastTimer = 0;
    this.cleanups = [];

    this._build();
    this._bind();
    this.setDivider(50);
    this._refreshMuteUI();
    this._setPlayIcon(false);
    this._fit();
  }

  /* ------------------------------------------------------------- DOM */

  _build() {
    const root = document.createElement("div");
    root.className = "cvs2";
    root.tabIndex = 0;
    root.innerHTML = `
      <div class="cvs2-area">
        <div class="cvs2-stage">
          <video class="cvs2-layer cvs2-a" playsinline preload="auto"></video>
          <video class="cvs2-layer cvs2-b" playsinline preload="auto"></video>

          <div class="cvs2-drop left" data-side="A">
            ${SVG_UPLOAD}
            <div class="cvs2-dz-label">Vídeo A</div>
            <div class="cvs2-dz-sub">Clique ou arraste o arquivo</div>
            <input type="file" accept="video/*">
          </div>
          <div class="cvs2-drop right" data-side="B">
            ${SVG_UPLOAD}
            <div class="cvs2-dz-label">Vídeo B</div>
            <div class="cvs2-dz-sub">Clique ou arraste o arquivo</div>
            <input type="file" accept="video/*">
          </div>

          <div class="cvs2-tag a">A</div>
          <div class="cvs2-tag b">B</div>

          <div class="cvs2-divider" title="Arraste para comparar">
            <div class="cvs2-handle">${SVG_HANDLE}</div>
          </div>

          <button type="button" class="cvs2-swap a" data-side="A">Trocar A</button>
          <button type="button" class="cvs2-swap b" data-side="B">Trocar B</button>
          <div class="cvs2-msg"></div>
        </div>
      </div>

      <div class="cvs2-controls">
        <button type="button" class="cvs2-icon-btn cvs2-play" title="Reproduzir ou pausar (barra de espaço)">
          <svg viewBox="0 0 24 24" fill="currentColor"></svg>
        </button>
        <div class="cvs2-seek-row">
          <span class="cvs2-time cvs2-cur">00:00</span>
          <input class="cvs2-seek" type="range" min="0" max="100" value="0" step="0.1">
          <span class="cvs2-time cvs2-tot">00:00</span>
        </div>
        <div class="cvs2-mute-group">
          <button type="button" class="cvs2-mute-btn side-a" data-mute="A" title="Silenciar vídeo A">
            <svg viewBox="0 0 24 24" fill="currentColor"></svg><span>A</span>
          </button>
          <button type="button" class="cvs2-mute-btn side-b" data-mute="B" title="Silenciar vídeo B">
            <svg viewBox="0 0 24 24" fill="currentColor"></svg><span>B</span>
          </button>
          <button type="button" class="cvs2-mute-btn side-all" data-mute="ALL" title="Silenciar os dois vídeos">
            <svg viewBox="0 0 24 24" fill="currentColor"></svg><span>Tudo</span>
          </button>
        </div>
        <div class="cvs2-tools">
          <button type="button" class="cvs2-icon-btn cvs2-sm cvs2-loop" title="Repetir em loop">${SVG_LOOP}</button>
          <button type="button" class="cvs2-icon-btn cvs2-sm cvs2-fs" title="Tela cheia">
            <svg viewBox="0 0 24 24" ${STROKE_ICON_ATTRS}></svg>
          </button>
        </div>
      </div>`;

    const q = (sel) => root.querySelector(sel);
    this.root = root;
    this.area = q(".cvs2-area");
    this.stage = q(".cvs2-stage");
    this.vA = q("video.cvs2-a");
    this.vB = q("video.cvs2-b");
    this.dropA = q('.cvs2-drop[data-side="A"]');
    this.dropB = q('.cvs2-drop[data-side="B"]');
    this.dividerEl = q(".cvs2-divider");
    this.msg = q(".cvs2-msg");
    this.playBtn = q(".cvs2-play");
    this.playIcon = this.playBtn.querySelector("svg");
    this.seek = q(".cvs2-seek");
    this.timeCur = q(".cvs2-cur");
    this.timeTot = q(".cvs2-tot");
    this.muteA = q('[data-mute="A"]');
    this.muteB = q('[data-mute="B"]');
    this.muteAll = q('[data-mute="ALL"]');
    this.loopBtn = q(".cvs2-loop");
    this.fsBtn = q(".cvs2-fs");
    this.fsIcon = this.fsBtn.querySelector("svg");
    this._setFsIcon(false);
  }

  _on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this.cleanups.push(() => target.removeEventListener(type, handler, options));
  }

  _bind() {
    const { vA, vB, stage, root } = this;

    // Escolher arquivo: clique na zona, ou no "Trocar A/B"
    for (const zone of [this.dropA, this.dropB]) {
      const side = zone.dataset.side;
      const input = zone.querySelector("input");
      this._on(zone, "click", () => input.click());
      this._on(input, "click", (e) => e.stopPropagation());
      this._on(input, "change", (e) => {
        this._loadFile(side, e.target.files[0]);
        e.target.value = "";
      });
    }
    for (const btn of stage.querySelectorAll(".cvs2-swap")) {
      this._on(btn, "click", (e) => {
        e.stopPropagation();
        const zone = btn.dataset.side === "A" ? this.dropA : this.dropB;
        zone.querySelector("input").click();
      });
    }

    // Arrastar arquivos para cima do palco
    this._on(stage, "dragover", (e) => this._onDragOver(e));
    this._on(stage, "dragleave", () => this._clearDragover());
    this._on(stage, "drop", (e) => this._onDrop(e));

    // Divisor: clicar ou arrastar em qualquer ponto do palco
    this._on(stage, "pointerdown", (e) => {
      if (!(this.loaded.A && this.loaded.B)) return;
      if (e.button !== 0 || e.target.closest(".cvs2-swap")) return;
      this.dragging = true;
      try {
        stage.setPointerCapture(e.pointerId);
      } catch (_) {
        /* pointer já inativo */
      }
      this.setDivider(this._percentAt(e.clientX));
      root.focus({ preventScroll: true });
    });
    this._on(stage, "pointermove", (e) => {
      if (this.dragging) this.setDivider(this._percentAt(e.clientX));
    });
    const stopDrag = () => {
      this.dragging = false;
    };
    this._on(stage, "pointerup", stopDrag);
    this._on(stage, "pointercancel", stopDrag);
    this._on(stage, "lostpointercapture", stopDrag);

    // Formato do palco e duração
    this._on(vA, "loadedmetadata", () => {
      this._fitStage(vA.videoWidth, vA.videoHeight);
      this._updateDuration();
      this._update();
    });
    this._on(vB, "loadedmetadata", () => {
      // Se o A ainda não definiu um formato, usa o do B (como no HTML).
      if (!vA.videoWidth || !vA.videoHeight) this._fitStage(vB.videoWidth, vB.videoHeight);
      this._updateDuration();
      this._update();
    });

    // Reprodução
    for (const v of [vA, vB]) {
      this._on(v, "play", () => {
        this._setPlayIcon(true);
        this._startLoop();
      });
      this._on(v, "pause", () => {
        this._setPlayIcon(this._isPlaying());
        this._update();
      });
      this._on(v, "seeked", () => this._update());
      this._on(v, "timeupdate", () => {
        if (!this.raf) this._update();
      });
      this._on(v, "loadeddata", () => this._maybeAutoplay());
      this._on(v, "error", () => this._onVideoError(v === vA ? "A" : "B"));
    }
    this._on(vA, "ended", () => this._onEnded("A"));
    this._on(vB, "ended", () => this._onEnded("B"));

    this._on(this.playBtn, "click", () => this.togglePlay());
    this._on(root, "keydown", (e) => {
      const tag = e.target.tagName;
      if (e.code === "Space" && tag !== "INPUT" && tag !== "BUTTON") {
        e.preventDefault();
        e.stopPropagation();
        this.togglePlay();
      }
    });

    // Barra de progresso: pausa ao segurar, move os dois, retoma ao soltar
    const endSeekOnWindow = () => {
      window.removeEventListener("pointerup", endSeekOnWindow);
      window.removeEventListener("pointercancel", endSeekOnWindow);
      this._endSeek();
    };
    this._on(this.seek, "pointerdown", () => {
      this._startSeek();
      window.addEventListener("pointerup", endSeekOnWindow);
      window.addEventListener("pointercancel", endSeekOnWindow);
    });
    this.cleanups.push(() => {
      window.removeEventListener("pointerup", endSeekOnWindow);
      window.removeEventListener("pointercancel", endSeekOnWindow);
    });
    this._on(this.seek, "input", () => {
      if (this.duration <= 0) return;
      const t = (this.seek.value / 100) * this.duration;
      vA.currentTime = t;
      vB.currentTime = t;
      this.timeCur.textContent = fmtTime(t);
    });
    this._on(this.seek, "change", () => this._endSeek());

    // Mute
    this._on(this.muteA, "click", () => {
      vA.muted = !vA.muted;
      this._refreshMuteUI();
    });
    this._on(this.muteB, "click", () => {
      vB.muted = !vB.muted;
      this._refreshMuteUI();
    });
    this._on(this.muteAll, "click", () => {
      const target = !(vA.muted && vB.muted);
      vA.muted = target;
      vB.muted = target;
      this._refreshMuteUI();
    });

    // Extras do node: loop e tela cheia
    this._on(this.loopBtn, "click", () => {
      this.setLoop(!this.loop);
      this.onLoopChange(this.loop);
    });
    this._on(this.fsBtn, "click", () => this.toggleFullscreen());
    this._on(document, "fullscreenchange", () => {
      this._setFsIcon(document.fullscreenElement === root);
      this._fit();
    });

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => this._fit());
      ro.observe(this.area);
      this.cleanups.push(() => ro.disconnect());
    }
  }

  /* ----------------------------------------------------------- layout */

  _fit() {
    const aw = this.area.clientWidth;
    const ah = this.area.clientHeight;
    if (!aw || !ah) return;
    let w = aw;
    let h = w / this.ar;
    if (h > ah) {
      h = ah;
      w = h * this.ar;
    }
    this.stage.style.width = Math.max(1, Math.floor(w)) + "px";
    this.stage.style.height = Math.max(1, Math.floor(h)) + "px";
  }

  _fitStage(w, h) {
    if (!w || !h) return;
    this.ar = w / h;
    this._fit();
  }

  _percentAt(clientX) {
    const rect = this.stage.getBoundingClientRect();
    if (!rect.width) return this.divider;
    return ((clientX - rect.left) / rect.width) * 100;
  }

  setDivider(percent) {
    percent = Math.min(100, Math.max(0, percent));
    this.divider = percent;
    this.dividerEl.style.left = percent + "%";
    this.vB.style.clipPath = "inset(0 0 0 " + percent + "%)";
  }

  _refreshReady() {
    this.stage.classList.toggle("has-a", this.loaded.A);
    this.stage.classList.toggle("has-b", this.loaded.B);
    this.stage.classList.toggle("ready", this.loaded.A && this.loaded.B);
  }

  /* ---------------------------------------------------------- fontes */

  _video(side) {
    return side === "A" ? this.vA : this.vB;
  }

  _setSource(side, url, isBlob) {
    const v = this._video(side);
    const drop = side === "A" ? this.dropA : this.dropB;
    const old = this.blobUrls[side];
    this.blobUrls[side] = isBlob ? url : null;
    v.src = url;
    v.load();
    if (old) URL.revokeObjectURL(old);
    this.loaded[side] = true;
    drop.classList.add("hidden");
    this._refreshReady();
  }

  _clearSource(side) {
    const v = this._video(side);
    const drop = side === "A" ? this.dropA : this.dropB;
    if (this.blobUrls[side]) URL.revokeObjectURL(this.blobUrls[side]);
    this.blobUrls[side] = null;
    v.removeAttribute("src");
    v.load();
    this.loaded[side] = false;
    drop.classList.remove("hidden");
    this._refreshReady();
    this._updateDuration();
    this._update();
  }

  _loadFile(side, file) {
    if (!isVideoFile(file)) return;
    this._hideToast();
    this._setSource(side, URL.createObjectURL(file), true);
  }

  /** Recebe o que o servidor preparou (entradas VIDEO do node). */
  setFromGraph(refA, refB) {
    let changed = false;
    for (const [side, ref] of [
      ["A", refA],
      ["B", refB],
    ]) {
      if (!ref) continue;
      if (ref.error) {
        this._toast(`Vídeo ${side}: ${ref.error}`);
        continue;
      }
      if (!ref.filename) continue;
      const qs = new URLSearchParams({
        filename: ref.filename,
        subfolder: ref.subfolder || "",
        type: ref.type || "temp",
      });
      this._setSource(side, api.apiURL("/view?" + qs.toString() + "&rand=" + Math.random()), false);
      changed = true;
    }
    if (!changed) return;
    this._hideToast();
    for (const v of [this.vA, this.vB]) {
      try {
        v.pause();
        if (v.readyState > 0) v.currentTime = 0;
      } catch (_) {
        /* ignora */
      }
    }
    this._setPlayIcon(false);
    this.pendingAutoplay = !!this.getAutoplay();
  }

  _onVideoError(side) {
    const v = this._video(side);
    if (!v.getAttribute("src")) return;
    this._clearSource(side);
    this._toast(`Vídeo ${side}: o navegador não conseguiu reproduzir este arquivo.`);
  }

  /* ----------------------------------------------------- arrastar/soltar */

  _isFileDrag(e) {
    return !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");
  }

  _sideAt(e) {
    const split = this.loaded.A && this.loaded.B ? this.divider : 50;
    return this._percentAt(e.clientX) < split ? "A" : "B";
  }

  _clearDragover() {
    this.dropA.classList.remove("dragover");
    this.dropB.classList.remove("dragover");
  }

  _onDragOver(e) {
    if (!this._isFileDrag(e)) return;
    const items = Array.from(e.dataTransfer.items || []);
    const maybeVideo =
      !items.length || items.some((i) => i.kind === "file" && (!i.type || i.type.startsWith("video/")));
    if (!maybeVideo) return; // deixa o ComfyUI tratar (imagem, workflow...)
    e.preventDefault();
    e.stopPropagation();
    const side = this._sideAt(e);
    this.dropA.classList.toggle("dragover", side === "A");
    this.dropB.classList.toggle("dragover", side === "B");
  }

  _onDrop(e) {
    this._clearDragover();
    if (!this._isFileDrag(e)) return;
    const files = Array.from(e.dataTransfer.files || []).filter(isVideoFile);
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();
    if (files.length >= 2) {
      this._loadFile("A", files[0]);
      this._loadFile("B", files[1]);
    } else {
      this._loadFile(this._sideAt(e), files[0]);
    }
  }

  /* ------------------------------------------------------- reprodução */

  _isPlaying() {
    return !this.vA.paused || !this.vB.paused;
  }

  _setPlayIcon(playing) {
    this.playIcon.innerHTML = playing ? ICON.pause : ICON.play;
  }

  togglePlay() {
    if (!this.loaded.A && !this.loaded.B) return;
    if (this._isPlaying()) {
      this.vA.pause();
      this.vB.pause();
    } else {
      if (this.loaded.A) playSafe(this.vA);
      if (this.loaded.B) playSafe(this.vB);
    }
  }

  _onEnded(which) {
    if (which === "A") this.vB.pause();
    if (!this.loop) return;
    if (which === "A" || !this.loaded.A) {
      for (const side of ["A", "B"]) {
        if (!this.loaded[side]) continue;
        const v = this._video(side);
        v.currentTime = 0;
        playSafe(v);
      }
    }
  }

  _maybeAutoplay() {
    if (!this.pendingAutoplay) return;
    const ready = (side) => !this.loaded[side] || this._video(side).readyState >= 2;
    if (!ready("A") || !ready("B")) return;
    this.pendingAutoplay = false;
    for (const side of ["A", "B"]) {
      if (this.loaded[side]) playSafe(this._video(side));
    }
  }

  _updateDuration() {
    const durs = [this.vA.duration, this.vB.duration].filter((d) => isFinite(d) && d > 0);
    this.duration = durs.length ? Math.max(...durs) : 0;
    this.timeTot.textContent = fmtTime(this.duration);
  }

  _update() {
    const { vA, vB } = this;
    if (!this.isSeeking) {
      const current = Math.max(vA.currentTime || 0, vB.currentTime || 0);
      if (this.duration > 0) this.seek.value = (current / this.duration) * 100;
      else this.seek.value = 0;
      this.timeCur.textContent = fmtTime(current);
    }
    // Mantém B colado no A enquanto os dois tocam.
    if (this.loaded.A && this.loaded.B && !vA.paused && !vB.paused) {
      if (Math.abs(vA.currentTime - vB.currentTime) > 0.15) vB.currentTime = vA.currentTime;
    }
  }

  _startLoop() {
    if (this.raf) return;
    const step = () => {
      this.raf = 0;
      if (!this.root.isConnected) return;
      this._update();
      if (this._isPlaying()) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  _startSeek() {
    this.isSeeking = true;
    this.wasPlaying = this._isPlaying();
    this.vA.pause();
    this.vB.pause();
  }

  _endSeek() {
    if (!this.isSeeking) return;
    this.isSeeking = false;
    if (this.wasPlaying) {
      if (this.loaded.A) playSafe(this.vA);
      if (this.loaded.B) playSafe(this.vB);
    }
    this.wasPlaying = false;
  }

  /* ------------------------------------------------------------ mute */

  _setMuteBtn(btn, muted) {
    btn.classList.toggle("muted", muted);
    btn.querySelector("svg").innerHTML = muted ? ICON.volOff : ICON.volOn;
  }

  _refreshMuteUI() {
    this._setMuteBtn(this.muteA, this.vA.muted);
    this._setMuteBtn(this.muteB, this.vB.muted);
    this._setMuteBtn(this.muteAll, this.vA.muted && this.vB.muted);
  }

  /* ---------------------------------------------------- loop / tela cheia */

  setLoop(value) {
    this.loop = !!value;
    this.loopBtn.classList.toggle("active", this.loop);
  }

  _setFsIcon(isFullscreen) {
    this.fsIcon.innerHTML = isFullscreen ? ICON.collapse : ICON.expand;
    this.fsBtn.title = isFullscreen ? "Sair da tela cheia" : "Tela cheia";
  }

  toggleFullscreen() {
    if (document.fullscreenElement === this.root) {
      document.exitFullscreen?.();
    } else if (this.root.requestFullscreen) {
      const p = this.root.requestFullscreen();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  }

  /* ----------------------------------------------------------- avisos */

  _toast(text) {
    this.msg.textContent = text;
    this.msg.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this._hideToast(), 5000);
  }

  _hideToast() {
    clearTimeout(this.toastTimer);
    this.msg.classList.remove("show");
  }

  /* ---------------------------------------------------------- limpeza */

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    clearTimeout(this.toastTimer);
    for (const off of this.cleanups.splice(0)) off();
    for (const side of ["A", "B"]) {
      const v = this._video(side);
      v.pause();
      v.removeAttribute("src");
      v.load();
      if (this.blobUrls[side]) URL.revokeObjectURL(this.blobUrls[side]);
      this.blobUrls[side] = null;
    }
    if (document.fullscreenElement === this.root) document.exitFullscreen?.();
  }
}

/* ------------------------------------------------------------ extensão */

injectStyle();

app.registerExtension({
  name: "Comparador.VideoS2",

  nodeCreated(node) {
    if (node.comfyClass !== NODE_CLASS) return;

    const viewer = new ComparadorViewer({
      getAutoplay: () => !!node.widgets?.find((w) => w.name === "autoplay")?.value,
      onLoopChange: (value) => {
        node.properties = node.properties || {};
        node.properties.cvs2_loop = value;
      },
    });
    viewer.setLoop(!!node.properties?.cvs2_loop);

    node.addDOMWidget("comparador", "comparador_video_s2", viewer.root, {
      serialize: false,
      hideOnZoom: false,
      getMinHeight: () => MIN_HEIGHT,
    });

    const w = Math.max(node.size?.[0] ?? 0, 640);
    const h = Math.max(node.size?.[1] ?? 0, 560);
    node.setSize([w, h]);

    // Ao abrir um workflow salvo, as propriedades chegam depois do nodeCreated.
    const onConfigure = node.onConfigure;
    node.onConfigure = function () {
      const r = onConfigure?.apply(this, arguments);
      viewer.setLoop(!!this.properties?.cvs2_loop);
      return r;
    };

    // Depois de executar, o servidor diz onde ficaram os vídeos ligados em A e B.
    const onExecuted = node.onExecuted;
    node.onExecuted = function (message) {
      const r = onExecuted?.apply(this, arguments);
      viewer.setFromGraph(message?.cvs2_a?.[0], message?.cvs2_b?.[0]);
      return r;
    };

    const onRemoved = node.onRemoved;
    node.onRemoved = function () {
      viewer.destroy();
      return onRemoved?.apply(this, arguments);
    };
  },
});
