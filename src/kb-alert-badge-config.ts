export type KbAlertBadgeConfig = {
  type: string;
  entity?: string;
  animation?: "flashing" | "police" | "water" | "storm" | "shake" | "washing-machine";
  color?: string;
  icon?: string;
  label?: string;
  speed?: number; // ms
  demo?: boolean; // force active animation for preview/testing
  tap_action?: any;
  hold_action?: any;
  double_tap_action?: any;
};


