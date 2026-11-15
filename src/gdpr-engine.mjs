/**
 * @b2apps/gdpr-ropa-audit-mcp — Deterministic GDPR Art. 30 RoPA validator,
 * ePrivacy cookie/tracker classifier, and Art. 28 DPA & Cross-Border SCC checklist engine.
 *
 * Educational & privacy-engineering planning tool only; not legal, financial, or tax advice.
 */

export const LEGAL_DISCLAIMER =
  "Educational & privacy-engineering planning tool only; does not constitute legal, regulatory, financial, or tax advice. Consult qualified data protection counsel or your Data Protection Officer (DPO) for formal GDPR/ePrivacy compliance sign-off.";

export const VALID_ART6_BASES = [
  "6(1)(a)",
  "consent",
  "6(1)(b)",
  "contract",
  "6(1)(c)",
  "legal_obligation",
  "6(1)(d)",
  "vital_interests",
  "6(1)(e)",
  "public_task",
  "6(1)(f)",
  "legitimate_interests",
];

export const VALID_ART9_EXCEPTIONS = [
  "none",
  "9(2)(a)_explicit_consent",
  "9(2)(b)_employment_social_security",
  "9(2)(c)_vital_interests",
  "9(2)(f)_legal_claims",
  "9(2)(g)_substantial_public_interest",
  "9(2)(h)_health_or_social_care",
  "9(2)(i)_public_health",
  "9(2)(j)_archiving_research_statistics",
];

export const VALID_TRANSFER_SAFEGUARDS = [
  "none_eea_only",
  "adequacy_decision_art45",
  "eu_us_dpf",
  "scc_2021_914_module_1",
  "scc_2021_914_module_2",
  "scc_2021_914_module_3",
  "scc_2021_914_module_4",
  "bcr_art47",
  "derogation_art49",
];

/**
 * Tool 1: audit_gdpr_ropa_record
 * Validates a Record of Processing Activities (GDPR Art. 30) JSON string or object for mandatory fields:
 * 1. Controller name & contact details (Art. 30(1)(a))
 * 2. DPO contact details or documented exemption rationale (Art. 30(1)(a))
 * 3. Purposes of the processing (Art. 30(1)(b))
 * 4. Lawful basis under Art. 6 (and Art. 9 exception if special category data is processed)
 * 5. Categories of data subjects & personal data categories (Art. 30(1)(c))
 * 6. Categories of recipients (Art. 30(1)(d))
 * 7. Third-country transfers & transfer safeguards / SCCs / TIA (Art. 30(1)(e), Chapter V)
 * 8. Retention schedule / erasure time limits (Art. 30(1)(f))
 * 9. Technical and Organisational Measures - TOMs under Art. 32 (Art. 30(1)(g))
 */
export function auditGdprRopaRecord(args = {}) {
  const rawRecord = args.record ?? args.input;
  if (!rawRecord) {
    throw new Error("Missing required 'record' (object or JSON string) for audit_gdpr_ropa_record.");
  }

  let rec;
  if (typeof rawRecord === "string") {
    try {
      rec = JSON.parse(rawRecord);
    } catch (err) {
      throw new Error(`Invalid JSON string in 'record': ${err.message}`);
    }
  } else if (typeof rawRecord === "object" && !Array.isArray(rawRecord)) {
    rec = rawRecord;
  } else {
    throw new Error("'record' must be a JSON object or serialized JSON object string.");
  }

  const checks = [];
  const missingFields = [];
  const remediations = [];
  let totalPoints = 0;
  const maxPoints = 100;

  const addCheck = (id, article, label, weight, passed, missingKey, remediation) => {
    if (passed) {
      totalPoints += weight;
      checks.push({ id, article, label, weight, status: "PASS" });
    } else {
      checks.push({ id, article, label, weight, status: "FAIL", remediation });
      missingFields.push(missingKey);
      remediations.push({ field: missingKey, article, action: remediation });
    }
  };

  // 1. Controller Contact (12 pts)
  const ctrl = rec.controller || rec.controllerContact;
  const hasController =
    (typeof ctrl === "object" &&
      ctrl !== null &&
      typeof ctrl.name === "string" &&
      ctrl.name.trim().length > 1 &&
      typeof (ctrl.email || ctrl.contact || ctrl.address) === "string" &&
      String(ctrl.email || ctrl.contact || ctrl.address).trim().length > 2) ||
    (typeof ctrl === "string" && ctrl.trim().length >= 5);
  addCheck(
    "controller_contact",
    "Art. 30(1)(a)",
    "Controller name and contact details",
    12,
    hasController,
    "controller",
    "Provide controller.name and controller.email/contact/address as required by GDPR Art. 30(1)(a)."
  );

  // 2. DPO Contact (10 pts)
  const dpo = rec.dpo || rec.dpoContact;
  const hasDpo =
    (typeof dpo === "object" &&
      dpo !== null &&
      ((typeof dpo.email === "string" && dpo.email.includes("@")) ||
        (typeof dpo.contact === "string" && dpo.contact.trim().length > 2) ||
        dpo.exempt === true)) ||
    (typeof dpo === "string" && dpo.trim().length >= 3);
  addCheck(
    "dpo_contact",
    "Art. 30(1)(a) & Art. 37",
    "Data Protection Officer (DPO) contact or documented Art. 37 exemption",
    10,
    hasDpo,
    "dpo",
    "Specify dpo.name and dpo.email (or dpo.exempt=true with Art. 37 rationale)."
  );

  // 3. Purposes of processing (12 pts)
  const purposes = rec.purposes || rec.purpose;
  const hasPurposes =
    (Array.isArray(purposes) && purposes.length > 0 && purposes.every((p) => typeof p === "string" && p.trim().length >= 5)) ||
    (typeof purposes === "string" && purposes.trim().length >= 8);
  addCheck(
    "processing_purposes",
    "Art. 30(1)(b)",
    "Explicit, specific purposes of processing",
    12,
    hasPurposes,
    "purposes",
    "List specific processing purposes (non-empty string or array of strings, >=5 chars each) under Art. 30(1)(b)."
  );

  // 4. Lawful Basis under Art. 6 (14 pts)
  const rawBasis = String(rec.lawfulBasis || rec.art6Basis || "").trim().toLowerCase();
  const hasValidArt6 = VALID_ART6_BASES.some((b) => rawBasis.includes(b));
  const needsLia = rawBasis.includes("6(1)(f)") || rawBasis.includes("legitimate_interests") || rawBasis.includes("legitimate interest");
  const hasLiaWhenNeeded = !needsLia || Boolean(rec.liaCompleted || rec.legitimateInterestAssessment);
  addCheck(
    "lawful_basis_art6",
    "Art. 6(1)",
    "Valid GDPR Art. 6(1) lawful basis (plus LIA reference if relying on Art. 6(1)(f))",
    14,
    hasValidArt6 && hasLiaWhenNeeded,
    "lawfulBasis",
    needsLia && hasValidArt6
      ? "Lawful basis relies on Art. 6(1)(f) Legitimate Interests; add 'liaCompleted: true' or 'legitimateInterestAssessment' reference."
      : "Specify a valid GDPR Art. 6(1) lawful basis (e.g. '6(1)(a) consent', '6(1)(b) contract', '6(1)(c) legal_obligation', '6(1)(f) legitimate_interests')."
  );

  // 5. Special Categories under Art. 9 + Data Subjects & Categories (10 pts)
  const special = rec.specialCategories || rec.art9SpecialCategories;
  let specialValid = true;
  let specialMsg = "Document dataSubjects, dataCategories, and Art. 9 special category status (plus Art. 9(2) condition if processed).";
  const hasSubjectsAndCats =
    ((Array.isArray(rec.dataSubjects) && rec.dataSubjects.length > 0) ||
      (typeof rec.dataSubjects === "string" && rec.dataSubjects.trim().length > 2) ||
      special !== undefined) &&
    ((Array.isArray(rec.dataCategories) && rec.dataCategories.length > 0) ||
      (typeof rec.dataCategories === "string" && rec.dataCategories.trim().length > 2) ||
      special !== undefined);

  if (special === undefined) {
    specialValid = false;
  } else if (typeof special === "object" && special !== null) {
    if (special.processed === true) {
      const cond = String(special.art9Condition || special.exception || "").trim();
      if (cond.length < 3) {
        specialValid = false;
        specialMsg = "Special category data (Art. 9) is processed; must specify 'specialCategories.art9Condition' (e.g. '9(2)(a)_explicit_consent' or '9(2)(b)_employment').";
      }
    }
  } else if (typeof special === "boolean" && special === true) {
    if (!rec.art9Condition) {
      specialValid = false;
      specialMsg = "When specialCategories is true, provide 'art9Condition' under GDPR Art. 9(2).";
    }
  }

  addCheck(
    "special_categories_art9",
    "Art. 9 & Art. 30(1)(c)",
    "Special category data declaration (Art. 9) and data subject/category inventory",
    10,
    specialValid && hasSubjectsAndCats,
    "specialCategories",
    specialMsg
  );

  // 6. Categories of Recipients (10 pts)
  const recipients = rec.recipients || rec.recipientCategories;
  const hasRecipients =
    (Array.isArray(recipients) && recipients.length > 0) ||
    (typeof recipients === "string" && recipients.trim().length >= 3);
  addCheck(
    "recipients",
    "Art. 30(1)(d)",
    "Categories of recipients (internal teams, processors, or third-country recipients)",
    10,
    hasRecipients,
    "recipients",
    "List categories of recipients or sub-processors (or explicitly state 'internal_only') under Art. 30(1)(d)."
  );

  // 7. Third-country transfers & SCCs / Safeguards (12 pts)
  const transfers = rec.thirdCountryTransfers ?? rec.transfers;
  let transfersValid = false;
  let transferRemediation =
    "Document 'thirdCountryTransfers' (e.g. { enabled: false } for EEA-only, or { enabled: true, countries: ['US'], safeguard: 'scc_2021_914_module_2', tiaCompleted: true }).";
  if (transfers !== undefined && transfers !== null) {
    if (transfers === false || transfers === "none" || transfers === "none_eea_only") {
      transfersValid = true;
    } else if (typeof transfers === "object") {
      if (transfers.enabled === false || transfers.outsideEEA === false) {
        transfersValid = true;
      } else if (transfers.enabled === true || transfers.outsideEEA === true || Array.isArray(transfers.countries)) {
        const sg = String(transfers.safeguard || transfers.mechanism || "").toLowerCase();
        const hasCountries = Array.isArray(transfers.countries) && transfers.countries.length > 0;
        const hasSafeguard =
          sg.includes("scc") ||
          sg.includes("dpf") ||
          sg.includes("adequacy") ||
          sg.includes("bcr") ||
          sg.includes("art45") ||
          sg.includes("art46");
        transfersValid = hasCountries && hasSafeguard;
        if (!transfersValid) {
          transferRemediation =
            "Third-country transfer is enabled; provide non-empty 'thirdCountryTransfers.countries' and a valid Chapter V safeguard (e.g. 'scc_2021_914_module_2', 'eu_us_dpf', or 'adequacy_decision_art45').";
        }
      }
    }
  }
  addCheck(
    "third_country_transfers",
    "Art. 30(1)(e) & Chapter V (Art. 44-49)",
    "Third-country transfer inventory & Chapter V safeguard (SCCs / EU-US DPF / Adequacy)",
    12,
    transfersValid,
    "thirdCountryTransfers",
    transferRemediation
  );

  // 8. Retention Schedule (10 pts)
  const retention = rec.retentionSchedule || rec.retentionPeriod || rec.retention;
  const hasRetention =
    (typeof retention === "string" &&
      retention.trim().length >= 4 &&
      !/^(indefinite|forever|unlimited|tbd|todo|unknown)$/i.test(retention.trim())) ||
    (typeof retention === "object" &&
      retention !== null &&
      typeof (retention.period || retention.rule) === "string" &&
      String(retention.period || retention.rule).trim().length >= 3);
  addCheck(
    "retention_schedule",
    "Art. 30(1)(f) & Art. 5(1)(e)",
    "Defined retention schedule / erasure time limits (storage limitation)",
    10,
    hasRetention,
    "retentionSchedule",
    "Specify a concrete retention period or erasure trigger (e.g. '7 years post-invoice for tax law; 30 days for logs') — 'indefinite' or 'TBD' violates Art. 5(1)(e)."
  );

  // 9. Technical and Organisational Measures - TOMs under Art. 32 (10 pts)
  const toms = rec.toms || rec.technicalAndOrganisationalMeasures || rec.securityMeasures;
  const hasToms =
    (Array.isArray(toms) && toms.length >= 2 && toms.every((t) => typeof t === "string" && t.trim().length >= 4)) ||
    (typeof toms === "string" && toms.trim().length >= 12);
  addCheck(
    "toms_art32",
    "Art. 30(1)(g) & Art. 32",
    "Technical and Organisational Measures (encryption, RBAC/MFA, pseudonymisation, backups)",
    10,
    hasToms,
    "toms",
    "Document at least 2 concrete Art. 32 Technical & Organisational Measures (e.g. ['TLS 1.3 & AES-256 encryption', 'RBAC + MFA', 'Automated daily backups & DR testing'])."
  );

  const complianceScore = Math.max(0, Math.min(maxPoints, totalPoints));
  const grade =
    complianceScore >= 90
      ? "A"
      : complianceScore >= 75
      ? "B"
      : complianceScore >= 60
      ? "C"
      : complianceScore >= 40
      ? "D"
      : "F";

  return {
    activityName: rec.activityName || rec.name || "Unnamed Processing Activity",
    compliant: missingFields.length === 0 && complianceScore === 100,
    complianceScore,
    grade,
    passedChecksCount: checks.filter((c) => c.status === "PASS").length,
    totalChecksCount: checks.length,
    missingFields,
    remediations,
    checks,
    disclaimer: LEGAL_DISCLAIMER,
  };
}

/**
 * Known Cookie & Tracker Knowledge Base for Tool 2
 */
const COOKIE_CATALOG = [
  {
    match: /^(cf_clearance|__cf_bm|__cfruid)$/i,
    category: "Strictly Necessary",
    vendor: "Cloudflare",
    purpose: "Bot mitigation, WAF security challenge clearance, and DDoS protection.",
    priorConsentRequired: false,
    ePrivacyBasis: "ePrivacy Directive Art. 5(3) Exemption (Strictly necessary for security/delivery requested by subscriber) + GDPR Art. 6(1)(f)",
    typicalDuration: "30 minutes to 1 year",
  },
  {
    match: /^(__stripe_mid|__stripe_sid|stripe_mid|stripe_sid)$/i,
    category: "Strictly Necessary",
    vendor: "Stripe",
    purpose: "Payment fraud prevention and checkout session integrity.",
    priorConsentRequired: false,
    ePrivacyBasis: "ePrivacy Directive Art. 5(3) Exemption (Strictly necessary for payment execution & fraud prevention) + GDPR Art. 6(1)(b)/(f)",
    typicalDuration: "30 minutes (__stripe_sid) to 1 year (__stripe_mid)",
  },
  {
    match: /^(PHPSESSID|JSESSIONID|connect\.sid|__Host-session|__Secure-next-auth\.session-token|csrf_token|XSRF-TOKEN|OptanonConsent|CookieConsent)$/i,
    category: "Strictly Necessary",
    vendor: "First-Party Application / CMP",
    purpose: "Authenticated user session state, CSRF protection, or storing user cookie consent preferences.",
    priorConsentRequired: false,
    ePrivacyBasis: "ePrivacy Directive Art. 5(3) Exemption (Strictly necessary for service requested by user)",
    typicalDuration: "Session to 1 year (consent state)",
  },
  {
    match: /^(_ga|_ga_[A-Z0-9]+|_gid|_gat.*)$/i,
    category: "Analytics",
    vendor: "Google Analytics (GA4 / Universal)",
    purpose: "Distinguishes unique users, tracks session counts, pageviews, and campaign attribution.",
    priorConsentRequired: true,
    ePrivacyBasis: "Prior opt-in consent required under ePrivacy Directive Art. 5(3) & GDPR Art. 6(1)(a)",
    typicalDuration: "24 hours (_gid) to 2 years (_ga)",
  },
  {
    match: /^(ph_.*|posthog.*)$/i,
    category: "Analytics",
    vendor: "PostHog",
    purpose: "Product analytics, funnel tracking, feature flag persistence, and session replay.",
    priorConsentRequired: true,
    ePrivacyBasis: "Prior opt-in consent required under ePrivacy Directive Art. 5(3) & GDPR Art. 6(1)(a) when using persistent client storage",
    typicalDuration: "1 year",
  },
  {
    match: /^(mp_.*|mixpanel.*|amplitude_id.*|_hjSession.*|_hjIncludedIn.*|_clck|_clsk)$/i,
    category: "Analytics",
    vendor: "Mixpanel / Amplitude / Hotjar / Microsoft Clarity",
    purpose: "Behavioral telemetry, heatmaps, and product usage analytics.",
    priorConsentRequired: true,
    ePrivacyBasis: "Prior opt-in consent required under ePrivacy Directive Art. 5(3) & GDPR Art. 6(1)(a)",
    typicalDuration: "Session to 1 year",
  },
  {
    match: /^(_fbp|_fbc|fr)$/i,
    category: "Marketing",
    vendor: "Meta (Facebook Pixel)",
    purpose: "Cross-site ad retargeting, conversion attribution, and audience profiling.",
    priorConsentRequired: true,
    ePrivacyBasis: "Prior explicit opt-in consent required under ePrivacy Directive Art. 5(3) & GDPR Art. 6(1)(a)",
    typicalDuration: "90 days",
  },
  {
    match: /^(_gcl_au|_gcl_aw|IDE|test_cookie|_uetvid|_uetsid|_ttp|_tt_enable_cookie|li_fat_id|bcookie|__hssc|__hssrc|__hstc|hubspotutk)$/i,
    category: "Marketing",
    vendor: "Google Ads / Microsoft Ads / TikTok / LinkedIn / HubSpot",
    purpose: "Advertising conversion linker, cross-site behavioral retargeting, and marketing automation tracking.",
    priorConsentRequired: true,
    ePrivacyBasis: "Prior explicit opt-in consent required under ePrivacy Directive Art. 5(3) & GDPR Art. 6(1)(a)",
    typicalDuration: "Session to 13 months",
  },
  {
    match: /^(intercom-id-.*|intercom-session-.*|crisp-client.*|locale|NEXT_LOCALE|i18n_redirected|ui_theme|player_volume)$/i,
    category: "Functional",
    vendor: "First-Party UI / Customer Chat Widget (Intercom / Crisp)",
    purpose: "Remembers user-selected language, UI preferences, or live support chat widget state.",
    priorConsentRequired: true,
    ePrivacyBasis: "Prior opt-in consent under ePrivacy Art. 5(3) for third-party chat widgets; short-term first-party locale selection requested by user may qualify for functional exemption",
    typicalDuration: "Session to 1 year",
  },
];

/**
 * Tool 2: classify_cookies_and_trackers
 * Classifies a list of cookie/script names into Strictly Necessary, Analytics, Marketing, or Functional
 * with ePrivacy Directive Art. 5(3) and GDPR Art. 6(1)(a) consent requirements.
 */
export function classifyCookiesAndTrackers(args = {}) {
  const rawList = args.cookies ?? args.trackers ?? args.names;
  if (!Array.isArray(rawList) || rawList.length === 0) {
    throw new Error("Provide a non-empty array of cookie or script names in 'cookies' (e.g. ['_ga', '_fbp', 'cf_clearance']).");
  }

  const classifications = rawList.map((rawName) => {
    const name = String(rawName || "").trim();
    if (!name) {
      return {
        name: "",
        category: "Unknown",
        vendor: "Unknown",
        purpose: "Empty identifier",
        priorConsentRequired: true,
        ePrivacyBasis: "Requires audit",
      };
    }

    for (const rule of COOKIE_CATALOG) {
      if (rule.match.test(name)) {
        return {
          name,
          category: rule.category,
          vendor: rule.vendor,
          purpose: rule.purpose,
          priorConsentRequired: rule.priorConsentRequired,
          ePrivacyBasis: rule.ePrivacyBasis,
          typicalDuration: rule.typicalDuration,
          cmpBannerBucket: rule.category.toLowerCase().replace(/\s+/g, "_"),
        };
      }
    }

    // Heuristic fallback for unrecognized cookies
    const lower = name.toLowerCase();
    if (lower.includes("sess") || lower.includes("csrf") || lower.includes("xsrf") || lower.includes("auth")) {
      return {
        name,
        category: "Strictly Necessary",
        vendor: "First-Party Application (Heuristic)",
        purpose: "Authentication or security session state.",
        priorConsentRequired: false,
        ePrivacyBasis: "ePrivacy Directive Art. 5(3) Exemption (Strictly necessary for user-initiated session/security)",
        typicalDuration: "Session",
        cmpBannerBucket: "strictly_necessary",
      };
    }
    if (lower.includes("ad") || lower.includes("pixel") || lower.includes("utm") || lower.includes("mkt")) {
      return {
        name,
        category: "Marketing",
        vendor: "Unrecognized Ad/Marketing Tracker (Heuristic)",
        purpose: "Marketing attribution or advertising identifier.",
        priorConsentRequired: true,
        ePrivacyBasis: "Prior opt-in consent required under ePrivacy Directive Art. 5(3) & GDPR Art. 6(1)(a)",
        typicalDuration: "Up to 13 months",
        cmpBannerBucket: "marketing",
      };
    }
    if (lower.includes("stat") || lower.includes("metric") || lower.includes("analytic") || lower.includes("telemetry")) {
      return {
        name,
        category: "Analytics",
        vendor: "Unrecognized Analytics Tracker (Heuristic)",
        purpose: "Usage analytics and telemetry.",
        priorConsentRequired: true,
        ePrivacyBasis: "Prior opt-in consent required under ePrivacy Directive Art. 5(3) & GDPR Art. 6(1)(a)",
        typicalDuration: "Up to 13 months",
        cmpBannerBucket: "analytics",
      };
    }

    return {
      name,
      category: "Functional",
      vendor: "Custom / Unclassified Cookie (Default Safe Mode)",
      purpose: "Unrecognized cookie; defaults to requiring prior consent until vendor & purpose are verified.",
      priorConsentRequired: true,
      ePrivacyBasis: "Prior opt-in consent recommended under ePrivacy Directive Art. 5(3) until proven strictly necessary",
      typicalDuration: "Verify in browser DevTools",
      cmpBannerBucket: "functional",
    };
  });

  const summaryByCategory = {
    "Strictly Necessary": classifications.filter((c) => c.category === "Strictly Necessary").length,
    Analytics: classifications.filter((c) => c.category === "Analytics").length,
    Marketing: classifications.filter((c) => c.category === "Marketing").length,
    Functional: classifications.filter((c) => c.category === "Functional").length,
  };

  const requiresConsentBanner = classifications.some((c) => c.priorConsentRequired);

  return {
    totalScanned: classifications.length,
    requiresConsentBanner,
    priorConsentCount: classifications.filter((c) => c.priorConsentRequired).length,
    exemptStrictlyNecessaryCount: summaryByCategory["Strictly Necessary"],
    summaryByCategory,
    classifications,
    cmpImplementationGuidance: requiresConsentBanner
      ? "Block all Analytics, Marketing, and non-exempt Functional scripts/cookies until the user grants affirmative opt-in consent via an ePrivacy/GDPR-compliant CMP (no pre-ticked boxes; equal 'Reject All' & 'Accept All' prominence)."
      : "Only Strictly Necessary cookies detected; disclose them in your Privacy/Cookie Notice, though prior opt-in blocking is not required under ePrivacy Art. 5(3).",
    disclaimer: LEGAL_DISCLAIMER,
  };
}

/**
 * Tool 3: generate_dpa_scc_checklist
 * Generates a deterministic GDPR Art. 28 Data Processing Agreement & Cross-Border Transfer
 * (EU->US DPF / SCC Module 1-4) audit checklist.
 */
export function generateDpaSccChecklist(args = {}) {
  const exporterRole = String(args.exporterRole || "controller").toLowerCase().trim();
  const importerRole = String(args.importerRole || "processor").toLowerCase().trim();
  const destinationCountry = String(args.destinationCountry || "US").toUpperCase().trim();
  const dpfCertified = Boolean(args.dpfCertified);
  const includesSubprocessors = args.includesSubprocessors !== false;

  // Determine applicable EU Standard Contractual Clauses (Commission Implementing Decision (EU) 2021/914) module
  let sccModule = "Module 2: Controller-to-Processor (C2P)";
  if (exporterRole === "controller" && importerRole === "controller") {
    sccModule = "Module 1: Controller-to-Controller (C2C)";
  } else if (exporterRole === "controller" && importerRole === "processor") {
    sccModule = "Module 2: Controller-to-Processor (C2P)";
  } else if (exporterRole === "processor" && importerRole === "processor") {
    sccModule = "Module 3: Processor-to-Processor (P2P)";
  } else if (exporterRole === "processor" && importerRole === "controller") {
    sccModule = "Module 4: Processor-to-Controller (P2C)";
  }

  const eeaCountries = new Set([
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IE",
    "IT", "LV", "LI", "LT", "LU", "MT", "NL", "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  ]);
  const adequacyCountries = new Set(["AD", "AR", "CA", "FO", "GG", "IL", "IM", "JP", "JE", "NZ", "KR", "CH", "GB", "UK", "UY"]);

  let transferMechanism;
  let tiaRequired = true;
  if (eeaCountries.has(destinationCountry)) {
    transferMechanism = "Intra-EEA Transfer (No Chapter V cross-border safeguard required)";
    tiaRequired = false;
  } else if (destinationCountry === "US" && dpfCertified) {
    transferMechanism =
      "EU-U.S. Data Privacy Framework (DPF) Adequacy Decision (Art. 45) — verify active DataPrivacyFramework.gov certification & HR data scope";
    tiaRequired = false;
  } else if (adequacyCountries.has(destinationCountry)) {
    transferMechanism = `European Commission Adequacy Decision under GDPR Art. 45 (${destinationCountry})`;
    tiaRequired = false;
  } else {
    transferMechanism = `EU Standard Contractual Clauses (Decision (EU) 2021/914) — ${sccModule} + Transfer Impact Assessment (TIA)`;
    tiaRequired = true;
  }

  const art28Checklist = [
    {
      id: "ART28-01",
      clause: "GDPR Art. 28(3) Preamble",
      requirement: "Subject-matter, duration, nature, purpose, data types & data subject categories",
      verificationCheck: "Verify Annex I / Schedule 1 explicitly lists categories of data subjects, personal data types, and duration of processing.",
    },
    {
      id: "ART28-02",
      clause: "GDPR Art. 28(3)(a)",
      requirement: "Documented instructions only",
      verificationCheck: "Confirm Processor may process Personal Data solely on documented instructions from Controller (including regarding third-country transfers).",
    },
    {
      id: "ART28-03",
      clause: "GDPR Art. 28(3)(b)",
      requirement: "Confidentiality commitment",
      verificationCheck: "Ensure all personnel authorized to process Personal Data are bound by statutory or contractual confidentiality.",
    },
    {
      id: "ART28-04",
      clause: "GDPR Art. 28(3)(c) & Art. 32",
      requirement: "Security of processing (TOMs)",
      verificationCheck: "Verify Annex II specifies concrete Technical & Organisational Measures (encryption in transit/at rest, access control, incident response).",
    },
    {
      id: "ART28-05",
      clause: "GDPR Art. 28(2) & 28(3)(d)",
      requirement: includesSubprocessors
        ? "Sub-processor authorization (Specific or General Written Authorization + Objection Window)"
        : "Strict prohibition on sub-processing without prior written consent",
      verificationCheck: includesSubprocessors
        ? "Check that DPA specifies prior notice period (e.g. 14-30 days) for sub-processor changes, right to object, and flow-down of equivalent Art. 28 obligations."
        : "Confirm DPA prohibits engaging any sub-processor without prior specific written authorization.",
    },
    {
      id: "ART28-06",
      clause: "GDPR Art. 28(3)(e)",
      requirement: "Assistance with Data Subject Rights (DSARs - Chapter III)",
      verificationCheck: "Confirm Processor assists Controller with access, rectification, erasure, restriction, and portability requests.",
    },
    {
      id: "ART28-07",
      clause: "GDPR Art. 28(3)(f) & Art. 33-36",
      requirement: "Personal Data Breach notification & DPIA assistance",
      verificationCheck: "Verify breach notification SLA (e.g. without undue delay / within 24-48 hours) so Controller can meet the 72-hour Art. 33 supervisory authority deadline.",
    },
    {
      id: "ART28-08",
      clause: "GDPR Art. 28(3)(g)",
      requirement: "Deletion or return of data at termination",
      verificationCheck: "Confirm Controller can choose deletion or return of all Personal Data (and deletion of existing copies) upon contract termination.",
    },
    {
      id: "ART28-09",
      clause: "GDPR Art. 28(3)(h)",
      requirement: "Audit & inspection rights",
      verificationCheck: "Ensure Processor makes available all information necessary to demonstrate compliance and allows audits/inspections (not restricted solely to summary SOC2 reports).",
    },
  ];

  const crossBorderChecklist = [
    {
      id: "XFER-01",
      clause: "GDPR Art. 44-46",
      requirement: "Valid Transfer Mechanism Selection",
      verificationCheck: `Selected mechanism: ${transferMechanism}.`,
    },
    {
      id: "XFER-02",
      clause: "Decision (EU) 2021/914 Annex I.A / I.B / I.C",
      requirement: `SCC Module Alignment (${sccModule})`,
      verificationCheck: `Ensure ${sccModule} is selected, docking clause (Clause 7) preference is stated, governing EU Member State law (Clause 17) and forum (Clause 18) are completed, and competent Supervisory Authority (Annex I.C) is named.`,
    },
    {
      id: "XFER-03",
      clause: "SCC Clause 14 (Schrems II / EDPB Recommendations 01/2020)",
      requirement: tiaRequired
        ? "Mandatory Transfer Impact Assessment (TIA) & Supplementary Measures"
        : "Periodic Adequacy / DPF Certification Monitoring",
      verificationCheck: tiaRequired
        ? `Document a Transfer Impact Assessment for ${destinationCountry} evaluating public-authority surveillance laws, plus supplementary encryption (BYOK/HYOK or end-to-end TLS + encryption at rest) and government access challenge procedures (Clause 15).`
        : destinationCountry === "US" && dpfCertified
        ? "Verify importer's active status on DataPrivacyFramework.gov annually and maintain backup 2021 SCCs in case DPF certification lapses."
        : `Verify ongoing validity of the European Commission adequacy decision for ${destinationCountry}.`,
    },
  ];

  return {
    exporterRole,
    importerRole,
    destinationCountry,
    dpfCertified,
    recommendedSccModule: sccModule,
    transferMechanism,
    tiaRequired,
    totalChecklistItems: art28Checklist.length + crossBorderChecklist.length,
    art28Checklist,
    crossBorderChecklist,
    disclaimer: LEGAL_DISCLAIMER,
  };
}
