# King of the Jungle V2

Independent rebuild foundation for the browser game. Technology: HTML5 Canvas + vanilla JavaScript, deployable to Netlify as a static site.

## Run locally

Open `game/index.html` in a modern browser, or serve the `game` directory with a local static server. No build step or package install is required.

## Current V2 foundation
- New dark cinematic jungle presentation and responsive menus.
- Original eleven-animal roster preserved: Badger, Wolf, Hyena, Leopard, Jaguar, Crocodile, Lion, Tiger, Grizzly, Hippo, Elephant.
- Two-player local character selection and versus prototype.
- Canvas arena, health bars, timer, movement, jump, block, attack, special attack, pause, rematch, and winner screen.
- Approved lion master and turnaround reference images included.

## Controls
Player 1: A/D move, W jump, S block, F attack, G special.
Player 2: Left/Right move, Up jump, Down block, K attack, L special.

## Important scope notes
This is the clean V2 foundation, not a finished commercial game. Tower mode currently opens the same local match flow with a Tower label; AI opponents and tower progression are not implemented yet. Online multiplayer, controller/gamepad mapping, audio, production-grade animal art, animation-state integration, hitbox tuning, and finishers remain planned work. The current canvas fighters are temporary combat placeholders, not final character art. The seven generated lion animation sheets are visual references and are not yet frame-extracted or wired into gameplay.

## Netlify
Deploy the contents of the `game` folder as the site publish directory. Keep the original site's deployment unchanged until V2 has been tested. The original source archive should be retained separately as `KingOfTheJungle_Original_Backup.zip`.

### Lion integration update
The approved original lion is now integrated into the arena as the actual in-game fighter whenever selected. A transparent gameplay cutout was created from the approved master image. The current in-game pose is the approved upright guard stance with subtle idle movement. The seven dedicated animation sequences are the next integration step and are not yet fully wired into the combat engine.


## Badger arena milestone

The V2 arena renderer now has layered jungle-temple scenery, a central waterfall, torch lighting, stone floor, and a lion-medallion floor motif. The Badger-versus-Wolf image in `docs/references/` is a visual target only, not a playable screenshot or game asset. The combat fighters remain prototype silhouettes until clean individual transparent character art and animation frames are produced and integrated.

## Badger playable-renderer milestone
The Badger now has a dedicated Canvas-drawn fighter renderer rather than the generic placeholder silhouette. It includes a black-and-white badger face blaze, gold-and-black armor, lion crest, claws, and action-responsive pose changes for movement, blocking, claw attacks, pounce, and hit flash. This is a procedural prototype renderer, not yet the final approved 3D artwork or a frame-by-frame sprite animation. The generated sprite atlas is included as a visual reference only.

## Badger combat refinement milestone (2026-11-06)
- Added a short attack-chain window so a timed follow-up attack can continue a claw string.
- Added a three-impact Ultra sequence when the fighter has a full meter.
- Kept the existing player controls, combo readouts, meter, and combo-breaker input.
- Validation performed: `node --check game/js/game.js` passed. This is a code milestone; gameplay still needs hands-on browser testing and frame-by-frame animation integration.

## Run locally on Windows
1. Extract the ZIP file.
2. Open the `KingOfTheJungle_V2` folder.
3. Double-click `START_LOCAL_SERVER.bat`.
4. Keep the black command window open.
5. Open `http://localhost:8000` in Chrome or Edge.
6. To stop the server, return to the command window and press `Ctrl+C`.

This uses Python 3's built-in local web server. If Python is not installed, install Python 3 and enable the PATH option, then run the batch file again.


## November 6, 2026 update: Badger special move
- Badger's G key now triggers a distinct Earth Slam instead of the generic pounce.
- Added a gold shockwave visual, stronger downward attack pose, increased impact range and damage.
- At full Ultra meter, the existing Badger Ultra remains the priority action.
- Wolf and other fighters retain their standard pounce special.
- JavaScript syntax validated with Node.js. This is not a substitute for browser playtesting.

## Web build 0.2 (November 6, 2026)
- **Real art on the select screen:** all 11 fighters use portraits cut from the official roster image (`assets/characters/portraits/`). Portraits also show in the fight HUD and the Tower ladder.
- **Badger uses its actual sprite art in fights:** 12 animations (idle, walk, walk back, block, claw, heavy, bite, pounce, hit, knockdown, Earth Slam, Badger Rampage) were cut from the sprite atlas into strips in `assets/characters/badger/frames/`. The second hit of a claw chain plays the heavy Power Slash. The source atlas is small, so frames look soft when scaled up; higher-res individual frames will look sharper.
- **Tower Mode is real now:** pick a fighter and climb the other 10 in roster order (Badger → Elephant). The CPU gets faster and blocks more on each floor. You win the crown after beating all 10.
- **VS CPU mode** added. Local 2 Player is still there.
- **Phone controls:** on-screen ◀ ▲ ▶ BLOCK / SPC / ATK buttons appear on touch devices. On landscape phones they sit beside the arena, and in portrait they sit below it. The header is hidden during fights so the arena fills the screen.
- **Controllers:** Xbox and PlayStation pads work through the browser Gamepad API. Stick/D-pad moves, A/✕ jumps, X/□ attacks, Y/△ does the special, B/○ or LT blocks, Start pauses. Pad 1 can also pick fighters on the select screen.
- **Fixes:** very quick key/tap presses no longer get dropped, health bars reset on rematch, fighters can't walk through each other, there's a K.O. pause before the result screen, Esc/P pauses, and the Ultra callout names the right fighter.
- Still placeholders: Wolf, Hyena, Leopard, Jaguar, Crocodile, Tiger, Grizzly, Hippo and Elephant use the temporary canvas body in fights until their sprite sheets exist.

## Web build 0.3: Killer Instinct-style combat
The fight system is rebuilt around KI-style combo mechanics, with original names and presentation:
- **Combos:** an opener (ATTACK, heavy BLOCK+ATTACK, or SPECIAL) → **auto-doubles** (tap ATTACK again as the hit lands, 2 fast hits each) → **ender** (SPECIAL during the combo).
- **Potential damage:** auto-double damage shows as a white "recoverable" chunk on the health bar. An ender makes it real and adds bonus damage for long combos. If the combo is broken, all of it comes back. If the combo is dropped, half comes back.
- **Combo Breaker:** when you're getting comboed, tap ATTACK during the attacker's **gold flash** (each auto-double). Tap at the wrong time and you get a **LOCKOUT** (2.2 s where you can't break).
- **Two life bars** per fighter, with a BAR BROKEN moment between them.
- **DANGER:** when someone's last bar is low, it flashes red. Landing an ender on a fighter in DANGER triggers an **ULTRA COMBO**: screen darkens, camera zooms, 18+ rapid hits, slow-motion finish.
- **Shadow move** (BLOCK+SPECIAL, costs half the meter): a 5-hit purple dash with afterimages. It also works as an ender.
- **Instinct** (INS / H / ; / RB-R1 / RT with a full meter): 8 seconds of +20% speed and +25% damage, with a cyan glow.
- **Combo ranks:** TRIPLE, SUPER, HYPER, BRUTAL, SAVAGE, FERAL, PRIMAL, MONSTER, APEX, KING. Big on-screen counter, hit-stop, sparks, screen shake.
- **Announcer & sound:** synthesized hit sounds, plus a spoken announcer using the browser's built-in voice ("Combo breaker", "Ultra combo"…). Use the SOUND button to toggle it.
- **CPU** now links combos, uses enders, attempts breakers (and sometimes locks itself out), uses Shadow and Instinct, and at higher Tower floors lands Ultras.

## Web build 0.4: Badger sprite upgrade
- Badger rebuilt from the two new transparent sprite sheets: idle, walk forward/back, run, block, light punch combo, heavy claw swipe, claw swipe, bite, uppercut, jump, aerial slam, light/heavy hit, knockdown & get up, victory, plus crouch, pounce and defeat from the second sheet.
- Move mapping: opener = punch combo; auto-doubles alternate heavy claw swipe / claw swipe; **ender = uppercut launcher**; SPECIAL = **Earth Slam** (aerial slam with gold impact); Shadow = Badger Rampage flurry (from the first atlas); knocked down = heavy hit → get up; K.O. = heavy hit and stays down; the winner plays the **victory pose**.
- Run, crouch, pounce and defeat are cut and included in `assets/characters/badger/sprites/`. The fight system doesn't use them yet.
- Frames are in `assets/characters/badger/sprites/`, one horizontal strip per animation.

## Web build 0.5: Wolf
- Wolf is fully sprite-animated from his sheet: idle, walk forward/back, run, block, punch combo, claw slash, bite, uppercut, jump, pounce attack (leaping strike), light/heavy hit, knockdown & recovery, victory, defeat.
- Move mapping: opener = punch combo; auto-doubles alternate claw slash / punch; ender = uppercut; SPECIAL = pounce attack; Shadow = "Shadow Frenzy" (rapid slash/punch flurry with purple afterimages); Ultra = punch/slash/uppercut/bite flurry; win = victory pose.
- The sheet had a solid black background. It is keyed out automatically, and the original is kept in `assets/characters/wolf/reference/`.
- The sprite system is per-animal now (`SPRITES` in `js/game.js`): each new fighter is one strips folder plus one table entry.
- Fighters keep a little more space between them so the larger sprites don't overlap.
- Added a short input buffer (0.15 s) and guaranteed links so enders/Ultras don't whiff after a correct link; breakers stay unbuffered.

## Web build 0.6: Hyena
- Hyena fully sprite-animated from his sheet (same layout as the Wolf's): idle, walk forward/back, run, block, punch combo, claw slash, bite, uppercut, jump, pounce attack, light/heavy hit, knockdown & get up, victory, defeat.
- Move mapping matches the Wolf's. His Shadow is "Shadow Madness", and his Ultra flurry leads with the bite.
- Three of 11 fighters are now fully animated: Badger, Wolf, Hyena.
- Sprite strips are stored as WebP (same look, about 70% smaller) so the Netlify upload stays well under 10 MB as more fighters are added.

## Web build 0.7: Leopard
- Leopard fully sprite-animated from his sheet: idle, walk forward/back, run, block, punch combo, claw slash, bite, uppercut, jump, pounce attack, light/heavy hit, knockdown & get up, victory, defeat.
- Speed-fighter flavor: auto-doubles alternate punch / claw slash, Shadow is "Shadow Blur", and his Ultra is a fast punch-heavy flurry.
- Four of 11 fighters are now fully animated: Badger, Wolf, Hyena, Leopard.

## Web build 0.8: Jaguar
- Jaguar fully sprite-animated from his sheet: idle, walk forward/back, run, block, punch combo, claw slash, bite, uppercut, jump, pounce attack, light/heavy hit, knockdown & get up, victory, defeat.
- Grappler flavor: auto-doubles alternate claw slash / bite, Shadow is "Shadow Mauler", and his Ultra leads with heavy slashes and bites.
- Five of 11 fighters are now fully animated: Badger, Wolf, Hyena, Leopard, Jaguar.

## Web build 0.9: Crocodile
- Crocodile fully sprite-animated from his sheet (all 16 animations, tail included).
- Armored-brawler flavor: auto-doubles alternate bite / claw slash, Shadow is "Shadow Death Roll", and his Ultra is bite-heavy.
- Six of 11 fighters are now fully animated: Badger, Wolf, Hyena, Leopard, Jaguar, Crocodile.

## Web build 1.0: Lion
- The Lion is now fully sprite-animated from his sheet (all 16 animations). This replaces the old 7 still poses, and that code is removed.
- Balanced-king flavor: auto-doubles alternate claw slash / punch, his Shadow is "Shadow Roar", and his Ultra mixes slash, bite and uppercut.
- 7 of 11 fighters are fully animated: Badger, Wolf, Hyena, Leopard, Jaguar, Crocodile, Lion. Still to come: Tiger, Grizzly, Hippo, Elephant.
- The lion master art (`lion-master.png`) is still used for the menu hero image.

## Web build 1.1: Tiger
- Tiger fully sprite-animated from his sheet (all 16 animations).
- Relentless-striker flavor: auto-doubles alternate claw slash / punch, Shadow is "Shadow Stripes", and his Ultra is a slash-heavy flurry.
- 8 of 11 fighters fully animated. Remaining: Grizzly, Hippo, Elephant.

## Web build 1.2: Grizzly
- Grizzly fully sprite-animated from his sheet (all 16 animations). His bulky heavy-attack and pounce frames overlapped on the sheet, so those two rows are cut at hand-set points.
- Heavyweight: drawn about 12% larger than the mid-size fighters. Auto-doubles alternate claw slash / bite, Shadow is "Shadow Maul", and his Ultra is a heavy-slash flurry.
- 9 of 11 fighters fully animated. Remaining: Hippo, Elephant.

## Web build 1.3: Hippo
- Hippo fully sprite-animated from his sheet (all 16 animations). His pounce and knockdown rows overlapped on the sheet, so those are cut at hand-set points or at the gaps between bodies.
- Heavyweight: drawn about 17% larger than the mid-size fighters. Auto-doubles alternate slam / bite, Shadow is "Shadow Stampede", and his Ultra is slam-and-bite heavy.
- 10 of 11 fighters fully animated. Remaining: Elephant.

## Web build 1.4: Elephant, full roster complete
- Elephant fully sprite-animated from his sheet (all 16 animations). His tusk gore is his bite, the trunk swipe is his heavy attack, and the leaping slam is his special.
- Largest fighter (about 24% bigger than mid-size). Auto-doubles alternate trunk swipe / tusk gore, Shadow is "Shadow Titan", and he's the final boss at the top of the Tower.
- **All 11 fighters are now fully sprite-animated.** The old canvas placeholder body is only a fallback if an image fails to load.

### Still to do (from the roadmap)
- Online play with invite codes
- Recorded announcer voice and music (currently a browser voice and synthesized hits)
- Different arenas per country (all fights use the Jungle Temple for now)
- Unique Shadow/Ultra animation rows per animal (they currently reuse each animal's attack frames)

## Web build 1.5: Six arenas
- Six playable arenas from J. Hardy's art: Jungle Temple, Inferno Fortress, Frozen Kingdom, Savage Plains, Shadow Swamp, Royal Colosseum (`assets/arenas/`, cropped to the fight frame with the logo and badge trimmed off).
- **Stage select** after picking fighters in VS CPU and Local 2 Player, plus a RANDOM option. Works with mouse, touch and controller (D-pad picks, X/□ confirms, B/○ back).
- **Tower Mode** moves to a new arena on each floor (Jungle → Inferno → Frozen → Plains → Swamp, repeating). The final boss fight is always in the **Royal Colosseum**.
- The arena name shows in the round intro banner and under the fight. The old drawn temple background is kept as a fallback if an image fails to load.

## Web build 1.6: Clean arena art
- All six arenas now use the clean versions from KOTJ_V2_Arenas_Clean: no KOTJ logo, no arena badge, and the faint watermark in the bottom-right is gone (cropped, not painted over).

## Web build 1.7
- Wolf run animation re-cut (feet and tail were landing on the wrong frames).

## Web build 1.8: Standardized fighter frames
- All 11 fighters now draw from the standardized animation set (KOTJ_V2_Fighter_Animations): one strip per animation in `assets/characters/<animal>/frames/`, each with its own ground anchor point, so fighters no longer slide or jump between poses.
- Fixes carried in: Hippo get-up, Grizzly uppercut slashes, Wolf run and defeat, stray fragments.
- Frames are stored at about the sprite sheets' original resolution; the game enlarges them when drawing. The old `sprites/` strips are removed.
