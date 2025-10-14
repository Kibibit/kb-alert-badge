import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant, LovelaceBadge } from "./ha-types";
import { subscribeRenderTemplate } from "./ha-types";
import type { KbAlertBadgeConfig } from "./kb-alert-badge-config";

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
      icon: "mdi:alert",
      speed: 1000,
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: KbAlertBadgeConfig;
  @state() private _active = false;

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
      return;
    }
    const st = this.hass.states[this._config.entity];
    const state = st?.state ?? "";
    const activeStates = ["on", "alarm", "problem", "triggered", "leak"];
    this._active = activeStates.includes(state);
  }

  protected render() {
    if (!this._config) return nothing;
    const { icon, color, animation = "flashing", speed = 1000 } = this._config;
    const active = this._active || !this._config.entity; // preview if no entity

    const style: Record<string, string> = {};
    if (color) style["--kb-alert-color"] = color;
    style["--kb-alert-speed"] = `${speed}ms`;

    return html`
      <div class=${`badge ${active ? `active ${animation}` : ""}`}
           style=${Object.entries(style)
             .map(([k, v]) => `${k}: ${v}`)
             .join(";")}
           role="img"
           aria-label="Alert badge">
        <ha-state-icon .icon=${icon || "mdi:alert"}></ha-state-icon>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --kb-alert-color: var(--error-color, #ff5252);
        --kb-alert-speed: 1000ms;
      }
      .badge {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        height: var(--ha-badge-size, 36px);
        width: var(--ha-badge-size, 36px);
        border-radius: 50%;
        background: var(--ha-card-background, var(--card-background-color));
        border: 1px solid var(--divider-color);
        overflow: hidden;
      }
      .badge ha-state-icon {
        --mdc-icon-size: 20px;
        color: var(--kb-alert-color);
      }

      /* flashing */
      .badge.active.flashing {
        animation: kb-flash var(--kb-alert-speed) infinite ease-in-out;
        box-shadow: 0 0 0 0 rgba(255,0,0,0.4);
      }
      @keyframes kb-flash {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.4); }
        50% { box-shadow: 0 0 0 8px rgba(255, 0, 0, 0.0); }
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
})();


