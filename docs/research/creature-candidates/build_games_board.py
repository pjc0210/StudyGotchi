#!/usr/bin/env python3
"""Rebuild the creature board around named game characters + four temperaments."""

from __future__ import annotations

import json
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
UA = "StudyGotchiCreatureResearch/1.0 (local style board; educational)"
CTX = ssl.create_default_context()

# temperament, name, game, family, why, wiki_kind, wiki_title, extra
# wiki_kind: wikipedia | fandom:<wiki> | official | local
CHARACTERS = [
    # Mario — animals and cute monsters, not the plumber
    ("verity", "Yoshi", "Yoshi's Island", "mario", "Loyal saddle dino. Face is the whole contract.", "wikipedia", "Yoshi", None),
    ("verity", "Poochy", "Yoshi's Island", "mario", "Good dog. No plot. No lie.", "fandom:mario", "Poochy", None),
    ("verity", "Penguin", "Super Mario 64", "mario", "The mother penguin just wants her baby back.", "fandom:mario", "Penguin", None),
    ("lovity", "Luma", "Super Mario Galaxy", "mario", "Star bean. Two dots and a giggle.", "wikipedia", "Luma (Mario)", None),
    ("lovity", "Hungry Luma", "Super Mario Galaxy", "mario", "Cute until it opens a shop in your face.", "fandom:mario", "Hungry Luma", None),
    ("lovity", "Cheep Cheep", "Super Mario Bros.", "mario", "The fish is the joke.", "wikipedia", "Cheep Cheep", None),
    ("lovity", "Blooper", "Super Mario Bros.", "mario", "Sad squid. That's the bit.", "wikipedia", "Blooper (Mario)", None),
    ("lovity", "Cataquack", "Super Mario Sunshine", "mario", "Boing. That is the entire character.", "fandom:mario", "Cataquack", None),
    ("lovity", "Monty Mole", "Super Mario World", "mario", "Hole + hat. Done.", "fandom:mario", "Monty Mole", None),
    ("lovity", "Pokey", "Super Mario Bros. 2", "mario", "Cactus that learned to walk badly.", "wikipedia", "Pokey (Mario)", None),
    ("falsity", "Shy Guy", "Super Mario Bros. 2", "mario", "The mask is the character.", "wikipedia", "Shy Guy", None),
    ("falsity", "Birdo", "Super Mario Bros. 2", "mario", "Egg-spitting maybe-dinosaur. Never quite what the label says.", "wikipedia", "Birdo", None),
    ("falsity", "Cappy", "Super Mario Odyssey", "mario", "A hat that steals other faces.", "wikipedia", "Cappy (Mario)", None),
    ("falsity", "Boo", "Super Mario Bros. 3", "mario", "Cute when watched. Mean when you turn.", "wikipedia", "Boo (Mario)", None),
    ("falsity", "Wario", "Super Mario Land 2", "mario", "Mario's lie. Same silhouette, worse soul.", "wikipedia", "Wario", None),
    ("falsity", "Waluigi", "Mario Tennis", "mario", "A fake Luigi invented for tennis.", "wikipedia", "Waluigi", None),
    ("cruelty", "Goomba", "Super Mario Bros.", "mario", "The first thing the game asks you to stomp.", "wikipedia", "Goomba", None),
    ("cruelty", "Koopa Troopa", "Super Mario Bros.", "mario", "Lives in its own coffin and keeps walking.", "wikipedia", "Koopa Troopa", None),
    ("cruelty", "Chain Chomp", "Super Mario Bros. 3", "mario", "A pet that wants you dead.", "wikipedia", "Chain Chomp", None),
    ("cruelty", "Piranha Plant", "Super Mario Bros.", "mario", "A flower with a mouth.", "wikipedia", "Piranha Plant", None),
    ("cruelty", "Bob-omb", "Super Mario Bros. 2", "mario", "A baby that explodes.", "wikipedia", "Bob-omb", None),
    ("cruelty", "Thwomp", "Super Mario Bros. 3", "mario", "A brick that hates you personally.", "wikipedia", "Thwomp", None),
    ("cruelty", "Bullet Bill", "Super Mario Bros.", "mario", "A face on a war crime.", "wikipedia", "Bullet Bill", None),
    ("cruelty", "King Boo", "Luigi's Mansion", "mario", "The shy ghost grew a crown and a grudge.", "wikipedia", "King Boo", None),
    ("cruelty", "Bowser Jr.", "Super Mario Sunshine", "mario", "Toddler + paintbrush + war.", "wikipedia", "Bowser Jr.", None),
    ("lovity", "Diddy Kong", "Donkey Kong Country", "mario", "Tiny ape, giant grin, jetpack later.", "wikipedia", "Diddy Kong", None),
    ("verity", "Dixie Kong", "Donkey Kong Country 2", "mario", "The ponytail is a helicopter and also honesty.", "wikipedia", "Dixie Kong", None),
    ("verity", "Rambi", "Donkey Kong Country", "mario", "Rhino taxi. No inner life required.", "wikipedia", "Rambi", None),
    ("lovity", "Squawks", "Donkey Kong Country", "mario", "Helpful parrot with a flashlight.", "fandom:mario", "Squawks", None),
    ("lovity", "Enguarde", "Donkey Kong Country", "mario", "Swordfish you can ride. Obviously.", "fandom:mario", "Enguarde", None),
    ("cruelty", "King K. Rool", "Donkey Kong Country", "mario", "Crocodile king in a stolen crown.", "wikipedia", "King K. Rool", None),
    # Pikmin
    ("verity", "Red Pikmin", "Pikmin", "pikmin", "The original plant soldier. Face is a leaf.", "official", "Red Pikmin", "https://pikmin.nintendo.com/_images/layouts/piklopedia/thumbnails/red-pikmin.png"),
    ("verity", "Yellow Pikmin", "Pikmin", "pikmin", "Ear-hands. Still tells the truth.", "official", "Yellow Pikmin", "https://pikmin.nintendo.com/_images/layouts/piklopedia/thumbnails/yellow-pikmin.png"),
    ("verity", "Blue Pikmin", "Pikmin", "pikmin", "Gills. Honest about water.", "official", "Blue Pikmin", "https://pikmin.nintendo.com/_images/layouts/piklopedia/thumbnails/blue-pikmin.png"),
    ("verity", "White Pikmin", "Pikmin 2", "pikmin", "Poison on purpose. Still a good employee.", "official", "White Pikmin", "https://pikmin.nintendo.com/_images/layouts/piklopedia/thumbnails/white-pikmin.png"),
    ("verity", "Purple Pikmin", "Pikmin 2", "pikmin", "Fat, slow, tells gravity the truth.", "official", "Purple Pikmin", "https://pikmin.nintendo.com/_images/layouts/piklopedia/thumbnails/purple-pikmin.png"),
    ("verity", "Rock Pikmin", "Pikmin 3", "pikmin", "A pebble that believes in itself.", "official", "Rock Pikmin", "https://pikmin.nintendo.com/_images/layouts/piklopedia/thumbnails/rock-pikmin.png"),
    ("verity", "Winged Pikmin", "Pikmin 3", "pikmin", "Pink and airborne. Still a worker.", "official", "Winged Pikmin", "https://pikmin.nintendo.com/_images/layouts/piklopedia/thumbnails/winged-pikmin.png"),
    ("verity", "Ice Pikmin", "Pikmin 4", "pikmin", "A cube of loyalty.", "official", "Ice Pikmin", "https://pikmin.nintendo.com/_images/layouts/piklopedia/thumbnails/ice-pikmin.png"),
    ("lovity", "Glow Pikmin", "Pikmin 4", "pikmin", "Night-shift ghost bean.", "official", "Glow Pikmin", "https://pikmin.nintendo.com/_images/layouts/piklopedia/thumbnails/glow-pikmin.png"),
    ("verity", "Oatchi", "Pikmin 4", "pikmin", "Space puppy. The goodest lieutenant.", "fandom:pikmin", "Oatchi", None),
    ("cruelty", "Red Bulborb", "Pikmin", "pikmin", "Cute spots. Eats your entire workforce.", "fandom:pikmin", "Red Bulborb", None),
    ("cruelty", "Empress Bulblax", "Pikmin 2", "pikmin", "Motherhood as a boss fight.", "fandom:pikmin", "Empress Bulblax", None),
    ("lovity", "Puffy Blowhog", "Pikmin", "pikmin", "Inflatable dog that sneezes you off a cliff.", "fandom:pikmin", "Puffy Blowhog", None),
    ("falsity", "Waterwraith", "Pikmin 2", "pikmin", "Invisible until it isn't. Then it rolls you.", "fandom:pikmin", "Waterwraith", None),
    ("falsity", "Breadbug", "Pikmin 2", "pikmin", "Looks like lunch. Steals your lunch.", "fandom:pikmin", "Breadbug", None),
    ("cruelty", "Sheargrub", "Pikmin", "pikmin", "A grub that cuts stems for fun.", "fandom:pikmin", "Sheargrub", None),
    ("cruelty", "Smoky Progg", "Pikmin", "pikmin", "A baby that is already a disaster.", "fandom:pikmin", "Smoky Progg", None),
    # Kirby
    ("lovity", "Kirby", "Kirby's Dream Land", "kirby", "Pink void. Eats the plot.", "wikipedia", "Kirby (character)", None),
    ("verity", "Waddle Dee", "Kirby's Dream Land", "kirby", "No mouth. No scheme. Perfect employee.", "wikipedia", "Waddle Dee", None),
    ("verity", "Bandana Waddle Dee", "Kirby Super Star", "kirby", "Same face, spear, honor.", "fandom:kirby", "Bandana Waddle Dee", None),
    ("lovity", "Awoofy", "Kirby and the Forgotten Land", "kirby", "Dog that forgot it was an enemy.", "fandom:kirby", "Awoofy", None),
    ("verity", "Elfilin", "Kirby and the Forgotten Land", "kirby", "The kind half of a cosmic horror.", "fandom:kirby", "Elfilin", None),
    ("falsity", "Fecto Elfilis", "Kirby and the Forgotten Land", "kirby", "Elfilin's other face. The cute one was a fragment.", "fandom:kirby", "Fecto Elfilis", None),
    ("falsity", "Scarfy", "Kirby's Dream Land", "kirby", "Adorable until you inhale. Then the smile splits.", "fandom:kirby", "Scarfy", None),
    ("falsity", "Marx", "Kirby Super Star", "kirby", "Jester friend. Then the sky cracks.", "wikipedia", "Marx (Kirby)", None),
    ("falsity", "Magolor", "Kirby's Return to Dream Land", "kirby", "Helpful wizard. Also stealing a wish.", "fandom:kirby", "Magolor", None),
    ("lovity", "Gooey", "Kirby's Dream Land 2", "kirby", "Dark Matter that chose to be a friend.", "fandom:kirby", "Gooey", None),
    ("lovity", "Bronto Burt", "Kirby's Dream Land", "kirby", "A flying blob with optimism.", "fandom:kirby", "Bronto Burt", None),
    ("lovity", "Cappy", "Kirby's Dream Land", "kirby", "Mushroom hat. That's it.", "fandom:kirby", "Cappy (enemy)", None),
    ("lovity", "Chilly", "Kirby's Dream Land", "kirby", "Snowman who wants a hug and ice.", "fandom:kirby", "Chilly", None),
    ("cruelty", "Waddle Doo", "Kirby's Dream Land", "kirby", "One eye. Beam. No remorse.", "fandom:kirby", "Waddle Doo", None),
    ("cruelty", "King Dedede", "Kirby's Dream Land", "kirby", "Penguin monarch who steals food.", "wikipedia", "King Dedede", None),
    ("cruelty", "Meta Knight", "Kirby's Adventure", "kirby", "Cute mask, real sword.", "wikipedia", "Meta Knight", None),
    # Pokemon — famous + temperament-perfect
    ("lovity", "Pikachu", "Pokémon Red/Blue", "pokemon", "The mascot. Cheek batteries, no subtext.", "wikipedia", "Pikachu", None),
    ("lovity", "Eevee", "Pokémon Red/Blue", "pokemon", "A puppy that can become anything.", "wikipedia", "Eevee", None),
    ("lovity", "Jigglypuff", "Pokémon Red/Blue", "pokemon", "Sings you to sleep, then draws on your face.", "wikipedia", "Jigglypuff", None),
    ("lovity", "Snorlax", "Pokémon Red/Blue", "pokemon", "A roadblock that snores.", "wikipedia", "Snorlax", None),
    ("lovity", "Psyduck", "Pokémon Red/Blue", "pokemon", "Headache as a personality.", "wikipedia", "Psyduck", None),
    ("lovity", "Wooper", "Pokémon Gold/Silver", "pokemon", "The face of unearned confidence.", "wikipedia", "Wooper", None),
    ("lovity", "Magikarp", "Pokémon Red/Blue", "pokemon", "Useless on purpose. Comedy gold.", "wikipedia", "Magikarp", None),
    ("lovity", "Mew", "Pokémon Red/Blue", "pokemon", "The original secret bean.", "wikipedia", "Mew (Pokémon)", None),
    ("verity", "Bulbasaur", "Pokémon Red/Blue", "pokemon", "Plant on its back. Advertised honestly.", "wikipedia", "Bulbasaur", None),
    ("verity", "Squirtle", "Pokémon Red/Blue", "pokemon", "Sunglasses optional. Shell is real.", "wikipedia", "Squirtle", None),
    ("verity", "Charmander", "Pokémon Red/Blue", "pokemon", "The tail fire is a vital sign.", "wikipedia", "Charmander", None),
    ("verity", "Lucario", "Pokémon Diamond/Pearl", "pokemon", "Reads auras. Cannot do small talk.", "wikipedia", "Lucario", None),
    ("verity", "Absol", "Pokémon Ruby/Sapphire", "pokemon", "Tells the truth about disasters. Gets blamed.", "wikipedia", "Absol", None),
    ("verity", "Cubone", "Pokémon Red/Blue", "pokemon", "Wears its mother's skull. The saddest honesty.", "wikipedia", "Cubone", None),
    ("falsity", "Ditto", "Pokémon Red/Blue", "pokemon", "The face is whoever you need.", "wikipedia", "Ditto (Pokémon)", None),
    ("falsity", "Mimikyu", "Pokémon Sun/Moon", "pokemon", "A ghost in a Pikachu costume. Please don't look.", "wikipedia", "Mimikyu", None),
    ("falsity", "Zoroark", "Pokémon Black/White", "pokemon", "Illusions as a lifestyle.", "wikipedia", "Zoroark", None),
    ("falsity", "Kecleon", "Pokémon Ruby/Sapphire", "pokemon", "Shopkeeper who is also invisible.", "wikipedia", "Kecleon", None),
    ("falsity", "Rotom", "Pokémon Diamond/Pearl", "pokemon", "Possesses your appliances.", "wikipedia", "Rotom", None),
    ("falsity", "Mr. Mime", "Pokémon Red/Blue", "pokemon", "Invisible walls. Visible discomfort.", "wikipedia", "Mr. Mime", None),
    ("falsity", "Mawile", "Pokémon Ruby/Sapphire", "pokemon", "Cute face. Second mouth in the hair.", "wikipedia", "Mawile", None),
    ("falsity", "Greavard", "Pokémon Scarlet/Violet", "pokemon", "A puppy. Also a funeral.", "fandom:pokemon", "Greavard", None),
    ("falsity", "Tatsugiri", "Pokémon Scarlet/Violet", "pokemon", "Sushi that puppets a shark.", "fandom:pokemon", "Tatsugiri", None),
    ("falsity", "Palafin", "Pokémon Scarlet/Violet", "pokemon", "Zero to hero the second you look away.", "fandom:pokemon", "Palafin", None),
    ("cruelty", "Gengar", "Pokémon Red/Blue", "pokemon", "Your shadow, laughing.", "wikipedia", "Gengar", None),
    ("cruelty", "Gyarados", "Pokémon Red/Blue", "pokemon", "The joke fish becomes a natural disaster.", "wikipedia", "Gyarados", None),
    ("cruelty", "Banette", "Pokémon Ruby/Sapphire", "pokemon", "Abandoned doll with a zipper mouth.", "wikipedia", "Banette", None),
    ("cruelty", "Spiritomb", "Pokémon Diamond/Pearl", "pokemon", "108 souls in a keystone.", "wikipedia", "Spiritomb", None),
    ("cruelty", "Gengar", "Pokémon Red/Blue", "pokemon", "Your shadow, laughing.", "wikipedia", "Gengar", None),
    ("cruelty", "Impidimp", "Pokémon Sword/Shield", "pokemon", "A gremlin that feeds on spoiled moods.", "fandom:pokemon", "Impidimp", None),
    ("cruelty", "Morpeko", "Pokémon Sword/Shield", "pokemon", "Hangry is a second form.", "fandom:pokemon", "Morpeko", None),
    ("lovity", "Meowth", "Pokémon Red/Blue", "pokemon", "Talks. Schemes. Still a cat.", "wikipedia", "Meowth", None),
    ("lovity", "Mudkip", "Pokémon Ruby/Sapphire", "pokemon", "The original so-i-herd-u-liek face.", "wikipedia", "Mudkip", None),
    ("lovity", "Piplup", "Pokémon Diamond/Pearl", "pokemon", "Proud baby penguin.", "wikipedia", "Piplup", None),
    ("lovity", "Rowlet", "Pokémon Sun/Moon", "pokemon", "Owl that is also a leaf.", "wikipedia", "Rowlet", None),
    ("lovity", "Sprigatito", "Pokémon Scarlet/Violet", "pokemon", "Cat grass. That's the pitch.", "fandom:pokemon", "Sprigatito", None),
    ("lovity", "Fidough", "Pokémon Scarlet/Violet", "pokemon", "A loaf that loves you.", "fandom:pokemon", "Fidough", None),
    ("lovity", "Lechonk", "Pokémon Scarlet/Violet", "pokemon", "A pig named after a vibe.", "fandom:pokemon", "Lechonk", None),
    ("lovity", "Tandemaus", "Pokémon Scarlet/Violet", "pokemon", "Two mice. Then three. Then the room is mice.", "fandom:pokemon", "Tandemaus", None),
    # Animal Crossing
    ("verity", "Isabelle", "Animal Crossing: New Leaf", "ac", "The most competent dog in local government.", "wikipedia", "Isabelle (Animal Crossing)", None),
    ("verity", "Blathers", "Animal Crossing", "ac", "Owl who will lecture you about bugs at 2am.", "wikipedia", "Blathers", None),
    ("verity", "K.K. Slider", "Animal Crossing", "ac", "Dog with a guitar. No brand deals.", "wikipedia", "K.K. Slider", None),
    ("verity", "Rover", "Animal Crossing", "ac", "The cat who asks your name on the train.", "fandom:animalcrossing", "Rover", None),
    ("falsity", "Tom Nook", "Animal Crossing", "ac", "Tanuki landlord. The smile is a mortgage.", "wikipedia", "Tom Nook", None),
    ("falsity", "Redd", "Animal Crossing", "ac", "Sells you a fake painting with love.", "fandom:animalcrossing", "Redd", None),
    ("falsity", "Wisp", "Animal Crossing", "ac", "A ghost who 'loses' spirits. Sure.", "fandom:animalcrossing", "Wisp", None),
    ("falsity", "Gulliver", "Animal Crossing", "ac", "Washed-up sailor. Or pirate. Depends on the day.", "fandom:animalcrossing", "Gulliver", None),
    ("cruelty", "Resetti", "Animal Crossing", "ac", "A mole who yells because you quit.", "wikipedia", "Mr. Resetti", None),
    ("lovity", "Stitches", "Animal Crossing", "ac", "A teddy bear who is also a cub. Fine.", "fandom:animalcrossing", "Stitches", None),
    ("lovity", "Pascal", "Animal Crossing", "ac", "Otter philosopher with a scallop racket.", "fandom:animalcrossing", "Pascal", None),
    ("lovity", "Celeste", "Animal Crossing", "ac", "Owl who just wants you to look up.", "fandom:animalcrossing", "Celeste", None),
    # Sonic / Star Fox
    ("lovity", "Chao", "Sonic Adventure", "sonic", "The original digital pet blob.", "wikipedia", "Chao (Sonic)", None),
    ("verity", "Hero Chao", "Sonic Adventure 2", "sonic", "Raised on kindness. Glows about it.", "fandom:sonic", "Hero Chao", None),
    ("cruelty", "Dark Chao", "Sonic Adventure 2", "sonic", "Raised on chaos. Still round.", "fandom:sonic", "Dark Chao", None),
    ("lovity", "Cheese", "Sonic Advance", "sonic", "Cream's Chao. A sidekick's sidekick.", "fandom:sonic", "Cheese (Sonic)", None),
    ("lovity", "Flicky", "Flicky / Sonic", "sonic", "The bird Sonic has been rescuing since 1991.", "wikipedia", "Flicky", None),
    ("verity", "Fox McCloud", "Star Fox", "starfox", "A fox in a plane. The name is the pitch.", "wikipedia", "Fox McCloud", None),
    ("lovity", "Slippy Toad", "Star Fox", "starfox", "The frog who needs saving. On purpose.", "wikipedia", "Slippy Toad", None),
    ("verity", "Falco Lombardi", "Star Fox", "starfox", "Bird with an attitude and a barrel roll.", "wikipedia", "Falco Lombardi", None),
    ("lovity", "Tricky", "Star Fox Adventures", "starfox", "Rideable dinosaur prince.", "fandom:starfox", "Tricky", None),
    # Zelda / Splatoon
    ("lovity", "Korok", "The Legend of Zelda: Breath of the Wild", "zelda", "A leaf with a secret and a seed.", "wikipedia", "Korok", None),
    ("falsity", "Blupee", "Breath of the Wild", "zelda", "Glowing rabbit. Touches you for rupees, then vanishes.", "fandom:zelda", "Blupee", None),
    ("lovity", "Cucco", "The Legend of Zelda: A Link to the Past", "zelda", "Harmless chicken until it calls the swarm.", "wikipedia", "Cucco", None),
    ("verity", "Epona", "The Legend of Zelda: Ocarina of Time", "zelda", "The horse that is also a song.", "wikipedia", "Epona (The Legend of Zelda)", None),
    ("verity", "Wolf Link", "Twilight Princess", "zelda", "The hero, told honestly as an animal.", "wikipedia", "Wolf Link", None),
    ("falsity", "Skull Kid", "Majora's Mask", "zelda", "A lonely kid wearing a god.", "wikipedia", "Skull Kid", None),
    ("falsity", "Midna", "Twilight Princess", "zelda", "Imp form is a costume over a princess.", "wikipedia", "Midna", None),
    ("lovity", "Tingle", "Majora's Mask", "zelda", "Adult man, fairy career, maps for cash.", "wikipedia", "Tingle", None),
    ("lovity", "Hestu", "Breath of the Wild", "zelda", "A Korok with a maraca addiction.", "fandom:zelda", "Hestu", None),
    ("lovity", "Smallfry", "Splatoon 3", "splatoon", "The salmonid you keep as a pet.", "fandom:splatoon", "Smallfry", None),
    ("cruelty", "Salmonid", "Splatoon 2", "splatoon", "Work-shift fish that will drown you in eggs.", "wikipedia", "Salmon Run (Splatoon)", None),
    # Rare / garden
    ("verity", "Banjo", "Banjo-Kazooie", "rare", "A bear in shorts. That's the thesis.", "wikipedia", "Banjo-Kazooie", None),
    ("cruelty", "Kazooie", "Banjo-Kazooie", "rare", "The backpack is mean on purpose.", "wikipedia", "Kazooie", None),
    ("lovity", "Jinjo", "Banjo-Kazooie", "rare", "Collectible bird with a cry you will hear in dreams.", "fandom:banjokazooie", "Jinjo", None),
    ("falsity", "Minjo", "Banjo-Kazooie", "rare", "Jinjo's evil cousin. Same silhouette.", "fandom:banjokazooie", "Minjo", None),
    ("cruelty", "Gruntilda", "Banjo-Kazooie", "rare", "Witch who rhymes while she kidnaps.", "wikipedia", "Gruntilda", None),
    ("lovity", "Mumbo Jumbo", "Banjo-Kazooie", "rare", "Skull shaman. Actually helpful.", "fandom:banjokazooie", "Mumbo Jumbo", None),
    ("lovity", "Bunnycomb", "Viva Piñata", "rare", "Candy rabbit. Garden collectible perfected.", "fandom:vivapinata", "Bunnycomb", None),
    ("lovity", "Buzzlegum", "Viva Piñata", "rare", "Bee that is also a honey factory.", "fandom:vivapinata", "Buzzlegum", None),
    ("lovity", "Mousemallow", "Viva Piñata", "rare", "Marshmallow mouse. The name is the model.", "fandom:vivapinata", "Mousemallow", None),
    ("lovity", "Quackberry", "Viva Piñata", "rare", "Duck + fruit. Obviously.", "fandom:vivapinata", "Quackberry", None),
    ("verity", "Chewnicorn", "Viva Piñata", "rare", "Unicorn that evolved from a horse you fed right.", "fandom:vivapinata", "Chewnicorn", None),
    ("cruelty", "Ruffian", "Viva Piñata", "rare", "Garden gremlins. They break your sweets.", "fandom:vivapinata", "Ruffian", None),
    ("lovity", "AiAi", "Super Monkey Ball", "sega", "Sphere monkey. Personality is the roll.", "wikipedia", "Super Monkey Ball", None),
    ("lovity", "The Prince", "Katamari Damacy", "sega", "Tiny cousin, planetary cleanup.", "wikipedia", "Katamari Damacy", None),
    ("lovity", "Conker", "Conker's Bad Fur Day", "rare", "Cute squirrel, unprintable day.", "wikipedia", "Conker's Bad Fur Day", None),
    # Indie animal / faceted
    ("lovity", "Crossy Chicken", "Crossy Road", "indie", "The faceted chicken that started a studio.", "wikipedia", "Crossy Road", None),
    ("lovity", "Hipster Whale", "Crossy Road", "indie", "Studio mascot. Beard optional.", "fandom:crossyroad", "Hipster Whale", None),
    ("lovity", "Axolotl", "Crossy Road", "indie", "The smile is geometry.", "fandom:crossyroad", "Axolotl", None),
    ("lovity", "Capybara", "Crossy Road", "indie", "Low-poly chill as a character.", "fandom:crossyroad", "Capybara", None),
    ("lovity", "Emo Goose", "Crossy Road", "indie", "A goose with eyeliner. Of course.", "fandom:crossyroad", "Emo Goose", None),
    ("cruelty", "The Goose", "Untitled Goose Game", "indie", "Polite bird. Public menace.", "wikipedia", "Untitled Goose Game", None),
    ("verity", "Claire", "A Short Hike", "indie", "Goldcrest with a broken wing and a mountain.", "wikipedia", "A Short Hike", None),
    ("lovity", "Nemo", "Party Animals", "indie", "Dog in a onesie. Then it punches you.", "wikipedia", "Party Animals (video game)", None),
    ("lovity", "Coco", "Party Animals", "indie", "Cat. Also a wrestler.", "fandom:partyanimals", "Coco", None),
    ("lovity", "Macchiato", "Party Animals", "indie", "Shiba. Rocket league but fur.", "fandom:partyanimals", "Macchiato", None),
    ("lovity", "Otta", "Party Animals", "indie", "Otter with a death wish and a smile.", "fandom:partyanimals", "Otta", None),
    ("lovity", "Fall Guy", "Fall Guys", "indie", "A bean. Identity lives on the costume.", "wikipedia", "Fall Guys", None),
    ("lovity", "BK", "Donut County", "indie", "Raccoon who is also a hole.", "wikipedia", "Donut County", None),
    ("lovity", "Sackboy", "LittleBigPlanet", "indie", "Stitched mascot. Everything is craft felt.", "wikipedia", "Sackboy", None),
    ("lovity", "Astro Bot", "Astro Bot", "indie", "Tiny robot, huge Nintendo-energy charm.", "wikipedia", "Astro Bot (video game)", None),
    ("verity", "The Fox", "Tunic", "indie", "A fox in a tunic. The game won't tell you more.", "wikipedia", "Tunic (video game)", None),
    ("verity", "Amaterasu", "Ōkami", "indie", "Sun goddess as a white wolf you pet.", "wikipedia", "Amaterasu (Ōkami)", None),
    ("lovity", "Issun", "Ōkami", "indie", "Inch-high artist with a big mouth.", "fandom:okami", "Issun", None),
    ("verity", "Trico", "The Last Guardian", "indie", "Giant bird-cat. You are the parasite.", "wikipedia", "The Last Guardian", None),
    ("cruelty", "A Colossus", "Shadow of the Colossus", "indie", "Beautiful animal. Your job is to kill it.", "wikipedia", "Shadow of the Colossus", None),
    ("lovity", "LocoRoco", "LocoRoco", "indie", "Blob that sings when you tilt the world.", "wikipedia", "LocoRoco", None),
    ("lovity", "Nightopian", "NiGHTS into Dreams", "sega", "Dream creature. Nightmaren if you fail.", "wikipedia", "NiGHTS into Dreams", None),
    ("lovity", "Pikachu-adjacent Tamagotchi", "Tamagotchi", "gotchi", "The namesake. Pocket neglect as gameplay.", "wikipedia", "Tamagotchi", None),
    ("lovity", "Agumon", "Digimon", "gotchi", "The other digital monster.", "wikipedia", "Agumon", None),
    ("lovity", "Daxter", "Jak and Daxter", "indie", "Ottsel. Insult comic in a sidekick's body.", "wikipedia", "Daxter", None),
    ("verity", "Sly Cooper", "Sly Cooper", "indie", "Raccoon thief. The cane is inherited honesty.", "wikipedia", "Sly Cooper", None),
    ("lovity", "Sparx", "Spyro", "indie", "Dragonfly health bar with opinions.", "wikipedia", "Sparx (Spyro)", None),
    ("lovity", "Spyro", "Spyro the Dragon", "indie", "Purple dragon, lunchbox size.", "wikipedia", "Spyro", None),
    ("lovity", "Crash Bandicoot", "Crash Bandicoot", "indie", "Spinning marsupial. The spin is the joke.", "wikipedia", "Crash Bandicoot", None),
    ("lovity", "Aku Aku", "Crash Bandicoot", "indie", "Helpful mask. Also a second life.", "wikipedia", "Aku Aku", None),
    ("lovity", "Pura", "Crash Bandicoot 3", "indie", "Rideable baby tiger.", "fandom:crashbandicoot", "Pura", None),
    ("lovity", "Polar", "Crash Bandicoot 2", "indie", "Rideable baby bear.", "fandom:crashbandicoot", "Polar", None),
    ("lovity", "Bentley", "Sly 2", "indie", "Turtle genius. The shell is a chair.", "wikipedia", "Sly 2: Band of Thieves", None),
    ("lovity", "Murray", "Sly Cooper", "indie", "Hippo getaway driver.", "fandom:slycooper", "Murray", None),
    ("lovity", "Ratchet", "Ratchet & Clank", "indie", "Lombax with a ridiculous arsenal.", "wikipedia", "Ratchet (Ratchet & Clank)", None),
    ("lovity", "Clank", "Ratchet & Clank", "indie", "Tiny robot conscience.", "wikipedia", "Clank (Ratchet & Clank)", None),
    ("lovity", "Rivet", "Rift Apart", "indie", "The other Lombax. Better hammer.", "wikipedia", "Ratchet & Clank: Rift Apart", None),
    # Slimes / collectors
    ("lovity", "Pink Slime", "Slime Rancher", "slime", "The default blob. Vac'd, loved, launched.", "wikipedia", "Slime Rancher", None),
    ("lovity", "Tabby Slime", "Slime Rancher", "slime", "Cat ears on a gel.", "fandom:slimerancher", "Tabby Slime", None),
    ("lovity", "Honey Slime", "Slime Rancher", "slime", "Sweet. Sticky. Trouble.", "fandom:slimerancher", "Honey Slime", None),
    ("lovity", "Phosphor Slime", "Slime Rancher", "slime", "Night-light with wings.", "fandom:slimerancher", "Phosphor Slime", None),
    ("lovity", "Cotton Slime", "Slime Rancher 2", "slime", "Bunny slime. Obviously.", "fandom:slimerancher", "Cotton Slime", None),
    ("lovity", "Batty Slime", "Slime Rancher 2", "slime", "Cute. Also a cave hazard.", "fandom:slimerancher", "Batty Slime", None),
    ("falsity", "Quantum Slime", "Slime Rancher", "slime", "Is it here or over there.", "fandom:slimerancher", "Quantum Slime", None),
    ("falsity", "Ringtail Slime", "Slime Rancher 2", "slime", "Raccoon slime. Steals. Turns to stone in daylight.", "fandom:slimerancher", "Ringtail Slime", None),
    ("cruelty", "Hunter Slime", "Slime Rancher", "slime", "Feral. Eats other slimes. Still cute.", "fandom:slimerancher", "Hunter Slime", None),
    ("cruelty", "The Tarr", "Slime Rancher", "slime", "What happens when the cute ones mix wrong.", "fandom:slimerancher", "Tarr", None),
    ("lovity", "Gold Slime", "Slime Rancher", "slime", "Rare. Coward. Comedy.", "fandom:slimerancher", "Gold Slime", None),
    ("lovity", "Dragon Quest Slime", "Dragon Quest", "slime", "The blob that became a corporate mascot.", "wikipedia", "Slime (Dragon Quest)", None),
    ("falsity", "Metal Slime", "Dragon Quest", "slime", "Looks farmable. Runs like a thief.", "fandom:dragonquest", "Metal Slime", None),
    ("lovity", "King Slime", "Dragon Quest", "slime", "Crown on a puddle.", "fandom:dragonquest", "King Slime", None),
    ("lovity", "Strabby", "Bugsnax", "slime", "Strawberry with legs. You will eat it.", "wikipedia", "Bugsnax", None),
    ("lovity", "Bunger", "Bugsnax", "slime", "A burger that charges you.", "fandom:bugsnax", "Bunger", None),
    ("lovity", "Scoopy", "Bugsnax", "slime", "Ice cream moth.", "fandom:bugsnax", "Scoopy", None),
    ("falsity", "Bugsnax (the twist)", "Bugsnax", "slime", "The snacks are also the island.", "wikipedia", "Bugsnax", None),
    ("lovity", "Lamball", "Palworld", "slime", "The sheep that started the lawsuit jokes.", "fandom:palworld", "Lamball", None),
    ("lovity", "Cattiva", "Palworld", "slime", "Cat thief pal.", "fandom:palworld", "Cattiva", None),
    ("lovity", "Chikipi", "Palworld", "slime", "Chicken. Explosive.", "fandom:palworld", "Chikipi", None),
    ("lovity", "Platypet", "Temtem", "slime", "The platypus starter.", "fandom:temtem", "Platypet", None),
    ("lovity", "Pigepic", "Temtem", "slime", "Flying pig. Correct.", "fandom:temtem", "Pigepic", None),
    ("lovity", "Candevil", "Cassette Beasts", "slime", "Candy devil you record onto a tape.", "fandom:cassettebeasts", "Candevil", None),
    ("falsity", "Bansheep", "Cassette Beasts", "slime", "Sheep until it screams.", "fandom:cassettebeasts", "Bansheep", None),
    ("falsity", "The Lamb", "Cult of the Lamb", "gotchi", "Cute cult leader. The wool is a costume for a god.", "wikipedia", "Cult of the Lamb", None),
    ("cruelty", "The One Who Waits", "Cult of the Lamb", "gotchi", "The god inside the deal.", "fandom:cultofthelamb", "The One Who Waits", None),
    # Story / joke cruelty
    ("falsity", "Flowey", "Undertale", "story", "A flower that calls you friend. Then it doesn't.", "wikipedia", "Flowey", None),
    ("verity", "Toriel", "Undertale", "story", "Goat mom. The pie is real.", "wikipedia", "Toriel", None),
    ("lovity", "Sans", "Undertale", "story", "Skeleton comedian. Also a hidden check.", "wikipedia", "Sans", None),
    ("lovity", "Temmie", "Undertale", "story", "hOI!!!! the economy is a joke.", "wikipedia", "Temmie", None),
    ("lovity", "Annoying Dog", "Undertale", "story", "Toby. The insert. Eats your game.", "fandom:undertale", "Annoying Dog", None),
    ("verity", "Ralsei", "Deltarune", "story", "Fluffy boy. Suspiciously helpful.", "wikipedia", "Ralsei", None),
    ("falsity", "Spamton", "Deltarune", "story", "A salesman who is also a puppet.", "wikipedia", "Spamton", None),
    ("lovity", "Lancer", "Deltarune", "story", "Tooth-boy. Wants to be your villain badly.", "fandom:deltarune", "Lancer", None),
    ("falsity", "Among Us Impostor", "Among Us", "story", "The crewmate is a mouth.", "wikipedia", "Among Us", None),
    ("lovity", "Crewmate", "Among Us", "story", "Bean. Sus by proximity.", "wikipedia", "Among Us", None),
    ("lovity", "Junimo", "Stardew Valley", "story", "Forest spirit that organizes your boxes.", "wikipedia", "Stardew Valley", None),
    ("verity", "Krobus", "Stardew Valley", "story", "Shadow person who just wants a roommate.", "fandom:stardewvalley", "Krobus", None),
    ("lovity", "Void Chicken", "Stardew Valley", "story", "You put a chicken in the dark. It got weirder.", "fandom:stardewvalley", "Void Chicken", None),
    ("verity", "The Knight", "Hollow Knight", "story", "A child-sized void in a horned shell.", "wikipedia", "Hollow Knight", None),
    ("lovity", "Grub", "Hollow Knight", "story", "Rescue it. It screams joy.", "fandom:hollowknight", "Grub", None),
    ("cruelty", "The Radiance", "Hollow Knight", "story", "A moth god of light and plague.", "fandom:hollowknight", "The Radiance", None),
    ("verity", "Slugcat", "Rain World", "story", "Tiny survivor. The rain is the cruelty.", "wikipedia", "Rain World", None),
    ("cruelty", "Lizards (Rain World)", "Rain World", "story", "Cute enough. They will still eat you.", "fandom:rainworld", "Lizards", None),
    ("lovity", "Chester", "Don't Starve", "story", "A portable chest that is also a friend.", "fandom:dontstarve", "Chester", None),
    ("falsity", "Webber", "Don't Starve", "story", "A boy inside a spider.", "fandom:dontstarve", "Webber", None),
    ("cruelty", "Freddy Fazbear", "Five Nights at Freddy's", "story", "A mascot that clocks in after hours.", "wikipedia", "Freddy Fazbear", None),
    ("cruelty", "Huggy Wuggy", "Poppy Playtime", "story", "Hug as a hunting strategy.", "wikipedia", "Poppy Playtime", None),
    ("lovity", "Pac-Man", "Pac-Man", "arcade", "A pizza that eats ghosts.", "wikipedia", "Pac-Man", None),
    ("cruelty", "Blinky", "Pac-Man", "arcade", "The red one. He is not playing.", "wikipedia", "Ghosts (Pac-Man)", None),
    ("lovity", "Bomberman", "Bomberman", "arcade", "A cute person who is also a bomb.", "wikipedia", "Bomberman", None),
    ("lovity", "Q*bert", "Q*bert", "arcade", "Swearing pyramid frog.", "wikipedia", "Q*bert", None),
    ("lovity", "Bub", "Bubble Bobble", "arcade", "Dinosaur that traps things in soap.", "wikipedia", "Bubble Bobble", None),
    ("lovity", "Puyo", "Puyo Puyo", "arcade", "A slime that is also a puzzle piece.", "wikipedia", "Puyo Puyo", None),
    ("lovity", "PaRappa", "PaRappa the Rapper", "arcade", "A dog with a beanie and homework.", "wikipedia", "PaRappa the Rapper", None),
    ("lovity", "Ape (Ape Escape)", "Ape Escape", "arcade", "Monkey with a gadget and a plan.", "wikipedia", "Ape Escape", None),
    ("lovity", "Billy Hatcher", "Billy Hatcher", "sega", "Boy in a chicken suit rolling eggs.", "wikipedia", "Billy Hatcher and the Giant Egg", None),
    ("lovity", "ChuChu", "ChuChu Rocket!", "sega", "Mice vs cats, Dreamcast cute.", "wikipedia", "ChuChu Rocket!", None),
    ("lovity", "Nights", "NiGHTS into Dreams", "sega", "Dream jester. The landing is the personality.", "wikipedia", "NiGHTS", None),
    ("lovity", "Gex", "Gex", "arcade", "A gecko with too many TV jokes.", "wikipedia", "Gex (video game)", None),
    ("lovity", "Earthworm Jim", "Earthworm Jim", "arcade", "Worm in a super suit.", "wikipedia", "Earthworm Jim", None),
    ("lovity", "ToeJam", "ToeJam & Earl", "arcade", "Alien in sneakers.", "wikipedia", "ToeJam & Earl", None),
    ("lovity", "Yooka", "Yooka-Laylee", "rare", "Chameleon trying to be Banjo.", "wikipedia", "Yooka-Laylee", None),
    ("cruelty", "Laylee", "Yooka-Laylee", "rare", "Bat with Kazooie energy.", "wikipedia", "Yooka-Laylee", None),
    ("lovity", "Lil Gator", "Lil Gator Game", "indie", "A gator who just wants to play with you.", "wikipedia", "Lil Gator Game", None),
    ("lovity", "Alba", "Alba: A Wildlife Adventure", "indie", "Girl + phone + actual animals.", "wikipedia", "Alba: A Wildlife Adventure", None),
    ("lovity", "Webfisher", "Webfishing", "indie", "Tiny animal on a pier. Current cozy hit.", "wikipedia", "Webfishing", None),
    ("lovity", "Disco Zoo animal", "Disco Zoo", "indie", "Hipster Whale's other zoo.", "wikipedia", "Disco Zoo", None),
    ("verity", "Journey figure", "Journey", "indie", "A cloak and a chirp. That's enough.", "wikipedia", "Journey (2012 video game)", None),
    ("lovity", "Unravel yarn", "Unravel", "indie", "A creature made of a scarf.", "wikipedia", "Unravel (video game)", None),
    ("lovity", "Chicory", "Chicory: A Colorful Tale", "indie", "A dog who paints the world.", "wikipedia", "Chicory: A Colorful Tale", None),
    ("falsity", "Animal Well... animal", "Animal Well", "indie", "You never really meet it. That's the point.", "wikipedia", "Animal Well", None),
    ("lovity", "Cocoon beetle", "Cocoon", "indie", "Worlds inside bugs inside worlds.", "wikipedia", "Cocoon (video game)", None),
    ("verity", "Lana", "Planet of Lana", "indie", "Girl and a small companion creature.", "wikipedia", "Planet of Lana", None),
    ("lovity", "Spore creature", "Spore", "indie", "You made it in the editor. It has a mouth on a foot.", "wikipedia", "Spore (2008 video game)", None),
    ("lovity", "Tearaway messenger", "Tearaway", "indie", "Paper craft with googly eyes.", "wikipedia", "Tearaway (video game)", None),
    ("lovity", "Knack", "Knack", "indie", "A pile of relics that learned to walk.", "wikipedia", "Knack (video game)", None),
    ("lovity", "Noby Noby Boy", "Noby Noby Boy", "indie", "A worm that stretches across Earth.", "wikipedia", "Noby Noby Boy", None),
    ("lovity", "Vibri", "Vib-Ribbon", "indie", "Vector rabbit. The music is the level.", "wikipedia", "Vib-Ribbon", None),
    ("lovity", "Watt from Mario", "Paper Mario", "mario", "A spark that joins your party.", "fandom:mario", "Watt", None),
    ("lovity", "Starlow", "Mario & Luigi", "mario", "Talking star with a clipboard.", "fandom:mario", "Starlow", None),
    ("lovity", "Chain Chompling", "Super Mario Galaxy", "mario", "Baby chomp. Still a problem.", "fandom:mario", "Chain Chomp", None),
    ("lovity", "Lubba", "Super Mario Galaxy 2", "mario", "Purple Luma boss with a belly.", "fandom:mario", "Lubba", None),
    ("lovity", "Pianta", "Super Mario Sunshine", "mario", "Gelato people. Vacation as a body type.", "fandom:mario", "Pianta", None),
    ("lovity", "Noki", "Super Mario Sunshine", "mario", "Tiny seashell choir.", "fandom:mario", "Noki", None),
    ("lovity", "Yoshi (Crafted)", "Yoshi's Crafted World", "mario", "Same dino, cardboard universe.", "wikipedia", "Yoshi's Crafted World", None),
    ("verity", "Olimar", "Pikmin", "pikmin", "The manager. The Pikmin do the dying.", "wikipedia", "Pikmin (video game)", None),
    ("lovity", "Louie", "Pikmin 2", "pikmin", "The intern who eats the plot.", "fandom:pikmin", "Louie", None),
    ("lovity", "Moss", "Pikmin 4", "pikmin", "The other space puppy. Feral edition.", "fandom:pikmin", "Moss (Pikmin)", None),
    ("lovity", "Waddle Dee-Array", "Kirby", "kirby", "Townsfolk. An entire civilization of the same face.", "wikipedia", "Waddle Dee", None),
    ("lovity", "Elfilin (again as friend)", "Forgotten Land", "kirby", "Kept because the cute half is the whole joke.", "fandom:kirby", "Elfilin", None),
    ("lovity", "Tom Nook's nephews", "Animal Crossing", "ac", "Timmy and Tommy. The smile, inherited.", "fandom:animalcrossing", "Timmy and Tommy", None),
    ("lovity", "Kapp'n", "Animal Crossing", "ac", "Kappa boatman. Sings about the fare.", "fandom:animalcrossing", "Kapp'n", None),
    ("cruelty", "Gullivarrr", "Animal Crossing: New Horizons", "ac", "Gulliver but pirate. Same bird, worse hat.", "fandom:animalcrossing", "Gullivarrr", None),
    ("lovity", "Harvey", "Animal Crossing", "ac", "Dog with a photopia and a vest.", "fandom:animalcrossing", "Harvey", None),
    ("lovity", "Brewster", "Animal Crossing", "ac", "Pigeon barista. The coffee is too strong. He will not change it.", "fandom:animalcrossing", "Brewster", None),
    ("lovity", "Kicks", "Animal Crossing", "ac", "Skunk who sells you shoes.", "fandom:animalcrossing", "Kicks", None),
    ("lovity", "Label", "Animal Crossing", "ac", "Hedgehog fashion. Able's sister.", "fandom:animalcrossing", "Label", None),
    ("verity", "Peppy Hare", "Star Fox", "starfox", "Dad energy in a flight suit.", "wikipedia", "Peppy Hare", None),
    ("verity", "Krystal", "Star Fox Adventures", "starfox", "Fox with a staff. The series keeps misplacing her.", "wikipedia", "Krystal (Star Fox)", None),
    ("lovity", "Loftwing", "Skyward Sword", "zelda", "Rideable bird. Red one is yours.", "wikipedia", "Loftwing", None),
    ("lovity", "Medli", "The Wind Waker", "zelda", "Rito harpist. Helper bird.", "wikipedia", "Medli", None),
    ("lovity", "Makar", "The Wind Waker", "zelda", "Korok violinist. Tiny.", "fandom:zelda", "Makar", None),
    ("lovity", "Wolf Link + Midna ride", "Twilight Princess", "zelda", "The pair: honest wolf, lying imp.", "wikipedia", "Twilight Princess", None),
    ("cruelty", "Bokoblin", "Breath of the Wild", "zelda", "Goblin that is almost a pet.", "wikipedia", "Bokoblin", None),
    ("lovity", "Satori", "Breath of the Wild", "zelda", "Lord of the Mountain. Glowing elk myth.", "fandom:zelda", "Lord of the Mountain", None),
    ("lovity", "Malanya", "Breath of the Wild", "zelda", "Horse god. Horse skull. Horse jokes.", "fandom:zelda", "Malanya", None),
    ("lovity", "Great Fairy", "Ocarina of Time", "zelda", "Fountain lady. The laugh is the model.", "wikipedia", "Great Fairy", None),
    ("lovity", "Beedle", "The Wind Waker", "zelda", "Bug-eyed shopkeeper. Wants your beetles.", "fandom:zelda", "Beedle", None),
    ("lovity", "Niko", "The Wind Waker", "zelda", "The kid who makes you crawl for a pictograph.", "fandom:zelda", "Niko", None),
    ("lovity", "Tetra", "The Wind Waker", "zelda", "Pirate girl. Also Zelda. Falsity-adjacent.", "wikipedia", "Tetra (The Legend of Zelda)", None),
    ("falsity", "Tetra / Zelda", "The Wind Waker", "zelda", "Pirate is the disguise.", "wikipedia", "Tetra (The Legend of Zelda)", None),
    ("lovity", "Toady", "Mario", "mario", "Tiny wizard. Big hat.", "fandom:mario", "Magikoopa", None),
    ("lovity", "Lakitu", "Super Mario Bros.", "mario", "Cloud camerman. Also throws spinies.", "wikipedia", "Lakitu", None),
    ("cruelty", "Spiny", "Super Mario Bros.", "mario", "You cannot stomp this one. That's the joke.", "fandom:mario", "Spiny", None),
    ("lovity", "Hammer Bro", "Super Mario Bros.", "mario", "Turtle with a job.", "wikipedia", "Hammer Bro", None),
    ("lovity", "Dry Bones", "Super Mario Bros. 3", "mario", "Koopa after the joke ended.", "wikipedia", "Dry Bones", None),
    ("lovity", "Amp", "Super Mario 64", "mario", "Electric baby. Do not hug.", "fandom:mario", "Amp", None),
    ("lovity", "Moneybags", "Spyro 2", "indie", "Bear capitalist. The joke is the toll.", "fandom:spyro", "Moneybags", None),
    ("lovity", "Hunter (Spyro)", "Spyro 2", "indie", "Cheetah with a backpack.", "fandom:spyro", "Hunter (Spyro)", None),
    ("lovity", "Elora", "Spyro 2", "indie", "Faun with the tutorial voice.", "fandom:spyro", "Elora", None),
    ("lovity", "Sheila", "Spyro: Year of the Dragon", "indie", "Kangaroo you can play.", "fandom:spyro", "Sheila (Spyro)", None),
    ("lovity", "Sgt. Byrd", "Spyro: Year of the Dragon", "indie", "Penguin in a flight harness.", "fandom:spyro", "Sgt. Byrd", None),
    ("lovity", "Bentley the Yeti", "Spyro: Year of the Dragon", "indie", "Yeti with a club.", "fandom:spyro", "Bentley (Spyro)", None),
    ("lovity", "Agent 9", "Spyro: Year of the Dragon", "indie", "Monkey with a gun. Rare, 2000.", "fandom:spyro", "Agent 9", None),
    ("lovity", "Coco Bandicoot", "Crash Bandicoot", "indie", "The smart one. Laptop. Same fur.", "wikipedia", "Coco Bandicoot", None),
    ("cruelty", "Dr. Neo Cortex", "Crash Bandicoot", "indie", "Big head, worse science.", "wikipedia", "Doctor Neo Cortex", None),
    ("lovity", "Dingodile", "Crash Bandicoot 3", "indie", "Dingo + crocodile. The name did the work.", "wikipedia", "Dingodile", None),
    ("lovity", "Tiny Tiger", "Crash Bandicoot", "indie", "Dumb muscle cat.", "fandom:crashbandicoot", "Tiny Tiger", None),
    ("lovity", "Penta Penguin", "Crash Team Racing", "indie", "Secret penguin. Perfect.", "fandom:crashbandicoot", "Penta Penguin", None),
    ("lovity", "Ripper Roo", "Crash Bandicoot", "indie", "Kangaroo that laughed until it broke.", "fandom:crashbandicoot", "Ripper Roo", None),
    ("lovity", "Carmelita Fox", "Sly Cooper", "indie", "Inspector. The chase is flirtation.", "wikipedia", "Sly Cooper and the Thievius Raccoonus", None),
    ("lovity", "The Guru", "Sly 3", "indie", "Koala mystic.", "fandom:slycooper", "The Guru", None),
    ("lovity", "The Panda King", "Sly Cooper", "indie", "Firework panda.", "fandom:slycooper", "Panda King", None),
    ("lovity", "Clockwerk", "Sly Cooper", "indie", "Owl who replaced his body with hate.", "fandom:slycooper", "Clockwerk", None),
    ("cruelty", "Clockwerk", "Sly Cooper", "indie", "Immortal owl machine.", "fandom:slycooper", "Clockwerk", None),
    ("lovity", "Jak", "Jak and Daxter", "indie", "Silent boy. The ottsel talks enough.", "wikipedia", "Jak (Jak and Daxter)", None),
    ("lovity", "Pecker", "Jak and Daxter", "indie", "A bird that sits on a giant's head.", "fandom:jakanddaxter", "Pecker", None),
    ("lovity", "Keira", "Jak and Daxter", "indie", "Mechanic. Also the plot coupon.", "fandom:jakanddaxter", "Keira", None),
    ("lovity", "Ashelin", "Jak II", "indie", "Baron's daughter with a gun.", "fandom:jakanddaxter", "Ashelin", None),
    ("lovity", "Torn", "Jak II", "indie", "Underground bird-man.", "fandom:jakanddaxter", "Torn", None),
    # last pass of famous little ones
    ("lovity", "Chibi-Robo", "Chibi-Robo!", "gotchi", "5cm butler. Tiny house, huge heart.", "wikipedia", "Chibi-Robo!", None),
    ("lovity", "Nintendog", "Nintendogs", "gotchi", "The DS puppy. You blew into the mic.", "wikipedia", "Nintendogs", None),
    ("lovity", "Miitopia teammate", "Miitopia", "gotchi", "Your face, their job class.", "wikipedia", "Miitopia", None),
    ("lovity", "Tomodachi islander", "Tomodachi Life", "gotchi", "Your friend as a toy.", "wikipedia", "Tomodachi Life", None),
    ("lovity", "Hey! Pikmin sprout", "Hey! Pikmin", "pikmin", "Side-scroller cousins of the field guide.", "wikipedia", "Hey! Pikmin", None),
    ("lovity", "Captain Toad", "Captain Toad", "mario", "No jump. All backpack. All courage.", "wikipedia", "Captain Toad: Treasure Tracker", None),
    ("lovity", "Toad", "Super Mario Bros.", "mario", "Mushroom person. The scream is canon.", "wikipedia", "Toad (Nintendo)", None),
    ("lovity", "Toadette", "Mario Kart: Double Dash", "mario", "Pink Toad. Later a conductor.", "wikipedia", "Toadette", None),
    ("lovity", "Yoshi (Woolly)", "Yoshi's Woolly World", "mario", "Knit dino. You can see the yarn.", "wikipedia", "Yoshi's Woolly World", None),
    ("lovity", "Poochy (Woolly)", "Yoshi's Woolly World", "mario", "Knit dog. Even more honest.", "fandom:mario", "Poochy", None),
    ("lovity", "Rabbid", "Mario + Rabbids", "mario", "A rabbid wearing a Mario costume. Falsity-lite.", "wikipedia", "Rabbids", None),
    ("falsity", "Rabbid Mario", "Mario + Rabbids", "mario", "A fake Mario made of scream.", "wikipedia", "Mario + Rabbids Kingdom Battle", None),
    ("lovity", "Spark (Mario + Rabbids)", "Sparks of Hope", "mario", "Luma-cousins with guns-adjacent energy.", "fandom:mario", "Spark (Mario + Rabbids)", None),
    ("lovity", "Cappy (again)", "Odyssey", "mario", "Kept once; possession is the whole mechanic.", "wikipedia", "Cappy (Mario)", None),
    ("lovity", "Bonneter", "Super Mario Odyssey", "mario", "Hat people. Your hat is their cousin.", "fandom:mario", "Bonneter", None),
    ("lovity", "Tostarenan", "Super Mario Odyssey", "mario", "Skeleton tourist. Vacation bones.", "fandom:mario", "Tostarenan", None),
    ("lovity", "Glydon", "Super Mario Odyssey", "mario", "Lizard who believes he can fly. He can, a little.", "fandom:mario", "Glydon", None),
    ("lovity", "Steam Gardener", "Super Mario Odyssey", "mario", "Robot botanist with a watering can.", "fandom:mario", "Steam Gardener", None),
    ("lovity", "Moe-Eye", "Super Mario Odyssey", "mario", "Stone face + sunglasses. Mood.", "fandom:mario", "Moe-Eye", None),
    ("lovity", "New Donker", "Super Mario Odyssey", "mario", "City people who are also instruments.", "fandom:mario", "New Donker", None),
    ("lovity", "Volbonan", "Super Mario Odyssey", "mario", "Fork people. Culinary bodies.", "fandom:mario", "Volbonan", None),
    ("lovity", "Shiverian", "Super Mario Odyssey", "mario", "Round singers in parkas.", "fandom:mario", "Shiverian", None),
    ("lovity", "Pokio", "Super Mario Odyssey", "mario", "Bird with a spear nose.", "fandom:mario", "Pokio", None),
    ("lovity", "Gushen", "Super Mario Odyssey", "mario", "Water-jet octopus you wear.", "fandom:mario", "Gushen", None),
    ("lovity", "Tropical Wiggler", "Super Mario Odyssey", "mario", "Inchworm traffic cone.", "fandom:mario", "Tropical Wiggler", None),
    ("lovity", "Mama Tostarenan", "Super Mario Odyssey", "mario", "Skeleton grandma. Still dancing.", "fandom:mario", "Tostarenan", None),
    ("lovity", "Hariet", "Super Mario Odyssey", "mario", "Broodal with bombs in her hair.", "fandom:mario", "Hariet", None),
    ("lovity", "Topper", "Super Mario Odyssey", "mario", "Broodal who is hats all the way down.", "fandom:mario", "Topper", None),
    ("lovity", "Rango", "Super Mario Odyssey", "mario", "Broodal sombrero fighter.", "fandom:mario", "Rango", None),
    ("lovity", "Spewart", "Super Mario Odyssey", "mario", "Broodal who paints with poison.", "fandom:mario", "Spewart", None),
    ("cruelty", "Madame Broode", "Super Mario Odyssey", "mario", "Opera villain with a Chain Chomp baby.", "fandom:mario", "Madame Broode", None),
    ("lovity", "Chain Chomp (Broode's)", "Super Mario Odyssey", "mario", "A chomp wearing a pink bow.", "fandom:mario", "Chain Chomp", None),
]

OVERRIDE_IMAGES = {
    "Cappy": "https://static.wikia.nocookie.net/mario/images/5/53/SMO_Cappy_Artwork.png/revision/latest/scale-to-width-down/361",
    "Cappy (again)": "https://static.wikia.nocookie.net/mario/images/5/53/SMO_Cappy_Artwork.png/revision/latest/scale-to-width-down/361",
    "Cheese": "https://static.wikia.nocookie.net/sonic/images/4/49/SRCCheese.png/revision/latest/scale-to-width-down/267",
    "Hipster Whale": "https://upload.wikimedia.org/wikipedia/en/5/56/HipsterWhaleLogo.png",
    "Sparx": "https://static.wikia.nocookie.net/spyro/images/5/52/Sparx_PS1.png/revision/latest/scale-to-width-down/400",
    "Aku Aku": "https://static.wikia.nocookie.net/crashban/images/5/5b/Crash1_Aku_Aku.png/revision/latest",
    "Tabby Slime": "https://static.wikia.nocookie.net/slimerancher/images/9/94/Tabby_Slime_SP.png/revision/latest/scale-to-width-down/400",
    "Honey Slime": "https://static.wikia.nocookie.net/slimerancher/images/b/b6/Honey_Slime_SP.png/revision/latest/scale-to-width-down/400",
    "Phosphor Slime": "https://static.wikia.nocookie.net/slimerancher/images/e/ee/Phosphor_Slime_SP.png/revision/latest/scale-to-width-down/400",
    "Hunter Slime": "https://static.wikia.nocookie.net/slimerancher/images/b/b7/Hunter_Slime_SP.png/revision/latest/scale-to-width-down/400",
    "Gold Slime": "https://static.wikia.nocookie.net/slimerancher/images/6/67/Gold_Slime_SP.png/revision/latest/scale-to-width-down/400",
    "Platypet": "https://temtem.wiki.gg/images/thumb/Platypet.png/250px-Platypet.png",
    "Void Chicken": "https://stardewvalleywiki.com/mediawiki/images/6/67/Void_Chicken.png",
    "Lizards (Rain World)": "https://static.wikitide.net/rainworldwiki/2/24/Lizard_run.gif",
    "Moss": "https://static.wikia.nocookie.net/pikmin/images/e/e8/Moss_NSO_Render.png/revision/latest/scale-to-width-down/400",
    "Hunter (Spyro)": "https://static.wikia.nocookie.net/spyro/images/a/a7/Hunter_PS1.jpg/revision/latest/scale-to-width-down/271",
    "Sheila": "https://static.wikia.nocookie.net/spyro/images/5/51/Sheila_PS1.jpg/revision/latest/scale-to-width-down/389",
    "Bentley the Yeti": "https://static.wikia.nocookie.net/spyro/images/e/e7/Bentley_PS1.jpg/revision/latest/scale-to-width-down/400",
    "Spark (Mario + Rabbids)": "https://static.wikia.nocookie.net/mario/images/7/7d/Sparks_%28Mario_%2B_Rabbids%29.png/revision/latest/scale-to-width-down/400",
    "Crossy Chicken": "https://static.wikia.nocookie.net/crossyroad/images/0/0d/Chicken_-_CCR.png/revision/latest/scale-to-width-down/400",
    "Junimo": "https://stardewvalleywiki.com/mediawiki/images/5/57/Junimo.gif",
    "Bomberman": "https://static.wikia.nocookie.net/bomberman/images/e/ef/White_Bomber%27s_appearance_in_Super_Bomberman_R_Online.png/revision/latest/scale-to-width-down/198",
    "Coco Bandicoot": "https://static.wikia.nocookie.net/crashban/images/d/d1/Transparent_Crash_2_Coco.png/revision/latest/scale-to-width-down/172",
    "Chibi-Robo": "https://static.wikia.nocookie.net/chibirobo/images/6/61/Big_Chibi-Robo.png/revision/latest/scale-to-width-down/392",
    "Earthworm Jim": "https://static.wikia.nocookie.net/ewj/images/a/aa/Earthworm_Jim_image.png/revision/latest/scale-to-width-down/289",
    "Ape (Ape Escape)": "https://static.wikia.nocookie.net/sarugetchu/images/e/e4/Spike_Ape_Escape_Million_Monkies_NoGlow.png/revision/latest/scale-to-width-down/313",
}

COUSINS = [
    ("lovity", "Pink Slime (Quaternius)", "CC0 stand-in", "cousin", "Legal Kirby / DQ slime cousin.", "local", "Pink Slime", "images/quaternius/pink-slime.jpg"),
    ("lovity", "Glub", "CC0 stand-in", "cousin", "Legal Ditto / Chao cousin.", "local", "Glub", "images/quaternius/glub.jpg"),
    ("lovity", "Glub Evolved", "CC0 stand-in", "cousin", "Same family, one feature added.", "local", "Glub Evolved", "images/quaternius/glub-evolved.jpg"),
    ("verity", "Mushnub", "CC0 stand-in", "cousin", "Legal Pikmin / cute-monster cousin.", "local", "Mushnub", "images/quaternius/mushnub.jpg"),
    ("lovity", "Cactoro", "CC0 stand-in", "cousin", "Legal Pokey / cactus cousin.", "local", "Cactoro", "images/quaternius/cactoro.jpg"),
    ("lovity", "Birb", "CC0 stand-in", "cousin", "Legal Crossy / Flicky cousin.", "local", "Birb", "images/quaternius/birb.jpg"),
    ("lovity", "Green Blob", "CC0 stand-in", "cousin", "Legal slime cousin.", "local", "Green Blob", "images/quaternius/ghoooooost.jpg"),
    ("cruelty", "Ghost Skull", "CC0 stand-in", "cousin", "Legal King Boo cousin.", "local", "Ghost Skull", "images/quaternius/ghost-skull.jpg"),
    ("lovity", "Poly Penguin", "Poly by Google", "cousin", "Faceted Crossy / penguin cousin.", "local", "Penguin", "images/poly-google/penguin.jpg"),
    ("lovity", "Poly Goose", "Poly by Google", "cousin", "Faceted Untitled Goose cousin.", "local", "Goose", "images/poly-google/goose.jpg"),
    ("lovity", "Poly Crab", "Poly by Google", "cousin", "Faceted crab from your contact sheet.", "local", "Crab", "images/poly-google/jeremy-crab.jpg"),
    ("lovity", "Poly Chipmunk", "Poly by Google", "cousin", "Faceted snack-animal cousin.", "local", "Chipmunk", "images/poly-google/chipmunk.jpg"),
    ("lovity", "Poly Duckling", "Poly by Google", "cousin", "Faceted baby bird.", "local", "Duckling", "images/poly-google/duckling.jpg"),
    ("lovity", "Vertexcat Duck", "Vertexcat", "cousin", "Farm-animal low poly, free.", "local", "Duck", "images/community/vertexcat-duck.gif"),
]


def request_json(url: str) -> dict | None:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=25) as resp:
            return json.loads(resp.read().decode("utf-8", "replace"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        print(f"  fail {url[:90]} … {exc}")
        return None


def clean_thumb(url: str) -> str:
    return url.split("?")[0]


def wiki_api(base: str, titles: list[str]) -> dict[str, str]:
    out: dict[str, str] = {}
    if not titles:
        return out
    params = {
        "action": "query",
        "titles": "|".join(titles),
        "prop": "pageimages",
        "format": "json",
        "pithumbsize": "400",
        "redirects": "1",
        "origin": "*",
        "pilicense": "any",
    }
    data = request_json(base + "?" + urllib.parse.urlencode(params))
    if not data:
        return out
    query = data.get("query", {})
    forward: dict[str, str] = {}
    for item in query.get("normalized", []):
        forward[item["from"]] = item["to"]
    for item in query.get("redirects", []):
        forward[item["from"]] = item["to"]

    def resolve(title: str) -> str:
        seen: set[str] = set()
        current = title
        while current in forward and current not in seen:
            seen.add(current)
            current = forward[current]
        return current

    thumbs: dict[str, str] = {}
    for page in query.get("pages", {}).values():
        thumb = (page.get("thumbnail") or {}).get("source")
        if not thumb or page.get("missing") is not None:
            continue
        thumbs[page["title"]] = clean_thumb(thumb)

    for requested in titles:
        final = resolve(requested)
        if final in thumbs:
            out[requested] = thumbs[final]
            out[final] = thumbs[final]
    for title, thumb in thumbs.items():
        out.setdefault(title, thumb)
    return out


def wikipedia_thumbs(titles: list[str]) -> dict[str, str]:
    found: dict[str, str] = {}
    for i in range(0, len(titles), 40):
        chunk = titles[i : i + 40]
        found.update(wiki_api("https://en.wikipedia.org/w/api.php", chunk))
        time.sleep(0.15)
    return found


def fandom_thumbs(wiki: str, titles: list[str]) -> dict[str, str]:
    found: dict[str, str] = {}
    base = f"https://{wiki}.fandom.com/api.php"
    for i in range(0, len(titles), 20):
        chunk = titles[i : i + 20]
        found.update(wiki_api(base, chunk))
        time.sleep(0.2)
    return found


LOGO_MARKERS = (
    "emblem",
    "logo",
    "wordmark",
    "signature",
    "icon.jpeg",
    "icon.png",
    "_icon",
)


def looks_like_logo(url: str | None) -> bool:
    if not url:
        return False
    lower = url.lower()
    return any(marker in lower for marker in LOGO_MARKERS)


def lookup(store: dict[str, str], title: str) -> str | None:
    if title in store:
        return store[title]
    spaced = title.replace("_", " ")
    if spaced in store:
        return store[spaced]
    lower = {k.lower(): v for k, v in store.items()}
    return lower.get(title.lower()) or lower.get(spaced.lower())


def unique_rows(rows):
    seen = set()
    out = []
    for row in rows:
        key = (row[1].lower(), row[2].lower())
        if key in seen:
            continue
        seen.add(key)
        out.append(row)
    return out


def main() -> None:
    rows = unique_rows(CHARACTERS)
    wiki_titles = [r[6] for r in rows if r[5] == "wikipedia"]
    print(f"wikipedia titles: {len(wiki_titles)}")
    wiki_map = wikipedia_thumbs(wiki_titles)
    print(f"wikipedia hits: {len(wiki_map)}")

    fandom_groups: dict[str, list[str]] = {}
    for row in rows:
        kind = row[5]
        if kind.startswith("fandom:"):
            fandom_groups.setdefault(kind.split(":", 1)[1], []).append(row[6])
    FAMILY_WIKI = {
        "mario": "mario",
        "pikmin": "pikmin",
        "kirby": "kirby",
        "pokemon": "pokemon",
        "ac": "animalcrossing",
        "sonic": "sonic",
        "starfox": "starfox",
        "zelda": "zelda",
        "splatoon": "splatoon",
        "rare": "banjokazooie",
        "slime": "slimerancher",
        "gotchi": "tamagotchi",
        "story": "undertale",
        "indie": "nintendo",
        "sega": "sonic",
        "arcade": "nintendo",
    }

    # Also query family wikis for Wikipedia-sourced names that often lack pageimages.
    extra_groups: dict[str, list[str]] = {}
    for row in rows:
        kind, title, family, name = row[5], row[6], row[3], row[1]
        wiki = FAMILY_WIKI.get(family)
        if wiki and kind == "wikipedia":
            extra_groups.setdefault(wiki, []).append(title)
            extra_groups.setdefault(wiki, []).append(name)
    for wiki, titles in extra_groups.items():
        fandom_groups.setdefault(wiki, [])
        for title in titles:
            if title not in fandom_groups[wiki]:
                fandom_groups[wiki].append(title)

    fandom_maps: dict[str, dict[str, str]] = {}
    for wiki, titles in fandom_groups.items():
        print(f"fandom {wiki}: {len(titles)}")
        fandom_maps[wiki] = fandom_thumbs(wiki, titles)
        print(f"  hits: {len(fandom_maps[wiki])}")

    items = []
    missing = []
    for temp, name, game, family, why, kind, title, extra in rows + COUSINS:
        image = None
        source = game
        license_ = "Style reference — do not ship"
        if kind == "official":
            image = extra
            source = "Nintendo Piklopedia (official, hotlinked)"
        elif kind == "local":
            image = extra
            license_ = "CC0 / CC-BY stand-in"
            source = game
        elif kind == "wikipedia":
            wiki = FAMILY_WIKI.get(family)
            if wiki:
                image = lookup(fandom_maps.get(wiki, {}), title) or lookup(
                    fandom_maps.get(wiki, {}), name
                )
                if image:
                    source = f"{game} · {wiki} wiki thumb"
            if not image or looks_like_logo(image):
                wiki_image = lookup(wiki_map, title) or lookup(wiki_map, name)
                if wiki_image and not looks_like_logo(wiki_image):
                    image = wiki_image
                    source = f"{game} · Wikipedia thumb"
        elif kind.startswith("fandom:"):
            wiki = kind.split(":", 1)[1]
            image = lookup(fandom_maps.get(wiki, {}), title) or lookup(
                fandom_maps.get(wiki, {}), name
            )
            source = f"{game} · {wiki} wiki thumb"
            if not image:
                image = lookup(wiki_map, name) or lookup(wiki_map, title)
                if image:
                    source = f"{game} · Wikipedia thumb"
        if not image and name in OVERRIDE_IMAGES:
            image = OVERRIDE_IMAGES[name]
            source = f"{game} · wiki / official art"
        if not image:
            missing.append(name)
        items.append(
            {
                "name": name,
                "game": game,
                "family": family,
                "temperament": temp,
                "why": why,
                "source": source,
                "license": license_,
                "image": image,
                "style": "game-character" if family != "cousin" else "cousin",
                "wiki_kind": kind,
                "wiki_title": title,
            }
        )

    catalog = {
        "count": len(items),
        "temperaments": dict(Counter(i["temperament"] for i in items)),
        "families": dict(Counter(i["family"] for i in items)),
        "with_image": sum(1 for i in items if i["image"]),
        "missing": missing,
        "items": items,
    }
    (ROOT / "catalog.json").write_text(json.dumps(catalog, indent=2), encoding="utf-8")
    (ROOT / "index.html").write_text(render_html(catalog), encoding="utf-8")
    print(f"wrote {catalog['count']} items, {catalog['with_image']} images, missing {len(missing)}")
    if missing:
        print("missing:", ", ".join(missing[:40]), ("…" if len(missing) > 40 else ""))


def render_html(catalog: dict) -> str:
    temps = catalog["temperaments"]
    cards = []
    for item in catalog["items"]:
        img = item["image"]
        if img:
            thumb = f'<img src="{esc(img)}" alt="{esc(item["name"])}" loading="lazy" referrerpolicy="no-referrer">'
        else:
            thumb = f'<div class="ph t-{esc(item["temperament"])}">{esc(item["name"][:1])}</div>'
        cards.append(
            f'''<article class="card" data-temp="{esc(item["temperament"])}" data-family="{esc(item["family"])}" data-style="{esc(item["style"])}">
  <div class="thumb">{thumb}</div>
  <div class="badge t-{esc(item["temperament"])}">{esc(item["temperament"])}</div>
  <h3>{esc(item["name"])}</h3>
  <p class="meta"><b>{esc(item["game"])}</b><br>{esc(item["why"])}<br><span>{esc(item["license"])}</span></p>
</article>'''
        )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Game characters — verity / falsity / cruelty / lovity</title>
<style>
  :root {{ --bg:#f4efe4; --ink:#241c16; --muted:#6b5f52; --card:#fffdf7; --line:#e3d6c3; }}
  * {{ box-sizing: border-box; }}
  body {{ margin:0; font-family:"Avenir Next","Segoe UI",sans-serif; background:var(--bg); color:var(--ink); }}
  header {{ max-width:1400px; margin:0 auto; padding:36px 24px 12px; }}
  h1 {{ font-size:2rem; margin:0 0 8px; letter-spacing:-0.03em; }}
  .lede {{ color:var(--muted); max-width:82ch; line-height:1.55; }}
  .warn {{ background:#fff4ee; border:1px solid #e8c4b4; color:#8a2c12; padding:10px 12px; border-radius:12px; max-width:82ch; }}
  .stats {{ display:flex; gap:12px; flex-wrap:wrap; margin:18px 0 0; }}
  .stat {{ background:var(--card); border:1px solid var(--line); border-radius:12px; padding:10px 14px; min-width:92px; }}
  .stat b {{ display:block; font-size:1.35rem; }}
  .stat span {{ color:var(--muted); font-size:0.8rem; }}
  nav.filters {{ max-width:1400px; margin:0 auto; padding:10px 24px; display:flex; gap:8px; flex-wrap:wrap; }}
  nav.filters button {{ border:1px solid var(--line); background:var(--card); color:var(--ink); border-radius:999px; padding:6px 12px; cursor:pointer; }}
  nav.filters button.on {{ background:var(--ink); color:var(--card); }}
  .grid {{ max-width:1400px; margin:0 auto; padding:8px 24px 80px; display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; }}
  .card {{ background:var(--card); border:1px solid var(--line); border-radius:14px; padding:10px; display:flex; flex-direction:column; gap:6px; position:relative; }}
  .thumb {{ aspect-ratio:1; display:grid; place-items:center; background:#fff; border-radius:10px; overflow:hidden; }}
  .thumb img {{ max-width:100%; max-height:150px; object-fit:contain; }}
  .ph {{ width:100%; height:100%; display:grid; place-items:center; font-size:2.4rem; font-weight:700; }}
  h3 {{ margin:0; font-size:0.95rem; padding-right:64px; }}
  .meta {{ margin:0; font-size:0.72rem; color:var(--muted); line-height:1.4; }}
  .badge {{ position:absolute; top:14px; right:14px; font-size:0.64rem; letter-spacing:0.04em; text-transform:uppercase; padding:3px 7px; border-radius:999px; }}
  .t-verity {{ background:#d8f0df; color:#1d5a32; }}
  .t-falsity {{ background:#ece4fb; color:#4c2d86; }}
  .t-cruelty {{ background:#f8d6d0; color:#8a2212; }}
  .t-lovity {{ background:#ffe9b8; color:#7a4d00; }}
  .hidden {{ display:none; }}
</style>
</head>
<body>
<header>
  <h1>Named game characters, four funny souls</h1>
  <p class="lede">
    The generic emoji zoo is gone. This board is characters people already know,
    sorted into a joke taxonomy: <strong>verity</strong> (the face does not lie),
    <strong>falsity</strong> (the face is a costume), <strong>cruelty</strong>
    (the cute one will eat you), and <strong>lovity</strong> (the bit is the whole animal).
    Official / wiki art is hotlinked for looking. None of this ships in StudyGotchi.
  </p>
  <p class="warn">Style references only. Copy the job of the character, not the silhouette.</p>
  <div class="stats">
    <div class="stat"><b>{catalog["count"]}</b><span>on the board</span></div>
    <div class="stat"><b>{catalog["with_image"]}</b><span>with pictures</span></div>
    <div class="stat"><b>{temps.get("verity", 0)}</b><span>verity</span></div>
    <div class="stat"><b>{temps.get("falsity", 0)}</b><span>falsity</span></div>
    <div class="stat"><b>{temps.get("cruelty", 0)}</b><span>cruelty</span></div>
    <div class="stat"><b>{temps.get("lovity", 0)}</b><span>lovity</span></div>
  </div>
</header>
<nav class="filters">
  <button class="on" data-filter="all">All</button>
  <button data-filter="verity">Verity</button>
  <button data-filter="falsity">Falsity</button>
  <button data-filter="cruelty">Cruelty</button>
  <button data-filter="lovity">Lovity</button>
  <button data-family="mario">Mario / DK</button>
  <button data-family="pikmin">Pikmin</button>
  <button data-family="kirby">Kirby</button>
  <button data-family="pokemon">Pokémon</button>
  <button data-family="ac">Animal Crossing</button>
  <button data-family="indie">Indie animals</button>
  <button data-family="slime">Slimes / collectors</button>
  <button data-family="story">Story / horror-cute</button>
  <button data-family="cousin">Shippable cousins</button>
</nav>
<main class="grid">
{chr(10).join(cards)}
</main>
<script>
const buttons = document.querySelectorAll("nav.filters button");
const cards = document.querySelectorAll("article.card");
buttons.forEach((btn) => {{
  btn.addEventListener("click", () => {{
    buttons.forEach((b) => b.classList.remove("on"));
    btn.classList.add("on");
    const temp = btn.dataset.filter;
    const family = btn.dataset.family;
    cards.forEach((card) => {{
      const ok = family ? card.dataset.family === family : (temp === "all" || card.dataset.temp === temp);
      card.classList.toggle("hidden", !ok);
    }});
  }});
}});
</script>
</body>
</html>
"""


def esc(value: str | None) -> str:
    return (
        (value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


if __name__ == "__main__":
    main()
