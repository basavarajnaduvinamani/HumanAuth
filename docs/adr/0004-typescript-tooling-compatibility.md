# Native TypeScript with compiler API compatibility

## Context
Latest stable TypeScript 7.0.2 has a native compiler but no JavaScript compiler API. The current Next.js ESLint ecosystem requires the older compiler API. Node 22.14 on the workstation is below latest Lighthouse's engine floor.

## Options
A. Downgrade TypeScript and Lighthouse.
B. Use Microsoft's documented side-by-side stable compiler/API aliases and a project-local Node 24 binary.

## Decision
Choose B: @typescript/native aliases typescript 7.0.2, while typescript aliases @typescript/typescript6 6.0.2. tsc remains the native compiler; lint and Next.js can import the compatibility API. Pin Node 24.22.2 locally and use Node 24 on Vercel/CI. Follow https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0 .

## Consequences
The lockfile records both stable versions. ESLint plugins emit peer-range warnings for ESLint 10; passing lint is required, never bypassed. No system Node replacement is needed.
