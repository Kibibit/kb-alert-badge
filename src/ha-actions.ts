import type { AttributePart } from "lit";
import { directive, Directive, DirectiveParameters, noChange } from "lit/directive.js";

// Minimal Home Assistant-like helpers for actions

export type ActionConfig = { action?: string; [key: string]: any } | undefined;

export interface ActionHandlerOptions {
  hasHold?: boolean;
  hasDoubleClick?: boolean;
  disabled?: boolean;
}

export interface ActionHandlerDetail {
  action: "hold" | "tap" | "double_tap";
}

export type ActionHandlerEvent = CustomEvent<ActionHandlerDetail>;

export function fireEvent<T = any>(node: HTMLElement, type: string, detail?: T) {
  node.dispatchEvent(
    new CustomEvent(type, {
      detail,
      bubbles: true,
      composed: true,
    })
  );
}

export function hasAction(config?: ActionConfig): boolean {
  return !!config && config.action !== "none";
}

export type ActionConfigParams = {
  entity?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
};

export const handleAction = async (
  node: HTMLElement,
  _hass: any,
  config: ActionConfigParams,
  action: string
): Promise<void> => {
  fireEvent(node, "hass-action", { config, action });
};

interface ActionHandlerEl extends HTMLElement {
  actionHandler?: {
    options: ActionHandlerOptions;
    start?: (ev: Event) => void;
    end?: (ev: Event) => void;
    handleKeyDown?: (ev: KeyboardEvent) => void;
  };
}

class ActionHandler extends HTMLElement {
  public holdTime = 500;

  private timer?: number;
  private held = false;
  private cancelled = false;
  private dblClickTimeout?: number;

  public connectedCallback() {
    [
      "touchcancel",
      "mouseout",
      "mouseup",
      "touchmove",
      "mousewheel",
      "wheel",
      "scroll",
    ].forEach((ev) => {
      document.addEventListener(
        ev,
        () => {
          this.cancelled = true;
          if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
          }
        },
        { passive: true }
      );
    });
  }

  public bind(element: ActionHandlerEl, options: ActionHandlerOptions = {}) {
    if (element.actionHandler) {
      element.removeEventListener("touchstart", element.actionHandler.start!);
      element.removeEventListener("touchend", element.actionHandler.end!);
      element.removeEventListener("touchcancel", element.actionHandler.end!);
      element.removeEventListener("mousedown", element.actionHandler.start!);
      element.removeEventListener("click", element.actionHandler.end!);
      element.removeEventListener("keydown", element.actionHandler.handleKeyDown!);
    }

    element.actionHandler = { options };

    if (options.disabled) return;

    element.actionHandler.start = (ev: Event) => {
      this.cancelled = false;
      if (options.hasHold) {
        this.held = false;
        this.timer = window.setTimeout(() => {
          this.held = true;
        }, this.holdTime);
      }
    };

    element.actionHandler.end = (ev: Event) => {
      if (["touchend", "touchcancel"].includes(ev.type) && this.cancelled) return;
      const target = ev.target as HTMLElement;
      if (ev.cancelable) ev.preventDefault();
      if (options.hasHold) {
        clearTimeout(this.timer);
        this.timer = undefined;
      }
      if (options.hasHold && this.held) {
        fireEvent<ActionHandlerDetail>(target, "action", { action: "hold" });
      } else if (options.hasDoubleClick) {
        if ((ev.type === "click" && (ev as MouseEvent).detail < 2) || !this.dblClickTimeout) {
          this.dblClickTimeout = window.setTimeout(() => {
            this.dblClickTimeout = undefined;
            fireEvent<ActionHandlerDetail>(target, "action", { action: "tap" });
          }, 250);
        } else {
          clearTimeout(this.dblClickTimeout);
          this.dblClickTimeout = undefined;
          fireEvent<ActionHandlerDetail>(target, "action", { action: "double_tap" });
        }
      } else {
        fireEvent<ActionHandlerDetail>(target, "action", { action: "tap" });
      }
    };

    element.actionHandler.handleKeyDown = (ev: KeyboardEvent) => {
      if (!["Enter", " "].includes(ev.key)) return;
      (ev.currentTarget as ActionHandlerEl).actionHandler!.end!(ev);
    };

    element.addEventListener("touchstart", element.actionHandler.start, { passive: true });
    element.addEventListener("touchend", element.actionHandler.end);
    element.addEventListener("touchcancel", element.actionHandler.end);
    element.addEventListener("mousedown", element.actionHandler.start, { passive: true });
    element.addEventListener("click", element.actionHandler.end);
    element.addEventListener("keydown", element.actionHandler.handleKeyDown);
  }
}

const getActionHandler = (): ActionHandler => {
  const body = document.body;
  if (body.querySelector("action-handler")) {
    return body.querySelector("action-handler") as ActionHandler;
  }
  const el = document.createElement("action-handler") as ActionHandler;
  body.appendChild(el);
  return el;
};

export const actionHandlerBind = (element: ActionHandlerEl, options?: ActionHandlerOptions) => {
  const handler = getActionHandler();
  if (!handler) return;
  handler.bind(element, options);
};

export const actionHandler = directive(
  class extends Directive {
    update(part: AttributePart, [options]: DirectiveParameters<this>) {
      actionHandlerBind(part.element as ActionHandlerEl, options);
      return noChange;
    }
    render(_options?: ActionHandlerOptions) {}
  }
);

declare global {
  interface HTMLElementTagNameMap {
    "action-handler": ActionHandler;
  }
  interface HASSDomEvents {
    action: ActionHandlerDetail;
    "hass-action": { config: ActionConfigParams; action: string };
  }
}


