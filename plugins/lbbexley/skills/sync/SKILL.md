---
name: sync
description: Brings the latest version of this Bexley service from the dev environment into the repository - the solution with pac solution sync, and a canvas app's source with Microsoft's canvas tools - so it's reviewed, committed and pushed. Use after someone changed the service in the dev environment themselves, for example in Power Apps Studio or the flow designer, or when asked to sync or save the latest version.
---

# Bring in the latest version

Everything is built in the dev environment. The repository keeps the guidelines and the latest version, so every change is reviewed and kept. When the assistant changes the dev environment, the end-of-run check asks for this sync by itself. Use this skill when the change was made some other way.

1. **Check where `pac` is connected.** Run `pac env who` (`pac org who` on older versions). It must be the dev environment named in `AGENTS.md`. If it isn't, stop and tell the person how to switch: `pac org select --environment <dev environment>`.
2. **The solution.** If there's no `src/solution` yet, clone the solution named in `AGENTS.md` into it with `pac solution clone`. Otherwise run `pac solution sync` in the solution's folder under `src/solution`.
3. **Canvas apps.** The solution has each app as a packed file that Git ignores, so its readable source comes through Microsoft's canvas tools. For each app that changed, if the canvas tools are connected to it, sync it into its folder, `src/canvas/<AppName>/`. If they aren't, say which app wasn't brought in, and that `/configure-canvas-mcp` with the app open in Power Apps Studio connects them.
4. **Power Pages.** The site's source in `src/` is what was uploaded. If someone changed the site in the design studio, and nothing in `src/` is waiting to be uploaded, download it with `pac pages download` into the same folder.
5. **Don't edit what came in.** To change something, change it in the dev environment and sync again. <!-- claude-only -->The end-of-run check then reviews the changes, and asks for them to be committed and pushed.<!-- /claude-only --><!-- copilot: Then offer **Check my work**: lbbexley-check reviews the changes, and offers **Commit the work**, which commits and pushes them. -->
