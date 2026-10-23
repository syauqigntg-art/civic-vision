import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/report-full-dependency-audit.mjs <npm-audit-json>");
  process.exitCode = 2;
} else {
  let report;
  try {
    report = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error("Could not parse npm audit JSON:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 2;
  }

  if (report) {
    const metadata = report.metadata?.vulnerabilities;
    const vulnerabilities = Object.values(report.vulnerabilities || {});
    console.log("CIVIC VISION full dependency-tree audit (triage report)");
    console.log(JSON.stringify({
      totals: metadata || null,
      packageCount: vulnerabilities.length,
      auditError: report.error || null,
    }, null, 2));

    for (const item of vulnerabilities.sort((a, b) => {
      const rank = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
      return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9) || a.name.localeCompare(b.name);
    })) {
      console.log([
        `PACKAGE: ${item.name}`,
        `severity=${item.severity}`,
        `direct=${Boolean(item.isDirect)}`,
        `range=${item.range || "unknown"}`,
        `fixAvailable=${JSON.stringify(item.fixAvailable ?? null)}`,
        `nodes=${(item.nodes || []).join(", ") || "unknown"}`,
      ].join(" | "));
      for (const advisory of item.via || []) {
        if (typeof advisory === "string") {
          console.log(`  dependency: ${advisory}`);
        } else {
          console.log(`  advisory: ${advisory.name || "unknown"} | ${advisory.severity || "unknown"} | ${advisory.title || "untitled"} | ${advisory.url || "no URL"} | range=${advisory.range || "unknown"}`);
        }
      }
      if (item.fixAvailable && typeof item.fixAvailable === "object") {
        console.log(`  recommended fix target: ${JSON.stringify(item.fixAvailable)}`);
      }
    }

    if (vulnerabilities.length > 0 || report.error) {
      console.log("::warning::Full dependency-tree audit has findings or an audit error; review this report before considering Phase 4 complete.");
    }
  }
}
