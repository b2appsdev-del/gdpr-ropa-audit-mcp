#!/usr/bin/env node
/**
 * @b2apps/gdpr-ropa-audit-mcp — Model Context Protocol (MCP) JSON-RPC 2.0 stdio server.
 * Implements initialize, notifications/initialized, ping, tools/list, and tools/call.
 * Educational & privacy-engineering planning tool only; not legal, financial, or tax advice.
 */
import readline from "node:readline";
import {
  auditGdprRopaRecord,
  classifyCookiesAndTrackers,
  generateDpaSccChecklist,
  LEGAL_DISCLAIMER,
} from "./gdpr-engine.mjs";

export const SERVER_INFO = {
  name: "gdpr-ropa-audit-mcp",
  version: "1.0.0",
};

export const TOOLS = [
  {
    name: "audit_gdpr_ropa_record",
    description:
      "Validate a GDPR Article 30 Record of Processing Activities (RoPA) JSON/object for mandatory fields (controller contact, DPO, purposes, lawful basis under Art. 6, special categories under Art. 9, recipients, third-country transfers/SCCs, retention schedule, and TOMs under Art. 32) and return a 0-100 compliance score plus missing-field remediation list.",
    inputSchema: {
      type: "object",
      properties: {
        record: {
          description:
            "GDPR Art. 30 Record of Processing Activities as a JSON object or JSON-encoded string.",
          oneOf: [{ type: "object" }, { type: "string" }],
        },
      },
      required: ["record"],
    },
  },
  {
    name: "classify_cookies_and_trackers",
    description:
      "Classify a list of cookie or tracker script names (_ga, _fbp, cf_clearance, stripe_mid, ph_*, etc.) into Strictly Necessary, Analytics, Marketing, or Functional categories with ePrivacy Directive Art. 5(3) and GDPR Art. 6(1)(a) prior consent requirements.",
    inputSchema: {
      type: "object",
      properties: {
        cookies: {
          type: "array",
          items: { type: "string" },
          description:
            "Array of cookie or tracker script names to classify (e.g. ['_ga', '_fbp', 'cf_clearance', 'stripe_mid', 'ph_project_posthog']).",
        },
      },
      required: ["cookies"],
    },
  },
  {
    name: "generate_dpa_scc_checklist",
    description:
      "Generate a deterministic GDPR Article 28 Data Processing Agreement (DPA) & Chapter V Cross-Border Transfer (EU-US DPF / 2021 EU Standard Contractual Clauses Module 1-4) audit checklist.",
    inputSchema: {
      type: "object",
      properties: {
        exporterRole: {
          type: "string",
          enum: ["controller", "processor"],
          description: "GDPR role of the data exporter (default: 'controller').",
        },
        importerRole: {
          type: "string",
          enum: ["controller", "processor"],
          description: "GDPR role of the data importer (default: 'processor').",
        },
        destinationCountry: {
          type: "string",
          description: "Two-letter ISO country code of the data importer (e.g. 'US', 'IN', 'GB', 'DE').",
        },
        dpfCertified: {
          type: "boolean",
          description: "Whether a US importer holds an active EU-U.S. Data Privacy Framework (DPF) certification.",
        },
        includesSubprocessors: {
          type: "boolean",
          description: "Whether the processor engages sub-processors under Art. 28(2).",
        },
      },
    },
  },
];

export function handleJsonRpcRequest(msg) {
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") {
    return {
      jsonrpc: "2.0",
      id: msg?.id ?? null,
      error: { code: -32600, message: "Invalid JSON-RPC 2.0 request" },
    };
  }

  // Notifications have no id and expect no response
  if (msg.id === undefined) {
    return null;
  }

  const { id, method, params = {} } = msg;

  try {
    switch (method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: params.protocolVersion || "2024-11-05",
            capabilities: {
              tools: { listChanged: false },
            },
            serverInfo: SERVER_INFO,
          },
        };

      case "ping":
        return {
          jsonrpc: "2.0",
          id,
          result: {},
        };

      case "tools/list":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: TOOLS,
          },
        };

      case "tools/call": {
        const toolName = params?.name;
        const args = params?.arguments || {};
        let payload;

        switch (toolName) {
          case "audit_gdpr_ropa_record":
            payload = auditGdprRopaRecord(args);
            break;

          case "classify_cookies_and_trackers":
            payload = classifyCookiesAndTrackers(args);
            break;

          case "generate_dpa_scc_checklist":
            payload = generateDpaSccChecklist(args);
            break;

          default:
            return {
              jsonrpc: "2.0",
              id,
              error: { code: -32601, message: `Unknown tool: ${toolName}` },
            };
        }

        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(payload, null, 2),
              },
            ],
            isError: false,
          },
        };
      }

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
    }
  } catch (err) {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: err instanceof Error ? err.message : String(err),
                disclaimer: LEGAL_DISCLAIMER,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      },
    };
  }
}

// Start stdio listener when executed directly
const isMain =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").slice(-2).join("/"));

if (isMain) {
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        }) + "\n"
      );
      return;
    }

    const res = handleJsonRpcRequest(parsed);
    if (res) {
      process.stdout.write(JSON.stringify(res) + "\n");
    }
  });
}
