/**
 * NPC Flavor Data — Part 3: Fetish Objects
 * Bilingual flavor text tables for procedural NPC generation.
 * Each entry is a unique iconic personal item a runner always carries.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Bilingual flavor entry */
export interface FlavorEntry { fr: string; en: string; }

// ═══════════════════════════════════════════════════════════════
// FETISH OBJECTS — Iconic personal items every runner carries
// ═══════════════════════════════════════════════════════════════

export const FETISH_OBJECTS: FlavorEntry[] = [
  // ——— Sentimental items ———
  { fr: "Un zippo gravé avec les mots 'Ne fais confiance à personne' en japonais", en: "A zippo engraved with 'Trust no one' in Japanese" },
  { fr: "Une vieille photo Polaroid tellement usée qu'on ne voit plus le visage dessus", en: "An old Polaroid photo so worn you can't see the face anymore" },
  { fr: "L'alliance d'un mariage qui n'a jamais eu lieu, portée à une chaîne autour du cou", en: "A wedding ring from a marriage that never happened, worn on a chain around their neck" },
  { fr: "Un dessin d'enfant représentant une famille devant une maison, plié en huit", en: "A child's drawing of a family in front of a house, folded into eighths" },
  { fr: "La dernière lettre manuscrite de leur mère, scellée et jamais rouverte", en: "The last handwritten letter from their mother, sealed and never reopened" },
  { fr: "Un médaillon contenant une mèche de cheveux blancs dont ils refusent de parler", en: "A locket containing a lock of white hair they refuse to discuss" },
  { fr: "Un petit ours en peluche brûlé sur un côté, rescapé d'un incendie de Barrens", en: "A small teddy bear burned on one side, rescued from a Barrens fire" },
  { fr: "Une carte postale de Seattle datée d'avant le Crash 2.0, jamais envoyée", en: "A postcard from Seattle dated before Crash 2.0, never sent" },
  { fr: "Le badge d'employé Renraku de leur père, taché de sang séché", en: "Their father's Renraku employee badge, stained with dried blood" },
  { fr: "Un origami en forme de grue fait par leur petite sœur le jour de sa disparition", en: "An origami crane made by their little sister the day she disappeared" },
  { fr: "Une clé USB contenant la voix de quelqu'un qu'ils ont perdu, jamais réécoutée", en: "A USB drive containing the voice of someone they lost, never replayed" },
  { fr: "Un bracelet tressé à deux couleurs, l'autre moitié portée par quelqu'un de mort", en: "A two-color braided bracelet, the other half worn by someone now dead" },
  { fr: "Une minuscule boîte à musique jouant un air que personne d'autre ne reconnaît", en: "A tiny music box playing a tune nobody else recognizes" },
  { fr: "Un morceau de tissu découpé dans la couverture de leur bébé, toujours dans leur poche", en: "A scrap of fabric cut from their baby blanket, always in their pocket" },
  { fr: "La montre de leur grand-père, arrêtée à 3h17, l'heure exacte de sa mort", en: "Their grandfather's watch, stopped at 3:17 AM, the exact time of his death" },
  { fr: "Un collier de perles en plastique offert par un enfant des Barrens qu'ils n'ont pas pu sauver", en: "A plastic bead necklace given by a Barrens kid they couldn't save" },
  { fr: "Une lettre d'amour écrite en or'zet, pliée si souvent que les mots s'effacent", en: "A love letter written in Or'zet, folded so often the words are fading" },
  { fr: "Le premier credstick qu'on leur a donné à l'orphelinat, valeur : 0 nuyen", en: "The first credstick they were given at the orphanage, balance: 0 nuyen" },
  { fr: "Un petit carnet rempli de noms barrés — tous des gens qu'ils ont perdus", en: "A small notebook full of crossed-out names — all people they've lost" },
  { fr: "Un bouton de manchette Ares arraché du costume de leur père lors de leur dernière dispute", en: "An Ares cufflink torn from their father's suit during their last argument" },

  // ——— Lucky charms ———
  { fr: "Un dé à six faces en os de dragon, toujours dans sa poche gauche", en: "A six-sided die made from dragon bone, always in their left pocket" },
  { fr: "Une balle de calibre .50 qui les a ratés de trois centimètres, montée en pendentif", en: "A .50 caliber bullet that missed them by three centimeters, mounted as a pendant" },
  { fr: "Une patte de lapin provenant d'un lapin Éveillé, brillant faiblement la nuit", en: "A rabbit's foot from an Awakened rabbit, glowing faintly at night" },
  { fr: "Un credstick avec exactement 1¥ dessus qu'ils n'ont jamais dépensé", en: "A credstick with exactly 1¥ on it they've never spent" },
  { fr: "Un jeton de poker volé à un dragon lors d'une partie clandestine", en: "A poker chip stolen from a dragon during an underground game" },
  { fr: "Une pièce de monnaie pré-Éveil qu'ils font tourner avant chaque run", en: "A pre-Awakening coin they spin before every run" },
  { fr: "Un trèfle à quatre feuilles plastifié, trouvé dans une zone toxique", en: "A laminated four-leaf clover found in a toxic zone" },
  { fr: "Un fragment de balle logé dans un médaillon — celle qui aurait dû les tuer", en: "A bullet fragment set in a medallion — the one that should have killed them" },
  { fr: "Un petit crâne en chrome qu'ils frottent avant chaque combat", en: "A small chrome skull they rub before every fight" },
  { fr: "Un dé pipé qui tombe toujours sur le six, trouvé sur un cadavre chanceux", en: "A loaded die that always lands on six, found on a lucky corpse" },
  { fr: "Un éclat de miroir qu'ils prétendent voir l'avenir dedans quand la lumière est bonne", en: "A mirror shard they claim shows the future when the light is right" },
  { fr: "Un ticket de loterie gagnant non réclamé datant de 2049", en: "An unclaimed winning lottery ticket from 2049" },
  { fr: "Un petit sachet de sel béni par un chaman qu'ils gardent dans leur botte droite", en: "A small pouch of salt blessed by a shaman, kept in their right boot" },
  { fr: "Un ongle de troll incassable porté en amulette autour du cou", en: "An unbreakable troll fingernail worn as an amulet around their neck" },
  { fr: "Un vieux jeton de métro de Seattle qu'ils font tourner entre leurs doigts quand ils réfléchissent", en: "An old Seattle metro token they spin between their fingers when thinking" },

  // ——— Trophies ———
  { fr: "Les plaques militaires de leur première cible, jamais nettoyées", en: "The dog tags of their first kill, never cleaned" },
  { fr: "Un bouton de manchette en platine d'un cadre Aztechnology qu'ils ont descendu", en: "A platinum cufflink from an Aztechnology executive they took down" },
  { fr: "Un morceau du blindage d'un drone Ares qu'ils ont détruit à mains nues", en: "A piece of armor plating from an Ares drone they destroyed bare-handed" },
  { fr: "Une dent en or arrachée à un rival lors de leur premier combat de rue", en: "A gold tooth pulled from a rival during their first street fight" },
  { fr: "L'insigne d'un officier Lone Star qu'ils ont laissé en vie, comme rappel", en: "The badge of a Lone Star officer they left alive, as a reminder" },
  { fr: "Un morceau de fibre optique arraché d'un nœud de la Matrice qu'ils ont crashé", en: "A length of fiber optic cable torn from a Matrix node they crashed" },
  { fr: "Le stylo Montblanc d'un Johnson qui a essayé de les doubler", en: "The Montblanc pen of a Johnson who tried to double-cross them" },
  { fr: "Un patch d'unité des Tir Ghost arraché lors d'une embuscade dans la forêt", en: "A Tir Ghost unit patch torn off during a forest ambush" },
  { fr: "La lame cassée du premier couteau qu'ils ont planté dans quelqu'un", en: "The broken blade of the first knife they stuck in someone" },
  { fr: "Un œil cybernétique désactivé pris à un adversaire, gardé dans un petit bocal", en: "A deactivated cybernetic eye taken from an opponent, kept in a small jar" },
  { fr: "Un morceau de la corne d'un esprit du feu qu'ils ont banni", en: "A piece of horn from a fire spirit they banished" },
  { fr: "La carte d'accès d'un laboratoire Mitsuhama qu'ils ont fait exploser", en: "The access card to a Mitsuhama lab they blew up" },
  { fr: "Un éclat de verre blindé provenant du bureau d'un CEO de Saeder-Krupp", en: "A shard of armored glass from a Saeder-Krupp CEO's office" },
  { fr: "Un bout de fil barbelé du camp dont ils se sont évadés dans les Barrens", en: "A length of barbed wire from the camp they escaped in the Barrens" },
  { fr: "Le dernier message d'erreur d'une IA qu'ils ont tuée, imprimé sur papier thermique", en: "The last error message of an AI they killed, printed on thermal paper" },

  // ——— Weird collections ———
  { fr: "Un bocal contenant sept datajacks extraits, étiquetés avec des dates", en: "A jar containing seven extracted datajacks, labeled with dates" },
  { fr: "Un sac en toile rempli de grues en origami — une pour chaque personne qu'ils ont tuée", en: "A canvas bag full of origami cranes — one for each person they've killed" },
  { fr: "Une collection de dents de différentes métaespèces dans un étui à cigares", en: "A collection of teeth from different metatypes in a cigar case" },
  { fr: "Un trousseau de clés dont aucune n'ouvre plus rien, mais ils les gardent quand même", en: "A keyring of keys that no longer open anything, but they keep them anyway" },
  { fr: "Un carnet rempli de croquis de chaque endroit où ils ont failli mourir", en: "A notebook filled with sketches of every place they almost died" },
  { fr: "Treize billes de verre de couleurs différentes dans une pochette en cuir", en: "Thirteen glass marbles of different colors in a leather pouch" },
  { fr: "Un sachet de puces RFID grillées récupérées sur des corps au fil des années", en: "A pouch of fried RFID chips collected from bodies over the years" },
  { fr: "Une boîte de boutons dépareillés arrachés aux vêtements de leurs victimes", en: "A box of mismatched buttons torn from their victims' clothing" },
  { fr: "Un album photo rempli de clichés de lieux abandonnés du Sixième Monde", en: "A photo album filled with pictures of abandoned Sixth World locations" },
  { fr: "Un fil sur lequel sont enfilées des capsules de balles aplaties comme des perles", en: "A string threaded with flattened bullet casings like beads" },
  { fr: "Un petit classeur contenant des cartes de visite de tous les fixers qu'ils ont connus", en: "A small binder containing business cards from every fixer they've known" },
  { fr: "Sept petites fioles contenant de la terre de sept pays différents", en: "Seven small vials containing soil from seven different countries" },

  // ——— Old world relics ———
  { fr: "Un smartphone pré-Éveil avec un écran fissuré, batterie morte depuis des décennies", en: "A pre-Awakening smartphone with a cracked screen, battery dead for decades" },
  { fr: "Un livre de poche en papier — un roman policier dont il manque les dix dernières pages", en: "A paper paperback — a mystery novel missing the last ten pages" },
  { fr: "Un vinyle de jazz analogique qu'ils n'ont aucun moyen de lire", en: "An analog jazz vinyl record they have no way to play" },
  { fr: "Une montre mécanique suisse qui retarde de trois minutes par jour", en: "A Swiss mechanical watch that loses three minutes every day" },
  { fr: "Un appareil photo argentique avec une seule photo non développée sur le rouleau", en: "A film camera with one undeveloped photo left on the roll" },
  { fr: "Un walkman cassette fonctionnel avec un seul album chargé qu'ils écoutent en boucle", en: "A working cassette Walkman with one album loaded that they play on repeat" },
  { fr: "Un jeu de cartes à jouer en papier, il en manque le valet de pique", en: "A paper deck of playing cards, missing the jack of spades" },
  { fr: "Un stylo-plume à encre véritable, une relique d'avant l'ère numérique", en: "A fountain pen with real ink, a relic from before the digital age" },
  { fr: "Un globe terrestre miniature montrant les frontières d'avant le Réveil", en: "A miniature globe showing pre-Awakening national borders" },
  { fr: "Un dictionnaire papier français-japonais tenu par un élastique", en: "A paper French-Japanese dictionary held together with a rubber band" },
  { fr: "Un Rubik's Cube original des années 80, résolu et collé en place", en: "An original 1980s Rubik's Cube, solved and glued in place" },
  { fr: "Un briquet Zippo en laiton qui fonctionne encore, alimenté à l'essence véritable", en: "A brass Zippo lighter that still works, fueled with real gasoline" },
  { fr: "Une paire de lunettes de soleil Ray-Ban vintage, un verre félé", en: "A pair of vintage Ray-Ban sunglasses, one lens cracked" },
  { fr: "Une cassette VHS étiquetée 'NE PAS REGARDER' en lettres majuscules", en: "A VHS tape labeled 'DO NOT WATCH' in block letters" },
  { fr: "Un tamagotchi pré-Éveil dont la créature virtuelle est morte depuis 2030", en: "A pre-Awakening Tamagotchi whose virtual pet has been dead since 2030" },

  // ——— Tech items ———
  { fr: "Un commlink briqué lors de leur premier run, qu'ils portent en bracelet", en: "A commlink bricked during their first run, worn as a bracelet" },
  { fr: "Une puce de données peinte à la main avec un motif de flammes aztech", en: "A data chip custom-painted with an Aztech flame pattern" },
  { fr: "Le module mémoire central d'une IA morte qu'ils jurent entendre murmurer parfois", en: "The core memory module of a dead AI they swear they hear whispering sometimes" },
  { fr: "Un œil cybernétique de rechange qu'ils gardent 'au cas où', roulant dans leur poche", en: "A spare cybernetic eye they keep 'just in case', rolling around in their pocket" },
  { fr: "Un vieux câble de datajack enroulé comme un bracelet autour de leur poignet", en: "An old datajack cable coiled like a bracelet around their wrist" },
  { fr: "Un circuit imprimé arraché au premier drone qu'ils ont hacké, monté en broche", en: "A circuit board ripped from the first drone they hacked, mounted as a brooch" },
  { fr: "Un holoprojecteur miniature affichant en boucle trois secondes d'un coucher de soleil", en: "A miniature holographic projector looping three seconds of a sunset" },
  { fr: "Une diode LED clignotante sans alimentation, récupérée dans les ruines de Renraku Arcology", en: "A blinking LED with no power source, salvaged from the Renraku Arcology ruins" },
  { fr: "Un disque dur magnétique d'un téraoctet, énorme et obsolète, utilisé comme presse-papier", en: "A one-terabyte magnetic hard drive, enormous and obsolete, used as a paperweight" },
  { fr: "Un drone espion miniature désactivé qu'ils appellent 'Petit' et à qui ils parlent", en: "A deactivated miniature spy drone they call 'Little One' and talk to" },
  { fr: "Un écran flexible enroulable affichant un message d'erreur permanent en néon vert", en: "A rollable flex-screen displaying a permanent error message in neon green" },
  { fr: "Une carte mère de commlink gravée avec les initiales de toute leur ancienne équipe", en: "A commlink motherboard engraved with the initials of their old team" },
  { fr: "Un fragment de satellite tombé qu'ils prétendent être d'origine extraterrestre", en: "A piece of fallen satellite they claim is of extraterrestrial origin" },
  { fr: "Un implant sous-cutané retiré de leur propre bras, conservé dans de la résine", en: "A subdermal implant removed from their own arm, preserved in resin" },

  // ——— Magical objects ———
  { fr: "Une plume d'aigle Éveillé qui flotte légèrement quand on la lâche", en: "A feather from an Awakened eagle that floats slightly when released" },
  { fr: "Un cristal de quartz qui brille faiblement en présence de magie", en: "A quartz crystal that glows faintly in the presence of magic" },
  { fr: "Une fiole d'eau imprégnée de mana récoltée dans un lac sacré amérindien", en: "A vial of mana-infused water collected from a sacred Amerindian lake" },
  { fr: "Un petit caillou ramassé dans un cercle de menhirs en Écosse, chaud au toucher", en: "A small pebble picked up from a stone circle in Scotland, warm to the touch" },
  { fr: "Un éclat d'os de sasquatch gravé de runes qu'aucun chamane ne sait déchiffrer", en: "A Sasquatch bone fragment carved with runes no shaman can decipher" },
  { fr: "Un flacon d'encre de calmar Éveillé qui change de couleur selon l'humeur du porteur", en: "A vial of Awakened squid ink that changes color based on the bearer's mood" },
  { fr: "Une bague en bois pétrifié provenant d'un arbre du Lacplesis, au Tir Tairngire", en: "A ring of petrified wood from a Lacplesis tree in Tir Tairngire" },
  { fr: "Un petit sablier dont le sable coule parfois vers le haut", en: "A small hourglass whose sand sometimes flows upward" },
  { fr: "Un scarabée en ambre contenant un insecte Éveillé fossilisé qui semble bouger la nuit", en: "An amber scarab containing a fossilized Awakened insect that seems to move at night" },
  { fr: "Un galet de rivière couvert de mousse qui ne meurt jamais et ne pousse jamais", en: "A river stone covered in moss that never dies and never grows" },
  { fr: "Un bout de charbon ardent perpétuel, enveloppé dans un tissu ignifugé", en: "A perpetually burning piece of charcoal, wrapped in fireproof cloth" },
  { fr: "Un miroir de poche en obsidienne qui ne reflète jamais tout à fait la réalité", en: "An obsidian pocket mirror that never quite reflects reality" },
  { fr: "Une petite clochette en argent dont le son n'est audible que par les Éveillés", en: "A small silver bell whose sound is only audible to the Awakened" },
  { fr: "Un croc de loup Éveillé monté en pendentif qui vibre quand le danger approche", en: "An Awakened wolf fang mounted as a pendant that vibrates when danger approaches" },
  { fr: "Un gland de chêne d'un bosquet sacré qui refuse de germer malgré tous les efforts", en: "An acorn from a sacred grove that refuses to sprout despite all efforts" },

  // ——— Food/drink ———
  { fr: "Un paquet de cigarettes pré-Éveil qu'ils refusent de fumer ou de jeter", en: "A pack of pre-Awakening cigarettes they refuse to smoke or throw away" },
  { fr: "Une flasque de vrai whisky écossais qu'ils n'ouvrent jamais, gardée pour 'le bon moment'", en: "A flask of real Scotch whisky they never open, saved for 'the right moment'" },
  { fr: "Un bonbon au caramel dans son emballage d'origine, durci comme une pierre depuis dix ans", en: "A caramel candy in its original wrapper, hardened like a rock for ten years" },
  { fr: "Un sachet de vrai thé Earl Grey, le dernier d'une boîte offerte par un ami mort", en: "A bag of real Earl Grey tea, the last from a box given by a dead friend" },
  { fr: "Une canette de Coca-Cola vintage non ouverte de 2029, légèrement bosselée", en: "An unopened vintage 2029 Coca-Cola can, slightly dented" },
  { fr: "Un flacon de sauce piquante artisanale fabriquée par un troll cuisinier de Redmond", en: "A bottle of artisanal hot sauce made by a troll cook from Redmond" },
  { fr: "Un morceau de chocolat suisse sous vide qu'ils reniflent parfois sans jamais l'ouvrir", en: "A vacuum-sealed piece of Swiss chocolate they sometimes sniff but never open" },
  { fr: "Une gourde militaire remplie d'eau de source 'pure', jamais bue, de peur qu'elle soit la dernière", en: "A military canteen full of 'pure' spring water, never drunk, afraid it's the last" },
  { fr: "Un petit pot de vrai miel cristallisé, volé lors d'un run dans une ferme corpo", en: "A small jar of real crystallized honey, stolen during a run on a corpo farm" },
  { fr: "Un biscuit de ration militaire qu'ils gardent comme 'dernier repas' depuis cinq ans", en: "A military ration biscuit they've kept as their 'last meal' for five years" },

  // ——— Clothing/accessories ———
  { fr: "Une écharpe tricotée par leur mère, trouée par deux impacts de balles", en: "A scarf knitted by their mother, with two bullet holes in it" },
  { fr: "Des gants mitaines en cuir usé offerts par leur mentor le jour de leur premier run", en: "Worn leather fingerless gloves given by their mentor the day of their first run" },
  { fr: "Un chapeau fedora noir dont ils refusent catégoriquement d'expliquer l'origine", en: "A black fedora hat whose origin they categorically refuse to explain" },
  { fr: "Un bandana rouge noué à leur cuisse, un souvenir d'un gang qu'ils ont quitté", en: "A red bandana tied to their thigh, a memento from a gang they left" },
  { fr: "Une cravate en soie Vashon Island portée comme bandeau de tête lors des combats", en: "A Vashon Island silk tie worn as a headband during fights" },
  { fr: "Une paire de Doc Martens recollées au moins vingt fois, irremplaçables", en: "A pair of Doc Martens reglued at least twenty times, irreplaceable" },
  { fr: "Un gant unique en kevlar souple, l'autre perdu lors d'une extraction ratée", en: "A single soft kevlar glove, the other lost during a botched extraction" },
  { fr: "Un pin's émaillé du logo de la UCAS épinglé à l'envers sur leur veste", en: "An enameled UCAS logo pin fastened upside down on their jacket" },
  { fr: "Une boucle de ceinture en forme de tête de loup, héritée de trois propriétaires morts", en: "A wolf-head belt buckle, inherited from three dead previous owners" },
  { fr: "Un foulard en soie taché de sang qu'ils n'ont jamais lavé et ne laveront jamais", en: "A silk handkerchief stained with blood they've never washed and never will" },

  // ——— More sentimental items ———
  { fr: "Un harmonica cabossé qui ne joue plus que trois notes, un cadeau de leur père", en: "A dented harmonica that only plays three notes, a gift from their father" },
  { fr: "La plaque d'identité militaire de leur jumeau mort à Bug City", en: "The military ID tag of their twin who died at Bug City" },
  { fr: "Un hologramme figé montrant un enfant riant — leur fils qu'ils n'ont jamais revu", en: "A frozen hologram showing a laughing child — their son they never saw again" },
  { fr: "Une bague de fiançailles dont le diamant a été remplacé par un éclat de balle", en: "An engagement ring whose diamond has been replaced with a bullet fragment" },
  { fr: "Un vieux pass de concert pour un groupe qui n'existe plus depuis le Crash", en: "An old concert pass for a band that hasn't existed since the Crash" },
  { fr: "Le dernier message vocal de leur coéquipier, stocké sur une puce isolée du réseau", en: "Their teammate's last voicemail, stored on a chip isolated from the network" },
  { fr: "Un marque-page en cuir pressé entre les pages d'un livre qu'ils ne possèdent plus", en: "A leather bookmark pressed between the pages of a book they no longer own" },

  // ——— More lucky charms ———
  { fr: "Un fer à cheval miniature en acier forgé par un nain de Seattle", en: "A miniature horseshoe forged from steel by a Seattle dwarf" },
  { fr: "Un boulon rouillé trouvé sur le toit d'où ils ont échappé à une embuscade", en: "A rusty bolt found on the rooftop where they escaped an ambush" },
  { fr: "Une carte de tarot — Le Pendu — trouvée dans la main d'un mort qui leur souriait", en: "A tarot card — The Hanged Man — found in the hand of a smiling corpse" },
  { fr: "Un morceau de kevlar découpé dans le gilet qui leur a sauvé la vie", en: "A piece of kevlar cut from the vest that saved their life" },
  { fr: "Un galet parfaitement rond ramassé sur une plage la veille de leur première mort clinique", en: "A perfectly round pebble picked up from a beach the day before their first clinical death" },

  // ——— More trophies ———
  { fr: "La montre à gousset d'un yakuza oyabun qu'ils ont battu au combat singulier", en: "The pocket watch of a Yakuza oyabun they defeated in single combat" },
  { fr: "Un fragment de masque de cérémonie arraché à un adepte du Loup de Fenris", en: "A fragment of a ceremonial mask torn from a Fenris Wolf adept" },
  { fr: "Un bout de câble porteur du pont dont ils ont fait tomber un hélicoptère corpo", en: "A piece of support cable from the bridge where they brought down a corpo helicopter" },
  { fr: "La fibule en argent d'un prince elfique du Tir na nÓg qu'ils ont humilié", en: "The silver brooch of a Tir na nÓg elven prince they humiliated" },
  { fr: "Le numéro de série gravé d'un tank Ares qu'ils ont neutralisé avec une bombe artisanale", en: "The engraved serial number plate of an Ares tank they disabled with a homemade bomb" },

  // ——— More weird collections ———
  { fr: "Un fil électrique sur lequel sont enfilés des SIN falsifiés périmés, comme un collier de perles", en: "An electric wire strung with expired fake SINs, like a pearl necklace" },
  { fr: "Trente-sept capsules de bouteilles, une pour chaque bar où ils ont été virés", en: "Thirty-seven bottle caps, one for each bar they've been thrown out of" },
  { fr: "Un bocal d'yeux de verre de différentes couleurs achetés dans des marchés noirs", en: "A jar of glass eyes of different colors bought at black markets" },
  { fr: "Un étui rempli de puces mémoire vierges qu'ils distribuent comme des cartes de visite", en: "A case full of blank memory chips they hand out like business cards" },
  { fr: "Un rouleau de papier toilette vintage d'avant le Crash, gardé comme trésor inestimable", en: "A roll of vintage pre-Crash toilet paper, kept as a priceless treasure" },

  // ——— More old world relics ———
  { fr: "Un Game Boy fonctionnel avec une cartouche de Tetris dont le score maximal n'a jamais été battu", en: "A working Game Boy with a Tetris cartridge whose high score has never been beaten" },
  { fr: "Un Polaroid Instax avec trois photos restantes qu'ils refusent d'utiliser à la légère", en: "A Polaroid Instax with three remaining shots they refuse to waste" },
  { fr: "Un journal intime papier rempli à moitié, écrit dans un code qu'ils ont eux-mêmes oublié", en: "A half-filled paper diary written in a code they themselves have forgotten" },
  { fr: "Un plan de métro papier de Seattle datant de 2045, annoté de symboles mystérieux", en: "A paper Seattle metro map from 2045, annotated with mysterious symbols" },
  { fr: "Un exemplaire papier du Manifeste Néo-Anarchiste, corné et souligné à chaque page", en: "A paper copy of the Neo-Anarchist Manifesto, dog-eared and underlined on every page" },

  // ——— More tech items ———
  { fr: "Un bras cybernétique miniature articulé, prototype d'un ami ingénieur assassiné", en: "A miniature articulated cybernetic arm, a prototype from a murdered engineer friend" },
  { fr: "Un patch neural grillé qui leur a donné des migraines pendant un an", en: "A burned-out neural patch that gave them migraines for a year" },
  { fr: "Un bout de câble de fibre optique tressé en forme de nœud celtique", en: "A length of fiber optic cable braided into a Celtic knot" },
  { fr: "Une lentille de contact AR périmée qu'ils gardent dans un petit étui en titane", en: "An expired AR contact lens they keep in a small titanium case" },
  { fr: "Le dernier message d'un agent de la Matrice qu'ils ont laissé mourir, affiché sur un écran miniature", en: "The last message of a Matrix agent they let die, displayed on a miniature screen" },

  // ——— More magical objects ———
  { fr: "Un bâton d'encens qui ne finit jamais de brûler et dégage une odeur de forêt primitive", en: "A stick of incense that never finishes burning and smells like primordial forest" },
  { fr: "Un coquillage spiral qui murmure des mots dans une langue morte quand on le porte à l'oreille", en: "A spiral shell that whispers words in a dead language when held to the ear" },
  { fr: "Un tatouage vivant sur leur avant-bras qui bouge lentement au fil des jours", en: "A living tattoo on their forearm that moves slowly over the course of days" },
  { fr: "Un éclat de météorite trouvé dans un cercle de cultures du Pays de Galles", en: "A meteorite fragment found in a crop circle in Wales" },
  { fr: "Une petite fiole de larmes de phénix cristallisées qu'on leur a vendues comme authentiques", en: "A small vial of crystallized phoenix tears sold to them as authentic" },

  // ——— More food/drink ———
  { fr: "Un sachet de pop-corn micro-ondes pré-Éveil, gonflé et jamais ouvert", en: "A bag of pre-Awakening microwave popcorn, puffed up and never opened" },
  { fr: "Un flacon de vanille véritable gardé pour parfumer le soja quand le moral est au plus bas", en: "A vial of real vanilla kept to flavor soy when morale is at its lowest" },
  { fr: "Une tablette de chewing-gum dont ils mâchent un morceau par an, rituel strict", en: "A pack of chewing gum from which they chew one piece per year, strict ritual" },
  { fr: "Un tube de wasabi authentique, trésor inestimable dans un monde de synthétique", en: "A tube of authentic wasabi, a priceless treasure in a world of synthetics" },
  { fr: "Une bouteille de sake miniature offerte par un yakuza en signe de respect mutuel", en: "A miniature bottle of sake given by a Yakuza as a sign of mutual respect" },

  // ——— More clothing/accessories ———
  { fr: "Un lacet de botte noué sept fois, un pour chaque promesse qu'ils ont tenue", en: "A boot lace tied in seven knots, one for each promise they've kept" },
  { fr: "Un bandeau oculaire en cuir qu'ils portent parfois sans raison médicale apparente", en: "A leather eye patch they sometimes wear for no apparent medical reason" },
  { fr: "Des boutons de manchette fabriqués à partir de douilles de balles, hérités de leur mentor", en: "Cufflinks made from bullet casings, inherited from their mentor" },
  { fr: "Une veste en cuir avec un trou de balle dans le dos, jamais réparé par superstition", en: "A leather jacket with a bullet hole in the back, never repaired out of superstition" },
  { fr: "Une chevalière gravée d'un blason familial d'une famille noble qui n'existe plus", en: "A signet ring engraved with the coat of arms of a noble family that no longer exists" },

  // ——— Mixed / unique ———
  { fr: "Un cube de Rubik dont les faces ont été repeintes aux couleurs des six mégacorpos", en: "A Rubik's Cube with faces repainted in the colors of the six megacorporations" },
  { fr: "Un bout de craie qui dessine toujours en bleu, quelle que soit la surface", en: "A piece of chalk that always draws in blue, regardless of the surface" },
  { fr: "Une figurine de dragon en étain, le pouce usé à force de la caresser nerveusement", en: "A pewter dragon figurine, its thumb-spot worn smooth from nervous fidgeting" },
  { fr: "Un canif suisse avec tous les outils cassés sauf le tire-bouchon", en: "A Swiss Army knife with every tool broken except the corkscrew" },
  { fr: "Un jeu de runes gravées sur des morceaux de circuit imprimé récupérés", en: "A set of runes carved on salvaged circuit board fragments" },
  { fr: "Un petit pot de peinture noire avec lequel ils repeignent leur masque avant chaque run", en: "A small pot of black paint they use to repaint their mask before every run" },
  { fr: "Un sifflet ultrasonique qui ne produit aucun son audible par les humains", en: "An ultrasonic whistle that produces no sound audible to humans" },
  { fr: "Une bague d'humeur cybernétique qui affiche leur rythme cardiaque en temps réel", en: "A cybernetic mood ring that displays their heart rate in real time" },
  { fr: "Un ticket de cinéma pour un film qui n'est jamais sorti en salles", en: "A movie ticket for a film that was never released in theaters" },
  { fr: "Un crayon à papier HB qu'ils taillent rituellement mais n'utilisent jamais pour écrire", en: "An HB pencil they ritually sharpen but never use to write" },
  { fr: "Un morceau de béton peint en or provenant du mur de Berlin, authentique selon eux", en: "A piece of concrete painted gold from the Berlin Wall, authentic according to them" },
  { fr: "Un jeton de métro de Neo-Tokyo qui ne correspond à aucune ligne connue", en: "A Neo-Tokyo metro token that doesn't match any known line" },
  { fr: "Une boussole dont l'aiguille pointe toujours vers le sud-ouest sans raison explicable", en: "A compass whose needle always points southwest for no explainable reason" },
  { fr: "Un briquet qui ne s'allume qu'une fois sur dix, mais jamais quand on n'en a pas besoin", en: "A lighter that only ignites one time in ten, but never when it's not needed" },
  { fr: "Un flocon de neige artificiel conservé dans une bulle de résine depuis leur enfance", en: "An artificial snowflake preserved in a resin bubble since their childhood" },
  { fr: "Un fil rouge noué à leur petit doigt, l'autre extrémité coupée net", en: "A red thread tied to their little finger, the other end cut clean" },
  { fr: "Un morceau d'ambre contenant un moustique, trouvé ironiquement dans un cinéma abandonné", en: "A piece of amber containing a mosquito, found ironically in an abandoned movie theater" },
  { fr: "Une plaque de métal gravée 'PROPRIÉTÉ DE LONE STAR — NE PAS VOLER' qu'ils ont volée", en: "A metal plate engraved 'LONE STAR PROPERTY — DO NOT STEAL' which they stole" },
  { fr: "Un pendule en cristal noir qui oscille tout seul quand personne ne regarde", en: "A black crystal pendulum that swings on its own when nobody's looking" },
  { fr: "Un minuscule carnet de coupons de réduction tous expirés, feuilleté comme un doudou", en: "A tiny coupon booklet, all expired, thumbed through like a comfort blanket" },
  { fr: "Un cure-dent en métal gravé de nanoglyphes illisibles, trouvé dans la poche d'un cadavre", en: "A metal toothpick engraved with unreadable nanoglyphs, found in a corpse's pocket" },
  { fr: "Un morceau de verre de mer bleu cobalt ramassé sur les rives toxiques du Puget Sound", en: "A cobalt blue sea glass shard picked up from the toxic shores of Puget Sound" },
  { fr: "Un bouchon de liège d'une bouteille de champagne ouverte le soir où tout a mal tourné", en: "A cork from a champagne bottle opened the night everything went wrong" },
  { fr: "Un petit robot jouet à remontoir qui marche en cercle et tombe du bord des tables", en: "A small wind-up toy robot that walks in circles and falls off table edges" },
  { fr: "Une longue-vue en laiton miniature qui ne grossit rien mais à laquelle ils tiennent", en: "A miniature brass spyglass that magnifies nothing but they cherish" },
  { fr: "Un pion de jeu d'échecs — le roi noir — taillé dans du bois véritable", en: "A chess piece — the black king — carved from real wood" },
];
