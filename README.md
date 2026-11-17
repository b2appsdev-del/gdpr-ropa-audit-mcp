# `@b2apps/gdpr-ropa-audit-mcp` — GDPR Art. 30 RoPA, ePrivacy Cookie Classifier & DPA/SCC Auditor MCP Server

Deterministic **Model Context Protocol (MCP)** server (`JSON-RPC 2.0` over `stdio` + Cloudflare Worker remote metered gateway in `src/worker.mjs`) for EU/UK privacy engineering, GDPR Article 30 Record of Processing Activities (RoPA) validation, ePrivacy Directive cookie/tracker classification, and Article 28 Data Processing Agreement (DPA) + Cross-Border Transfer (EU-US DPF & 2021 SCC Module 1–4) auditing.

> **Disclaimer:** *Educational & privacy-engineering planning tool only; not legal, regulatory, financial, or tax advice. Consult qualified data protection counsel or your Data Protection Officer (DPO) for formal GDPR and ePrivacy compliance sign-off.*

---

## Free Online Tool / Pro Suite

- 🚀 **Free Online Web Tool**: Generate zero-dependency, GDPR & ePrivacy compliant cookie consent banners and privacy policies instantly at [https://b2appsdev-del.github.io/gdpr-cookie-privacy-generator/](https://b2appsdev-del.github.io/gdpr-cookie-privacy-generator/).
- 💼 **GDPR Cookie & ROPA Compliance Kit ($0+ PWYW / $29 Pro)**: Full Article 30 ROPA spreadsheets, DPIA assessment templates, and multi-language cookie banner code on [Gumroad](https://devbloom12.gumroad.com/l/fgeokd?utm_source=github&utm_medium=readme).
- 🌐 **All B2 Apps Tools & Directory**: Explore our full ecosystem of EU dev, compliance, and investor tools at [https://b2appsdev-del.github.io/](https://b2appsdev-del.github.io/).
- 🧭 **All free samples and step-by-step guides (mobile-friendly):** https://b2appsdev-del.github.io/start/

---

## Included MCP Tools

1. **`audit_gdpr_ropa_record`**
   - Validates a Record of Processing Activities (`GDPR Art. 30`) JSON string or object across all 9 mandatory regulatory dimensions:
     - Controller contact details (`Art. 30(1)(a)`)
     - Data Protection Officer (`DPO`) contact or documented `Art. 37` exemption (`Art. 30(1)(a)`)
     - Specific purposes of processing (`Art. 30(1)(b)`)
     - Lawful basis under `Art. 6(1)` (plus LIA check when relying on `Art. 6(1)(f)` Legitimate Interests)
     - Special categories of personal data (`Art. 9`) and data subject/category inventory (`Art. 30(1)(c)`)
     - Categories of recipients (`Art. 30(1)(d)`)
     - Third-country transfers & `Chapter V` safeguards (`2021 SCCs`, `EU-US DPF`, `Art. 45 Adequacy`) (`Art. 30(1)(e)`)
     - Defined retention schedule / storage limitation (`Art. 30(1)(f)` & `Art. 5(1)(e)`)
     - Technical and Organisational Measures (`TOMs` under `Art. 32` & `Art. 30(1)(g)`)
   - Returns a deterministic `0–100` compliance score, letter grade (`A–F`), and actionable missing-field remediation list.

2. **`classify_cookies_and_trackers`**
   - Classifies cookie and script identifiers (`_ga`, `_gid`, `_fbp`, `cf_clearance`, `__stripe_mid`, `stripe_mid`, `ph_*`, `intercom-id-*`, `OptanonConsent`, etc.) into:
     - **Strictly Necessary** (Exempt from prior opt-in under `ePrivacy Directive Art. 5(3)`)
     - **Analytics** (Prior opt-in consent required under `ePrivacy Art. 5(3)` & `GDPR Art. 6(1)(a)`)
     - **Marketing** (Prior explicit opt-in consent required)
     - **Functional** (Consent required unless strictly necessary for a user-requested UI preference)
   - Outputs per-cookie vendor, purpose, typical duration, CMP bucket, and banner implementation guidance.

3. **`generate_dpa_scc_checklist`**
   - Generates a deterministic **GDPR Art. 28 Data Processing Agreement (DPA)** checklist (`Art. 28(3)(a)–(h)`) and **Chapter V Cross-Border Transfer** checklist tailored to exporter/importer roles (`Controller` / `Processor`), destination country (`US`, `GB`, `IN`, `DE`, etc.), `EU-U.S. Data Privacy Framework (DPF)` status, and automatic selection of **2021 EU Standard Contractual Clauses (Decision (EU) 2021/914) Module 1, 2, 3, or 4** + Transfer Impact Assessment (`TIA`) requirements.

---

## Client Configuration (`mcpServers`)

Add to your `claude_desktop_config.json`, Cursor `.cursor/mcp.json`, or Windsurf MCP settings:

```json
{
  "mcpServers": {
    "gdpr-ropa-audit": {
      "command": "npx",
      "args": ["-y", "@b2apps/gdpr-ropa-audit-mcp"],
      "env": {
        "MCP_PRO_LICENSE_KEY": "OPTIONAL_PRO_KEY"
      }
    }
  }
}
```

---

## Network, Telemetry & Privacy Disclosure

- **Offline Local `stdio` Execution:** All 3 tools in `src/index.mjs` run **100% locally and offline** on your machine with **zero external network calls, zero telemetry, and zero logging** of your RoPA records, cookie inventories, or vendor checklists.
- **Optional Remote Metered Cloudflare Worker (`src/worker.mjs`):** Teams deploying or connecting to the hosted Streamable HTTP endpoint (`/mcp`) transmit JSON-RPC payloads over TLS 1.3 and can pass `X-MCP-Pro-Key` or `Authorization: Bearer <MCP_PRO_LICENSE_KEY>` for remote metered Pro access.

## Pricing, Licensing & Billing Tiers

- **Free Tier (MIT Open-Source):** Unlimited local `stdio` usage of `audit_gdpr_ropa_record`, `classify_cookies_and_trackers`, and `generate_dpa_scc_checklist`.
- **Pro Tier ($19/month Metered Gateway & Enterprise CI):** Hosted Cloudflare Worker remote MCP endpoint (`src/worker.mjs`), multi-record batch CI/CD RoPA validation, and priority regulatory rule updates via LemonSqueezy: [https://b2apps.lemonsqueezy.com/buy/gdpr-ropa-audit-mcp-pro](https://b2apps.lemonsqueezy.com/buy/gdpr-ropa-audit-mcp-pro).
