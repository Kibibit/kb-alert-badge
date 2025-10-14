import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant } from "./ha-types";
import type { KbAlertBadgeConfig } from "./kb-alert-badge-config";

type Schema = any[]; // Rely on HA's <ha-form> schema at runtime

const SCHEMA: Schema = [
  {
    name: "entity",
    selector: {
      entity: {
        domain: [
          "binary_sensor",
          "sensor",
          "alarm_control_panel",
          "switch",
        ],
      },
    },
  },
  {
    name: "animation",
    selector: {
      select: {
        options: [
          { value: "flashing", label: "Flashing" },
          { value: "police", label: "Police" },
          { value: "water", label: "Water" },
          { value: "storm", label: "Storm" },
          { value: "shake", label: "Shake" },
          { value: "washing-machine", label: "Washing machine" },
        ],
        mode: "dropdown",
      },
    },
  },
  {
    name: "color",
    selector: {
      text: {},
    },
  },
  {
    name: "label",
    selector: {
      text: {},
    },
  },
  {
    name: "icon",
    selector: {
      icon: {},
    },
  },
  // Display toggles
  { name: "show_icon", selector: { boolean: {} } },
  { name: "show_name", selector: { boolean: {} } },
  { name: "show_state", selector: { boolean: {} } },
  // State content selection
  {
    name: "state_content",
    selector: {
      select: {
        options: [
          { value: "state", label: "State" },
          { value: "name", label: "Name" },
          { value: "last_changed", label: "Last changed" },
          { value: "last_updated", label: "Last updated" },
          { value: "attribute", label: "Attribute" },
          { value: "text", label: "Text" },
        ],
        mode: "dropdown",
      },
    },
  },
  {
    name: "state_attribute",
    selector: { text: {} },
    conditions: [{ name: "state_content", value: "attribute" }],
  },
  {
    name: "state_text",
    selector: { text: {} },
    conditions: [{ name: "state_content", value: "text" }],
  },
  {
    name: "speed",
    selector: {
      number: { min: 100, max: 10000, step: 100, mode: "box" },
    },
  },
  {
    name: "demo",
    selector: {
      boolean: {},
    },
  },
];

@customElement("kb-alert-badge-editor")
export class KbAlertBadgeEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: KbAlertBadgeConfig;

  public setConfig(config: KbAlertBadgeConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) return nothing;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _computeLabel = (schema: any) => {
    switch (schema.name) {
      case "entity":
        return "Entity";
      case "animation":
        return "Animation";
      case "color":
        return "Color";
      case "icon":
        return "Icon";
      case "label":
        return "Label";
      case "show_icon":
        return "Show icon";
      case "show_name":
        return "Show name";
      case "show_state":
        return "Show state";
      case "state_content":
        return "State content";
      case "state_attribute":
        return "Attribute name";
      case "state_text":
        return "Text";
      case "speed":
        return "Speed (ms)";
      case "demo":
        return "Preview animation (demo)";
      default:
        return schema.name;
    }
  };

  private _valueChanged(ev: CustomEvent) {
    const cfg = ev.detail.value as KbAlertBadgeConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: cfg },
        bubbles: true,
        composed: true,
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kb-alert-badge-editor": KbAlertBadgeEditor;
  }
}


