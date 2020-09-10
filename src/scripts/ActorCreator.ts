import MarkdownParser from "./MarkdownParser";

class ActorCreator {
    private static _instance: ActorCreator;

    private constructor() {
    }

    public static getInstance(): ActorCreator {
        if (!ActorCreator._instance) ActorCreator._instance = new ActorCreator();
        return ActorCreator._instance;
    }

   /**
    * Returns the foundry friendly structure for the ability scores
    *
    * @param stats - ability scores
    * @param saves - saves (used to decide if the creatures is proficient in a stat or not
    * @param proficiency - proficiency score
    * @private
    */
    private _makeAbilitiesStructure(stats: object, saves: object, proficiency: number): object {
        const abilitiesObject = {}
        for (const stat in stats) {
            if (!stats.hasOwnProperty(stat)) continue;
            abilitiesObject[stat.toLowerCase()] = {
                value: Number(stats[stat]),
                proficient: saves ? saves[stat] ? 1 : 0 : 0,
                prof: proficiency
            };
        }
        return abilitiesObject
    }

   /**
    * Returns the foundry friendly structure for skills
    *
    * @param text - markdown text
    * @param proficiency - proficiency score
    * @private
    */
    private _makeSkillsStructure(text: string, proficiency: number): object {
        const creatureSkills = MarkdownParser.getSkills(text);
        const skillsObject = {};
        for (const skill in creatureSkills) {
            if (!creatureSkills.hasOwnProperty(skill)) continue;
            skillsObject[MarkdownParser.shortenSkills(skill)] = {value: Math.floor(creatureSkills[skill] / proficiency)};
        }
        return skillsObject
    }

   /**
    * Returns a foundry friendly structure for resistances
    *
    * @param modifiers - an object with all the damage modifiers of the creature
    * @private
    */
    private _makeResistancesStructure(modifiers: object): object {
        const structure = {};
        for (const key in modifiers) {
            if (!modifiers.hasOwnProperty(key)) continue;
            structure[MarkdownParser.convertResistance(key)] = {
                value: modifiers[key].split(', ')
            }
        }
        return structure;
    }

   /**
    * Returns a foundry friendly structure for the traits part of the actor
    *
    * @param markdownText - text to be parsed
    * @private
    */
    private _makeTraitsStructure(markdownText): object {
        const creatureSizeAndAlignment = MarkdownParser.getCreatureSizeAndAlignment(markdownText);
        const creatureLanguages = MarkdownParser.getLanguages(markdownText).toLocaleLowerCase();
        const creatureSenses = MarkdownParser.getSenses(markdownText);
        const creatureDamageModifiers = MarkdownParser.getDamageModifiers(markdownText);

        const traits = this._makeResistancesStructure(creatureDamageModifiers);
        traits['size'] = MarkdownParser.convertSizes(creatureSizeAndAlignment['size']);
        traits['languages'] = {value: creatureLanguages.split(', ')};
        traits['senses'] = creatureSenses['vision'];

        return traits;
    }

    public async actorCreator(markdownText: string) {
        const creatureSizeAndAlignment = MarkdownParser.getCreatureSizeAndAlignment(markdownText);
        const creatureArmor = MarkdownParser.getCreatureACAndSource(markdownText);
        const creatureHP = MarkdownParser.getCreatureHP(markdownText);
        const creatureStats = MarkdownParser.getCreatureStats(markdownText);
        const creatureSaves = MarkdownParser.getSavingThrowMods(markdownText);
        const creatureChallenge = MarkdownParser.getChallenge(markdownText);
        const creatureAbilities = MarkdownParser.getAbilities(markdownText);
        const creatureLegendaryActions = MarkdownParser.getLegendaryActions(markdownText);
        const creatureSpells = MarkdownParser.getSpells(markdownText);
        const creatureProficiency = MarkdownParser.getProficiency(creatureAbilities);

        let actor = await Actor.create({
            name: MarkdownParser.getCreatureName(markdownText),
            type: "npc",
            img: "",
            sort: 12000,
            data: {
                abilities: this._makeAbilitiesStructure(creatureStats, creatureSaves, creatureProficiency),
                attributes: {
                    ac: {value: Number(creatureArmor['AC'])},
                    hp: {
                        value: Number(creatureHP['HP']),
                        max: Number(creatureHP['HP']),
                        formula: creatureHP['formula']
                    },
                    speed: MarkdownParser.getCreatureSpeed(markdownText),
                    prof: creatureProficiency
                },
                details: {
                    alignment: creatureSizeAndAlignment['alignment'],
                    type: creatureSizeAndAlignment['race'],
                    cr: creatureChallenge['CR'],
                    xp: {value: creatureChallenge['XP']}
                },
                traits: this._makeTraitsStructure(markdownText),
                skills: this._makeSkillsStructure(markdownText, creatureProficiency)

            },
            token: {},
            items: [],
            flags: {}
        });
    }

}

export default ActorCreator.getInstance();