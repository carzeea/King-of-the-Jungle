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

## Lion (side view) — auto_fighter.py lion <clips> 260
- idle AaPGyrNkUhWv3UZHLqgXVmljCumqI0eZHnzDkPCpxJ4TNvEnEAjNwH_ptgMbCv0zVE7uDNxz
- walk AfDKai5emyp70nIDYhRK9YmQaJQoRLlQUas_mL0Dw6ips5p5pTctVe8HafQdmYL7mucNZ0ZP
- light AREMjxjP68PRHeHDoHN0QEeMeyqLCrAINy1F78_TM3fGFjZuIULtMbzmyFvl2EiDEm46QxGi
- heavy AVAo3JPajcSQ0ZrZOSCxQ7__dclXsoO7jEI9LYsTRwIMZWNejORx9uQWxYvPWy-Z4cTtauqV
- jump Af58Ly83c8qeRQYnQSi7guJz-SKDNrfOj9JmtFozOAz-6EfD3B_6-MZFrK6CYxmwIdQsVKtZ
- special AaxIUj-arZCUaGG4679YCEthmm7RatZTEBQrW8ZtOiH_nytPKVIocNSRTjIRIE6mniZ3TRC2
- hit AbNKV9aN7CK6wFO59vMd4eiqAx2fRetyRJfsqpX1anyeiiEyO95MfLBJk6dDNTDx32duH_n5
- knock AYmZJom3El6j7-JFT1XPCsg7GrLASTh0GjVJgO2HbCBFTg3DhH7k3psyvNrCRxa7MHoc9OAH
- victory AaciGzeAi9oRtrp0YqOTqnvcAcgTCSBXesnI6ie_sTCb62GupHpWABgiMXvaIakNXmyIzgaP
- block AYM_Y2jrxNNTJ_gHZgiEZR9EGpPsAAYs3ETUYWZkGIwQq24VTLPTsYsbpcW_6l9eP6EplZjb

## Tiger (side view) — auto_fighter.py
- idle Act7IX8-gKvpIprMPNCgzmIW3g3uuG04voIdMfRkhX-9JXh278KEIdUP0JIxAUvq7u8m8LQn
- walk Af9zKlP5J6opGQW98Z8V50NYG_DMbiy9g55WTI6uH_Pxm9nlkzi7AgYCpqWxcuoMLliul7Xv
- light AUPylZmSR2xKW1XrP5c1uspfyt-JQD_O7PXSZO0fiiDidQUZ8-pIu3xPiHu9MKP1bIE78Cng
- heavy AdneLPfOUoeV20BTzcLXoujr9C1lSXRO1CyscLzJ41xx61PTjq4wAdQqj0A73cb0aWA8buz3
- jump ASqOTg5a9jnieEqvyy-2bTcFPAVtHnA2Ov8-lnG89QczrbEKFN3S-hC4smHR54Q7MmHM3ShV
- special AeHKlLCAuEypTu11SKwA3DkGvhJG-rXXBZy3bJYTk0Y76rnEgbmqDky1WkL_Zl5R0cQ6btpq
- hit AbQfxO1JZ5ZMJjk3-FDa-pJBKLtZc9wG3wPAGQsf4xwDLla63GV5WQYWyP2AtkJbwb2OP9h-
- knock AfJYzACJFaMNHhiLmgjjJ6-vb2ihj5fpbgfRj-AhOh8rU56LCAWGT_bKxpdAIBuUBpgRN9o_
- victory AUl3PfLdU6CQvrGX61Qs31M9wQaC-Ilj-Q5Pqpxlh0shHifBVSEaMcWs9aG0AxOehil-qTqk
- block AcGCygElgxrfVbOXFJYgZwITRW4MM6xwH3t5Mkwr-vhXHVSb3oisr_-JqVKPxhPGP0ITLHfN

## Jaguar (side view) — auto_fighter.py
- idle AZyKdLse-6eEtP_V_em-QxJDAa5v0arVFBBSSSSqB9GVbkaaa3z3WwqO7bi-_sEo_v483ONs
- walk AbR9nepqu88fMugCnvIXHIv2W3K-ebJ3pocbFUnIJzyrOuEC3cmJclyeUZMlwZfAlignd2nP
- light ASPI2_sHJTQPYqLuUehqn94DNETD1qv9rblJcOsBBnyYdzivQySiTX0SbBj4BgaFm6iFaJWN
- heavy AXv_HKZlGRl7To0E55bXgNMyIc1l_dB-FkWnYfSl_zVW-5SEyOe24hi_xiKunnIWpRlO1nwO
- jump AbmSDg7REndZHZQRVtpjjyR0QMyXkTnmqGXsObK7KgIjCQdk0IYt2C3Q8E_I1t4710OoTDqb
- special AXHVrJLGu1sQRgJdpMgWmQOJW56zCJ2QDGdV8w9xkbViWZTW3Q53lkSXvoGgQwuhpqyivSMu
- hit AaWnKzd6h8jR1lh4GLcuR1yyo6C9KNTWDLCUS2Riey2_4xleQFpgb1I_Ul7Qw0pcKVZIv-iN
- knock AY8OtnGVkBIduxMKNQcK4QeAoL8XFQEz7ZW_PQEX2d5SQn4ZwL1YasPGUkCK-pD4L94h3hSs
- victory AVRO8NZUw5nWYG5izHilsLRdpvmISWyqCMRAy569EoAF_u4jjMncBzA_2Pknbk3dNAXyIncG
- block AaK440GUwxq_HYDKruJoJMZFEFBr-oVqYfGczK4oR1ZWqA97oWnvYXfVWMeVtaxyWY0qWBx8

## Snow Leopard (side view) — auto_fighter.py
- idle AWXo4_tXftfIwdxrF8kiWPBXHD207bksLCgSF91o5PidLhQgEQTsthLrnQhh0HUJU8F8f3vZ
- walk ARzweIi61IM851ue1KcY0G-iQzeIisYsPsF-gV_9w_rVroKkDb_Ws1eF_skQv2DmP_Fnwlcl
- light Ad1htjdIdy_26bnucHEnyKDcRAF8CVuQAuRaxrvpRU3bsp1ROKtukJ-sVdMgcNymXldwrLL2
- heavy AZWmkCeph2sCNxcAoRrvLO6vZE4tOjNQ6JpEyjyrI-o4eQjtUgLyilrjbsgrv7bbame-05df
- jump ARruU1dhMPfHwwRXTBkNOP9i6-hdk8uOECXgSvavum9OIu--wy29gtJwVcXc06-1pughCJQr
- special AQ9CJBiGZVNagEeK1uMmWM47jCDYGsY1N-KQnikZaf14DSkJjbz6wPQpXWjyvXbiqFuvkCnt
- hit ARciXKxuUNG_xVdQW60avwledcvYkpBWr60ZzRUBZipRqJN8PcXs4nFJahyAK1XKBTIzsICP
- knock ARNBWJJ1h4xC8dvLaqqKfzex6WnfXHfxTP0LSBEsZtedfLRVl4hagVIunArG2Z-9o5aks6jy
- victory AZsO3LvjhojRtozMAVnsWAuuXlDNm_ghsq9Gfd8Pdu1Fa34lh9WaGHn3GCWIYvcpXJBInjGE
- block ARzzIXllYYtWDp4o7S24ZIFm3yquKcqp2dcbb5X4Jo_uFUyZ0Wzv-rpZkZF8clDuREJb-g9h

## Grizzly (side view) — auto_fighter.py
- idle AeMaFyCi3V0PgPP0LuryynW83qx3T0CJ2UyAiZKUacKsavicWH7C8qxAAkvW0AzfMqhW_6e1
- walk AX2Yc3SLwChVMOH48iga6RS2oHIG934IwuOWqH1u7PG2NMg6HZONHdymlTAbZGyNSs-36k5v
- light AegO74YZA76dAeHONacml6fpGcPKdqW8y4UuE_QWjcCqzILFpx706shSYd25JF5eNrDN5T16
- heavy AR4E83OMp-Cb2B5CWx0otFAE3ISjs1qYjUqbsNGur60HkrC6W4kGSTNl1PPg2ooimNz0UQw6
- jump ATnyL4mmEcThVE_r4yNYb607uwH3Vp47Ad_rMThFgDdQ-fN1agUTqItlHTPyuiEU3-S9hvif
- special Acu0VrsfeYNoYlSo1FLEl1QiY_7mEcZ_kFGBZ15LcpONicJoPEuILwuyfSNPiEJsbf8ded1T
- hit AUgLymOcvQErA-1p-ca0w2b5aLx6pDp90BPpPOPEn4VLNXpz2sxDhxYlJlNLRiIYWQ77wR-6
- knock AfNksBvU1TBG55Khkd5fCfGWW6u5Qr0Iezvtga-t0a9DkTRSBFnjdO3hblxJPGYfyj2V0_Q2
- victory Aan3wZCzB1m30-dbAd9iEneiZK__gIv_sKNzcvD9c3Qj0SCRPR8RUIbK22WDpGm-a0wrAW5h
- block AYHT95EFFy3_O3fKId-Ip2WFu-H3WT-ezHf7g-0OnwJCjvhqvyg_Zuedkd-6zOXGOFVEguBo

## Badger (side view) — auto_fighter.py
- idle AfwHIxUFCRj_FY_UZkBXMx85wm_Qk-MmpysrMbD5euAfrAbQo7-iJHQtm3zifoaWqx9Cgpvv
- walk ARmPtHUm8CMM4WTrUrgj0q5HzOkr_Hemv7cvqS3R-tsw8TM1P_n2YGn_MZT8_22Mm0iaemkL
- light AcEcUt82r45IQ9_dnfCi6HjirVP4c8O9Ehs6UEGnD3r9Mr58ZSTNoya321sTXGfAlfLaklGJ
- heavy AZyuNZZchit8952VGyLmDiErdvTdcYlm_zPm9dZ-u5EuL0BvqqRLkHN-hOTDl1-Q-W43y6Ls
- jump AYpeZmBejY2AG08QImA-nYuOReIFdNzhMO3iKsChfSQR4PuJwD3vj40cawIsrRJ4hAqjwNCL
- special AZfCQaGm9MfAP8ceWnYKjQANlRLv7L2ie5SbaKAgYi2B8qqxScchiOOmzE44xziIwG3aMX3D
- hit AW-GK8nFJJKyI5TMAKIxQhf4T1O9lZUcFZaUH9MQjVEAfHo4F5FG7dyXezj2bbCGlJJrQBON
- knock ATc_NqdFak35MuN20crj2UcXho4F0zBxk9erAr4bCsljJXBWaHPwRy9EeU00eZW5B7Nd3FJr
- victory AWa4714k1WHitxOd-9SCZpZaTC5NFU-pvbMyMaqdyZ67L2q35ElTAxr2D3btTP18zrBiT3Fm
- block AT-pLJMdiFqAyzvHupWc2uaIJ7b7yFKuikK95j3dP15SWlQZkuC2DDhp-XqDY6A6jv4_Bahq

## Hyena (side view) — auto_fighter.py
- idle AREklDo2_k0yWYfSwjlDhDvHvyMC_CM5mVaCms74TaC0Usft91ogrcmvRiiuSWY4upgKdnPT
- walk AaDvHGK7xbMtEb6IXZlAY0HYHavrU5_RhYktdQh5EnFVdAkjehpnaWyyl-c7Xi2csJAfcwHq
- light AZWa21O-IbnHFbTc9EwM_1GyuIpuk29NX4f5UxfKQzX0MqBcoombyjoDqrFpVotI-neyc_QX
- heavy AcAoLP2seA-lbX8GZNq-vFWgwHkQ4WbVxMMfmjRdUcWo78jgz_QTeIQYP0ct5Mv3o4xOjsf5
- jump AW_9cJXIQG0Ymz-7fI-zjldxYI1-evzyJpPCKpgLVdyJPKbFTrCzDn8AYB4CnXWMs4mwQrl7
- special ATrUBVQC3EAOshs6Wz-ApI2GW_5vqKGyzZUib7qpFcNkoIMUXPK1bUj4cy6AekI2CByu2wkg
- hit AeAATLiCW0Xgcmi3KUMhsqKlgAs2W27c0uKxHP0tB1kGtVN0S6iiogC5Cf6qMs7mIEY-Uwr7
- knock ARhVj30I5LyrpBZDscGMSD15WY_2_kdkjLNcJLjnijlWbtZSGTRVP9s2vZjdXggs_g3wLsPs
- victory AdBg4FwGZO35pQNjpt8dcbx_sckbA4FpzYpWF2_62U1xvQVkb-dHmNG1IYD6LuwlC3IFgiGt
- block ATzVgZ_qXbyeDTvBBWArqxFiKWepE6HMQEpRQkdKSTSiHexxzdO4OUy2iJpYSmHLd6mxug9J

## Crocodile (side view) — auto_fighter.py
- idle AcdBk8-SG_L3zPFmNxCdqS7L8YOVnerhjJh-an81WgLiRcVZDlZZJdi5RTClxkfzzc8jnp_f
- walk AU6PKt7DqTlq1G7VLidtPgC3aM0f4TMB6KhtuQC1y6JpyOb45NZ2NwPMX47e1atmIGRM4E6k
- light Aca5olJwJD4n_fY2sXMgb_euPAsaFW3aMtc2AFmDYsZSFYggmohUw2tsl-4U_pPvJAmeO96_
- heavy AbFBP8cDA2Amum3A2JdkOH7LmJi2OFAtINrQQvOTYqYs_DCoH1x_bK9UBIflLwhzs1Vsc-FQ
- jump ASHKp7osy97VDWEGAPGDUDOsYe3NAab0QYLDL0Xx_2tD9yUnt8pYefLSW_ED25sdR1F2y_vY
- special ATf_e6qufxI5PWlCM1A8g_ij7O-IFKrBO_aGURz-Es7ShS9ZsneMkUu7YkfWOCRBO9_ceNyc
- hit AenaSbd2BnejW8fFaqywF1CzcjgUk37DYPZB7Q5IZSL_bpeYGZ5mX_HpQq6ay07h_yCZ4ERH
- knock AePLzeHtDK3aMfNagvL3x0_1n2--uYyTPF-Db1HdHfyMj6bCPg4UWObvEBc0AaCBy8pM4o8v
- victory AWlLRwYFgp1XO4DtqcfLMWFj59if21ZMWc1yN7AIJUUAs6FF8DmZBdKtPk2Yc68AXLn4hV-H
- block AebnIt2JFC_jLbzvAfCHzlPXx6PHGjqnRDLAL8UOFmETMnRRm_KwiEy9HCaDSUl5eIXIHbxK

## Elephant (side view) — auto_fighter.py
- idle Ae-HU50080VMZfiz0Mkui-pWfPrkbM9kxG_g4MvdA4_Va8xrQ3nFrVqsv-ldT4FsTmdGS4oe
- walk Afs8LTXTEQp0ppeqhOlqWAAWfQjQ5TVs2lvCkEgM1GZULJJSnNfFjdOPfo8OLmEbsg5ydrpK
- light Ac9QMuLvFu68rDUkfz6cDzL1HF4hKamBwK5v7dGDRPfOks1-vV0HeasVF6W_V-eQ7BUxiXzt
- heavy ATRxRQY-FdD-AKs3sFS6QDK9OUNOqA1CxfK775-TwReT5-wSN6_A7ULPTN8mLSu2ELTVpuqN
- jump AWWSaXD1IHNz2G5gVf-HTpw8VMl2vHX2ReOzVeyelKr1_PsiPcQmz90xoAZgMVgWKgxzjYiD
- special AfZ3FN67U5gRI0uFQox7NPVTnEgkXmQ_vulikUi-xy1lEgCLAT1qia_PrylUEs5mobuXin26
- hit ASClNPQOl8x52yzbfIXNZJ-y2wrmxlmj5467MlB5IhRfOBP4FUnR-QLE4XSQjMU-AOjPIuQg
- knock AU9ZtGS9iX1t4na0E5euamaF30Dkj7Tx3yVd4K65toXGp4P7flMhDDXiiv0N1LtF3Hs3XSc4
- victory AfsJuIRRIZL83xZQ0BNnzX4zKK28NI9Um7OM4vVMBRljZ3agExEU7n5LIVTCwt4mZG-jR6nQ
- block AbFjzK4P27TQ5NZEz1AGpp4UlB7e8uIx0eJj9od0P8dEFpRJCezmayZ_7v7MgmWP9gHgPw-3

## Hippo (side view) — auto_fighter.py
- idle AUrrpu_7a4x4kyEHwW5vqGzhqZv4Rd9bg4goHmnrwtmwpfYwSrqaHHSnQ-qzUjR7PLEiCC23
- walk AXWL07KpHUfOUdpA_Gz6DFs8t-Ih6wp4xpcImbbMskitP4W1LyEkrv9cz3r41ibDkQdVvVJB
- light Ae0q1cBtt0KBR5sqNR5L-7a0dYeVmIwL64J78gVaTgHoog3IUdYT3Az5fu4K-UfHz52DLNrZ
- heavy AXeuJnta9YYqlOTRcH-sUP5RXhF3OexsSNPza6uiRcnclFfBFV3Y8QMz7jlbLTKt2ZrySSiH
- jump ATqbmR3fbEP6P5mfTZ4GQJMlF07tfo1rJZtDaRMKqcb7qSNzCnRvLBy0oQ7regfZQSI8KOzU
- special AcnxZdKZQ8-mx56Gagr9eCHepZDBM-ZQSeglxLacktaRmkRO2_Pefud3PYoo9l7uJ_H8-VZU
- hit AUw7wsrEswnvwNxngoX9zQfP5VSNE960UzM0gH5cbMHvVeL-u81KmIu7SvKCAbS5qprWr4Ki
- knock AYM03lWr6icjHOV-4OcbS6gqVnZp4Je_UuNjAvr2CtfY8csYTtw0Q3grLejyIdx-YAKRhzKc
- victory Aeo0G26-vZnHtKPgIGOI23ZwRnDVfm9LexMfbsR61cI3-ScHWgYXYMKlrs1JN0jFt6M-2rWu
- block AbvzCtqD9xrKGd8T6Y5Mpe2d4bdmEGlSeHI6eycgwvFJ2aNdeSBVzYh5VeR45pqYFU82Y31p

## Snake (side view) — auto_fighter.py
- idle Ae56ol67XfaJjwmqyPbZWX6m7Tm1-2w2MDjkie2MzCL2sILgmOQRejBXf3ndjo5fUinuJvm2
- walk AVSPtEcmxzBB4qrB6rMLK48UXMH-_v4MkD6pTswJrB3Wc00_W1aR8gx2jYvbQaj9DEBSvLoO
- light AT2Z9MgaOx1-2QpC0rAr08pf0wfVzoH2Vxt1LkOt4MEdRHTFf15__Afo7VulklL7Sw6tSp7z
- heavy AWAB76U-xZpzWrECENX1te4NL1ZgQSSZlBzteRsbuVoFpvGA4uaQUfc8skqyyoVYqzXPlPFw
- jump AZl930tNmxtyJ7zfD2Tg3BSJ7wdWFY7SkHddBfhI7RA66YK0enSGZmeW13KZVFF_AcwmJTCB
- special AX6WOujcTP22UdUvf_-7p9UUjQKEuh6fVGBr8sSi5HGEM7Ny9e9OxivjshQLsmYshQFMhxp0
- hit AeOPzLUWNPY34ULuLMman811KW-S3O_LOtcB02iFfdG6skYLNsjUXkTJkCXpawanTIAkDb1H
- knock AcAK2JCUwMB-DtrJN2Ns5gfk3q4yyaORO1zYJe7EGoqqrQBKe9otgrarVjRiG7u248L-wxMA
- victory AWgUYPTaJO5bPrOM4K1TiH1PZfFeigdUb9EsS6RDjKqefWnYPfk5TyfPX6Rca_UyDXWzGuw1
- block AbfGlhQ85FURxeLvWolODC_ql-4lNdkkK9PpzwJBkBr-VGR4ZdnaGeKyLJ60NCnc4UfnTbiZ

## Stag (side view) — auto_fighter.py
- idle AY3rfXeXA_j1lzcNSNOZaodIYJ18EMzIZJ_qdh62JGgvJlCXVGcNMvOv-VkUw4xxu5WLDJbo
- walk AT7eCbfwhoWXDTqReBAMCUL9mfOZv4vZZ7Ra9rRuaeSO0ktrBUz4eSjpZ8KY8Nxc5IkUj2H9
- light AeoVh49pke3Yhif9u5yVqjDDET0UBFCe2lNDkJXbnljlQyduPgxrDL3eYovLUOXA3eLpIGMt
- heavy Ab3oN4Uob7CTAeBfoAuQOG06Y6Jmm5hdMeqanGNY53H2WuXk9AwdPhcQytvhMtpQ3Mznqni1
- jump AT68L2mfcJVJBvPaiTZeouHBrpp3rouK9C0XVKR_9q_O3QXxjbaYXHw5Z5mBKY5pHEdTjS-Y
- special AaJN_bTU2ZjrXpF0nSyRSBYuTe-QAS6ahvgv5bvNUB73K_blRg6GS-4SmknGorIIK03CAiKs
- hit AQ2HXPKU3N3OeDubqEcS3GwyhrlxI64oE_U1fdWjPLwJRMS789jdnvzVlYBgr7xuLSr2394u
- knock AYfqHm4YEqIVEdU6TmOtSj4YrmU7h5P4JiROgmVgLp8W17CanUehCU1po4Mn7e7_zXlLYeVs
- victory ARbdWzp3TJDrb7f3HagMF2BYNjxYfW3Br1gxEmQ0hlJPGeNLQf_ffVAv092050PID_uiX6Ni
- block AccgrmC2IX-zaOJhhIk7LCKLwLbiVSAu-cnWLo_C8sKupM1MMs1k_xvoGTj5RUVcYMzn_INK
