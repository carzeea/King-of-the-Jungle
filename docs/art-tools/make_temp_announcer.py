import subprocess,json,os,sys
LINES={'final-fight':'Final... fight!','danger':'Danger!','combo-breaker':'Combo breaker!','lockout':'Lockout!','instinct':'Instinct!',
'ultra-combo':'Ultra combo!','time':'Time!','you-win':'You win!','you-lose':'You lose.','king-of-the-jungle':'King... of the jungle!',
'triple-combo':'Triple combo!','super-combo':'Super combo!','hyper-combo':'Hyper combo!','brutal-combo':'Brutal combo!','savage-combo':'Savage combo!',
'feral-combo':'Feral combo!','primal-combo':'Primal combo!','monster-combo':'Monster combo!','apex-combo':'Apex combo!','king-combo':'King combo!',
'majic':'Magic! The jungle titan!','majic-wins':'Magic wins!'}
LINES['leopard-wins']='Snow leopard wins!'
for f in ['badger','wolf','hyena','leopard','jaguar','crocodile','lion','tiger','grizzly','hippo','elephant']:LINES.setdefault(f+'-wins',f.capitalize()+' wins!')
only=sys.argv[1:] or list(LINES)
for k in only:
  t=LINES[k];raw=f'out/{k}.wav'
  subprocess.run(['./piper/piper','-m','ryan/en-us-ryan-high.onnx','--length_scale','1.12','--noise_scale','0.5','-f',raw],input=t.encode(),capture_output=True)
  sr=22050
  fc=(f"[0:a]asplit=2[a][b];"
      f"[a]asetrate={sr}*0.80,aresample=44100,atempo=1.18[m];"
      f"[b]asetrate={sr}*0.56,aresample=44100,atempo=1.6,lowpass=f=900,volume=0.55[s];"
      f"[m][s]amix=inputs=2:duration=longest:normalize=0,"
      f"equalizer=f=110:t=q:w=1:g=6,equalizer=f=3000:t=q:w=1.2:g=3,"
      f"acompressor=threshold=-18dB:ratio=4:attack=5:release=120:makeup=4,"
      f"aecho=0.8:0.5:60|130:0.25|0.12,"
      f"apad=pad_dur=0.25,loudnorm=I=-13:TP=-1:LRA=7")
  subprocess.run(['ffmpeg','-y','-loglevel','error','-i',raw,'-filter_complex',fc,'-ar','44100','-ac','1','-b:a','128k',f'out/holden-{k}.mp3'],check=True)
  print(k,flush=True)
