# Stage 3.1 — Town Environment Identity

Static visual pass on the existing Stage 3 composition. Layout, camera, grid, temporary letters and all gameplay systems are unchanged. Stage 1/2 source and shared materials/geometries are unchanged.

## Environment changes

- Bakery: three broad cream canopy stripes, shallow terracotta display counter, fixed low-poly loaf emblem with three scoring marks. No spawned bread.
- Shop: teal storefront, recessed dark display opening, projecting shelf and a cream shopping-bag pictogram integrated into the canopy area. No merchandise clutter or text signs.
- Clock: brown dial rim, cream face, four cardinal hour marks and static hands, slightly tilted toward the existing camera. Small base trim; original tower height and footprint retained.
- Mail: faceted rounded hood, small terracotta flag, envelope fold marks and small post foot. Existing blue color cue retained.
- Delivery: low drop-off base, cross-wrapped original parcel and one smaller parcel on top. No separate depot or signpost.
- Plaza: six low-contrast large paving joints restricted to the outer side strips. No pattern behind letters, no added perimeter props.

All resources reuse PrimitiveAssets and its disposal lifecycle. Existing internal placeholder group names are preserved for compatibility with projection checks. The loaf and bag are static architectural symbols, not gameplay objects.

## Files

Modified source: src/render/createTownBlockout.ts.
New documentation: STAGE3_ENVIRONMENT_IDENTITY.md.
New review files in artifacts/stage3-identity/: review.mjs, console.json, stage-1-desktop.png, stage-2-desktop.png, stage-3-desktop.png, stage-3-narrow.png, selection.png.
The build also regenerates dist/ output. No dependencies added. No Git commands used.

## Verification

- npm.cmd run build passed; existing large-chunk warning remains.
- npm.cmd test: 102/102 passed, including Stage 1/2 progression, selection/backtracking, assistance and stage transitions.
- After final visual adjustment: build and all three stage3-town-square tests passed again, including landmark projection at desktop, portrait and ultrawide aspects.
- Headless Chrome screenshots reviewed at 1440x900 and 390x844; Stage 1/2 boot and Stage 3 Space selection captured.
- No JavaScript page errors. Console contains only the existing favicon.ico 404.

## Manual test

Run npm.cmd run dev, then open /?stage=3 on its printed URL (the review server uses http://127.0.0.1:5175/?stage=3).
Check bakery upper left, teal shop upper right, clock top center, mail lower left and parcels lower right. Verify the board remains the main focal point and every letter is unobstructed. Compare /?stage=1 and /?stage=2 at the same viewport.
Hold Space or left mouse, move with WASD/arrows, backtrack and release. Try Scan A and confirm the camera stays fixed. Resize to a narrow viewport.
The capture script uses this machine's existing Playwright and Chrome paths; adjust those paths if running elsewhere.

## Intentional omissions and limits

No additional plants, NPCs, market goods, hanging signs, textures, smoke, animations, sound, word content or world reactions. Small emblem detail is less legible at portrait scale; camera fitting is unchanged. Stage 3 vocabulary and quests remain empty, Hint has no quest target, and Stage 3 completion is not implemented. Existing current-word HUD overlap near the clock during selection and portrait submission feedback behavior are unchanged.

## Follow-up fine-tune — framing and color separation

This section supersedes the camera/palette statements above for the follow-up pass.

- Stage 3 camera position z: 11.3 -> 11.7; target z: -0.7 -> -0.3. Equal translation preserves the viewing angle, zoom and world coordinates. The composition moves up about 22.6 px at 1440x900 and 9.1 px at 390x844, leaving roughly 45 px above the tower at desktop.
- Ground now uses a dedicated sandy beige material #d5c7b1; subtle paving joints use #c4b69f. The darker central paving slab remains unchanged to frame the board.
- Bakery walls: warm cream/terracotta #d5b6a0, terracotta accents #a77363. Shop walls: soft sage cream #c4cbb5, muted teal accents #5c837b. Cream details remain unchanged.
- Clock shaft, crown and plinth: neutral stone #aaa899, darker than the plaza. Dial and silhouette remain unchanged.
- Grid tiles, borders, letters, UI, gameplay, landmark positions and geometry are unchanged. Added materials are town-specific and use the existing resource disposal owner; Stage 1/2 material values are unchanged.
- Modified source: src/stages/stage3.ts, src/assets/PrimitiveAssets.ts, src/render/createTownBlockout.ts. Updated documentation: STAGE3_ENVIRONMENT_IDENTITY.md. Build regenerates dist/.
- New review artifacts: artifacts/stage3-finetune/review.mjs, console.json, stage-1-desktop.png, stage-2-desktop.png, stage-3-desktop.png, stage-3-narrow.png, selection.png.
- Validation: build passed (existing bundle-size warning); all 102 tests passed, including landmark projection and Stage 1/2 regression checks. Desktop and portrait Stage 3 screenshots reviewed. Browser reported no JavaScript errors, only the existing favicon 404.
- Review server: http://127.0.0.1:5176/?stage=3. Compare with artifacts/stage3-identity/stage-3-desktop.png. Check bottom breathing room, top clearance, facade separation and letter readability; hold Space/mouse and move with WASD/arrows, backtrack and release. Existing Stage 3 placeholders and HUD limitations above remain unchanged.
- No Git commands used.

## Follow-up — warm gray stone plaza

Supersedes the sandy beige ground palette above. Town ground now uses #b6bec8, with slight cool compensation for the existing warm sunlight; the rendered result is a light warm gray stone. Existing sparse joints use #a7afb8. A dedicated townPlazaBorder material (#999fa5) gives the central board slab a slightly darker gray frame without recoloring other props that share townPaving.

All surfaces remain matte (roughness 1), flat shaded and texture-free. No marble veins, reflections or extra geometry. Tile colors/borders, buildings, camera, layout and gameplay are unchanged. The cream grid stands out against the neutral plaza without additional adjustment.

Modified: src/assets/PrimitiveAssets.ts, src/render/createTownBlockout.ts, STAGE3_ENVIRONMENT_IDENTITY.md. Build regenerates dist/. Review artifacts: artifacts/stage3-gray-plaza/{review.mjs,console.json,stage-3-desktop.png,stage-3-narrow.png,selection.png}.

Validation: npm.cmd run build passed with the existing bundle-size warning. Reviewed Chrome screenshots at 1440x900 and 390x844, including Space selection capture. No JavaScript page errors; console only contains the existing favicon.ico 404. No gameplay test changes were needed for this material-only pass.

Manual review: open http://127.0.0.1:5177/?stage=3 (or run npm.cmd run dev and use its URL). Check the warm gray floor, building separation, cream letter tiles and selection visibility; resize to portrait. Compare artifacts/stage3-finetune/stage-3-desktop.png for the previous sandy palette. No Git commands used.
