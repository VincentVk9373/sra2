const COMPLICATIONS = {
  // ─────────────────────────────────────────────────────────────
  // ATHLETICS — Course, saut, natation
  // ─────────────────────────────────────────────────────────────
  "athletics": {
    minor: {
      fr: [
        "Crampe : ne peut pas se déplacer lors de sa prochaine narration",
        "Se retrouve à découvert : désavantage à la prochaine défense à distance",
        "Glisse et perd l'équilibre : perd sa prochaine action mineure",
        "S'essouffle : désavantage au prochain test physique"
      ],
      en: [
        "Cramp: cannot move during next narration",
        "Caught in the open: disadvantage on next ranged defense",
        "Slips and loses balance: loses next minor action",
        "Winded: disadvantage on next physical test"
      ]
    },
    critical: {
      fr: [
        "Forte crampe : ne peut pas se déplacer et désavantage pendant 2 narrations",
        "Trébuche et tombe : blessure légère",
        "Se tord la cheville : vitesse réduite de moitié pour le reste de la scène",
        "Collision avec un obstacle : blessure légère et étourdi pendant 1 narration"
      ],
      en: [
        "Severe cramp: cannot move and disadvantage for 2 narrations",
        "Trips and falls: minor wound",
        "Twists ankle: speed halved for the rest of the scene",
        "Collides with an obstacle: minor wound and stunned for 1 narration"
      ]
    },
    disaster: {
      fr: [
        "Tombe et entraîne des alliés dans sa chute",
        "Chute grave : blessure incapacitante et immobilisé",
        "Effondrement de la structure sous ses pieds : chute de plusieurs étages",
        "Se retrouve piégé dans un environnement dangereux (eau, feu, vide)"
      ],
      en: [
        "Falls and drags allies down as well",
        "Serious fall: incapacitating wound and immobilized",
        "Structure collapses underfoot: falls several stories",
        "Trapped in a hazardous environment (water, fire, vacuum)"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // RANGED WEAPONS — Attaque à distance
  // ─────────────────────────────────────────────────────────────
  "ranged-weapons": {
    minor: {
      fr: [
        "Arme enrayée ou chargeur vide (1 action pour régler le problème)",
        "Arme endommagée : désavantage jusqu'à réparation",
        "Provoque un incendie : gros dégagement de fumée",
        "Se met à découvert : désavantage à la prochaine défense à distance",
        "Le recul fait lâcher l'arme : 1 action pour la récupérer"
      ],
      en: [
        "Weapon jammed or empty magazine (1 action to fix)",
        "Weapon damaged: disadvantage until repaired",
        "Starts a fire: heavy smoke",
        "Caught in the open: disadvantage on next ranged defense",
        "Recoil knocks the weapon loose: 1 action to recover it"
      ]
    },
    critical: {
      fr: [
        "Arme endommagée : inutilisable jusqu'à réparation (une heure) et le personnage subit une blessure légère",
        "Touche un allié",
        "Provoque une explosion : blessure légère à plusieurs alliés",
        "Le tir attire l'attention d'une patrouille de sécurité proche"
      ],
      en: [
        "Weapon damaged: unusable until repaired (one hour) and the character suffers a minor wound",
        "Hits an ally",
        "Causes an explosion: minor wound to several allies",
        "The shot draws the attention of a nearby security patrol"
      ]
    },
    disaster: {
      fr: [
        "Arme détruite : inutilisable et blessure incapacitante",
        "Tue la personne à extraire ou protéger",
        "Provoque une explosion qui compromet l'intégrité du bâtiment",
        "Tue une personne importante, provoquant une réaction extrême",
        "Le tir touche un réservoir de carburant ou un explosif : explosion massive"
      ],
      en: [
        "Weapon destroyed: unusable and incapacitating wound",
        "Kills the person to extract or protect",
        "Causes an explosion that compromises the building's structural integrity",
        "Kills an important person, provoking an extreme reaction",
        "The shot hits a fuel tank or explosive: massive explosion"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // CLOSE COMBAT — Combat rapproché
  // ─────────────────────────────────────────────────────────────
  "close-combat": {
    minor: {
      fr: [
        "Lâche son arme : une action pour la récupérer",
        "Tombe au sol : désavantage jusqu'à la fin de la prochaine narration",
        "Élan mal maîtrisé : se retrouve dos à l'adversaire",
        "Le choc engourdit le bras : désavantage au prochain test de mêlée"
      ],
      en: [
        "Drops weapon: one action to recover it",
        "Falls to the ground: disadvantage until end of next narration",
        "Poorly controlled momentum: ends up with back to the opponent",
        "Impact numbs the arm: disadvantage on next melee test"
      ]
    },
    critical: {
      fr: [
        "L'arme est récupérée par l'adversaire ou très difficilement accessible",
        "Arme endommagée : VD −2 jusqu'à réparation (une heure)",
        "Touche un allié",
        "Se blesse avec sa propre arme : blessure légère",
        "L'adversaire profite de l'ouverture pour une attaque gratuite"
      ],
      en: [
        "Weapon is picked up by the opponent or becomes very hard to reach",
        "Weapon damaged: DV −2 until repaired (one hour)",
        "Hits an ally",
        "Injures self with own weapon: minor wound",
        "The opponent exploits the opening for a free attack"
      ]
    },
    disaster: {
      fr: [
        "Tue la personne à extraire ou protéger",
        "Tue une personne importante, provoquant une réaction extrême",
        "Se transperce ou se tranche un membre : blessure incapacitante",
        "L'adversaire désarme et retourne l'arme contre le personnage : blessure grave"
      ],
      en: [
        "Kills the person to extract or protect",
        "Kills an important person, provoking an extreme reaction",
        "Pierces or severs own limb: incapacitating wound",
        "The opponent disarms and turns the weapon against the character: serious wound"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // STEALTH — Discrétion / Furtivité
  // ─────────────────────────────────────────────────────────────
  "stealth": {
    minor: {
      fr: [
        "Laisse un indice qui permettra de le découvrir plus tard s'il n'agit pas",
        "Se trompe de chemin",
        "Fait du bruit : un garde se rapproche pour vérifier",
        "Laisse une empreinte visible (empreinte de pas, fibre de vêtement)"
      ],
      en: [
        "Leaves a clue that will lead to discovery later unless dealt with",
        "Takes a wrong path",
        "Makes noise: a guard moves closer to investigate",
        "Leaves a visible trace (footprint, clothing fiber)"
      ]
    },
    critical: {
      fr: [
        "Laisse un indice qui permettra de le découvrir plus tard, sans en être conscient",
        "Active un capteur silencieux : la sécurité est en alerte sans que le personnage le sache",
        "Pris dans un angle mort : doit attendre ou revenir en arrière, perdant un temps précieux",
        "Perd un objet personnel sur place, permettant une identification ultérieure"
      ],
      en: [
        "Leaves a clue that will lead to discovery later, without being aware of it",
        "Triggers a silent sensor: security is alerted without the character knowing",
        "Caught in a dead end: must wait or backtrack, losing precious time",
        "Drops a personal item on-site, enabling later identification"
      ]
    },
    disaster: {
      fr: [
        "Alerte !",
        "Tombe nez à nez avec un groupe de gardes : couverture grillée",
        "Déclenche une alarme générale : toute l'installation est en lockdown",
        "Capturé par un système de sécurité automatisé (filet, gaz, tourelle)"
      ],
      en: [
        "Alert!",
        "Runs straight into a group of guards: cover is blown",
        "Triggers a general alarm: the entire facility goes into lockdown",
        "Captured by an automated security system (net, gas, turret)"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // CRACKING — Piratage
  // ─────────────────────────────────────────────────────────────
  "cracking": {
    minor: {
      fr: [
        "Laisse une trace qui permettra de pister matriciellement le personnage plus tard",
        "Laisse, sans s'en rendre compte, une trace qui permettra de le pister",
        "Le programme ralentit : désavantage au prochain test matriciel",
        "Déclenche une alerte mineure dans les logs du serveur"
      ],
      en: [
        "Leaves a trace that will allow the character to be tracked in the Matrix later",
        "Unknowingly leaves a trace that will allow tracking",
        "The program slows down: disadvantage on next Matrix test",
        "Triggers a minor alert in the server logs"
      ]
    },
    critical: {
      fr: [
        "Laisse une trace matricielle (en falsifiant les logs par ex.)",
        "Repéré par les glaces / le spider du serveur",
        "Le biofeedback inflige une blessure légère",
        "Un fichier piégé infecte le commlink du personnage : désavantage à tous les tests matriciels pour la scène"
      ],
      en: [
        "Leaves a Matrix trace (e.g. by falsifying logs)",
        "Spotted by IC / the server's spider",
        "Biofeedback inflicts a minor wound",
        "A data bomb infects the character's commlink: disadvantage on all Matrix tests for the scene"
      ]
    },
    disaster: {
      fr: [
        "Convergence",
        "Le système riposte violemment : blessure grave par biofeedback",
        "Toutes les données du commlink sont effacées ou chiffrées",
        "GOD localise le decker : équipe d'intervention en route"
      ],
      en: [
        "Convergence",
        "The system retaliates violently: serious wound from biofeedback",
        "All commlink data is wiped or encrypted",
        "GOD locates the decker: response team en route"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // ELECTRONICS — Électronique / Utilisation d'appareils
  // ─────────────────────────────────────────────────────────────
  "electronics": {
    minor: {
      fr: [
        "Redémarre l'appareil par erreur, perte de temps",
        "L'écran grésille : désavantage au prochain test utilisant cet appareil",
        "Les données récupérées sont partiellement corrompues",
        "L'appareil émet un bip sonore suspect, attirant l'attention"
      ],
      en: [
        "Accidentally reboots the device, wasting time",
        "The screen flickers: disadvantage on next test using this device",
        "Retrieved data is partially corrupted",
        "The device emits a suspicious beep, drawing attention"
      ]
    },
    critical: {
      fr: [
        "L'appareil est détruit (en considérant qu'il est important pour la mission en cours)",
        "Court-circuit : blessure légère et appareil hors service",
        "L'appareil envoie un signal de détresse avant de s'éteindre",
        "Les données stockées sur l'appareil sont définitivement perdues"
      ],
      en: [
        "The device is destroyed (assuming it is important to the current mission)",
        "Short circuit: minor wound and device out of service",
        "The device sends a distress signal before shutting down",
        "Data stored on the device is permanently lost"
      ]
    },
    disaster: {
      fr: [
        "L'appareil est détruit",
        "Explosion de l'appareil : blessure grave et incendie",
        "L'appareil provoque un court-circuit en chaîne : tous les appareils à proximité sont endommagés",
        "L'appareil se met à émettre en continu la position du personnage"
      ],
      en: [
        "The device is destroyed",
        "Device explodes: serious wound and fire",
        "The device causes a chain short circuit: all nearby devices are damaged",
        "The device begins continuously broadcasting the character's position"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // ENGINEERING — Ingénierie / Construction & réparation
  // ─────────────────────────────────────────────────────────────
  "engineering": {
    minor: {
      fr: [
        "L'appareil/véhicule est réparé, mais quelques réglages sont mauvais : désavantage à la première action l'utilisant",
        "La réparation prend deux fois plus de temps que prévu",
        "Une pièce de rechange est utilisée à mauvais escient : la prochaine panne sera plus grave",
        "L'appareil fonctionne mais émet un bruit suspect"
      ],
      en: [
        "The device/vehicle is repaired, but some settings are off: disadvantage on the first action using it",
        "The repair takes twice as long as expected",
        "A spare part is misused: the next breakdown will be worse",
        "The device works but emits a suspicious noise"
      ]
    },
    critical: {
      fr: [
        "L'appareil/véhicule est mal réparé : désavantage à toutes les actions l'utilisant jusqu'à réparation correcte",
        "Outil en panne, ou manque de pièces empêchant une réparation supplémentaire",
        "La réparation provoque une fuite (carburant, liquide de refroidissement, données)",
        "L'appareil semble réparé mais tombera en panne au pire moment"
      ],
      en: [
        "The device/vehicle is poorly repaired: disadvantage on all actions using it until properly fixed",
        "Tool breaks down, or missing parts prevent any further repair",
        "The repair causes a leak (fuel, coolant, data)",
        "The device seems repaired but will break down at the worst possible moment"
      ]
    },
    disaster: {
      fr: [
        "Explosion lors du maniement d'une batterie",
        "L'appareil/véhicule est mal réparé : il génère un fort bruit matriciel, désavantage à toutes les actions matricielles",
        "L'appareil est irréparable : pièces fondues ou structure fracturée",
        "Explosion de l'atelier : blessure grave et équipement environnant détruit"
      ],
      en: [
        "Explosion while handling a battery",
        "The device/vehicle is badly repaired: it generates heavy Matrix noise, disadvantage on all Matrix actions",
        "The device is beyond repair: melted parts or fractured structure",
        "Workshop explosion: serious wound and surrounding equipment destroyed"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // PILOTING — Pilotage
  // ─────────────────────────────────────────────────────────────
  "piloting": {
    minor: {
      fr: [
        "Batterie endommagée : il ne reste que 5 narrations avant court de batterie",
        "Incident sur la voie publique : poubelles renversées",
        "Perte de connexion avec le véhicule/drone pendant un tour",
        "Éraflure sur la carrosserie : le véhicule est désormais identifiable"
      ],
      en: [
        "Battery damaged: only 5 narrations before the battery dies",
        "Incident on public road: trash cans knocked over",
        "Loss of connection with the vehicle/drone for one turn",
        "Scratch on the bodywork: the vehicle is now identifiable"
      ]
    },
    critical: {
      fr: [
        "Batterie endommagée : le moteur se coupe",
        "Accident sur la voie publique : blessés",
        "Perte de connexion avec le véhicule/drone pour la fin de la scène (autopilote encore fonctionnel)",
        "Le véhicule est sévèrement endommagé : vitesse réduite de moitié",
        "Un passager est blessé légèrement à cause de la manœuvre"
      ],
      en: [
        "Battery damaged: the engine cuts out",
        "Accident on public road: injured bystanders",
        "Loss of connection with the vehicle/drone for the rest of the scene (autopilot still functional)",
        "The vehicle is severely damaged: speed halved",
        "A passenger suffers a minor wound from the maneuver"
      ]
    },
    disaster: {
      fr: [
        "Carambolage sur la voie publique : véhicule immobilisé et forces de l'ordre en route",
        "Le véhicule est détruit : tous les occupants subissent une blessure grave",
        "Accident mortel sur la voie publique : victimes civiles et couverture médiatique",
        "Le véhicule plonge dans le décor (rivière, ravin, bâtiment) : blessure incapacitante"
      ],
      en: [
        "Pile-up on public road: vehicle immobilized and law enforcement en route",
        "The vehicle is destroyed: all occupants suffer a serious wound",
        "Fatal accident on public road: civilian casualties and media coverage",
        "The vehicle plunges off course (river, ravine, building): incapacitating wound"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // SORCERY — Sorcellerie
  // ─────────────────────────────────────────────────────────────
  "sorcery": {
    minor: {
      fr: [
        "Les effets du sort sont légèrement affaiblis (ex : VD de base réduite de 2 pour un sort offensif)",
        "Mauvaise cible, mais du « bon camp »",
        "Sort trop puissant (ex : tue au lieu d'incapaciter)",
        "Le drain est doublé",
        "Manifestation magique visible : lumière, bruit ou odeur inhabituelle"
      ],
      en: [
        "The spell's effects are slightly weakened (e.g. base DV reduced by 2 for an offensive spell)",
        "Wrong target, but on the 'right side'",
        "Spell too powerful (e.g. kills instead of incapacitating)",
        "Drain is doubled",
        "Visible magical manifestation: unusual light, sound, or smell"
      ]
    },
    critical: {
      fr: [
        "Les effets du sort sont fortement affaiblis (VD de base divisée par 2)",
        "Mauvaise cible, « mauvais camp »",
        "Sort beaucoup trop puissant, dommages collatéraux importants",
        "Effet différent ou inverse (ex : silence au lieu d'invisibilité)",
        "Le personnage subit un contrecoup magique : blessure légère et désavantage en magie pour 2 narrations"
      ],
      en: [
        "The spell's effects are greatly weakened (base DV halved)",
        "Wrong target, 'wrong side'",
        "Spell far too powerful, significant collateral damage",
        "Different or opposite effect (e.g. silence instead of invisibility)",
        "The character suffers a magical backlash: minor wound and disadvantage on magic for 2 narrations"
      ]
    },
    disaster: {
      fr: [
        "Crée une faille astrale temporaire, les esprits malveillants peuvent traverser",
        "Le sort se retourne intégralement contre le lanceur : blessure grave",
        "Explosion de mana incontrôlée : blessure légère à toutes les personnes à proximité",
        "Le personnage perd temporairement l'accès à la magie pour le reste de la scène"
      ],
      en: [
        "Creates a temporary astral rift, malevolent spirits can cross through",
        "The spell fully rebounds on the caster: serious wound",
        "Uncontrolled mana explosion: minor wound to everyone nearby",
        "The character temporarily loses access to magic for the rest of the scene"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // CONJURATION — Conjuration
  // ─────────────────────────────────────────────────────────────
  "conjuration": {
    minor: {
      fr: [
        "L'esprit invoqué souffre d'un trait de caractère ennuyant (ex : esprit pacifiste qui refuse de combattre)",
        "Les pouvoirs optionnels de l'esprit ne sont pas ceux attendus",
        "L'esprit est plus faible que prévu : ses attributs sont réduits de 1",
        "L'esprit obéit, mais exprime bruyamment son mécontentement"
      ],
      en: [
        "The summoned spirit has an annoying personality trait (e.g. pacifist spirit that refuses to fight)",
        "The spirit's optional powers are not the expected ones",
        "The spirit is weaker than expected: its attributes are reduced by 1",
        "The spirit obeys, but loudly expresses its displeasure"
      ]
    },
    critical: {
      fr: [
        "L'esprit fera de son mieux pour « interpréter de manière créative » les ordres",
        "L'esprit échappe au contrôle de son invocateur",
        "L'esprit n'est pas du type attendu",
        "L'esprit exige un service en retour avant d'obéir",
        "L'invocation attire l'attention d'une entité astrale hostile"
      ],
      en: [
        "The spirit will do its best to 'creatively interpret' orders",
        "The spirit escapes the summoner's control",
        "The spirit is not the expected type",
        "The spirit demands a service in return before obeying",
        "The summoning attracts the attention of a hostile astral entity"
      ]
    },
    disaster: {
      fr: [
        "L'esprit échappe au contrôle et se retourne contre l'invocateur",
        "L'esprit est une version supérieure qui se retourne contre lui",
        "L'invocation ouvre une brèche astrale permanente",
        "Un esprit libre de grande puissance est attiré par le rituel et s'en prend au groupe"
      ],
      en: [
        "The spirit escapes control and turns against the summoner",
        "The spirit is a superior version that turns against the summoner",
        "The summoning opens a permanent astral breach",
        "A powerful free spirit is attracted by the ritual and attacks the group"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // PERCEPTION — Perception
  // ─────────────────────────────────────────────────────────────
  "perception": {
    minor: {
      fr: [
        "Quelques informations sont correctes, mais imprécises",
        "L'observation prend plus de temps que prévu : perd sa prochaine action mineure",
        "Le personnage est distrait par un détail sans importance",
        "Informations partielles : certains détails clés manquent"
      ],
      en: [
        "Some information is correct but imprecise",
        "The observation takes longer than expected: loses next minor action",
        "The character is distracted by an unimportant detail",
        "Partial information: some key details are missing"
      ]
    },
    critical: {
      fr: [
        "Est repéré par sa cible",
        "Quelques informations sont erronées (mais le principal est correct si le test est un succès)",
        "Le personnage est convaincu d'un faux détail qui pourrait fausser ses décisions",
        "Un reflet ou un bruit trahit la position du personnage"
      ],
      en: [
        "Spotted by the target",
        "Some information is wrong (but the main points are correct if the test is a success)",
        "The character is convinced of a false detail that could skew decisions",
        "A reflection or noise gives away the character's position"
      ]
    },
    disaster: {
      fr: [
        "Est repéré et capturé par sa cible",
        "Toutes les informations obtenues sont fausses et le personnage y croit",
        "Le personnage est piégé dans un guet-apens en observant sa cible",
        "La cible est alertée et disparaît avant que le personnage ne puisse agir"
      ],
      en: [
        "Spotted and captured by the target",
        "All obtained information is false and the character believes it",
        "The character is caught in an ambush while observing the target",
        "The target is alerted and vanishes before the character can act"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // SURVIVAL — Survie
  // ─────────────────────────────────────────────────────────────
  "survival": {
    minor: {
      fr: [
        "Passe une partie significative de la journée à trouver des provisions ou de l'eau",
        "L'abri construit est fragile : désavantage aux tests de repos",
        "Attrape un coup de froid : désavantage aux tests physiques pour 4 heures",
        "Se retrouve dans un territoire marqué par un prédateur"
      ],
      en: [
        "Spends a significant part of the day finding provisions or water",
        "The shelter built is fragile: disadvantage on rest tests",
        "Catches a cold: disadvantage on physical tests for 4 hours",
        "Ends up in a predator's marked territory"
      ]
    },
    critical: {
      fr: [
        "Mange quelque chose d'empoisonné : toute l'équipe subit un désavantage pour 8 heures",
        "Se perd temporairement : perd une demi-journée de voyage",
        "Rencontre un prédateur dangereux",
        "L'abri s'effondre en pleine nuit : pas de repos, désavantage le lendemain"
      ],
      en: [
        "Eats something poisonous: the whole team suffers disadvantage for 8 hours",
        "Temporarily gets lost: loses half a day of travel",
        "Encounters a dangerous predator",
        "The shelter collapses during the night: no rest, disadvantage the next day"
      ]
    },
    disaster: {
      fr: [
        "Se perd, aucune chance d'arriver à temps",
        "Empoisonnement grave : blessure grave pour tout le groupe",
        "Tombe dans un piège naturel (sables mouvants, crevasse) : blessure incapacitante",
        "Attaque d'un groupe de prédateurs : combat inévitable en mauvaise posture"
      ],
      en: [
        "Gets lost, no chance of arriving on time",
        "Severe poisoning: serious wound for the entire group",
        "Falls into a natural trap (quicksand, crevasse): incapacitating wound",
        "Attacked by a pack of predators: unavoidable fight in a bad position"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // INFLUENCE — Interaction sociale générale
  // ─────────────────────────────────────────────────────────────
  "influence": {
    minor: {
      fr: [
        "L'interlocuteur est mal à l'aise : désavantage à la prochaine interaction avec lui",
        "Un lapsus maladroit rend la conversation gênante",
        "Le personnage révèle involontairement un détail personnel"
      ],
      en: [
        "The other party is uncomfortable: disadvantage on next interaction with them",
        "An awkward slip of the tongue makes the conversation uncomfortable",
        "The character involuntarily reveals a personal detail"
      ]
    },
    critical: {
      fr: [
        "L'interlocuteur est mal à l'aise : il tente par tous les moyens de mettre fin à l'interaction",
        "L'interlocuteur exige une preuve de bonne foi avant de continuer",
        "Le personnage s'aliène une partie de l'audience",
        "L'interlocuteur prévient discrètement la sécurité"
      ],
      en: [
        "The other party is uncomfortable: they try everything to end the interaction",
        "The other party demands proof of good faith before continuing",
        "The character alienates part of the audience",
        "The other party discreetly alerts security"
      ]
    },
    disaster: {
      fr: [
        "L'interlocuteur se sent insulté, ce qui provoque une réaction extrême de sa corporation/son groupe",
        "Le personnage est identifié comme un imposteur et les gardes sont appelés",
        "L'interlocuteur devient un ennemi juré et jure de se venger",
        "La conversation dégénère en confrontation physique"
      ],
      en: [
        "The other party feels insulted, provoking an extreme reaction from their corporation/group",
        "The character is identified as an impostor and guards are called",
        "The other party becomes a sworn enemy and vows revenge",
        "The conversation devolves into a physical confrontation"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // INFLUENCE — Interaction sociale (sous-catégorie)
  // ─────────────────────────────────────────────────────────────
  "influence_social": {
    minor: {
      fr: [
        "L'interlocuteur est mal à l'aise : désavantage à la prochaine interaction avec lui",
        "Le personnage fait une gaffe qui refroidit l'ambiance",
        "Un sujet sensible est abordé par mégarde",
        "Le personnage monopolise la conversation et agace son interlocuteur"
      ],
      en: [
        "The other party is uncomfortable: disadvantage on next interaction with them",
        "The character makes a blunder that dampens the mood",
        "A sensitive topic is accidentally brought up",
        "The character monopolizes the conversation and annoys the other party"
      ]
    },
    critical: {
      fr: [
        "L'interlocuteur est mal à l'aise : il tente par tous les moyens de mettre fin à l'interaction",
        "Le personnage révèle accidentellement des informations sur la mission",
        "L'interlocuteur est offensé et prévient ses associés",
        "Le personnage est perçu comme une menace et mis sous surveillance"
      ],
      en: [
        "The other party is uncomfortable: they try everything to end the interaction",
        "The character accidentally reveals information about the mission",
        "The other party is offended and warns their associates",
        "The character is perceived as a threat and put under surveillance"
      ]
    },
    disaster: {
      fr: [
        "L'interlocuteur se sent insulté, ce qui provoque une réaction extrême de sa corporation/son groupe",
        "Le personnage provoque une rixe générale",
        "L'interlocuteur jure de détruire la réputation du personnage",
        "La conversation dégénère en incident médiatique"
      ],
      en: [
        "The other party feels insulted, provoking an extreme reaction from their corporation/group",
        "The character triggers a general brawl",
        "The other party vows to destroy the character's reputation",
        "The conversation devolves into a media incident"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // INFLUENCE — Étiquette
  // ─────────────────────────────────────────────────────────────
  "influence_etiquette": {
    minor: {
      fr: [
        "Faux pas : laisse échapper qu'il n'est jamais venu à cet endroit, sans trahir qu'il n'est pas du milieu",
        "Utilise le mauvais titre ou honorifique, créant un moment gênant",
        "Commet une erreur de protocole mineure remarquée par quelques personnes",
        "Porte un vêtement ou un accessoire inapproprié pour l'occasion"
      ],
      en: [
        "Faux pas: lets slip that they have never been here before, without revealing they don't belong",
        "Uses the wrong title or honorific, creating an awkward moment",
        "Makes a minor protocol mistake noticed by a few people",
        "Wears inappropriate clothing or accessory for the occasion"
      ]
    },
    critical: {
      fr: [
        "Faux pas : laisse échapper qu'il n'est pas coutumier du milieu",
        "Est confondu avec quelqu'un d'autre qui doit une faveur à l'interlocuteur",
        "Brise un tabou culturel sans s'en rendre compte : l'assemblée se fige",
        "Est identifié comme venant d'un milieu social très différent"
      ],
      en: [
        "Faux pas: lets slip that they are not familiar with this social circle",
        "Is mistaken for someone else who owes the other party a favor",
        "Breaks a cultural taboo without realizing it: the gathering freezes",
        "Is identified as coming from a very different social background"
      ]
    },
    disaster: {
      fr: [
        "Insulte un interlocuteur en lien avec la mission sans s'en rendre compte",
        "Provoque un incident diplomatique qui met en péril toute la mission",
        "Est démasqué et banni de l'événement avec éclat",
        "L'interlocuteur se sent insulté, ce qui provoque une réaction extrême de sa corporation/son groupe"
      ],
      en: [
        "Insults a mission-related contact without realizing it",
        "Causes a diplomatic incident that jeopardizes the entire mission",
        "Is unmasked and dramatically banned from the event",
        "The other party feels insulted, provoking an extreme reaction from their corporation/group"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // INFLUENCE — Négociation
  // ─────────────────────────────────────────────────────────────
  "influence_negotiation": {
    minor: {
      fr: [
        "L'interlocuteur pense qu'il s'est fait avoir et le fait savoir",
        "Le prix final est légèrement plus élevé que prévu",
        "L'accord inclut une clause désavantageuse passée inaperçue",
        "L'interlocuteur exige un geste de bonne volonté supplémentaire"
      ],
      en: [
        "The other party thinks they got cheated and makes it known",
        "The final price is slightly higher than expected",
        "The deal includes a disadvantageous clause that went unnoticed",
        "The other party demands an additional gesture of goodwill"
      ]
    },
    critical: {
      fr: [
        "Obtient le prix souhaité uniquement en achetant autre chose avec",
        "L'interlocuteur rompt la négociation et refuse de reprendre contact pendant un temps",
        "Le contrat comporte une clause piège : le personnage s'engage sans le savoir à un service futur",
        "L'interlocuteur contacte un concurrent pour faire monter les enchères"
      ],
      en: [
        "Gets the desired price only by buying something else as well",
        "The other party breaks off negotiation and refuses further contact for a while",
        "The contract contains a trap clause: the character unknowingly commits to a future service",
        "The other party contacts a competitor to drive up the price"
      ]
    },
    disaster: {
      fr: [
        "La cible croit à un bluff et donne de fausses informations",
        "La négociation échoue totalement et l'interlocuteur devient hostile",
        "L'interlocuteur utilise les informations révélées pendant la négociation contre le personnage",
        "Le marché est un piège : l'interlocuteur a prévenu les autorités"
      ],
      en: [
        "The target thinks it's a bluff and gives false information",
        "The negotiation fails completely and the other party becomes hostile",
        "The other party uses information revealed during negotiation against the character",
        "The deal is a trap: the other party has alerted the authorities"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // INFLUENCE — Intimidation
  // ─────────────────────────────────────────────────────────────
  "influence_intimidation": {
    minor: {
      fr: [
        "Un mot ou une attitude permet à la cible de comprendre que sa vie n'est pas en danger (elle peut néanmoins être intimidée par d'autres moyens)",
        "La cible est intimidée mais garde suffisamment son sang-froid pour cacher une information",
        "Le personnage en fait trop : les témoins sont choqués",
        "La cible cède en apparence mais planifie sa revanche"
      ],
      en: [
        "A word or attitude lets the target understand their life is not in danger (they may still be intimidated by other means)",
        "The target is intimidated but keeps enough composure to hide some information",
        "The character overdoes it: witnesses are shocked",
        "The target appears to give in but plans revenge"
      ]
    },
    critical: {
      fr: [
        "L'interlocuteur est mal à l'aise : il tente par tous les moyens de mettre fin à l'interaction",
        "La cible panique et fait quelque chose d'imprévisible (crier, fuir, attaquer)",
        "La scène attire l'attention de témoins ou de la sécurité",
        "La cible s'évanouit ou est paralysée par la peur : impossible d'obtenir des informations"
      ],
      en: [
        "The other party is uncomfortable: they try everything to end the interaction",
        "The target panics and does something unpredictable (scream, flee, attack)",
        "The scene draws attention from witnesses or security",
        "The target faints or is paralyzed by fear: impossible to get information"
      ]
    },
    disaster: {
      fr: [
        "L'interlocuteur se sent insulté, ce qui provoque une réaction extrême de sa corporation/son groupe",
        "La cible appelle des renforts armés",
        "Le personnage est filmé et la vidéo circule : réputation compromise",
        "La cible meurt de peur (littéralement) : crise cardiaque ou équivalent"
      ],
      en: [
        "The other party feels insulted, provoking an extreme reaction from their corporation/group",
        "The target calls for armed reinforcements",
        "The character is filmed and the video circulates: reputation compromised",
        "The target dies of fright (literally): heart attack or equivalent"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // INFLUENCE — Bluff / Imposture
  // ─────────────────────────────────────────────────────────────
  "influence_bluff": {
    minor: {
      fr: [
        "L'interlocuteur est suspicieux : désavantage à la prochaine interaction avec lui",
        "Le personnage doit improviser un détail qui pourrait être vérifié plus tard",
        "Un micro-expression trahit le mensonge, mais l'interlocuteur n'est pas sûr",
        "Le personnage s'emmêle dans ses mensonges : doit réussir un test de mémoire plus tard"
      ],
      en: [
        "The other party is suspicious: disadvantage on next interaction with them",
        "The character must improvise a detail that could be verified later",
        "A micro-expression betrays the lie, but the other party is not sure",
        "The character gets tangled in their lies: must pass a memory test later"
      ]
    },
    critical: {
      fr: [
        "L'interlocuteur est suspicieux : il alerte sa hiérarchie dès le départ du personnage",
        "Le mensonge est partiellement découvert : l'interlocuteur demande des preuves",
        "Un témoin inattendu reconnaît le personnage ou contredit son histoire",
        "L'interlocuteur joue le jeu mais tend un piège"
      ],
      en: [
        "The other party is suspicious: they alert their superiors as soon as the character leaves",
        "The lie is partially uncovered: the other party demands proof",
        "An unexpected witness recognizes the character or contradicts their story",
        "The other party plays along but sets a trap"
      ]
    },
    disaster: {
      fr: [
        "Est découvert, ce qui provoque une réaction extrême de la corporation/du groupe",
        "La couverture est grillée : le personnage est identifié et un avis de recherche est lancé",
        "L'interlocuteur retourne le bluff contre le personnage et le piège",
        "Le personnage est capturé et interrogé"
      ],
      en: [
        "Is discovered, provoking an extreme reaction from the corporation/group",
        "Cover is blown: the character is identified and a warrant is issued",
        "The other party turns the bluff against the character and traps them",
        "The character is captured and interrogated"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // NETWORKING — Réseau
  // ─────────────────────────────────────────────────────────────
  "networking": {
    minor: {
      fr: [
        "Un contact est excédé / en a marre des requêtes incessantes : désavantage au prochain test de Réseau",
        "Le prix demandé est légèrement plus élevé qu'anticipé",
        "Le matériel est de seconde main et en mauvais état",
        "L'information arrive en retard : perte de temps"
      ],
      en: [
        "A contact is fed up with constant requests: disadvantage on next Networking test",
        "The price is slightly higher than expected",
        "The gear is second-hand and in poor condition",
        "The information arrives late: time wasted"
      ]
    },
    critical: {
      fr: [
        "La cible est informée des recherches et se prépare",
        "Le prix demandé est le double de celui anticipé",
        "Le matériel fourni est déclaré volé",
        "Le contact fournit des informations partiellement fausses (intentionnellement ou non)",
        "Le contact est compromis et sous surveillance"
      ],
      en: [
        "The target is informed of the inquiries and prepares",
        "The price is double what was expected",
        "The supplied gear is reported stolen",
        "The contact provides partially false information (intentionally or not)",
        "The contact is compromised and under surveillance"
      ]
    },
    disaster: {
      fr: [
        "La cible est informée des recherches et s'en prend directement au personnage",
        "Les forces de l'ordre sont alertées de la transaction et tendent un piège",
        "Le contact trahit le personnage et vend ses informations au plus offrant",
        "Le réseau du personnage est compromis : tous les contacts sont inaccessibles pour un temps"
      ],
      en: [
        "The target is informed of the inquiries and directly targets the character",
        "Law enforcement is alerted to the transaction and sets a trap",
        "The contact betrays the character and sells their information to the highest bidder",
        "The character's network is compromised: all contacts are unreachable for a while"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // ASTRAL COMBAT — Combat astral
  // ─────────────────────────────────────────────────────────────
  "astral-combat": {
    minor: {
      fr: [
        "Perte de concentration momentanée : désavantage au prochain test astral",
        "L'aura du personnage vacille : visible par tout observateur astral à proximité",
        "Le lien avec le corps physique se distend : léger vertige au retour",
        "L'entité adverse perçoit une faiblesse émotionnelle du personnage"
      ],
      en: [
        "Momentary loss of focus: disadvantage on next astral test",
        "The character's aura flickers: visible to any nearby astral observer",
        "The link to the physical body stretches: slight dizziness upon return",
        "The opposing entity perceives an emotional weakness in the character"
      ]
    },
    critical: {
      fr: [
        "L'adversaire astral identifie l'aura du personnage — il pourra le retrouver",
        "Le personnage est repoussé dans le plan physique : blessure légère et désorienté pendant 1 narration",
        "Un fragment de l'entité s'accroche à l'aura du personnage : désavantage à tous les tests astraux pour la scène",
        "Le combat attire l'attention d'autres entités astrales hostiles"
      ],
      en: [
        "The astral adversary identifies the character's aura — it can find them again",
        "The character is pushed back to the physical plane: minor wound and disoriented for 1 narration",
        "A fragment of the entity clings to the character's aura: disadvantage on all astral tests for the scene",
        "The fight draws the attention of other hostile astral entities"
      ]
    },
    disaster: {
      fr: [
        "Projection astrale interrompue brutalement : blessure grave et désorientation",
        "L'entité astrale possède temporairement le corps du personnage",
        "Le corps astral est gravement endommagé : magie réduite de 1 jusqu'à guérison",
        "Le personnage est piégé dans le plan astral : son corps physique est vulnérable"
      ],
      en: [
        "Astral projection brutally interrupted: serious wound and disorientation",
        "The astral entity temporarily possesses the character's body",
        "The astral body is severely damaged: magic reduced by 1 until healed",
        "The character is trapped in the astral plane: their physical body is vulnerable"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // TECHNOMANCER — Technomancie
  // ─────────────────────────────────────────────────────────────
  "technomancer": {
    minor: {
      fr: [
        "Écho de résonance : laisse une trace détectable dans la Matrice",
        "La forme complexe scintille : visible par tout persona matriciel à proximité",
        "Feedback mineur : le technomancien souffre d'une migraine (désavantage au prochain test matriciel)",
        "Le sprite invoqué est instable et disparaîtra plus tôt que prévu"
      ],
      en: [
        "Resonance echo: leaves a detectable trace in the Matrix",
        "The complex form flickers: visible to any nearby Matrix persona",
        "Minor feedback: the technomancer suffers a migraine (disadvantage on next Matrix test)",
        "The compiled sprite is unstable and will disappear sooner than expected"
      ]
    },
    critical: {
      fr: [
        "La forme complexe se retourne partiellement : effet réduit et feedback mental",
        "Un sprite sauvage est attiré par l'activité de résonance et interfère",
        "Le technomancien est repéré par un spider corporatiste",
        "Le living persona subit des interférences : désavantage à tous les tests matriciels pour la scène",
        "Les données du technomancien fuient dans la Matrice locale"
      ],
      en: [
        "The complex form partially backfires: reduced effect and mental feedback",
        "A wild sprite is attracted by the resonance activity and interferes",
        "The technomancer is spotted by a corporate spider",
        "The living persona suffers interference: disadvantage on all Matrix tests for the scene",
        "The technomancer's data leaks into the local Matrix"
      ]
    },
    disaster: {
      fr: [
        "Convergence partielle : le technomancien est repéré et traqué par GOD",
        "Le technomancien perd temporairement sa connexion à la résonance : pas de formes complexes ni de sprites pour le reste de la scène",
        "Feedback massif : blessure grave et perte de conscience temporaire",
        "La nature de technomancien du personnage est révélée publiquement dans la Matrice"
      ],
      en: [
        "Partial convergence: the technomancer is spotted and tracked by GOD",
        "The technomancer temporarily loses their resonance connection: no complex forms or sprites for the rest of the scene",
        "Massive feedback: serious wound and temporary loss of consciousness",
        "The character's technomancer nature is publicly revealed in the Matrix"
      ]
    }
  },
  // ─────────────────────────────────────────────────────────────
  // DEFAULT — Fallback for any unlisted skill
  // ─────────────────────────────────────────────────────────────
  "default": {
    minor: {
      fr: [
        "L'action prend plus de temps que prévu : perd sa prochaine action mineure",
        "Résultat partiel : l'objectif est atteint, mais de manière imparfaite",
        "L'action attire l'attention de quelqu'un de non désiré",
        "Un outil ou une ressource est endommagé(e) lors de la tentative",
        "Le personnage laisse une trace de son passage"
      ],
      en: [
        "The action takes longer than expected: loses next minor action",
        "Partial result: the goal is achieved, but imperfectly",
        "The action draws unwanted attention",
        "A tool or resource is damaged during the attempt",
        "The character leaves a trace behind"
      ]
    },
    critical: {
      fr: [
        "L'action échoue et crée un nouveau problème",
        "Le personnage subit une blessure légère liée à l'action",
        "Un allié est affecté négativement par le résultat",
        "L'action produit l'effet inverse de celui souhaité",
        "Le personnage est exposé à un danger immédiat"
      ],
      en: [
        "The action fails and creates a new problem",
        "The character suffers a minor wound related to the action",
        "An ally is negatively affected by the result",
        "The action produces the opposite of the desired effect",
        "The character is exposed to immediate danger"
      ]
    },
    disaster: {
      fr: [
        "Catastrophe totale : l'action échoue de la pire manière possible",
        "Le personnage subit une blessure grave",
        "L'ensemble de l'équipe est mis en danger par l'échec",
        "L'action provoque des conséquences irréversibles",
        "L'échec compromet l'objectif principal de la mission"
      ],
      en: [
        "Total catastrophe: the action fails in the worst possible way",
        "The character suffers a serious wound",
        "The entire team is put in danger by the failure",
        "The action causes irreversible consequences",
        "The failure compromises the mission's primary objective"
      ]
    }
  }
};
export {
  COMPLICATIONS
};
//# sourceMappingURL=complication-data-11hSTXbu.mjs.map
