# King of the Jungle – Sound Library

Every sound has a labeled file in this folder. `audio-manifest.json` lists each clip with its label, where it plays, and its source link.

**How the files get here:** while Netlify publishes the site, `scripts/fetch-audio.mjs` downloads any clip that is not already in this folder and saves it under the name below. If a download ever fails, the game streams that clip from its source link instead, so nothing goes silent.

**To replace a sound:** put a new file in this folder with the same name (for example `music/arena-2-inferno-fortress.mp3`) and push it. The game uses your file and stops downloading that clip.

## Announcer

| File | Label | Plays when |
|---|---|---|
| `announcer/announcer-fight-intro.wav` | Announcer – fight intro call | Start of every fight |

## Music

| File | Label | Plays when |
|---|---|---|
| `music/menu-main-theme.mp3` | Main Theme | Title screen, fighter select and stage select |
| `music/arena-1-jungle-temple.mp3` | Arena 1 – Jungle Temple (uses Main Theme until its own track exists) | Fight music in the Jungle Temple |
| `music/arena-2-inferno-fortress.mp3` | Arena 2 – Inferno Fortress | Fight music in the Inferno Fortress |
| `music/arena-3-frozen-kingdom.mp3` | Arena 3 – Frozen Kingdom | Fight music in the Frozen Kingdom |
| `music/arena-4-savage-plains.mp3` | Arena 4 – Savage Plains | Fight music in the Savage Plains |
| `music/arena-5-shadow-swamp.mp3` | Arena 5 – Shadow Swamp | Fight music in the Shadow Swamp |
| `music/arena-6-royal-colosseum.mp3` | Arena 6 – Royal Colosseum (final boss) | Fight music in the Royal Colosseum |

## Sound effects

| File | Label | Plays when |
|---|---|---|
| `sfx/hit-punch.mp3` | Punch hit | Light attacks and auto-double hits |
| `sfx/hit-heavy-impact.mp3` | Heavy impact | Enders, specials landing, bar broken, K.O. |
| `sfx/hit-claw-slash.mp3` | Claw slash | Heavy claw swipes in combos |
| `sfx/hit-bite.mp3` | Bite | Bite attacks |
| `sfx/block.mp3` | Block | Attack blocked |
| `sfx/ground-slam.mp3` | Ground slam | Badger Earth Slam, heavyweight specials, Ultra finisher |

## Shadow move cues (one per fighter)

| File | Label | Plays when |
|---|---|---|
| `shadow/shadow-badger.mp3` | Badger – Shadow move | Badger uses a Shadow move (BLOCK + SPECIAL) |
| `shadow/shadow-wolf.mp3` | Wolf – Shadow move | Wolf uses a Shadow move (BLOCK + SPECIAL) |
| `shadow/shadow-hyena.mp3` | Hyena – Shadow move | Hyena uses a Shadow move (BLOCK + SPECIAL) |
| `shadow/shadow-leopard.mp3` | Leopard – Shadow move | Leopard uses a Shadow move (BLOCK + SPECIAL) |
| `shadow/shadow-jaguar.mp3` | Jaguar – Shadow move | Jaguar uses a Shadow move (BLOCK + SPECIAL) |
| `shadow/shadow-crocodile.mp3` | Crocodile – Shadow move | Crocodile uses a Shadow move (BLOCK + SPECIAL) |
| `shadow/shadow-lion.mp3` | Lion – Shadow move | Lion uses a Shadow move (BLOCK + SPECIAL) |
| `shadow/shadow-tiger.mp3` | Tiger – Shadow move | Tiger uses a Shadow move (BLOCK + SPECIAL) |
| `shadow/shadow-grizzly.mp3` | Grizzly – Shadow move | Grizzly uses a Shadow move (BLOCK + SPECIAL) |
| `shadow/shadow-hippo.mp3` | Hippo – Shadow move | Hippo uses a Shadow move (BLOCK + SPECIAL) |
| `shadow/shadow-elephant.mp3` | Elephant – Shadow move | Elephant uses a Shadow move (BLOCK + SPECIAL) |

## Ultra Combo cues (one per fighter)

| File | Label | Plays when |
|---|---|---|
| `ultra/ultra-badger.mp3` | Badger – Ultra Combo | Badger lands an Ultra Combo |
| `ultra/ultra-wolf.mp3` | Wolf – Ultra Combo | Wolf lands an Ultra Combo |
| `ultra/ultra-hyena.mp3` | Hyena – Ultra Combo | Hyena lands an Ultra Combo |
| `ultra/ultra-leopard.mp3` | Leopard – Ultra Combo | Leopard lands an Ultra Combo |
| `ultra/ultra-jaguar.mp3` | Jaguar – Ultra Combo | Jaguar lands an Ultra Combo |
| `ultra/ultra-crocodile.mp3` | Crocodile – Ultra Combo | Crocodile lands an Ultra Combo |
| `ultra/ultra-lion.mp3` | Lion – Ultra Combo | Lion lands an Ultra Combo |
| `ultra/ultra-tiger.mp3` | Tiger – Ultra Combo | Tiger lands an Ultra Combo |
| `ultra/ultra-grizzly.mp3` | Grizzly – Ultra Combo | Grizzly lands an Ultra Combo |
| `ultra/ultra-hippo.mp3` | Hippo – Ultra Combo | Hippo lands an Ultra Combo |
| `ultra/ultra-elephant.mp3` | Elephant – Ultra Combo | Elephant lands an Ultra Combo |


## Announcer voice lines (Holden)

Recordings go in `voice/`. Until a file exists, that line uses the browser voice. The full recording list is in `docs/HOLDEN_VOICE_LINES.md`.

| File | Line | Plays when |
|---|---|---|
| `voice/holden-fight.mp3` | Fight! | Start of every fight |
| `voice/holden-round-one.mp3` | Round one! | Before "Fight!" in VS CPU and 2 Player |
| `voice/holden-final-fight.mp3` | Final fight! | Tower Mode, the Elephant boss fight |
| `voice/holden-danger.mp3` | Danger! | A fighter drops into the danger zone |
| `voice/holden-combo-breaker.mp3` | Combo breaker! | A combo is broken |
| `voice/holden-lockout.mp3` | Lockout! | Mistimed combo breaker |
| `voice/holden-instinct.mp3` | Instinct! | Instinct mode activated |
| `voice/holden-ultra-combo.mp3` | Ultra combo! | Ultra Combo lands |
| `voice/holden-ko.mp3` | K.O.! | Knockout |
| `voice/holden-time.mp3` | Time! | Timer runs out |
| `voice/holden-you-win.mp3` | You win! | You beat the CPU |
| `voice/holden-you-lose.mp3` | You lose. | The CPU beats you |
| `voice/holden-king-of-the-jungle.mp3` | King of the Jungle! | Tower Mode completed |
| `voice/holden-triple-combo.mp3` | Triple combo! | A combo of that rank ends |
| `voice/holden-super-combo.mp3` | Super combo! | A combo of that rank ends |
| `voice/holden-hyper-combo.mp3` | Hyper combo! | A combo of that rank ends |
| `voice/holden-brutal-combo.mp3` | Brutal combo! | A combo of that rank ends |
| `voice/holden-savage-combo.mp3` | Savage combo! | A combo of that rank ends |
| `voice/holden-feral-combo.mp3` | Feral combo! | A combo of that rank ends |
| `voice/holden-primal-combo.mp3` | Primal combo! | A combo of that rank ends |
| `voice/holden-monster-combo.mp3` | Monster combo! | A combo of that rank ends |
| `voice/holden-apex-combo.mp3` | Apex combo! | A combo of that rank ends |
| `voice/holden-king-combo.mp3` | King combo! | A combo of that rank ends |
| `voice/holden-badger-wins.mp3` | Badger wins! | Badger wins a fight |
| `voice/holden-wolf-wins.mp3` | Wolf wins! | Wolf wins a fight |
| `voice/holden-hyena-wins.mp3` | Hyena wins! | Hyena wins a fight |
| `voice/holden-leopard-wins.mp3` | Leopard wins! | Leopard wins a fight |
| `voice/holden-jaguar-wins.mp3` | Jaguar wins! | Jaguar wins a fight |
| `voice/holden-crocodile-wins.mp3` | Crocodile wins! | Crocodile wins a fight |
| `voice/holden-lion-wins.mp3` | Lion wins! | Lion wins a fight |
| `voice/holden-tiger-wins.mp3` | Tiger wins! | Tiger wins a fight |
| `voice/holden-grizzly-wins.mp3` | Grizzly wins! | Grizzly wins a fight |
| `voice/holden-hippo-wins.mp3` | Hippo wins! | Hippo wins a fight |
| `voice/holden-elephant-wins.mp3` | Elephant wins! | Elephant wins a fight |

## Notes
- Arena 1 (Jungle Temple) uses the Main Theme until its own track is made. The original sound batch had no Temple track.
- The built-in synthesized sounds remain as a backup for any clip that hasn't loaded yet, and for Combo Breaker, Lockout and Instinct, which have no recorded clips yet.
- Spoken calls like "Combo breaker" and "Ultra combo" still use the browser's voice; the recorded announcer clip plays at the start of each fight.
