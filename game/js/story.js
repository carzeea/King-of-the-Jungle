'use strict';
/* KING OF THE JUNGLE · STORY TEXT
   Fill in the quotes. Any line left empty is simply skipped in the game, so
   half-finished text never shows. Use \n for a new paragraph.
   RULE: never write the secret boss's name anywhere except forgotten.reveal,
   forgotten.trueEnding and forgotten.history (players only see those after earning them). */
window.KOTJ_STORY={
 // Each fighter's Tower. intro: before fight 1. clues: shown after winning fight 3, 6 and 9.
 // ending: on the champion screen after beating that fighter's Tower.
 fighters:{
  badger:{intro:'',clues:{3:'',6:'',9:''},ending:''},
  wolf:{intro:'',clues:{3:'',6:'',9:''},ending:''},
  hyena:{intro:'',clues:{3:'',6:'',9:''},ending:''},
  leopard:{intro:'',clues:{3:'',6:'',9:''},ending:''},
  jaguar:{intro:'',clues:{3:'',6:'',9:''},ending:''},
  crocodile:{intro:'',clues:{3:'',6:'',9:''},ending:''},
  lion:{intro:'',clues:{3:'',6:'',9:''},ending:''},
  tiger:{intro:'',clues:{3:'',6:'',9:''},ending:''},
  grizzly:{intro:'',clues:{3:'',6:'',9:''},ending:''},
  hippo:{intro:'',clues:{3:'',6:'',9:''},ending:''},
  elephant:{intro:'',clues:{3:'',6:'',9:''},ending:''},
 },
 // The secret tower (unlocked after all 11 fighter Towers are won). No name is shown in game.
 forgotten:{
  enter:'',            // when a fighter steps inside
  echoes:['','',''],   // before echo fight 1, 2 and 3 (shadowy echoes of the fallen parents)
  summit:'',           // after the 3rd echo, on the way to the summit
  reveal:'',           // the truth: who defeated the parents and what became of them
  trueEnding:'',       // champion screen after the final victory
  history:''           // the tower's full history, shown after the true ending
 }
};
