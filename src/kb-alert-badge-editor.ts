import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant } from "./ha-types";
import type { KbAlertBadgeConfig } from "./kb-alert-badge-config";

type Schema = any[]; // Rely on HA's <ha-form> schema at runtime

const BASE_SCHEMA: Schema = [
  {
    name: "demo",
    selector: { boolean: {} },
  },
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
    name: "speed",
    selector: {
      number: { min: 100, max: 10000, step: 100, mode: "box" },
    },
  },
  {
    // Content group similar to HA default badge editor
    name: "content",
    type: "expandable",
    flatten: true,
    icon: "mdi:text-short",
    schema: [
      { name: "label", selector: { text: {} } },
      { name: "color", selector: { text: {} } },
      { name: "icon", selector: { icon: {} }, context: { icon_entity: "entity" } },
      {
        type: "grid",
        name: "displayed_elements",
        schema: [
          { name: "show_name", selector: { boolean: {} } },
          { name: "show_state", selector: { boolean: {} } },
          { name: "show_icon", selector: { boolean: {} } },
        ],
      },
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
      { name: "state_attribute", selector: { text: {} } },
      { name: "state_text", selector: { text: {} } },
    ],
  },
  {
    name: "interactions",
    type: "expandable",
    flatten: true,
    icon: "mdi:gesture-tap",
    schema: [
      {
        name: "tap_action",
        selector: {
          ui_action: {
            default_action: "more-info",
          },
        },
      },
      {
        name: "",
        type: "optional_actions",
        flatten: true,
        schema: (["hold_action", "double_tap_action"] as const).map((action) => ({
          name: action,
          selector: { ui_action: { default_action: "none" as const } },
        })),
      },
    ],
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
    const selected = this._config.state_content;
    // Compute nested schema so optional state sub-fields render like HA default
    const schema = BASE_SCHEMA.map((s: any) => {
      if (s.name !== "content") return s;
      const content = { ...s };
      content.schema = s.schema.filter((c: any) => {
        if (c.name === "state_attribute") return selected === "attribute";
        if (c.name === "state_text") return selected === "text";
        return true;
      });
      return content;
    });
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
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
      case "speed":
        return "Speed (ms)";
      case "content":
        return "Content";
      case "color":
        return "Color";
      case "icon":
        return "Icon";
      case "label":
        return "Name";
      case "displayed_elements":
        return "Displayed elements";
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


