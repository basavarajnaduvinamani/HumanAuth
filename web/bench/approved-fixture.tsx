// Review artifact only. Never imported by the application.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFile } from "node:fs/promises";
import { ResultSheet } from "../src/components/result-sheet";
import { result } from "../src/lib/types";
const rows = [
  result("face", 0.9, true, "Fusion unit-test input; no model was run."),
  result("document", 0.8, true, "Fusion unit-test input; no model was run."),
  result("voice", 0.95, true, "Fusion unit-test input; no model was run."),
].map((r) => ({ ...r, backend: "Fusion test fixture" }));
void writeFile(
  "../.overnight/approved-fixture.html",
  renderToStaticMarkup(
    <article className="wrap prose">
      <h1>Verified layout — fusion unit-test illustration</h1>
      <p>
        Not model inference. Inputs copied from all_pass_approves in
        web/src/lib/fusion.test.ts.
      </p>
      <ResultSheet results={rows} />
    </article>,
  ),
);
