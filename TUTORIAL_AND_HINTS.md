# Welcome, tutorial and hint rewards

Normal entry now shows a cottage welcome screen before Stage 1. Learn & play opens
an isolated CAT practice board; Skip tutorial enters the cottage immediately.
The game is not mounted until the player leaves the welcome flow. Development
`?stage=N` links still open directly for existing stage reviews.

The tutorial explains reading clues, tapping WASD/arrows, holding Space or the
left mouse button to build a word, releasing to submit, hints, scans and shards.
English instructions include Thai explanations. The keyboard practice board has
no effect on quests or resources. How to play reopens it during gameplay; Escape
closes it. There is no saved tutorial-completion flag: reload starts a new session.
Desktop keyboard/mouse and WebGL 2 remain required.

Hint still costs one shard and reveals one more prefix letter of the selected
available quest, stopping before the last letter. Scan still costs one shard and
highlights matches for three seconds. The starting balance remains two shards.
Each newly solved quest now awards one shard; duplicate submissions cannot award
again. Optional Room Discoveries retain their one-time rewards. Their HUD now
shows one-based row and column coordinates (count from the top-left of the board).
Balances carry forward between stages. No purchases or advertisements are used.

The welcome illustration is CSS artwork matching the existing warm cottage UI.
The requested reference image was not attached, so its layout is provisional.

Verification: production build and all 204 automated tests pass, including a new
reward/reuse/ledger regression. Vite reports the existing large bundle warning.
Browser visual/playthrough checks remain pending: the environment has no installed
Chromium and the Playwright browser download returned an invalid archive.
