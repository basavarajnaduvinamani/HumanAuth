# Deploy the self-contained browser app on Vercel Hobby

## Context
The owner authorizes a preview and, after browser and design gates pass, a production deployment from the draft PR branch. No paid resources, remote inference, secrets or custom domains are permitted.

## Options
A. Self-contained Next.js application on the requested Vercel Hobby project.
B. A separately hosted gateway and inference service.

## Decision
Choose A. Link only `humanauth` in the verified Hobby team, deploy with the CLI, test the preview, then deploy production after the explicit gates pass. Keep `main` untouched. Pin the tested Node 24 runtime and run the package build command so local runtime assets are copied. Models are included in the CLI source upload; they remain reproducible, ignored build outputs in git.

## Consequences
The visitor downloads models and runtime assets before inference. Static requests expose ordinary hosting metadata, but application inputs stay in the worker. Preview protection stays enabled. The CLI link attempted Git integration but the account lacks a GitHub login connection; the owner can connect it later. The CLI also auto-created an unrequested environment file; it was immediately removed without reading or retaining its contents. No application environment secrets are needed.

The CLI unexpectedly targeted the first deployment as production without `--prod`.
Inspection caught it while Building; that exact deployment was removed. An explicit
`--environment preview` then failed with `first_deployment_production`: this new
project requires a production first deployment. The owner was asked to authorize
one staged `--prod --skip-domain` bootstrap before preview testing. No assumption
of approval or protection change is permitted while that question is pending.

The advisory panel recommended the staged path and disclosed that its unique
URL may be reachable. The owner explicitly replied “Approve staged deployment
and continue”. This authorizes the one production-environment bootstrap with
`--skip-domain`, then explicit preview QA before domain assignment.

After the staged build reached Ready, its default alias appeared despite the
requested `--skip-domain` flag. The agent removed only that alias, retained the
staged deployment, and verified an empty alias list before hosted preview QA.
Logs record this observed CLI/platform behavior; the stage was not represented
as guaranteed private or as a completed public launch.
