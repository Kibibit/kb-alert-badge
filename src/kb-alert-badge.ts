import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant, LovelaceBadge } from "./ha-types";
import { subscribeRenderTemplate } from "./ha-types";
import type { KbAlertBadgeConfig } from "./kb-alert-badge-config";
import { version } from "../package.json";

type AnimationMode = NonNullable<KbAlertBadgeConfig["animation"]>;

@customElement("kb-alert-badge")
export class KbAlertBadge extends LitElement implements LovelaceBadge {
  public static async getConfigElement() {
    await import("./kb-alert-badge-editor");
    return document.createElement("kb-alert-badge-editor");
  }

  public static async getStubConfig(): Promise<KbAlertBadgeConfig> {
    return {
      type: "custom:kb-alert-badge",
      // No default entity so the preview can render standalone
      animation: "storm",
      color: "#04A9F4",
      icon: "mdi:alarm-light",
      label: "Alert",
      speed: 1000,
      show_icon: true,
      show_name: true,
      show_state: true,
      state_content: "text",
      state_text: "Active",
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: KbAlertBadgeConfig;
  @state() private _active = false;
  @state() private _stateDisplay?: string;

  // --- Storm (rain + lightning) runtime state ---
  private _stormRaf?: number;
  private _stormRainCanvas?: HTMLCanvasElement;
  private _stormRainCtx?: CanvasRenderingContext2D | null;
  private _stormResizeHandler?: () => void;
  private _stormDrops: Array<{
    x: number;
    y: number;
    width: number;
    length: number;
    opacity: number;
    speedX: number;
    speedY: number;
  }> = [];
  private _stormColor?: { r: number; g: number; b: number; a: number };

  setConfig(config: KbAlertBadgeConfig): void {
    this._config = {
      animation: "flashing",
      speed: 1000,
      show_icon: true,
      show_name: true,
      show_state: true,
      state_content: "state",
      ...config,
    };
  }

  protected willUpdate() {
    this._computeActive();
  }

  private _computeActive() {
    if (!this.hass || !this._config?.entity) {
      this._active = false;
      this._stateDisplay = undefined;
      return;
    }
    const st = this.hass.states[this._config.entity];
    const state = st?.state ?? "";
    const activeStates = ["on", "alarm", "problem", "triggered", "leak"];
    this._active = activeStates.includes(state);
    if (st) {
      // Prefer Home Assistant's localized formatting if available
      this._stateDisplay = this.hass?.formatEntityState
        ? this.hass.formatEntityState(st as any, state)
        : state;
    } else {
      this._stateDisplay = undefined;
    }
  }

  private _computePoliceColors(customRightColor?: string): { right: string; left: string } {
    // Defaults approximate the CodePen styling
    const defaultRight = "#66d2ff"; // blue side
    const defaultLeft = "#ff3c2d";  // red side
    if (!customRightColor) {
      return { right: defaultRight, left: defaultLeft };
    }
    const rgba = this._resolveCssColorToRgba(customRightColor);
    if (!rgba) {
      return { right: defaultRight, left: defaultLeft };
    }
    const { h, s, l, a } = this._rgbToHsl(rgba.r, rgba.g, rgba.b, rgba.a);
    const complementaryHue = (h + 180) % 360;
    const leftRgb = this._hslToRgb(complementaryHue, s, l, a);
    const rightCss = this._rgbaToCss(rgba.r, rgba.g, rgba.b, rgba.a);
    const leftCss = this._rgbaToCss(leftRgb.r, leftRgb.g, leftRgb.b, leftRgb.a);
    return { right: rightCss, left: leftCss };
  }

  private _resolveCssColorToRgba(input: string): { r: number; g: number; b: number; a: number } | undefined {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return undefined;
      context.fillStyle = input;
      const normalized = context.fillStyle as string;
      // normalized is typically in the form "#rrggbb" or "rgba(r,g,b,a)"
      if (normalized.startsWith("#")) {
        const hex = normalized.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return { r, g, b, a: 1 };
      }
      const rgbaMatch = normalized.match(/rgba?\(([^)]+)\)/i);
      if (rgbaMatch) {
        const parts = rgbaMatch[1].split(",").map((p) => p.trim());
        const r = parseFloat(parts[0]);
        const g = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
        return { r, g, b, a: isNaN(a) ? 1 : a };
      }
      return undefined;
    } catch (_e) {
      return undefined;
    }
  }

  private _rgbToHsl(r: number, g: number, b: number, a: number): { h: number; s: number; l: number; a: number } {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    let hue = 0;
    if (delta !== 0) {
      if (max === rn) hue = ((gn - bn) / delta) % 6;
      else if (max === gn) hue = (bn - rn) / delta + 2;
      else hue = (rn - gn) / delta + 4;
      hue *= 60;
      if (hue < 0) hue += 360;
    }
    const lightness = (max + min) / 2;
    const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
    return { h: hue, s: saturation, l: lightness, a };
  }

  private _hslToRgb(h: number, s: number, l: number, a: number): { r: number; g: number; b: number; a: number } {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rn = 0, gn = 0, bn = 0;
    if (0 <= h && h < 60) { rn = c; gn = x; bn = 0; }
    else if (60 <= h && h < 120) { rn = x; gn = c; bn = 0; }
    else if (120 <= h && h < 180) { rn = 0; gn = c; bn = x; }
    else if (180 <= h && h < 240) { rn = 0; gn = x; bn = c; }
    else if (240 <= h && h < 300) { rn = x; gn = 0; bn = c; }
    else { rn = c; gn = 0; bn = x; }
    const r = Math.round((rn + m) * 255);
    const g = Math.round((gn + m) * 255);
    const b = Math.round((bn + m) * 255);
    return { r, g, b, a };
  }

  private _rgbaToCss(r: number, g: number, b: number, a: number): string {
    if (a >= 1) {
      const toHex = (v: number) => v.toString(16).padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    const alpha = Math.max(0, Math.min(1, a));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  protected render() {
    if (!this._config) return nothing;
    const { icon, label, color, animation = "flashing", speed = 1000 } = this._config;
    const active = this._config.demo || this._active || !this._config.entity; // preview if no entity or demo

    const style: Record<string, string> = {};
    if (color) style["--kb-alert-color"] = color;
    style["--kb-alert-speed"] = `${speed}ms`;
    // Storm-specific color palette: default to white when no color is set
    if (animation === "storm") {
      style["--kb-storm-color"] = color || "#ffffff";
    }

    if (animation === "police") {
      const { right, left } = this._computePoliceColors(color);
      style["--kb-police-right"] = right;
      style["--kb-police-left"] = left;
    }

    const entityStateObj = this._config.entity
      ? this.hass?.states[this._config.entity]
      : undefined;

    // Resolve visibility toggles
    const showIcon = this._config.show_icon !== false;
    const showName = this._config.show_name !== false;
    const showState = this._config.show_state !== false;

    // Determine name/label line
    const friendlyName = entityStateObj?.attributes?.friendly_name as string | undefined;
    const nameText = showName ? (label || friendlyName || (!entityStateObj ? "Alert" : undefined)) : undefined;

    // Determine state/content line
    let contentText: string | undefined;
    if (showState) {
      const mode = this._config.state_content || "state";
      if (mode === "state") {
        // Fallback to a readable state when no entity is provided
        contentText = this._stateDisplay ?? (!entityStateObj ? (this._config.state_text || "Active") : undefined);
      } else if (mode === "name") {
        contentText = label || friendlyName;
      } else if (mode === "last_changed") {
        const lc = entityStateObj?.last_changed;
        if (lc) contentText = new Date(lc).toLocaleString();
      } else if (mode === "last_updated") {
        const lu = entityStateObj?.last_updated;
        if (lu) contentText = new Date(lu).toLocaleString();
      } else if (mode === "attribute") {
        const attr = this._config.state_attribute;
        const val = attr ? entityStateObj?.attributes?.[attr] : undefined;
        if (val !== undefined) contentText = typeof val === "object" ? JSON.stringify(val) : String(val);
      } else if (mode === "text") {
        contentText = this._config.state_text || "";
      }
    }

    return html`
      <div class=${`badge ${active ? `active ${animation}` : animation === "washing-machine" ? animation : ""}`}
           style=${Object.entries(style)
             .map(([k, v]) => `${k}: ${v}`)
             .join(";")}
           role="img"
           aria-label="Alert badge">
        ${active && animation === "police"
          ? html`<div class="kb-police" aria-hidden="true">
              <div class="segment red"><div class="inner"></div></div>
              <div class="segment blue"><div class="inner"></div></div>
            </div>`
          : nothing}
        ${active && animation === "water"
          ? html`<div class="kb-water" aria-hidden="true">
              <svg class="kb-water-wave w1" viewBox="0 0 120 20" preserveAspectRatio="none" focusable="false" aria-hidden="true">
                <path d="M0 10 Q 15 0 30 10 T 60 10 T 90 10 T 120 10 V 20 H 0 Z"></path>
              </svg>
              <svg class="kb-water-wave w2" viewBox="0 0 120 20" preserveAspectRatio="none" focusable="false" aria-hidden="true">
                <path d="M0 10 Q 15 0 30 10 T 60 10 T 90 10 T 120 10 V 20 H 0 Z"></path>
              </svg>
            </div>`
          : nothing}
        ${active && animation === "storm"
          ? html`<div class="kb-storm" aria-hidden="true">
              <canvas class="kb-storm-rain"></canvas>
              <div class="kb-storm-lightning"></div>
            </div>`
          : nothing}
        ${animation === "washing-machine"
          ? html`<div class="kb-wash" aria-hidden="true">
              <div class="kb-wash-drum">
                <div class="kb-wash-spinner"></div>
              </div>
            </div>`
          : showIcon
          ? html`<ha-state-icon
                .hass=${this.hass}
                .icon=${icon || (!entityStateObj ? "mdi:alarm-light" : undefined)}
                .stateObj=${entityStateObj}
              ></ha-state-icon>`
          : nothing}
        ${(nameText || contentText)
          ? html`<span class="info">
              ${nameText ? html`<span class="label">${nameText}</span>` : nothing}
              ${contentText ? html`<span class="content">${contentText}</span>` : nothing}
            </span>`
          : nothing}
      </div>
    `;
  }

  protected updated(): void {
    const isStorm = this._config?.animation === "storm";
    const isActive = this._config?.demo || this._active || !this._config?.entity;
    const shouldRunStorm = Boolean(isStorm && isActive);
    if (shouldRunStorm) this._stormStart(); else this._stormStop();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stormStop();
  }

  private _stormStart(): void {
    // Resolve current canvas in the render tree (it may change after editor closes)
    const canvas = this.renderRoot.querySelector<HTMLCanvasElement>(".kb-storm-rain") || undefined;
    if (!canvas) return;
    const canvasChanged = canvas !== this._stormRainCanvas;
    if (canvasChanged) {
      this._stormRainCanvas = canvas;
      this._stormRainCtx = this._stormRainCanvas.getContext("2d");
    }
    if (!this._stormRainCtx || !this._stormRainCanvas) return;
    // Resolve base storm color from editor (default to white when none)
    const baseColor = this._config?.color || "#ffffff";
    this._stormColor = this._resolveCssColorToRgba(baseColor) || { r: 255, g: 255, b: 255, a: 1 };
    this._stormSetupCanvasAndDrops();
    // Ensure resize handler is attached once
    if (!this._stormResizeHandler) {
      this._stormResizeHandler = () => {
        this._stormSetupCanvasAndDrops();
      };
      window.addEventListener("resize", this._stormResizeHandler);
    }
    // Ensure RAF loop is running
    if (!this._stormRaf) {
      const tick = () => {
        this._stormUpdate();
        this._stormRaf = window.requestAnimationFrame(tick);
      };
      this._stormRaf = window.requestAnimationFrame(tick);
    }
  }

  private _stormStop(): void {
    if (this._stormRaf) {
      window.cancelAnimationFrame(this._stormRaf);
      this._stormRaf = undefined;
    }
    if (this._stormResizeHandler) {
      window.removeEventListener("resize", this._stormResizeHandler);
      this._stormResizeHandler = undefined;
    }
    // Clear canvas
    if (this._stormRainCtx && this._stormRainCanvas) {
      const ctx = this._stormRainCtx;
      ctx.clearRect(0, 0, this._stormRainCanvas.width, this._stormRainCanvas.height);
    }
  }

  private _stormSetupCanvasAndDrops(): void {
    if (!this._stormRainCanvas || !this._stormRainCtx) return;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const rect = this._stormRainCanvas.getBoundingClientRect();
    const wCss = Math.max(1, Math.floor(rect.width));
    const hCss = Math.max(1, Math.floor(rect.height));
    this._stormRainCanvas.width = wCss * dpr;
    this._stormRainCanvas.height = hCss * dpr;
    const ctx = this._stormRainCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    // Populate drops based on area, scaled down for small badge
    const baseCount = 180; // reference density for ~100x36
    const area = wCss * hCss;
    const density = Math.min(400, Math.max(30, Math.floor((area / 3600) * (baseCount / 100))));
    this._stormDrops = [];
    for (let i = 0; i < density; i++) {
      this._stormDrops.push(this._stormCreateDrop(wCss, hCss));
    }
  }

  private _stormCreateDrop(w: number, h: number) {
    const random = (min: number, max: number) => min + Math.random() * (max - min);
    // Windy angle: left-to-right negative X speed, strong Y speed
    const speedY = random(6, 12);
    const speedX = random(-2.5, -0.8);
    return {
      x: Math.random() * w * 1.3, // allow offscreen spawn
      y: Math.random() * h,
      // Make drops visually thicker
      width: random(1.2, 1.8),
      length: random(2, 5),
      // Slightly brighter rain: higher opacity range
      opacity: random(0.25, 0.55),
      speedX,
      speedY,
    };
  }

  private _stormUpdate(): void {
    if (!this._stormRainCtx || !this._stormRainCanvas) return;
    const ctx = this._stormRainCtx as CanvasRenderingContext2D;
    const rect = this._stormRainCanvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    ctx.clearRect(0, 0, w, h);
    // Move
    for (let i = 0; i < this._stormDrops.length; i++) {
      const d = this._stormDrops[i];
      d.x += d.speedX;
      d.y += d.speedY;
      if (d.y > h) {
        // recycle to top with random x
        d.x = Math.random() * w * 1.3;
        d.y = -10;
      }
    }
    // Draw
    const prevComposite = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter"; // additive blend for brighter streaks
    for (let i = 0; i < this._stormDrops.length; i++) {
      const d = this._stormDrops[i];
      const startX = d.x;
      const startY = d.y;
      const endX = d.x + d.speedX * d.length;
      const endY = d.y + d.speedY * d.length;
      const grad = ctx.createLinearGradient(startX, startY, endX, endY);
      // Use editor color as the lightest tone (end of the streak)
      const base = this._stormColor || { r: 255, g: 255, b: 255, a: 1 };
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, `rgba(${base.r}, ${base.g}, ${base.b}, ${d.opacity.toFixed(3)})`);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = d.width;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.globalCompositeOperation = prevComposite;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --kb-alert-color: var(--error-color, #ff5252);
        --kb-alert-speed: 1000ms;
        --kb-icon-color-disabled: rgb(var(--rgb-disabled));
      }
      .badge {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: var(--ha-badge-size, 36px);
        padding: 0 8px;
        width: auto;
        border-radius: var(
          --ha-badge-border-radius,
          calc(var(--ha-badge-size, 36px) / 2)
        );
        background: var(
          --ha-card-background,
          var(--card-background-color, white)
        );
        -webkit-backdrop-filter: var(--ha-card-backdrop-filter, none);
        backdrop-filter: var(--ha-card-backdrop-filter, none);
        border-width: var(--ha-card-border-width, 1px);
        box-shadow: var(--ha-card-box-shadow, none);
        border-style: solid;
        border-color: var(
          --ha-card-border-color,
          var(--divider-color, #e0e0e0)
        );
        overflow: hidden;
      }
      .badge ha-state-icon {
        --mdc-icon-size: 18px;
        color: var(--badge-color);
      }
      /* Drive icon color the same way as core badges */
      .badge.active {
        --badge-color: var(--kb-alert-color);
      }
      .badge:not(.active) {
        --badge-color: var(--state-inactive-color);
      }
      .info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding-right: 4px;
      }
      .label {
        font-size: 10px;
        font-weight: 500;
        color: var(--secondary-text-color);
        line-height: 10px;
        letter-spacing: 0.1px;
      }
      .content {
        font-size: 12px;
        font-weight: 500;
        color: var(--primary-text-color);
        line-height: 16px;
        letter-spacing: 0.1px;
      }

      /* flashing - background pulse + outer glow (CodePen-inspired) */
      .badge.active.flashing {
        /* Animate outer glow on the badge itself so it's not clipped */
        animation: kb-flash-glow var(--kb-alert-speed) infinite ease-in-out;
        box-shadow: 0 0 3px color-mix(in oklab, var(--kb-alert-color) 60%, transparent);
        /* Keep content above the animated background */
        /* Icon color remains driven by --badge-color; leave as-is for now */
      }
      .badge.active.flashing::before {
        /* Animated background overlay inside the badge */
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background-color: color-mix(in oklab, var(--kb-alert-color) 55%, black);
        animation: kb-flash-bg var(--kb-alert-speed) infinite ease-in-out;
        pointer-events: none;
        z-index: 0;
      }
      .badge.active.flashing ha-state-icon,
      .badge.active.flashing .info {
        position: relative;
        z-index: 1;
      }
      .badge.active.flashing .label,
      .badge.active.flashing .content {
        color: #ffffff;
      }
      @keyframes kb-flash-glow {
        0%, 100% {
          box-shadow: 0 0 3px color-mix(in oklab, var(--kb-alert-color) 60%, transparent);
        }
        50% {
          box-shadow: 0 0 40px 6px color-mix(in oklab, var(--kb-alert-color) 90%, transparent);
        }
      }
      @keyframes kb-flash-bg {
        0%, 100% {
          background-color: color-mix(in oklab, var(--kb-alert-color) 55%, black);
        }
        50% {
          background-color: color-mix(in oklab, var(--kb-alert-color) 95%, black);
        }
      }

      /* police - Sequence 1 */
      .badge.active.police { overflow: hidden; }
      .badge.active.police .kb-police {
        position: absolute;
        inset: 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        pointer-events: none;
        z-index: 1;
      }
      .badge.active.police .segment {
        position: relative;
        overflow: hidden;
      }
      .badge.active.police .segment .inner {
        position: absolute;
        inset: 0;
        opacity: 0;
      }
      /* Right segment uses provided color (or default blue) */
      .badge.active.police .segment.blue .inner {
        animation: kb-strobe-blue var(--kb-alert-speed) infinite;
      }
      /* Left segment uses complementary color (or default red) */
      .badge.active.police .segment.red .inner {
        animation: kb-strobe-red var(--kb-alert-speed) infinite;
        animation-delay: calc(var(--kb-alert-speed) / 2);
      }
      /* Content stays above overlays */
      .badge.active.police ha-state-icon,
      .badge.active.police .info {
        position: relative;
        z-index: 2;
      }

      /* Strobe keyframes (based on CodePen sequence 1) */
      @keyframes kb-strobe-blue {
        0%, 25%    { opacity: 0; box-shadow: none; background: transparent; }
        28%, 50%   { opacity: 1; background: color-mix(in oklab, var(--kb-police-right, #66d2ff) 55%, transparent); box-shadow: 0 0 40px 10px color-mix(in oklab, var(--kb-police-right, #66d2ff) 80%, transparent) inset, 0 0 24px color-mix(in oklab, var(--kb-police-right, #66d2ff) 90%, transparent); }
        52%, 55%   { opacity: 0; box-shadow: none; background: transparent; }
        57%, 69%   { opacity: 1; background: color-mix(in oklab, var(--kb-police-right, #66d2ff) 55%, transparent); box-shadow: 0 0 40px 10px color-mix(in oklab, var(--kb-police-right, #66d2ff) 80%, transparent) inset, 0 0 24px color-mix(in oklab, var(--kb-police-right, #66d2ff) 90%, transparent); }
        70%, 71%   { opacity: 0; box-shadow: none; background: transparent; }
        72%, 75%   { opacity: 1; background: color-mix(in oklab, var(--kb-police-right, #66d2ff) 55%, transparent); box-shadow: 0 0 40px 10px color-mix(in oklab, var(--kb-police-right, #66d2ff) 80%, transparent) inset, 0 0 24px color-mix(in oklab, var(--kb-police-right, #66d2ff) 90%, transparent); }
        77%, 100%  { opacity: 0; box-shadow: none; background: transparent; }
      }
      @keyframes kb-strobe-red {
        0%, 25%    { opacity: 0; box-shadow: none; background: transparent; }
        28%, 50%   { opacity: 1; background: color-mix(in oklab, var(--kb-police-left, #ff3c2d) 55%, transparent); box-shadow: 0 0 40px 10px color-mix(in oklab, var(--kb-police-left, #ff3c2d) 80%, transparent) inset, 0 0 24px color-mix(in oklab, var(--kb-police-left, #ff3c2d) 90%, transparent); }
        52%, 55%   { opacity: 0; box-shadow: none; background: transparent; }
        57%, 69%   { opacity: 1; background: color-mix(in oklab, var(--kb-police-left, #ff3c2d) 55%, transparent); box-shadow: 0 0 40px 10px color-mix(in oklab, var(--kb-police-left, #ff3c2d) 80%, transparent) inset, 0 0 24px color-mix(in oklab, var(--kb-police-left, #ff3c2d) 90%, transparent); }
        70%, 71%   { opacity: 0; box-shadow: none; background: transparent; }
        72%, 75%   { opacity: 1; background: color-mix(in oklab, var(--kb-police-left, #ff3c2d) 55%, transparent); box-shadow: 0 0 40px 10px color-mix(in oklab, var(--kb-police-left, #ff3c2d) 80%, transparent) inset, 0 0 24px color-mix(in oklab, var(--kb-police-left, #ff3c2d) 90%, transparent); }
        77%, 100%  { opacity: 0; box-shadow: none; background: transparent; }
      }

      /* water */
      .badge.active.water { overflow: hidden; }
      .badge.active.water .kb-water {
        position: absolute;
        left: 0;
        top: 60%;
        width: 100%;
        height: 140%;
        z-index: 0; /* base water background */
        border-bottom-left-radius: inherit;
        border-bottom-right-radius: inherit;
        background: transparent;
        animation: kb-water-wave-rise calc(var(--kb-alert-speed) * 3) ease-out forwards;
      }
      .badge.active.water .kb-water-wave {
        position: absolute;
        left: 0;
        top: -4px;
        width: 200%;
        height: 24px;
        overflow: visible;
        pointer-events: none;
      }
      .badge.active.water .kb-water-wave path { fill: var(--kb-alert-color); }
      .badge.active.water .kb-water-wave.w1 {
        z-index: 2; /* above water background */
        animation: kb-water-wave-shift calc(var(--kb-alert-speed) * 3) linear infinite;
      }
      .badge.active.water .kb-water-wave.w2 {
        z-index: 1; /* below w1 but above background */
        top: -3px; /* slight phase and position offset */
        animation: kb-water-wave-shift calc(var(--kb-alert-speed) * 4.5) linear infinite reverse;
      }
      .badge.active.water .kb-water-wave.w2 path {
        fill: color-mix(in oklab, var(--kb-alert-color) 70%, black);
      }
      .badge.active.water ha-state-icon,
      .badge.active.water .info { position: relative; z-index: 2; }
      @keyframes kb-water-wave-shift {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      @keyframes kb-water-wave-rise {
        0% { top: 60%; }
        100% { top: calc(var(--ha-badge-size, 36px) * 0.45); }
      }

      

      /* storm */
      .badge.active.storm { overflow: hidden; }
      .badge.active.storm {
        /* derive shade palette from storm base color (falls back to white) */
        --kb-storm-flash-strong: var(--kb-storm-color, #ffffff);
        --kb-storm-flash: color-mix(in oklab, var(--kb-storm-color, #ffffff) 80%, black);
        --kb-storm-flash-dim: color-mix(in oklab, var(--kb-storm-color, #ffffff) 55%, black);
      }
      .badge.active.storm .kb-storm {
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
      }
      /* No ambient dark overlay; preserve original badge background */
      .badge.active.storm .kb-storm-rain {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
      }
      .badge.active.storm .kb-storm-lightning {
        position: absolute;
        inset: 0;
        background: var(--kb-storm-flash-strong);
        opacity: 0;
        animation: kb-lightning 6000ms infinite;
        mix-blend-mode: screen;
      }
      .badge.active.storm ha-state-icon,
      .badge.active.storm .info {
        position: relative;
        z-index: 2; /* above storm overlays */
      }
      @keyframes kb-lightning {
        0%, 8% { opacity: 0; background: transparent; }
        9.5% { opacity: 1; background: var(--kb-storm-flash-strong); }
        9.8% { opacity: 0; background: transparent; }
        10.2% { opacity: 0.9; background: var(--kb-storm-flash); }
        10.6% { opacity: 0; background: transparent; }
        73% { opacity: 0; background: transparent; }
        75% { opacity: 1; background: var(--kb-storm-flash-strong); }
        76.0% { opacity: 0; background: transparent; }
        76.7% { opacity: 0.9; background: var(--kb-storm-flash); }
        77.5% { opacity: 0; background: transparent; }
        80% { opacity: 0.75; background: var(--kb-storm-flash-dim); }
        90%, 100% { opacity: 0; background: transparent; }
      }

      /* shake */
      .badge.active.shake {
        animation: kb-wash-shake calc(var(--kb-alert-speed)) cubic-bezier(.36,.07,.19,.97) both infinite;
      }

      /* washing-machine */
      .badge.washing-machine .kb-wash {
        position: relative;
        width: var(--mdc-icon-size, 18px);
        height: var(--mdc-icon-size, 18px);
        flex: 0 0 auto;
      }
      .badge.washing-machine .kb-wash-drum {
        --kb-wash-size: var(--mdc-icon-size, 18px);
        --kb-wash-door-duration: 250ms;
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: #434343; /* outer ring */
        box-shadow: inset 0 0 0 calc(var(--kb-wash-size) * 0.08) #434343,
                    inset 0 0 0 calc(var(--kb-wash-size) * 0.14) grey;
        transform-style: preserve-3d;
        perspective: 150px;
      }
      /* inner glass/door */
      .badge.washing-machine .kb-wash-drum::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        opacity: 0.5;
        width: calc(var(--kb-wash-size) * 0.62);
        height: calc(var(--kb-wash-size) * 0.62);
        transform: translate(-50%, -50%) rotateY(55deg);
        transform-origin: left center;
        border-radius: 50%;
        background: #77757b; /* glass */
        box-shadow: inset 0 0 0 calc(var(--kb-wash-size) * 0.02) #999;
        z-index: 2; /* glass above spinner */
      }
      .badge.active.washing-machine .kb-wash-drum::after {
        animation: kb-wash-door-close var(--kb-wash-door-duration) ease-out forwards;
      }
      @keyframes kb-wash-door-close {
        0% { transform: translate(-50%, -50%) rotateY(55deg); }
        100% { transform: translate(-50%, -50%) rotateY(0deg); }
      }
      .badge.washing-machine .kb-wash-spinner {
        --arm-h: calc(var(--mdc-icon-size, 18px) * 0.06);
        position: absolute;
        left: 50%;
        top: 50%;
        /* radius equals half of inner glass */
        width: calc(var(--mdc-icon-size, 18px) * 0.31);
        height: var(--arm-h);
        background: white;
        border-radius: 25%;
        border-bottom-left-radius: 0;
        border-top-left-radius: 0;
        transform-origin: left center;
        transform: translateY(-50%);
        z-index: 1; /* below glass */
      }
      .badge.washing-machine .kb-wash-spinner::before,
      .badge.washing-machine .kb-wash-spinner::after {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background: white;
        border-radius: 25%;
        border-bottom-left-radius: 0;
        border-top-left-radius: 0;
        transform-origin: center left;
      }
      .badge.washing-machine .kb-wash-spinner::before { transform: rotate(120deg); }
      .badge.washing-machine .kb-wash-spinner::after { transform: rotate(240deg); }
      .badge.active.washing-machine .kb-wash-spinner {
        animation: kb-wash-rotation calc(var(--kb-alert-speed) * 0.8) linear infinite;
        animation-delay: var(--kb-wash-door-duration);
      }
      @keyframes kb-wash-rotation {
        0% { transform: translateY(-50%) rotate(0deg); }
        25% { transform: translateY(-50%) rotate(90deg); }
        50% { transform: translateY(-50%) rotate(180deg); }
        75% { transform: translateY(-50%) rotate(270deg); }
        100% { transform: translateY(-50%) rotate(360deg); }
      }
      .badge.active.washing-machine {
        animation: kb-wash-shake calc(var(--kb-alert-speed)) cubic-bezier(.36,.07,.19,.97) both infinite;
        animation-delay: var(--kb-wash-door-duration);
      }
      @keyframes kb-wash-shake {
        10%, 90% { transform: translate3d(-0.5px, 0, 0); }
        20%, 80% { transform: translate3d(1px, 0, 0); }
        30%, 50%, 70% { transform: translate3d(-2px, 0, 0); }
        40%, 60% { transform: translate3d(2px, 0, 0); }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kb-alert-badge": KbAlertBadge;
  }
}

// Register in dashboard badge picker catalog for preview/documentation linking
(() => {
  const windowWithBadges = window as unknown as Window & { customBadges?: any[] };
  windowWithBadges.customBadges = windowWithBadges.customBadges || [];
  windowWithBadges.customBadges.push({
    type: "kb-alert-badge",
    name: "KB Alert Badge",
    description: "Animated alert badge for critical sensors",
    preview: true,
  });
  // Console badge to confirm registration
  try {
    // eslint-disable-next-line no-console
    console.log(
      "%c KB %c Alert Badge %c registered",
      "background:#673ab7;color:#fff;border-radius:3px 0 0 3px;padding:2px 6px;font-weight:600",
      "background:#03a9f4;color:#fff;padding:2px 6px;font-weight:600",
      "background:transparent;color:inherit;padding:2px 6px"
    );
  } catch (_e) {
    // eslint-disable-next-line no-console
    console.log("KB Alert Badge registered");
  }
})();


