import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant } from "./ha-types";
import type { KbAlertBadgeConfig } from "./kb-alert-badge-config";

@customElement("kb-alert-badge-editor")
export class KbAlertBadgeEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: KbAlertBadgeConfig;

  public setConfig(config: KbAlertBadgeConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) return nothing;
    // Minimal schema-less editor to keep dependencies small
    return html`
      <div class="form">
        <label>
          Entity
          <input
            type="text"
            .value=${this._config.entity ?? ""}
            @input=${(e: any) => this._update({ entity: e.target.value })}
          />
        </label>
        <label>
          Animation
          <select
            .value=${this._config.animation ?? "flashing"}
            @change=${(e: any) => this._update({ animation: e.target.value })}
          >
            <option value="flashing">flashing</option>
            <option value="police">police</option>
            <option value="water">water</option>
            <option value="wind">wind</option>
          </select>
        </label>
        <label>
          Color
          <input
            type="text"
            placeholder="e.g. red or #ff0000"
            .value=${this._config.color ?? ""}
            @input=${(e: any) => this._update({ color: e.target.value })}
          />
        </label>
        <label>
          Icon
          <input
            type="text"
            placeholder="mdi:alert"
            .value=${this._config.icon ?? ""}
            @input=${(e: any) => this._update({ icon: e.target.value })}
          />
        </label>
        <label>
          Speed (ms)
          <input
            type="number"
            min="100"
            step="100"
            .value=${String(this._config.speed ?? 1000)}
            @input=${(e: any) => this._update({ speed: Number(e.target.value) })}
          />
        </label>
      </div>
    `;
  }

  private _update(values: Partial<KbAlertBadgeConfig>) {
    const detail = { config: { ...(this._config || {}), ...values } };
    this.dispatchEvent(new CustomEvent("config-changed", { detail, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kb-alert-badge-editor": KbAlertBadgeEditor;
  }
}


