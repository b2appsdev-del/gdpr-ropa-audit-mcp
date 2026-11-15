/**
 * Cloudflare Worker Remote Metered MCP Gateway for @b2apps/gdpr-ropa-audit-mcp
 * Exposes Streamable HTTP JSON-RPC 2.0 endpoint (/mcp) and health check (/health).
 * Validates optional Pro license key header (X-MCP-Pro-Key or Authorization: Bearer <key>)
 * for multi-record enterprise batch auditing.
 */
import { handleJsonRpcRequest, SERVER_INFO, TOOLS } from "./index.mjs";
import { LEGAL_DISCLAIMER } from "./gdpr-engine.mjs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-MCP-Pro-Key",
};

export function verifyProLicenseKey(rawKey, env = {}) {
  const key = String(rawKey || env.MCP_PRO_LICENSE_KEY || "").trim();
  if (!key) return { valid: false, tier: "free" };
  const isValidFormat = /^PRO-[A-Z0-9-]{8,}$/i.test(key);
  return {
    valid: isValidFormat,
    tier: isValidFormat ? "pro" : "free",
  };
}

export default {
  async fetch(request, env = {}) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return new Response(
        JSON.stringify(
          {
            status: "ok",
            server: SERVER_INFO,
            transport: "streamable-http",
            tools: TOOLS.map((t) => t.name),
            disclaimer: LEGAL_DISCLAIMER,
          },
          null,
          2
        ),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    if (request.method === "POST" && (url.pathname === "/mcp" || url.pathname === "/")) {
      const authHeader = request.headers.get("Authorization") || "";
      const bearerKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const headerKey = request.headers.get("X-MCP-Pro-Key") || bearerKey;
      const license = verifyProLicenseKey(headerKey, env);

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Parse error" },
          }),
          {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }

      const rpcResponse = handleJsonRpcRequest(body);
      return new Response(JSON.stringify(rpcResponse), {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
          "X-MCP-Tier": license.tier,
        },
      });
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  },
};
