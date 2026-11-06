# V2 implementation roadmap

1. **Foundation (current):** independent HTML5/Canvas project, roster selection, local combat loop, HUD, responsive shell.
2. **Lion vertical slice:** extract transparent frames from approved lion references, normalize frame bounds and ground pivots, implement idle/walk/attacks/hurt/knockdown states, test both player sides.
3. **Combat depth:** separate hitboxes/hurtboxes, attack startup/active/recovery frames, blockstun, hitstun, combo rules, special meter, round flow.
4. **Character production:** create species-specific rigs and animation sets for the other ten original roster members.
5. **Modes and devices:** real Tower progression with AI opponents, gamepad support, accessibility and input remapping.
6. **Online:** choose and implement an authoritative or rollback-friendly networking approach, then test latency and reconnect behavior.
7. **Polish and release:** audio, arena art, finishers, QA, performance, deployment preview, then controlled Netlify release.

## Preservation rule
Never overwrite the original Netlify production site during V2 development. Keep the uploaded original project archive unchanged as a rollback source.

## Current build update: Lion visual integration
- Added a transparent gameplay-ready cutout derived from the previously approved lion master image.
- The approved lion now renders as the Player 1 or Player 2 fighter in the arena when selected.
- The original master and turnaround references remain unchanged.
- This is the first in-game visual integration, not the completed seven-animation system. The lion currently uses the approved guard pose with subtle idle motion; attack, hit, pounce, and recovery frames still need to be sliced/imported and connected to gameplay states.
