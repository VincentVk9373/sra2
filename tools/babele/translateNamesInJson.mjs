import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

// FR -> EN translation dictionary (same as convertPackToSkillsFormat.mjs)
const translations = {
  // Skills
  'Athlétisme': 'Athletics',
  'Conjuration': 'Conjuration',
  'Ingénierie': 'Engineering',
  'Réseau': 'Networking',
  'Perception': 'Perception',
  'Pilotage': 'Piloting',
  'Survie': 'Survival',
  'Armes à distance': 'Ranged Weapons',
  'Étiquette': 'Etiquette',
  'Combat rapproché': 'Close Combat',
  'Furtivité': 'Stealth',
  'Influence': 'Influence',
  'Piratage': 'Cracking',
  'Électronique': 'Electronics',
  'Sorcellerie': 'Sorcery',
  'Technomancie': 'Technomancy',

  // Specializations
  'Spé : De la rue': 'Spec: Street',
  'Spé : Escamotage': 'Spec: Stealth',
  'Spé : Appareils personnels': 'Spec: Personal Devices',
  'Spé : Armes contondantes': 'Spec: Blunt Weapons',
  'Spé : Armes lourdes': 'Spec: Heavy Weapons',
  'Spé : Backdoor': 'Spec: Backdoor',
  'Spé : Bannissement': 'Spec: Banishing',
  'Spé : Criminel': 'Spec: Criminal',
  'Spé : Drones terrestres': 'Spec: Ground Drones',
  'Spé : Esprits de la terre': 'Spec: Earth Spirits',
  'Spé : Esprits des bêtes': 'Spec: Beast Spirits',
  'Spé : Esprits des plantes': 'Spec: Plant Spirits',
  'Spé : Lames': 'Spec: Blades',
  'Spé : Matriciel': 'Spec: Matrix',
  'Spé : Motos': 'Spec: Bikes',
  'Spé : Physique': 'Spec: Physical',
  'Spé : pistolets': 'Spec: Pistols',
  'Spé : Armes montées': 'Spec: Mounted Weapons',
  'Spé : Camions': 'Spec: Trucks',
  'Spé : Combat astral': 'Spec: Astral Combat',
  'Spé : Contresort': 'Spec: Counterspelling',
  'Spé : Défense à distance': 'Spec: Ranged Defense',
  'Spé : Discrétion Physique': 'Spec: Physical Stealth',
  'Spé : Discrétion astrale': 'Spec: Astral Stealth',
  'Spé : Discrétion matricielle': 'Spec: Matrix Stealth',
  'Spé : Drones volants': 'Spec: Flying Drones',
  'Spé : Esprit des aînés': 'Spec: Kin Spirits',
  'Spé : Esprits de l\'air': 'Spec: Air Spirits',
  'Spé : Médiatique': 'Spec: Media',
  'Spé : Natation': 'Spec: Swimming',
  'Spé : Recherche matricielle': 'Spec: Matrix Search',
  'Spé : Sorts d\'illusion': 'Spec: Illusion Spells',
  'Spé : Sorts de combat': 'Spec: Combat Spells',
  'Spé : Véhicules aquatiques': 'Spec: Aquatic Vehicles',
  'Spé : attaque élémentaire': 'Spec: Elemental Attack',
  'Spé : Armes contrôlées à distance': 'Spec: Remote Controlled Weapons',
  'Spé : Armes de trait': 'Spec: Thrown Weapons',
  'Spé : C-R appareils électroniques': 'Spec: Personal Electronics',
  'Spé : C-R engins mécaniques': 'Spec: C-R Mechanical Devices',
  'Spé : C-R implants cybernétiques': 'Spec: Cybernetics',
  'Spé : C-R véhicules': 'Spec: C-R Vehicles',
  'Spé : Escalade': 'Spec: Climbing',
  'Spé : Esprits du feu': 'Spec: Fire Spirits',
  'Spé : Guerre électronique': 'Spec: Electronic Warfare',
  'Spé : Ingénierie': 'Spec: Engineering',
  'Spé : Lance grenades': 'Spec: Grenade Launchers',
  'Spé : Matricielle': 'Spec: Matrix',
  'Spé : Perception astrale': 'Spec: Astral Perception',
  'Spé : Protection matricielle': 'Spec: Matrix Protection',
  'Spé : Reseau de la rue': 'Spec: Street Network',
  'Spé : Sorts de détection': 'Spec: Detection Spells',
  'Spé : Véhicules volants': 'Spec: Flying Vehicles',
  'Spé : parkour': 'Spec: Parkour',
  'Spé : Bluff': 'Spec: Bluff',
  'Spé : Course': 'Spec: Running',
  'Spé : Crochetage': 'Spec: Lockpicking',
  'Spé : Drones aquatiques': 'Spec: Aquatic Drones',
  'Spé : Explosifs': 'Spec: Explosives',
  'Spé : Force brute': 'Spec: Brute Force',
  'Spé : Force Brute': 'Spec: Brute Force',
  'Spé : Fusils': 'Spec: Rifles',
  'Spé : Gouvernemental': 'Spec: Government',
  'Spé : Imposture': 'Spec: Impersonation',
  'Spé : Intimidation': 'Spec: Intimidation',
  'Spé : Médical': 'Spec: Medical',
  'Spé : Magique': 'Spec: Magic',
  'Spé : Mains nues': 'Spec: Unarmed',
  'Spé : Mitraillettes': 'Spec: SMGs',
  'Spé : Négociation': 'Spec: Negotiation',
  'Spé : Orientation': 'Spec: Navigation',
  'Spé : Sorts de manipulation': 'Spec: Manipulation Spells',
  'Spé : Sorts de santé': 'Spec: Health Spells',
  'Spé : Étiquette': 'Spec: Etiquette',
  'Spé : Armes de jet': 'Spec: Thrown Weapons',
  'Spé : C-R drones': 'Spec: C-R Drones',
  'Spé : Corporatiste': 'Spec: Corporate',
  'Spé : Cybercombat': 'Spec: Cybercombat',
  'Spé : Défense': 'Spec: Defense',
  'Spé : Dressage': 'Spec: Animal Training',
  'Spé : Perception physique': 'Spec: Physical Perception',
  'Spé : Premiers soins': 'Spec: First Aid',
  'Spé : Sang froid': 'Spec: Composure',
  'Spé : Survie en milieu naturel': 'Spec: Wilderness Survival',
  'Spé : Voitures': 'Spec: Cars',
  
  // Weapons
  'Fusil d\'assaut': 'Assault Rifle',
  'Fusil de précision': 'Sniper Rifle',
  'Fusil de sport': 'Sport Rifle',
  'Pistolet léger': 'Light Pistol',
  'Pistolet lourd': 'Heavy Pistol',
  'Pistolet automatique': 'Automatic Pistol',
  'Pistolet de poche': 'Holdout Pistol',
  'Mitraillette': 'SMG',
  'Mitrailleuse': 'Machine Gun',
  'Shotgun': 'Shotgun',
  'Taser': 'Taser',
  'Arme courte': 'Melee Weapon (Short)',
  'Arme longue': 'Melee Weapon (Long)',
  'Lance grenade': 'Grenade Launcher',
  'Canne fusil': 'Cane Rifle',
  
  // Other terms
  'Tir automatique': 'Automatic Fire',
  'Armure': 'Armor',
  'Explosifs': 'Explosives',
  'Munitions': 'Ammunition',
  'Grenades': 'Grenades',
  'Drones': 'Drones',
  'Véhicules': 'Vehicles',
  'Magie': 'Magic',
  'Focus': 'Focus',
  'Médikit': 'Medkit',
  'Contrat': 'Contract',
  
  // Additional common terms
  'Acrobate né': 'Natural Acrobat',
  'Adepte': 'Adept',
  'Adepte Mystique': 'Mystic Adept',
  'Alcool / Synthanol': 'Alcohol / Synthanol',
  'journaliste': 'journalist',
  'Amortisseur traumatique': 'Trauma Damper',
  'Amplificateur de réaction': 'Reaction Enhancer',
  'Amplificateur synaptique': 'Synaptic Booster',
  'Amplification cérébrale': 'Cerebral Booster',
  'Analyse de véracité': 'Truth Analysis',
  'Anti-magie': 'Anti-Magic',
  'Arbalète': 'Crossbow',
  'Arbalète de poignet': 'Wrist Crossbow',
  'Arbalète lourde': 'Heavy Crossbow',
  'Arc ranger X': 'Ranger X Bow',
  'Arcs': 'Bows',
  'Armure astrale': 'Astral Armor',
  'Armure corporelle intégrale': 'Full Body Armor',
  'Armure dermique': 'Dermal Armor',
  'Armure militaire': 'Military Armor',
  'Armure mystique': 'Mystic Armor',
  'Armure SWAT': 'SWAT Armor',
  'Assistance sorcière': 'Witch Assistance',
  'Atelier de réparation véhicules': 'Vehicle Repair Workshop',
  'Attaque retardée': 'Delayed Attack',
  'Augmentation d\'Agilité': 'Agility Enhancement',
  'Augmentation de Charisme': 'Charisma Enhancement',
  'Augmentation de densité osseuse': 'Bone Density Augmentation',
  'Augmentation de Force': 'Strength Enhancement',
  'Augmentation de Logique': 'Logic Enhancement',
  'Augmentation de Volonté': 'Willpower Enhancement',
  'Auto-injecteur': 'Auto-Injector',
  'Auto-injecteur et biomoniteur': 'Auto-Injector and Biomonitor',
  'Baïonnette détachable': 'Detachable Bayonet',
  'Balles ardentes': 'Flaming Rounds',
  'Balles fléchettes': 'Flechette Rounds',
  'Balles mouchard': 'Tracer Rounds',
  'Batte de baseball barbelée': 'Barbed Baseball Bat',
  'Berserk': 'Berserk',
  'Berserker': 'Berserker',
  'Bliss': 'Bliss',
  'Bouclier balistique': 'Ballistic Shield',
  'Bras cybernétique': 'Cyberarm',
  'Bras cybernétique synthétique avec lame cybernétique': 'Synthetic Cyberarm with Cyberblade',
  'Bras cybernétique synthétique avec pistolet lourd': 'Synthetic Cyberarm with Heavy Pistol',
  'Bras d\'escalade': 'Climbing Arm',
  'Bras d\'escalade avec lance-grappin': 'Climbing Arm with Grapple Gun',
  'Brouilleur de signal': 'Signal Jammer',
  'Canon d\'assaut Panther': 'Panther Assault Cannon',
  'Cartouches Big-D': 'Big-D Shells',
  'Casanova': 'Casanova',
  'inspecteur à la Lone Star': 'Lone Star Inspector',
  'Cavalier Arms Walker 2': 'Cavalier Arms Walker 2',
  'Célèbre': 'Famous',
  'Céréprax': 'Cereprax',
  'Chute libre 3m': 'Free Fall 3m',
  'Chute libre 6m': 'Free Fall 6m',
  'Chute libre 9m': 'Free Fall 9m',
  'Cicatrices intimidantes': 'Intimidating Scars',
  'Clairvoyant': 'Clairvoyant',
  'Cogneur': 'Brawler',
  'Collier Focus de combat': 'Combat Focus Necklace',
  'Combat à deux armes': 'Dual Wielding',
  'Combat ASTRAL': 'ASTRAL Combat',
  'Combat en aveugle': 'Blind Combat',
  'Commlink': 'Commlink',
  'Commlink (1er gratuit)': 'Commlink (1st free)',
  'Commlink implanté': 'Implanted Commlink',
  'Commlink supplémentaire': 'Additional Commlink',
  'Communion avec les cordes': 'Communion with Strings',
  'Compétence améliorée :': 'Enhanced Skill:',
  'Concentration accrue': 'Increased Concentration',
  'Conjurateur': 'Conjurer',
  'Contorsionniste': 'Contortionist',
  'Contrat CrashCart basic': 'CrashCart basic Contract',
  'Contrat Doc Wagon Platine': 'Doc Wagon Platinum Contract',
  'Contrôle des pensées': 'Mind Control',
  'Contrôle vocal': 'Voice Control',
  'Contrôle vocal et morphologique': 'Voice and Morphological Control',
  'Coprocesseur cortical': 'Cortical Coprocessor',
  'Corps de rêve': 'Dream Body',
  'Costaud': 'Tough',
  'Coup dévastateur': 'Devastating Blow',
  'Course sur les murs': 'Wall Running',
  'Couteau / Arme courte': 'Knife / Melee Weapon (Short)',
  'Couteau de combat avec toxine débilitante': 'Combat Knife with Debilitating Toxin',
  'Couteau de combat avec toxine débilitantes': 'Combat Knife with Debilitating Toxins',
  'Couteau de combat avec toxine létale': 'Combat Knife with Lethal Toxin',
  'Couteau de combat avec toxines létales': 'Combat Knife with Lethal Toxins',
  'Cram': 'Cram',
  'Crocs': 'Fangs',
  'Cuir épais 3': 'Thick Hide 3',
  'Cuir épais 4': 'Thick Hide 4',
  'Cyberjack MCT Decker-Pro': 'MCT Decker-Pro Cyberjack',
  'Datajack': 'Datajack',
  'Datajack débridé': 'Unbridled Datajack',
  'Deepweed': 'Deepweed',
  'Defiance super shock (Taser)': 'Defiance Super Shock (Taser)',
  'Defiance T-250': 'Defiance T-250',
  'Defiance T-250 à canon scié': 'Defiance T-250 Sawed-Off',
  'Démarqueur': 'Tag Eraser',
  'Déplacement flash': 'Flash Step',
  'officier DocWagon': 'DocWagon Officer',
  'Doigts de fée': 'Light Fingers',
  'ganger': 'ganger',
  'Dur à cuire': 'Hard to Kill',
  'Easy Motors DroneMaster': 'Easy Motors DroneMaster',
  'Éclair étourdissant': 'Stunning Flash',
  'Élasticité': 'Elasticity',
  'Electro-gants': 'Electro-Gloves',
  'Electro-matraques': 'Electro-Batons',
  'Elfe': 'Elf',
  'chanteuse médiatique': 'media singer',
  'avocat': 'lawyer',
  'Empathie animale': 'Animal Empathy',
  'Endurance à la douleur': 'Pain Tolerance',
  'Erika MCD−6': 'Erika MCD−6',
  'Esprit analytique': 'Analytical Mind',
  'Esprit d\'équipe': 'Team Spirit',
  'Esprit mentor': 'Mentor Spirit',
  'Esprits de l\'eau': 'Water Spirits',
  'Explosifs commerciaux': 'Commercial Explosives',
  'propriétaire du Good Vibes': 'Good Vibes Owner',
  'Fairlight Excalibur': 'Fairlight Excalibur',
  'Faux  SIN': 'Fake SIN',
  'Fétiche': 'Fetish',
  'Fichetti Security 500': 'Fichetti Security 500',
  'Filtre trachéal et extracteur de toxines': 'Tracheal Filter and Toxin Extractor',
  'Fixateurs de réflexes': 'Reflex Recorders',
  'Fixateurs de réflexes Evo ReflexUltra': 'Evo ReflexUltra Reflex Recorders',
  'Fixateurs de réflexes UO PrimeSkill': 'UO PrimeSkill Reflex Recorders',
  'FN HAR': 'FN HAR',
  'FN P93 Preator': 'FN P93 Preator',
  'Focus d\'arme (couteau)': 'Weapon Focus (knife)',
  'Focus d\'arme (katana)': 'Weapon Focus (katana)',
  'Focus de bannissement': 'Banishing Focus',
  'Focus de combat': 'Combat Focus',
  'Focus de combat mineur': 'Minor Combat Focus',
  'Focus de conjuration': 'Conjuration Focus',
  'Focus de contresort': 'Counterspelling Focus',
  'Focus de contrôle': 'Control Focus',
  'Focus de d\'illusion majeur': 'Major Illusion Focus',
  'Focus de détection': 'Detection Focus',
  'Focus de détection mineur': 'Minor Detection Focus',
  'Focus de l\'air mineur': 'Minor Air Focus',
  'Focus de maintien': 'Sustaining Focus',
  'Focus de manipulation': 'Manipulation Focus',
  'Focus des bêtes': 'Beast Focus',
  'Focus du feu': 'Fire Focus',
  'Focus du feu majeur': 'Major Fire Focus',
  'Focus sorcier': 'Sorcerer Focus',
  'Focus vivant': 'Living Focus',
  'Fouet monofilament': 'Monofilament Whip',
  'Franchi SPAS-22': 'Franchi SPAS-22',
  'Frappe à distance': 'Ranged Strike',
  'Frappe élémentaire': 'Elemental Strike',
  'Frappe névralgique': 'Pressure Point Strike',
  'Fusil Parashield DART': 'Parashield DART Rifle',
  'GE Vindicator minigun': 'GE Vindicator Minigun',
  'Gilet pare-balles': 'Ballistic Vest',
  'Grand saut': 'Great Leap',
  'Gremlins': 'Gremlins',
  'Grenade lacrymogène': 'Tear Gas Grenade',
  'Grenade Neuro-Stunt VIII': 'Neuro-Stunt VIII Grenade',
  'Grenade Neuro-Stunt X': 'Neuro-Stunt X Grenade',
  'Grenade Seven-7': 'Seven-7 Grenade',
  'Grenades au phosphore blanc': 'White Phosphorus Grenades',
  'Grenades Flashbang': 'Flashbang Grenades',
  'Grenades fumigènes': 'Smoke Grenades',
  'Grenades Lacrymo': 'Tear Gas Grenades',
  'Grenades Neuro-Stun VIII': 'Neuro-Stun VIII Grenades',
  'Grenades Neuro-Stun X': 'Neuro-Stun X Grenades',
  'Grenades offensive HE': 'Offensive HE Grenades',
  'Grenades planantes': 'Gliding Grenades',
  'Grenades Seven-7': 'Seven-7 Grenades',
  'Guérison facile': 'Easy Healing',
  'Guérison rapide': 'Rapid Healing',
  'Gun fu': 'Gun Fu',
  'antiquaire (contact)': 'antiquarian (contact)',
  'HK 227': 'HK 227',
  'Horizon Overseer (drones aquatiques)': 'Horizon Overseer (Aquatic Drones)',
  'Horizon Overseer (drones terrestres)': 'Horizon Overseer (Ground Drones)',
  'Horizon Overseer (drones volants)': 'Horizon Overseer (Flying Drones)',
  'Humain': 'Human',
  'Hurlement Paralysant': 'Paralyzing Howl',
  'Immitation': 'Imitation',
  'Ingram Smartgun': 'Ingram Smartgun',
  'Ingram Valiant': 'Ingram Valiant',
  'Invisibilité': 'Invisibility',
  'Jambes cybernétiques': 'Cyberlegs',
  'Jambes cybernétiques digitigrades': 'Digitigrade Cyberlegs',
  'Jazz': 'Jazz',
  'Jumelles': 'Binoculars',
  'Jumelles Evo Night Hawk 500': 'Evo Night Hawk 500 Binoculars',
  'Jumelles thermiques': 'Thermal Binoculars',
  'Kamikaze': 'Kamikaze',
  'Katana / Arme longue': 'Katana / Melee Weapon (Long)',
  'Katana Dikote™': 'Dikote™ Katana',
  'Kit d\'effraction': 'Burglary Kit',
  'Lance grappin': 'Grapple Gun',
  'Lance-missile Balista': 'Balista Missile Launcher',
  'Lance-missile Great Dragon': 'Great Dragon Missile Launcher',
  'Lancer puissant': 'Powerful Throw',
  'Langue': 'Language',
  'Lecture rapide': 'Speed Reading',
  'Linguiste': 'Linguist',
  'Loge magique': 'Magic Lodge',
  'Long court': 'Long Short',
  'Lost in translation': 'Lost in Translation',
  'Loyauté envers une marque': 'Brand Loyalty',
  'M79B1': 'M79B1',
  'Magicien complet': 'Full Magician',
  'Mains mortelles': 'Deadly Hands',
  'Mains nues': 'Unarmed',
  'Maitrise des projectiles': 'Projectile Mastery',
  'Manteau renforcé': 'Reinforced Coat',
  'fournisseur de matériel matriciel': 'matrix equipment supplier',
  'Marqueurs furtifs': 'Stealth Tags',
  'Marqueurs senseurs': 'Sensor Tags',
  'Matériel d\'escalade': 'Climbing Gear',
  'MCT 360': 'MCT 360',
  'Médikit autonome CrashCart Essential': 'CrashCart Essential Autonomous Medkit',
  'Médikit autonome DocWagon Pro+': 'DocWagon Pro+ Autonomous Medkit',
  'Médikit standard': 'Standard Medkit',
  'Mémoire photographique': 'Photographic Memory',
  'Microphone directionnel': 'Directional Microphone',
  'Microphone directionnel (Copy)': 'Directional Microphone (Copy)',
  'Mine antipersonnel': 'Anti-Personnel Mine',
  'Mines anti-véhicule': 'Anti-Vehicle Mines',
  'Monobe Synthacardium': 'Monobe Synthacardium',
  'Monsieur Tout-le-Monde': 'Mr. Everyman',
  'Mossberg CMDT': 'Mossberg CMDT',
  'Move-by-wire': 'Move-by-Wire',
  'Munitions APDS': 'APDS Ammunition',
  'Munitions EX Explosives': 'EX Explosives Ammunition',
  'Munitions Explosives': 'Explosives Ammunition',
  'Munitions Gel': 'Gel Ammunition',
  'Nain': 'Dwarf',
  'Nanocrème de maquillage': 'Nanomakeup Cream',
  'Nature Duale': 'Dual Nature',
  'Nécessaire de jeu de rôle': 'Role-Playing Kit',
  'Ninjutsu': 'Ninjutsu',
  'Nitro': 'Nitro',
  'Novacoke': 'Novacoke',
  'OEil de lynx': 'Lynx Eye',
  'Orc': 'Ork',
  'Oreilles cybernétiques standards': 'Standard Cyberears',
  'Oreilles cybernétiques Universal Omnitech ProSound': 'Universal Omnitech ProSound Cyberears',
  'Oreilles cybernétiques Universal Omnitech UltraSound': 'Universal Omnitech UltraSound Cyberears',
  'Orthoderme': 'Orthoskin',
  'Os de verre': 'Glass Bones',
  'Ossature renforcée en aluminium': 'Aluminum Bone Lacing',
  'Ossature renforcée en plastique': 'Plastic Bone Lacing',
  'Ossature renforcée en titane': 'Titanium Bone Lacing',
  'Parade de projectiles': 'Projectile Parry',
  'Passage sans traces': 'Traceless Passage',
  'Passe maglock': 'Maglock Passkey',
  'Perception améliorée': 'Improved Perception',
  'Petrification': 'Petrification',
  'Peur 1': 'Fear 1',
  'Peur 2': 'Fear 2',
  'Peur 3': 'Fear 3',
  'Phéromones large spectre': 'Broad Spectrum Pheromones',
  'Phéromones optimisées': 'Optimized Pheromones',
  'Pilote de course': 'Race Driver',
  'Plastic Composé XII (Explosifs)': 'Plastic Compound XII (Explosives)',
  'Poids plume': 'Featherweight',
  'Poing américain': 'Brass Knuckles',
  'Pompe d\'adrénaline': 'Adrenaline Pump',
  'Précision améliorée': 'Improved Accuracy',
  'Première impression': 'First Impression',
  'Proches influents': 'Influential Contacts',
  'Producteurs de plaquettes': 'Platelet Factories',
  'Projectile': 'Projectile',
  'Proteus Poseidon (drones aquatiques)': 'Proteus Poseidon (Aquatic Drones)',
  'Proteus Poseidon (drones terrestres)': 'Proteus Poseidon (Ground Drones)',
  'Proteus Poseidon (drones volants)': 'Proteus Poseidon (Flying Drones)',
  'Psyché': 'Psyche',
  'Rage de vivre': 'Rage to Live',
  'Ranger Arms SM-6': 'Ranger Arms SM-6',
  'Réflexes accrus': 'Increased Reflexes',
  'Réflexes améliorés': 'Improved Reflexes',
  'Réflexes câblés Ares': 'Ares Wired Reflexes',
  'Réflexes câblés Evo': 'Evo Wired Reflexes',
  'Réflexes éclairs': 'Lightning Reflexes',
  'Relais satellite': 'Satellite Relay',
  'Remington 750': 'Remington 750',
  'Renforcement musculaire': 'Muscle Augmentation',
  'Renfort neuronal': 'Neural Boost',
  'Renraku Kitsune': 'Renraku Kitsune',
  'Réputation online': 'Online Reputation',
  'Résistance à la douleur': 'Pain Resistance',
  'Résistance à la magie': 'Magic Resistance',
  'Résistance au feu': 'Fire Resistance',
  'Résistance mentale': 'Mental Resistance',
  'Ruger 100': 'Ruger 100',
  'Ruger Super Warhawk': 'Ruger Super Warhawk',
  'cadre supérieur chez Aztechnology': 'Aztechnology Executive',
  'doc des rues': 'street doc',
  'Savalette Guardian': 'Savalette Guardian',
  'Sens accrus': 'Increased Senses',
  'Sens amélioré': 'Improved Sense',
  'Sens de l\'orientation': 'Sense of Direction',
  'Sens du combat': 'Combat Sense',
  'Sens du danger': 'Danger Sense',
  'Sens empathique': 'Empathic Sense',
  'Sens magique': 'Magic Sense',
  'paradis numérique basé à Seattle': 'Seattle-based digital paradise',
  'Shiawase Cyber−6': 'Shiawase Cyber−6',
  'Shiawaze Arms Puzzler': 'Shiawaze Arms Puzzler',
  'SIN': 'SIN',
  'SINner': 'SINner',
  'Smartlink': 'Smartlink',
  'Soins': 'Healing',
  'Soins empathiques': 'Empathic Healing',
  'Sonde mentale': 'Mind Probe',
  'Sorcier': 'Sorcerer',
  'Spinrad Falcon': 'Spinrad Falcon',
  'Steyr AUG CSL (Conf :': 'Steyr AUG CSL (Config:',
  'Steyr TMP': 'Steyr TMP',
  'Stim Patch': 'Stim Patch',
  'Stoner Ares M202': 'Stoner Ares M202',
  'Streeline special': 'Streeline Special',
  'Subsistance': 'Subsistence',
  'Substituts musculaires': 'Muscle Replacement',
  'Swing parfait': 'Perfect Swing',
  'Synthécuir au couleur du gang': 'Synthleather in Gang Colors',
  'Tête brûlée': 'Burnout',
  'Thunderstruck Gauss Rifle': 'Thunderstruck Gauss Rifle',
  'Tolérance au cyberware': 'Cyberware Tolerance',
  'Tonification musculaire': 'Muscle Toner',
  'Trait de feu': 'Fire Trait',
  'Trauma Patch': 'Trauma Patch',
  'Tripes': 'Guts',
  'Troll': 'Troll',
  'Uzi V': 'Uzi V',
  'Veille de nuit': 'Night Watch',
  'Vertiges RA': 'AR Vertigo',
  'Veste pare-balles': 'Ballistic Jacket',
  'Vêtement pare-balle avec manteau': 'Ballistic Clothing with Coat',
  'Vêtements pare-balles légers': 'Light Ballistic Clothing',
  'flic sous couverture': 'undercover cop',
  'Vision de chat': 'Cat Vision',
  'Vision de troll': 'Troll Vision',
  'Vision nocturne': 'Night Vision',
  'Vision véritable': 'True Vision',
  'Voile': 'Veil',
  'Voix de commandement': 'Command Voice',
  'Walter MA-2100': 'Walter MA-2100',
  'Walter Palm Pistol': 'Walter Palm Pistol',
  'Yamaha Pulsar (Taser)': 'Yamaha Pulsar (Taser)',
  'Yeong-mu': 'Yeong-mu',
  'Yeux cybernétiques Ares ProShooter': 'Ares ProShooter Cybereyes',
  'Yeux cybernétiques Ares SharpShooter': 'Ares SharpShooter Cybereyes',
  'Yeux cybernétiques avec smartlink': 'Cybereyes with Smartlink',
  'Yeux cybernétiques Evo EyeDrone': 'Evo EyeDrone Cybereyes',
  'Yeux cybernétiques L\'Oréal Fashion Top': 'L\'Oréal Fashion Top Cybereyes',
  'Yeux cybernétiques standards': 'Standard Cybereyes',
  'Yeux cybernétiques Universal Omnitech AbsoluteView': 'Universal Omnitech AbsoluteView Cybereyes',
  'Yeux cybernétiques Universal Omnitech ProView': 'Universal Omnitech ProView Cybereyes',
  'Zélé': 'Zealous',
  'Zen': 'Zen',
  
  // Additional terms from the file
  '(pb VD)Arme élémentaire': '(pb VD)Elemental Weapon',
  'feu, glace, acide, etc. choisi lors de l\'acquisition de l\'atout': 'fire, ice, acid, etc. chosen when acquiring the feat',
  'Spé : La rue': 'Spec: Street',
  'Spé : Universitaire': 'Spec: Academic',
  'Spé : monofilament': 'Spec: Monofilament',
  'Spé : Perception sociale': 'Spec: Social Perception',
  'Spé : Perception matricielle': 'Spec: Matrix Perception',
  'Spé : Shotguns': 'Spec: Shotguns',
  'Spé : Esprit des aînés': 'Spec: Elder Spirits',
  'Spé : Sang-froid': 'Spec: Cool Under Pressure',
  'Spé : Lance-Grenades': 'Spec: Grenade Launchers',
  'Spé : C&R appareils Electronicss': 'Spec: C&R Electronic Devices',
  'Spé: Formes complexes': 'Spec: Complex Forms',
  'Spé: Compilation': 'Spec: Compilation',
  'Spé: Décompilation': 'Spec: Decompilation',
};

// Translate text
function translateText(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Look for exact translation
  if (translations[text]) {
    return translations[text];
  }
  
  // Translate common terms in names
  let translated = text;
  
  // Replace common terms
  for (const [fr, en] of Object.entries(translations)) {
    const escaped = fr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    translated = translated.replace(new RegExp(escaped, 'gi'), en);
  }
  
  // Basic translations for prefixes/suffixes
  translated = translated
    .replace(/Arme à distance/gi, 'Ranged Weapons')
    .replace(/Arme à feu/gi, 'Firearms')
    .replace(/Fusil d'assaut/gi, 'Assault Rifle')
    .replace(/Fusil de précision/gi, 'Sniper Rifle')
    .replace(/Fusil de sport/gi, 'Sport Rifle')
    .replace(/Pistolet léger/gi, 'Light Pistol')
    .replace(/Pistolet lourd/gi, 'Heavy Pistol')
    .replace(/Pistolet automatique/gi, 'Automatic Pistol')
    .replace(/Pistolet de poche/gi, 'Holdout Pistol')
    .replace(/Mitraillette/gi, 'SMG')
    .replace(/Mitrailleuse/gi, 'Machine Gun')
    .replace(/Lance grenade/gi, 'Grenade Launcher')
    .replace(/Canne fusil/gi, 'Cane Rifle')
    .replace(/Arme courte/gi, 'Melee Weapon (Short)')
    .replace(/Arme longue/gi, 'Melee Weapon (Long)')
    .replace(/Armure/gi, 'Armor')
    .replace(/Explosifs/gi, 'Explosives')
    .replace(/Munitions/gi, 'Ammunition')
    .replace(/Grenades/gi, 'Grenades')
    .replace(/Drones/gi, 'Drones')
    .replace(/Véhicules/gi, 'Vehicles')
    .replace(/Magie/gi, 'Magic')
    .replace(/Focus/gi, 'Focus')
    .replace(/Médikit/gi, 'Medkit')
    .replace(/Contrat/gi, 'Contract')
    .replace(/Spé :/gi, 'Spec:')
    .replace(/Spécialisation/gi, 'Specialization')
    .replace(/De la rue/gi, 'Street')
    .replace(/Escamotage/gi, 'Stealth')
    .replace(/C-R/gi, 'C&R')
    .replace(/C&R appareils électroniques/gi, 'C&R Electronic Devices')
    .replace(/C&R engins mécaniques/gi, 'C-R Mechanical Devices')
    .replace(/C&R implants cybernétiques/gi, 'C&R Cybernetic Implants')
    .replace(/C&R véhicules/gi, 'C&R Vehicles')
    .replace(/C&R drones/gi, 'C&R Drones')
    .replace(/appareils électroniques/gi, 'Electronic Devices')
    .replace(/engins mécaniques/gi, 'Mechanical Devices')
    .replace(/implants cybernétiques/gi, 'Cybernetic Implants')
    .replace(/spirituelle/gi, 'spiritual')
    .replace(/spirituelle forte/gi, 'strong spiritual')
    .replace(/Lance-grenade/gi, 'Grenade Launcher')
    .replace(/Lance-roquette/gi, 'Missile Launcher')
    .replace(/Lance-missile/gi, 'Missile Launcher')
    .replace(/Dégats de zone/gi, 'Area Damage')
    .replace(/Dégâts de zone/gi, 'Area Damage')
    .replace(/Dommages étourdissants/gi, 'Stun Damage')
    .replace(/Dégâts étourdissants/gi, 'Stun Damage')
    .replace(/Tête chercheuse/gi, 'Seeker Head')
    .replace(/Compact/gi, 'Compact')
    .replace(/Jetable/gi, 'Disposable')
    .replace(/usage unique par scène/gi, 'single use per scene')
    .replace(/Smartgun/gi, 'Smartgun')
    .replace(/bonus RR/gi, 'RR bonus')
    .replace(/RR 1/gi, 'RR 1')
    .replace(/RR 2/gi, 'RR 2')
    .replace(/RR 3/gi, 'RR 3')
    .replace(/RR2/gi, 'RR2')
    .replace(/VD/gi, 'DV')
    .replace(/VD\+/gi, 'DV+')
    .replace(/VD-/gi, 'DV-')
    .replace(/contre les/gi, 'against')
    .replace(/contre/gi, 'against')
    .replace(/Monté sous le canon du/gi, 'Mounted under the barrel of')
    .replace(/monté sous le canon du/gi, 'mounted under the barrel of')
    .replace(/Lance-grenade monté sous le canon du/gi, 'Grenade Launcher mounted under the barrel of')
    .replace(/Convertible :/gi, 'Convertible:')
    .replace(/Conf :/gi, 'Config:')
    .replace(/Conf:/gi, 'Config:')
    .replace(/Drones aquatiques/gi, 'Aquatic Drones')
    .replace(/Drones terrestres/gi, 'Ground Drones')
    .replace(/Drones volants/gi, 'Flying Drones')
    .replace(/Electronicss/gi, 'Electronics');
  
  return translated;
}

/**
 * Translates all name fields in a JSON file
 */
async function translateNamesInJson(jsonFile) {
  try {
    console.log(`\n🔄 Translating names in: ${jsonFile}`);
    console.log('='.repeat(50));
    
    // Read the file
    const content = await fs.readFile(jsonFile, 'utf-8');
    const data = JSON.parse(content);
    
    if (!data.entries || !Array.isArray(data.entries)) {
      console.error('❌ Invalid JSON structure: entries array not found');
      return;
    }
    
    let translatedCount = 0;
    let unchangedCount = 0;
    
    // Translate each entry's name
    for (const entry of data.entries) {
      if (entry.name) {
        const originalName = entry.name;
        const translatedName = translateText(originalName);
        
        if (originalName !== translatedName) {
          entry.name = translatedName;
          translatedCount++;
        } else {
          unchangedCount++;
        }
      }
    }
    
    // Save the file
    await fs.writeFile(
      jsonFile,
      JSON.stringify(data, null, 4),
      'utf-8'
    );
    
    console.log(`\n✅ Translation complete!`);
    console.log(`   ${translatedCount} name(s) translated`);
    console.log(`   ${unchangedCount} name(s) unchanged`);
    console.log(`   File: ${jsonFile}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error during translation:', error.message);
    throw error;
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node translateNamesInJson.mjs <jsonFile>');
    console.log('\nExample:');
    console.log('  node translateNamesInJson.mjs public/lang/en/sra2.anarchy-objets.json');
    process.exit(1);
  }
  
  const jsonFile = path.isAbsolute(args[0]) 
    ? args[0] 
    : path.join(ROOT_DIR, args[0]);
  
  // Check that file exists
  try {
    await fs.access(jsonFile);
  } catch (error) {
    console.error(`❌ File does not exist: ${jsonFile}`);
    process.exit(1);
  }
  
  await translateNamesInJson(jsonFile);
}

main();

