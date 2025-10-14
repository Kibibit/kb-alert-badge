import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";

export interface RenderTemplateResult {
  result: string;
  listeners: {
    all: boolean;
    entities: string[];
    time: boolean;
  };
}

export const subscribeRenderTemplate = (
  conn: Connection,
  onChange: (result: RenderTemplateResult) => void,
  params: {
    template: string;
    entity_ids?: string | string[];
    variables?: Record<string, unknown>;
    timeout?: number;
    strict?: boolean;
  }
): Promise<UnsubscribeFunc> =>
  conn.subscribeMessage((msg: RenderTemplateResult) => onChange(msg), {
    type: "render_template",
    ...params,
  });

export interface LovelaceBadge extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: any): void;
}

export interface HomeAssistant {
  connection: Connection;
  states: Record<string, { state: string; attributes: Record<string, any> }>;
  user?: { name: string };
  // Optional methods available in HA runtime
  formatEntityState?: (stateObj: any, state?: string) => string;
}


