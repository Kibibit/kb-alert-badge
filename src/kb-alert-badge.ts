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
      entity: "binary_sensor.example",
      animation: "flashing",
      color: "red",
      speed: 1000,
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: KbAlertBadgeConfig;
  @state() private _active = false;
  @state() private _stateDisplay?: string;

  setConfig(config: KbAlertBadgeConfig): void {
    this._config = {
      animation: "flashing",
      speed: 1000,
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

  protected render() {
    if (!this._config) return nothing;
    const { icon, label, color, animation = "flashing", speed = 1000 } = this._config;
    const active = this._config.demo || this._active || !this._config.entity; // preview if no entity or demo

    const style: Record<string, string> = {};
    if (color) style["--kb-alert-color"] = color;
    style["--kb-alert-speed"] = `${speed}ms`;

    const entityStateObj = this._config.entity
      ? this.hass?.states[this._config.entity]
      : undefined;

    return html`
      <div class=${`badge ${active ? `active ${animation}` : ""}`}
           style=${Object.entries(style)
             .map(([k, v]) => `${k}: ${v}`)
             .join(";")}
           role="img"
           aria-label="Alert badge">
        ${html`<ha-state-icon
          .hass=${this.hass}
          .icon=${icon}
          .stateObj=${entityStateObj}
        ></ha-state-icon>`}
        ${(label || this._stateDisplay)
          ? html`<span class="info">
              ${label ? html`<span class="label">${label}</span>` : nothing}
              ${this._stateDisplay ? html`<span class="content">${this._stateDisplay}</span>` : nothing}
            </span>`
          : nothing}
      </div>
    `;
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
        min-width: var(--ha-badge-size, 36px);
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

      /* flashing - render pulse inside element to avoid preview clipping */
      .badge.active.flashing::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        box-shadow: inset 0 0 0 0 color-mix(in oklab, var(--kb-alert-color) 40%, transparent);
        animation: kb-flash var(--kb-alert-speed) infinite ease-in-out;
        pointer-events: none;
      }
      @keyframes kb-flash {
        0%, 100% { box-shadow: inset 0 0 0 0 color-mix(in oklab, var(--kb-alert-color) 40%, transparent); }
        50% { box-shadow: inset 0 0 0 6px transparent; }
      }

      /* police */
      .badge.active.police {
        background: linear-gradient(90deg, #e53935 0%, #e53935 50%, #1e88e5 50%, #1e88e5 100%);
        background-size: 200% 100%;
        animation: kb-police var(--kb-alert-speed) infinite linear;
      }
      @keyframes kb-police {
        0% { background-position: 0% 0; }
        100% { background-position: -100% 0; }
      }

      /* water */
      .badge.active.water::after {
        content: "";
        position: absolute;
        left: 0; right: 0; bottom: 0;
        height: 0%;
        background: radial-gradient(ellipse at top, rgba(255,255,255,0.4), transparent),
                    var(--kb-alert-color);
        animation: kb-water-rise var(--kb-alert-speed) infinite ease-in-out;
        z-index: -1;
      }
      @keyframes kb-water-rise {
        0% { height: 0%; }
        50% { height: 85%; }
        100% { height: 0%; }
      }

      /* wind */
      .badge.active.wind::before {
        content: "";
        position: absolute;
        top: 10%; left: -50%;
        width: 50%; height: 2px;
        background: var(--kb-alert-color);
        box-shadow: 30px 8px 0 0 var(--kb-alert-color), 60px -8px 0 0 var(--kb-alert-color);
        opacity: 0.8;
        animation: kb-wind var(--kb-alert-speed) infinite linear;
      }
      @keyframes kb-wind {
        0% { transform: translateX(0); }
        100% { transform: translateX(200%); }
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


