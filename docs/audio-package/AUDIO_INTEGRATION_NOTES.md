# KOTJ V2 Audio Integration

This package adds an audio manifest and a lightweight browser audio controller to the V2 foundation. It wires announcer + main menu/arena music on match start, block, claw/bite, generic hit, and each fighter's Shadow/Ultra cue into the existing combat events.

## Important delivery note
The generated audio files are hosted media URLs, not bundled MP3/WAV binaries. `game/audio/audio-manifest.json` points to those hosted files. The browser therefore needs internet access and the hosting URLs must remain available. The Temple of the King track was not successfully generated in the original batch, so its stage entry temporarily falls back to the main theme.

## Current limitations
- Arena stage selection is not implemented in the foundation, so match start currently uses the main theme.
- Announcer calls are delivered as one generated voice clip rather than separately timed clips.
- Character-specific sound triggers are connected to the current shared special/Ultra input path. They still need playtesting and timing/volume tuning.
- No binary audio files are included in this ZIP.

Open `game/index.html` or deploy the `game` folder as a static site.
