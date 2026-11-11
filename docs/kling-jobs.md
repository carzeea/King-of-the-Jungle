# Kling video jobs — King of the Jungle 1.5 motion rebuild

Settings that worked (James approved the Eagle stance look on 2026-11-11):
- Tool: Kling MCP `image_to_video`, model `kling-video-v3_0_turbo`, 1080p, 5 s (6 s for knockdown), silent. ~50 credits per 5 s clip.
- Starter pictures (green screen, from current game art): `https://raw.githubusercontent.com/carzeea/King-of-the-Jungle/test-1.5/game/assets/kling-start/<fighter>.jpg`
- Prompt pattern: "Animate this exact <fighter> warrior character <action> … full body always in frame head to feet, stays in place in the centre, camera completely locked with no zoom, pan or cuts. Smooth continuous motion, every frame different, natural weight. Keep the exact design, colors and armor. Solid flat pure green background, no shadows, no text."
- Convert with `docs/art-tools/build_video_anim.py <fighter> <anim> <frames_dir> <start> <count> <height_units>` after extracting frames with ffmpeg.
- Kling result links expire 24 h after the job finishes; re-run `query_tasks` with the id to get fresh links if needed.
- The workspace needs `*.klingai.com` allowed (Settings → Capabilities) to download results.

## Eagle (submitted 2026-11-11)
| Move | Game anim | generationId |
|---|---|---|
| Walk | walk_forward / walk_back | done earlier from James's own video (already in 1.5 test) |
| Stance | idle | AbnY2n55P60CO4kHADVyyYxh_9TYXHx9uPIL72Qx7yFBM426HcZF2V8FRcjhZbeHZRZHMghS |
| Light attack | attack_light | AccNCuxT-oYXvT5TWYCEhv33lOg66XKGlm89FBaH9DnTSSu7s0Ot6hzD-SN9y73nzOVsiQ6Q |
| Heavy attack | attack_heavy | AeSuHCFQ102rYnlNurLdBOKY5XaWo16TnH-DhXXXEQI9Fr_B5tzr62axHEeXVqc6z4BlHdte |
| Jump | jump | AaubtDoxWLXk4QbveOkU83-X64mzqC2su3tXPeTMfcSOZUnn8Oc1cUw41yyz4sPybYzQL_G5 |
| Hit | hit_light / hit_heavy | AbtFloHfA8JV1Rfe_gJ-_4R6E8fBlyOhVfPlKmJK4NW9EXQ798CuZur3gSTXjLoCYFAESwJs |
| Knockdown + get up (6 s) | fall / knockdown_getup | AZlYMSP_lF668_aPZLd82QdOM2or-9Ao4sh3lK2AKoxBU66ryyTgzrybg2fSkawWEKBH-zls |
| Victory | victory | AVe_JHP8ZxoV5-vJQ1ujXRq8AevBnTeROFLaje9if5TPKJiKDyPPDPcEpCD8V4ev_KN5cRhz |
| Special (dive) | special | AeWEOKbnoj7RFfe6I1jkXxn7wZ91iBPe_tikM6SnOVp8xW-s5PUy-uUmzttnon-_Euol7JxX |

## Remaining fighters
lion, tiger, jaguar, wolf, hyena, badger, grizzly, crocodile, hippo, elephant, leopard, snake, stag, majic — same 9 moves each (walk included). Go live only when all 15 are done and James says so.

## Eagle side-view redo (side-on fighting)
Starter: kling-start/eagle-side.jpg · model kling-video-v3_0_turbo · 1080p
- Stance → idle (frames 42–120, ping-pong): ASUYCu3wdnLyLemREzWWzlQyqDl0Gws0zbaD7if55cYxxkziUffFoXp5QV_X1_VRrSNsrmXI
- Heavy → attack_heavy, uppercut (72–120): Ae0R9xClzpVIaOt6kK-nYEcv-Ma_ch7M47yOaCv9hZkxnFvIDE1Dug6iA3XpC17ZWZ3SgccZ
- Wing spread → jump (78–120): AeWQXMCaPXUk3sL8G8cJCm6qb0NX5MJeYUwmMc7KKQp1n_tyXc0HzorsZXRK1RFxdVpmWM_w
- Special → special_pounce, special_b (54–114): AT88Q46dblmWVSXM5ESEU5FJzBzuu4USKqJ7zKQJUQLvFBc_V_A8M45Uikuh-g-k34syWH7b
- Knockdown 6 s → knockdown/defeat (12–96), knockdown_getup (96–145): ATIbtuSM_p99fOaqMRWQJ-w-2WXkIqRPhzMWbPvaCCRRx5djpqWVnYoPk8IpDA2ACrVc1wDy
Lesson: starters must be side-view, otherwise moves come toward the camera.

## Wolf (side view, 2026-11-11) — starter kling-start/wolf-side.jpg, stand 242
idle 32–86/2 · walk 86–111 (loop via find_loop.py) · light 16–45 · bite 92–121 · heavy 60–113 · jump FRAMES=62-80,93-108 (apex skipped: head left frame) · special 36–105 · hit 60–93/2 · knockdown 12–89/2 · getup 88–146/2 · victory 24–121/2 · block 0–31/2
Install: docs/art-tools/install_anims.py wolf <json dir> '{"idle":12,"knockdown":20,"victory":12,"hit":36,"block":40}' 25 29 38
- idle AZzcSbPNj85ZOR8uGjAWoFSc9eFWRLy_iBP7JX8rJCJ5Di8QIPmrWPDIfuzMpiOFBwhScm-h
- walk AVh5KXID0y0lPNI9N298uZiiRq1-vJefnlM_lujyau6Dp_BVlBd7eNv7F66Y7pZKENtVcJrQ
- light ASwvHdNMarFWO5lNSGfVGRB9r9lXgUfVKfqgNf2FY02aR8APCbmj6eT0ZFVGGibLegmTJJ_Y
- heavy AR00ARVAX7iUbo4erMMZj-a-dP0tvFVRgCYC93Mq2sGw2N88oIuZl1hFPZ8LHf5iaavBbnin
- jump Adez34-8C4kdUy0z-wS4FHfkGmoAs9oMiZfANqY7ifwz16E2umgncb2REQfdRCwoXiL_4CeK
- special Ae-UHPeleaor3HCrDUeSOepm8sYCuQtqxrAWCB_iLD2Xqg3VVWTD2OLpvZVQ21o9xVmOidO5
- hit ATJRzKerPUkKZFXKGGl_jGDmCJRbN3RqhMfg4MFOg96iDph9HrVdwwt5KMxaAnF0kwjeVKkD
- knock AQRdnPobMVaoJrnPrDpWCREBomOz_J-JyoGc_p7KBUlIwNEXcCfRdkkMJSDdkRCXbuSiBfME
- victory ASrCf_9WQ6iHF-p034Id3yErDTdLNLlAvE0yxQnQBEPSTQdYpMEivTvUKZzwkCUB8_Fy0-tw
- block AfV_s7s91TOOL__T4L65mrmvlzXdhhow4vlcEXUzFOX0TNATseu91SkmPCWCSa6o5etRw7p6
