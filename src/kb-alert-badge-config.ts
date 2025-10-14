export type KbAlertBadgeConfig = {
  type: string;
  entity?: string;
  animation?: "flashing" | "police" | "water" | "wind";
  color?: string;
  icon?: string;
  label?: string;
  speed?: number; // ms
  tap_action?: any;
  hold_action?: any;
  double_tap_action?: any;
};


