'use strict';
/* KING OF THE JUNGLE · STORY TEXT
   Edit the text in quotes. Any line left empty ("") is skipped in the game, so
   half-finished text never shows. \n starts a new paragraph.
   fighters.<id>: intro (before fight 1), clues "3"/"6"/"9" (after those fights), ending (champion screen),
   trueEnding (that fighter's own reveal after defeating the secret boss with them; may name him).
   forgotten: the secret tower. Only reveal, trueEnding and history may say the secret boss's name. */
window.KOTJ_STORY={
 "fighters": {
  "badger": {
   "intro": "Badger has never backed down from anything, and has never once asked why.\nSo when the drums started in his chest, the ones only he could hear, he did not ask. He sharpened his claws, strapped on his father's old armor, and walked toward the tournament.\nHe tells everyone he wants the crown. He does not know who taught him to want it.",
   "clues": {
    "3": "The Wolf he just defeated stares at Badger's armor. \"That crest on your shoulder. A crowned claw. I have seen it before.\"\nBadger has worn that armor his whole life. He never once looked at the crest.",
    "6": "Scratched inside the old armor's collar, worn almost smooth, are words in his father's hand: \"Eleven went up. If I do not come back down, do not follow.\"",
    "9": "Every night now, the same dream: a tower of black stone, taller than the trees, standing where no tower should be. Badger wakes up digging at the dirt, trying to get under it."
   },
   "ending": "Badger stands at the top of the Tower with the crown in his claws, and feels nothing.\nThe drums have not stopped. They have only gotten louder, and now they are coming from somewhere higher still.",
   "trueEnding": "As MAJIC falls, the armor plates on his shoulders crack apart, and one of them clatters at Badger's feet. On it is the crowned-claw crest, the same one Badger has worn on his chest all his life.\nIt was his father's. His father wore it into the tower so his son would know where to look.\nBadger finally understands the drums. They were never telling him to fight. They were telling him to come get his father.\nHe buries the plate beside the black tower and does not ask why anymore. He knows."
  },
  "wolf": {
   "intro": "Wolf left the pack the night the moon turned red. He could not explain it to them. He could barely explain it to himself.\nHis mother left on a night just like this one, when he was a pup. The pack says she abandoned them. Wolf has never believed it.\nSomething is calling him toward the crown, and it sounds like her howl.",
   "clues": {
    "3": "The beaten Hyena laughs through broken teeth. \"Your mother? Gray coat, scar across one eye? She came through here years ago. Asked for the old road north. Nobody asks for the old road.\"",
    "6": "In the ruins, Wolf finds a howl carved into stone, a pack mark only his mother ever used. Beside it are ten other marks he does not recognize, all pointing the same direction: up.",
    "9": "Wolf can smell her now, faint and old, on the wind coming from the north. It is mixed with something else. Something big. Something that should not smell like eleven different animals at once."
   },
   "ending": "The crowd chants his name, but Wolf only hears the silence after it.\nHe won the crown his mother never came back with. He still does not know why he wanted it, only that she wanted it first.",
   "trueEnding": "The wolf's head at MAJIC's belt falls loose, and for a moment its eyes are not empty. A gray wolf with a scar across one eye stands in the light, and howls the pack mark only she ever used.\nWolf howls back. The pack hears it, all the way across the jungle.\nShe never abandoned them. She went up to make the jungle safe for her pup. Wolf leads the pack home under a moon that is finally white again."
  },
  "hyena": {
   "intro": "Everyone thinks Hyena is laughing. Hyena is never laughing.\nThe sound comes out when he is afraid, and he has been afraid since the night his mother walked into the dark and the whole clan pretended she never existed.\nHe signed up for the tournament as a joke. That is what he tells himself.",
   "clues": {
    "3": "The clan elders refused to say her name, but the Snow Leopard he just beat did not.\n\"Your mother made a deal with the others. Eleven of them, the strongest of their kind. They swore to climb something together.\"",
    "6": "Hyena finds his mother's bone charm hanging from a dead branch at the edge of the old jungle. It was not lost. It was left, like a marker on a trail.",
    "9": "Every hyena knows to stay away from the black stone in the north. Hyena always thought it was a story to scare pups.\nThe charm is warm in his paw. It is pointing at the black stone."
   },
   "ending": "Hyena wins the crown, and for the first time in years, he does not laugh.\nHe looks north, and something up there looks back.",
   "trueEnding": "When MAJIC's eleven voices leave him, one of them is laughing. It is not cruel. It is the warm, wild laugh Hyena has not heard since he was a pup.\nHis mother did not vanish into the dark. She climbed into it, on purpose, for the clan that refused to say her name.\nHyena walks home and says it in front of every elder, out loud.\nThen he laughs, and for the first time in his life he means it."
  },
  "leopard": {
   "intro": "Snow Leopard is the fastest thing on four legs or two, and she has never once outrun the cold in her chest.\nShe came down from the mountains the winter her mother vanished, a white streak against white snow that no one ever saw arrive. Her mother taught her to move without a sound and to strike before the snow settled.\nNow a crown is calling her down from the peaks, and she runs toward it faster than she has ever run toward anything.",
   "clues": {
    "3": "The Jaguar she beats stares at her white fur. \"I've seen that coat before, on a mountain cat who came down the old road with ten others. She was the only one who left no tracks.\"",
    "6": "High on a frozen ledge, Snow Leopard finds frost that never melts, even in summer. Pressed into it is her mother's paw print, pointing at a black shape far above the clouds.",
    "9": "Travelers from the north speak of a giant whose breath turns the air to ice, and whose shoulders are covered in white, spotted fur that does not belong to it.\nSnow Leopard knows exactly whose fur that is."
   },
   "ending": "Snow Leopard holds the crown, and for the first time it is she who is standing still.\nThe frost on her claws has started to glow. Somewhere above the clouds, something is using her mother's cold.",
   "trueEnding": "When MAJIC falls, the frost around his claws cracks and lifts away like breath on a winter morning. The white, spotted fur on his shoulders fades to light, and a mountain cat steps out of it.\nIt is her mother, silver-eyed and silent, the fastest of the Pact. She reached MAJIC first. She was the one who almost won. MAJIC took her speed and her frost, and that is where his ice came from.\nShe touches her nose to her daughter's, the way she did when Snow Leopard was a cub, and then she is gone into the snow.\nSnow Leopard climbs back to the high peaks. Behind her the frost melts for the first time in a generation, and spring comes to the mountain."
  },
  "jaguar": {
   "intro": "Jaguar does not believe in signs. She believes in strength.\nBut she has dreamed of a crown every night since her mother disappeared, and the dream always ends the same way: her mother climbing, and never reaching the top.\nJaguar has decided to finish the climb herself.",
   "clues": {
    "3": "Her mother's hunting grounds are untouched, as if she left in the middle of a hunt and never came back for the kill.\nIn the mud, Jaguar finds tracks. Eleven sets, all different, all heading north together.",
    "6": "The Crocodile does not want to talk, but Jaguar makes him. \"They called themselves the Pact. Eleven champions, one from every kind. They went to take the crown from whoever wears the real one.\"\nJaguar has never heard of a real one.",
    "9": "Jaguar finds an old trophy wall in a ruined temple: carvings of beasts with their heads bowed before something enormous. Its face has been scratched out by claws, over and over, as if someone could not stand to look at it."
   },
   "ending": "Jaguar takes the crown and holds it up to the light. It is beautiful. It is also smaller than the one in the carving.\nThis is not the real crown. Somewhere, someone is still wearing that one.",
   "trueEnding": "The scratched-out face in the temple carving finally makes sense. It was MAJIC, and the claw marks were her mother's, made the night the Pact set out, so no one else would ever bow to him.\nJaguar lifts the real crown from MAJIC's head. It is heavy with eleven generations of stolen strength.\nShe does not put it on. She breaks it in half, and her mother's strength goes back into the jungle where it belongs."
  },
  "crocodile": {
   "intro": "Crocodile is older than most fighters in the tournament and slower than all of them. He does not care.\nHe has waited at the edge of the same river for years, waiting for his father to swim back. He is done waiting.\nHe does not know why the crown matters. He only knows that his father went looking for it.",
   "clues": {
    "3": "The river talks to those who listen long enough. Tonight it says the same thing three times: eleven crossed here, going north, and none crossed back.",
    "6": "In the mud of the riverbed, Crocodile finds one of his father's scales, as big as a shield and scored with claw marks far too large to belong to anything he has ever seen.",
    "9": "The old ones of the swamp will not say what lives in the north. They only say this: \"Your father was the toughest of us. He bit it once. That is the only reason we still talk about him.\""
   },
   "ending": "The crown sits on Crocodile's head, and the river is quiet for the first time in years.\nThen, far upstream, something heavy slides into the water.",
   "trueEnding": "The crocodile tail stops thrashing. Crocodile walks to it slowly and finds the old bite mark on the scales, his father's bite, the one the swamp still talks about.\nHis father hurt the giant, and the wound never healed. That is why MAJIC needed a new generation. He was weakening.\nCrocodile carries his father's scale back to the river and drops it in the current.\nThe river is quiet again. This time, it is a good quiet."
  },
  "lion": {
   "intro": "Everyone already calls Lion a king. He has never felt like one.\nHis father ruled before him, until the night he walked out of the pride lands wearing his crown and never came back. The pride says he was a coward who ran.\nLion entered the tournament to prove the pride wrong. He tells himself that is the only reason.",
   "clues": {
    "3": "An old lioness pulls Lion aside after the fight. \"Your father did not run, cub. He went to challenge something. Ten others went with him. They wanted to end it.\"\n\"End what?\" Lion asks. She does not answer.",
    "6": "Lion finds his father's crown half buried at the foot of a cliff, bent and scratched. Kings do not drop their crowns.\nSomeone took it off him. Someone stronger.",
    "9": "Every lion in the pride has the same dream, the old lioness admits. A roar from the north that sounds almost like theirs, but wrong, mixed with a dozen other voices.\nLion heard it last night for the first time. It sounded like his father."
   },
   "ending": "Lion wears the crown his father lost, and the pride finally bows.\nBut Lion is not looking at them. He is looking north, where the roar came from, and he is starting to understand why his father had to go.",
   "trueEnding": "MAJIC's mane falls away like smoke, and inside it Lion sees the true shape of a lion: his father, crownless and smiling.\n\"I did not run,\" his father's voice says. \"I went up so that one day you would not have to.\"\nLion takes the crown off MAJIC's head. It is his father's crown, the one that was bent at the cliff, reforged into something monstrous.\nHe straightens it, places it back on the summit, and walks down to the pride lands. He does not need to wear a crown anymore. He is a king."
  },
  "tiger": {
   "intro": "Tiger does not fight to win. Tiger fights because when he stops moving, he remembers.\nHe remembers the stripes on his mother's back disappearing into the tall grass. He remembers being told she would come back. She did not.\nThe tournament is just somewhere to keep moving. At least, that is what he thought.",
   "clues": {
    "3": "The Grizzly he defeated mutters as he falls: \"Stripes like those. I have seen them before. Not on a tiger.\"\nTiger asks what that means. The Grizzly does not get up to explain.",
    "6": "In an abandoned camp, Tiger finds a circle of eleven sleeping spots, one shaped exactly like his mother. In the center are ashes, and a single word clawed into a stone: TOGETHER.",
    "9": "Hunters in the north have a story about a beast with stripes on its arms and spots on its legs, and a tail that does not belong to a cat.\nTiger tells himself it is just a story. His paws are shaking."
   },
   "ending": "Tiger takes the crown, and for one moment he is perfectly still.\nThen he hears it, far away in the north: something moving that carries his mother's stripes.",
   "trueEnding": "The stripes on MAJIC's arms fade into light. Tiger watches them go and finally lets himself stand still.\nHe remembers her now, all of it: not just the stripes disappearing into the grass, but her turning back once, before she left, to look at him.\nShe was not leaving him. She was leaving for him.\nTiger stays at the summit until sunset. He is not running anymore, and the memories do not hurt."
  },
  "grizzly": {
   "intro": "Grizzly is a mountain with fur on it. Nobody in the jungle can move him, and nobody has tried in years.\nBut every spring he wakes from his long sleep expecting to see his father at the mouth of the cave. Every spring the cave is empty.\nThis year Grizzly woke up early, angry, and pointed north.",
   "clues": {
    "3": "His father's claw marks are on the trees along the old road, very high and very deep. Grizzly reaches up and puts his own paw beside them. He is bigger now than his father ever was.\nIt does not make him feel any better.",
    "6": "A traveling Hippo tells him: \"Your father was the strongest of the eleven. They put him in front, to take the first hit.\"\n\"The first hit from what?\" Grizzly asks. The Hippo goes quiet.",
    "9": "At the top of a ridge, Grizzly finds the place where the road ends. Beyond it, the clouds have a shape, the outline of something tall and black that the wind will not move.\nHe smells his father there, strongest of all."
   },
   "ending": "Grizzly takes the crown and roars until the mountains answer.\nSomething else answers too. It is wearing his father's arms.",
   "trueEnding": "MAJIC's massive arms fall still, and Grizzly knows them instantly. He knows the claw marks on the trees, the paws he measured himself against.\nHis father took the first hit for the Pact. He held MAJIC long enough for the others to strike, and MAJIC kept him for it.\nGrizzly carries the spirit of his father's strength down the mountain and back to the cave.\nWhen spring comes, he wakes up and the cave does not feel empty. It feels like home."
  },
  "hippo": {
   "intro": "Hippo is the most dangerous animal in the jungle, and also the most patient. She has waited a long time for her mother to come home.\nThe herd says she drowned. Hippos do not drown.\nWhen the tournament was announced, Hippo walked out of the water for the first time in years.",
   "clues": {
    "3": "The Elephant she beats is an old friend of the family. He looks at her sadly. \"Your mother made me promise not to tell you. She went with the others to the black tower. All eleven. I should have gone too.\"",
    "6": "In the dried mud where her mother used to rest, Hippo finds tracks leading out of the water. Huge ones, heavier than any hippo. They walk in, circle the spot, and walk back out, as if something came looking for her.",
    "9": "The water has been warm all season, the herd says, as if something enormous is breathing somewhere upstream.\nHippo dives down and listens. Far away, under the riverbed, something huge has a heartbeat."
   },
   "ending": "Hippo stands on the top of the Tower, dripping and furious, holding the crown.\nShe will not wait any longer. She has a tower to climb, even if no one else can see it yet.",
   "trueEnding": "The giant heartbeat Hippo heard under the riverbed was never MAJIC's. It was her mother's, still beating inside him, still fighting him from the inside all these years. That is why the water stayed warm.\nWhen MAJIC falls, the heartbeat slows, and then it is gone, gently, like someone falling asleep.\nHippo goes back to the river. The water is cool again. She floats in her mother's old resting spot, and she is not waiting for anyone anymore."
  },
  "elephant": {
   "intro": "Elephant never forgets. That is the problem. He remembers everything except the one thing that matters: where his father went.\nHe remembers the night his father touched his trunk to his forehead and said \"I will be back before the rains.\" The rains have come eleven times since then.\nThe crown means nothing to Elephant. Remembering means everything.",
   "clues": {
    "3": "In the elephant graveyard, every elder has a resting place. Every one except his father's.\nThere is no body, no bones and no tusks. Elephant searches until sunrise and finds nothing.",
    "6": "The Hippo he defeats finally tells him: \"Your father led them. He was the one who found the tower. He said it had been waiting for someone to come.\"",
    "9": "Elephant dreams of tusks: his father's tusks, white and curved and unmistakable. In the dream they are not on his father. They are on something else, something with a lion's mane and wings.\nElephant wakes up screaming, and for the first time he wishes he could forget."
   },
   "ending": "Elephant has the crown and the cheers of the whole jungle, and he gives both away.\nHe is the last one. All eleven have climbed now. All eleven have the same question. Somewhere, a door that was never there is opening.",
   "trueEnding": "The tusks on MAJIC's face are white and curved and unmistakable.\nElephant touches them with his trunk, the way his father touched his forehead the night he left, and he remembers the promise: \"I will be back before the rains.\"\nHe carries his father's tusks down the mountain to the graveyard, to the one empty resting place, and lays them there as the first rain begins.\nHis father came back before the rains after all. And Elephant, who never forgets, will remember this most of all."
  },
  "snake": {
   "intro": "Snake does not hurry. Snakes never do.\nBut for three seasons now, he has felt something winding tighter in his chest, a pull toward the crown he cannot shake off like an old skin.\nHis mother shed her last skin on the night she left. He still keeps it. It is the only thing she left behind.",
   "clues": {
    "3": "An old tortoise who has watched the jungle for two hundred years stops Snake on the road.\n\"Your mother came this way long ago, before the others. She climbed alone. No one climbs alone.\"",
    "6": "Coiled in the roots of a dead tree, Snake finds his mother's fangs, pressed into the bark in a warning only snakes can read: \"Too big. Too many. Do not follow.\"",
    "9": "The crocodiles of the north tell a story about a giant with serpents around its shoulders, serpents that still move on their own and still hiss in a voice none of them recognize.\nSnake recognizes it. He has heard it in his dreams his whole life."
   },
   "ending": "Snake wraps the crown in his coils and holds it close.\nIt is warm, but not the right kind of warm. Somewhere far above, something is wearing his mother's skin.",
   "trueEnding": "When MAJIC falls, the serpents around his shoulders go still, then slither free, then fade into the wind.\nOne of them turns back before it goes. Its eyes are gold, like his.\nSnake's mother was the first to climb, alone, long before the Pact. She made it to the summit. She bit MAJIC, and that is why the giant always moved so carefully around serpents.\nSnake sheds his skin at the top of the tower and leaves it there beside hers. Two skins, two generations, one finished climb."
  },
  "eagle": {
   "intro": "Eagle can see a rabbit move from three miles up. So why can he never see where his father went?\nHe has flown over every inch of the jungle searching. And every time he flies north, his wings turn back on their own, as if something up there does not want to be seen.\nNow there is a tournament, and a crown, and a pull in his chest stronger than the wind.",
   "clues": {
    "3": "The old birds of the cliffs remember. \"Your father flew higher than any of us. He said he saw a tower above the clouds. He said it was waiting for him.\"",
    "6": "High on a cliff ledge, Eagle finds one of his father's feathers, golden and huge, burned black at the tip as if it had been too close to lightning.",
    "9": "For the first time, Eagle forces his wings north. Above the clouds he sees it: a black tower, and around its peak, something with wings that are not its own.\nThey are shaped exactly like his father's."
   },
   "ending": "Eagle holds the crown and looks up instead of down for once.\nHe has always been the one who sees everything. Now he finally knows where to look.",
   "trueEnding": "MAJIC's wings tear free as he falls, and for one moment they spread wide on their own, catching the dawn wind.\nEagle knows that wingspan. He learned to fly underneath it.\nHis father flew to the summit alone, a generation before the Pact, to see what was hiding above the clouds. MAJIC took his wings so the jungle could never look down on him again.\nEagle carries the feathers to the highest cliff and lets the wind take them. His father can finally fly."
  },
  "dolphin": {
   "intro": "Dolphin King rules a kingdom no land beast has ever seen. The tides answer to him, and the reef bows when he passes.\nBut the rivers that feed his sea have started to run dark, and something upstream is drinking the jungle dry.\nSo for the first time in his life, the King of the Tides walks out of the water.",
   "clues": {
    "3": "Every river he follows bends the same way, toward the mountains, as if something up there is pulling the water to it.",
    "6": "The Crocodile he beats spits out a warning with the river water. \"Go home, sea king. The last thing that came up here wearing a crown is still up there. It just isn't wearing it anymore.\"",
    "9": "At the foot of the black tower the streams stop flowing entirely. They pool, still and silent, and in the reflection Dolphin King sees a second crown behind his own."
   },
   "ending": "The jungle crowns him on the riverbank so the water can see.\nIt is the first time a king of the sea has worn the jungle's crown. Somewhere above the clouds, something old takes notice.",
   "trueEnding": "As MAJIC falls, the stolen rivers break free all at once and roar back down the mountain toward the sea.\nMAJIC took a piece of every beast that climbed his tower, but he never took the tide. Nothing ever has.\nDolphin King walks home in the rain, and the oceans rise to meet him."
  },
  "stag": {
   "intro": "Stag has never lost a head-to-head fight. His father taught him how, before the night he walked into the dark forest and did not come back.\nThe herd says a king of the forest should not chase crowns that belong to the jungle. Stag agrees.\nSo why can he not stop walking toward one?",
   "clues": {
    "3": "Antler marks on the old trees, far too high and far too wide for any deer alive. They are his father's. He would know them anywhere. They point north.",
    "6": "The Grizzly he beats tells him, \"A stag came through the mountains long ago. Alone. He said he was going to put an end to the thing that eats kings.\"",
    "9": "In the black stone at the foot of the mountain, Stag finds a broken antler tip, iron-hard and scored with claw marks.\nThe break is clean, as if something took the rest on purpose."
   },
   "ending": "Stag lowers his head and lets them place the crown between his antlers.\nIt fits. That is what frightens him. It fits like it was meant for someone his father knew.",
   "trueEnding": "The great curved horns on MAJIC's head crack as he falls, and Stag finally sees them for what they are: his father's antlers, twisted and stolen.\nHis father went up alone, a generation before the Pact, to break the thing that eats kings. He broke one of MAJIC's fangs before he fell, and MAJIC took his crown of antlers in return.\nStag gathers what is left of them and carries it home to the forest.\nNext spring his own antlers grow back taller than ever, and they look just like his father's."
  }
 },
 "forgotten": {
  "enter": "There was no tower here yesterday.\nThere is no name above the door, no path leading to it and no sound inside. But every fighter who has ever felt the drums knows this is where they were going.\nThe door is already open. It has been waiting.",
  "echoes": [
   "The air goes cold. Something steps out of the dark, shaped like a fighter but gray and hollow, with eyes that glow faintly purple.\nIt moves like someone you almost remember.",
   "Another echo blocks the stairs. It fights with a style that is old and proud, the way champions fought a generation ago.\nAs it falls, it whispers one word: \"Climb.\"",
   "The last echo is the strongest, as if it held on the longest. It does not want to stop you. It wants to see if you are strong enough.\nWhen it fades, the stairway up finally lights."
  ],
  "summit": "The stairs end at the top of the world. Wind howls through broken pillars. Eleven banners hang here, torn and faded, one for every kind of beast.\nYou recognize every one of them. They belonged to the ones who climbed before.",
  "reveal": "Something huge rises from the shadow of the throne.\nIt has a lion's mane and a crown. It has an elephant's tusks, a tiger's stripes, and the white, spotted fur of a snow leopard, with frost curling off its claws. A crocodile's tail drags behind it. A wolf's head hangs at its belt. On its back are wings, and around its shoulders coil serpents.\n\"I am MAJIC,\" it says, with a voice made of eleven voices. \"Your parents came here as the Pact. Eleven champions, the best of their kind, sworn to take my crown.\"\n\"They fought well. The mountain cat was fastest; she nearly reached my heart before I froze her with her own cold. They lost. And I keep what I win.\"\nIt spreads its arms, and every trophy on its body is someone you have been searching for.\n\"You felt the drums, little one. That was me, calling the next generation home.\"",
  "trueEnding": "MAJIC falls, and eleven voices leave his body at once, rising like smoke into the dawn.\nThe parents are not coming back, but they are finally free. And the jungle, for the first time in a generation, has a true king.",
  "history": "Long before the tournament, the jungle had no king. It had MAJIC.\nHe was once a single beast who learned that every challenger he defeated left something behind: strength, speed, armor, a bite. He kept all of it. Over the centuries he grew into something no longer one animal, but all of them.\nHe built the tower from the black stone of the old mountain and hid it from every map. He created the tournament so the strongest of each generation would rise, climb, and come to him.\nOne generation ago, eleven champions saw through the lie. They formed the Pact and climbed together. They nearly won; the snow leopard of the high peaks struck first and fastest. MAJIC took their trophies, and her frost became his own and called the drums again for their children.\nThis time, the children came. And this time, the Forgotten Tower lost.",
  "majicSpeech": "The jungle was never mine to rule.\nLet it finally live in peace."
 }
};
