export type KbAlertBadgeConfig = {
  type: string;
  entity?: string;
  animation?: "flashing" | "police" | "water" | "storm" | "shake" | "washing-machine";
  color?: string;
  icon?: string;
  label?: string;
  speed?: number; // ms
  demo?: boolean; // force active animation for preview/testing
  // Display controls
  show_icon?: boolean; // default true
  show_name?: boolean; // default true
  show_state?: boolean; // default true
  // What to render as the state/content line
  state_content?:
    | "state"
    | "name"
    | "last_changed"
    | "last_updated"
    | "attribute"
    | "text";
  // When state_content === "attribute", pick which attribute
  state_attribute?: string;
  // When state_content === "text", render this free text
  state_text?: string;
  tap_action?: { action?: string; [key: string]: any };
  hold_action?: { action?: string; [key: string]: any };
  double_tap_action?: { action?: string; [key: string]: any };
};


