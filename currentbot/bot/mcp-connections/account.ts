import { defineConnection } from "@grok/agent-sdk/connections";

/**
 * Use Jacob's Cursor-account ZoomInfo (plugin vendor "Cursor").
 * Never use mcp oauth / host-connections — ZoomInfo rejects vendor "Agent SDK".
 */
export default defineConnection({
  cursorAccount: true,
  servers: ["Zoominfo", "ZoomInfo", "zoominfo"],
  advertiseTools: true,
  optional: true,
});
