# Start here

This folder is the seed of the `attack-learner` repo. It already contains:

- `docs/superpowers/specs/2026-10-17-attack-learner-design.md`: the approved design.
- `docs/superpowers/plans/2026-10-17-attack-learner.md`: the 17-task implementation plan.
- `docs/design/screens/*.png`: the screen concepts as images.
- `docs/design/source/*.dc.html`: the source files for those screens.

## On your laptop

1. Put this folder somewhere, for example `~/projects/attack-learner`, and `cd` into it.
2. Check that the GitHub CLI is logged in: `gh auth status`. If it isn't, run `gh auth login`.
3. Check that Node 22 is installed (`node -v`). Java 21 is only needed if you ever build the APK locally; GitHub builds it for you.
4. Start Claude Code in this folder and paste:

> Read `docs/superpowers/specs/2026-10-17-attack-learner-design.md` and execute `docs/superpowers/plans/2026-10-17-attack-learner.md` task by task using superpowers:subagent-driven-development. Create the public GitHub repo in Task 1 with my gh login. Stop and ask me at Task 9 (wording review) and Task 16 (keystore creation).
