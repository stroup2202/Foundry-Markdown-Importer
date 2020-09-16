import MarkdownParser from "./MarkdownParser";
import ItemCreator from "./ItemCreator";

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
                custom: modifiers[key]
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
    private _makeTraitsStructure(markdownText: string): object {
        const creatureSizeAndAlignment = MarkdownParser.getCreatureSizeAndAlignment(markdownText);
        const creatureLanguages = MarkdownParser.getLanguages(markdownText).toLocaleLowerCase();
        const creatureSenses = MarkdownParser.getSenses(markdownText);
        const creatureDamageModifiers = MarkdownParser.getDamageModifiers(markdownText);

        const traits = this._makeResistancesStructure(creatureDamageModifiers);
        traits['size'] = MarkdownParser.convertSizes(creatureSizeAndAlignment['size']);
        traits['languages'] = {
            custom: creatureLanguages
        };
        traits['senses'] = creatureSenses['vision'];
        return traits;
    }

    /**
     * Returns a foundry friendly structure for the details part
     *
     * @param markdownText - text to be parsed
     * @param abilities - object structure of all abilities to get the spellcasting level if needed
     * @private
     */
    private _makeDetailsStructure(markdownText: string, abilities): object {
        const structure = {};
        const creatureSizeAndAlignment = MarkdownParser.getCreatureSizeAndAlignment(markdownText);
        const creatureChallenge = MarkdownParser.getChallenge(markdownText);

        structure['alignment'] = creatureSizeAndAlignment['alignment'];
        structure['type'] = creatureSizeAndAlignment['race'];
        structure['cr'] = creatureChallenge['CR']
        structure['xp'] = {value: creatureChallenge['XP']};
        structure['spellLevel'] = abilities?.Spellcasting?.data?.level;

        return structure;
    }

    /**
     * Returns a foundry friendly structure for the HP
     *
     * @param markdownText - text to be parsed
     * @private
     */
    private _makeHpStructure(markdownText: string): object {
        const structure = {};
        const creatureHP = MarkdownParser.getCreatureHP(markdownText);

        structure['value'] = Number(creatureHP['HP']);
        structure['max'] = Number(creatureHP['HP']);
        structure['formula'] = creatureHP['formula'];

        return structure;
    }

    /**
     * Returns a foundry friendly structure for the attributes tab
     *
     * @param markdownText - text to be parsed
     * @param creatureProficiency - creature's proficiency modifier
     * @param abilities - abilities object for extracting the spellcaster abilities of the creature
     * @private
     */
    private _makeAttributesStructure(markdownText: string, creatureProficiency: number, abilities): object {
        const structure = {};
        const creatureArmor = MarkdownParser.getCreatureACAndSource(markdownText);

        structure['ac'] = {value: Number(creatureArmor['AC'])};
        structure['hp'] = this._makeHpStructure(markdownText);
        structure['speed'] = MarkdownParser.getCreatureSpeed(markdownText);
        structure['prof'] = creatureProficiency;
        structure['spellcasting'] = MarkdownParser.shortenAbilities(abilities?.Spellcasting?.data?.modifier);

        return structure;
    }

    /**
     * Returns a foundry friendly structure for the data field of the actor
     *
     * @param markdownText - user input text
     * @param creatureProficiency - proficiency of the actor
     * @param creatureAbilities - abilities object of the actor
     * @param creatureStats - stats of the actor
     * @private
     */
    private _makeDataStructure(markdownText: string, creatureProficiency: number, creatureAbilities: object, creatureStats: object): object {
        const creatureSaves = MarkdownParser.getSavingThrowMods(markdownText);

        return {
            abilities: this._makeAbilitiesStructure(creatureStats, creatureSaves, creatureProficiency),
            attributes: this._makeAttributesStructure(markdownText, creatureProficiency, creatureAbilities),
            details: this._makeDetailsStructure(markdownText, creatureAbilities),
            traits: this._makeTraitsStructure(markdownText),
            skills: this._makeSkillsStructure(markdownText, creatureProficiency)
        };
    }

    public async actorCreator(markdownText: string) {
        const creatureAbilities = MarkdownParser.getAbilities(markdownText);
        const creatureLegendaryActions = MarkdownParser.getLegendaryActions(markdownText);
        const creatureSpells = MarkdownParser.getSpells(markdownText);
        const creatureProficiency = MarkdownParser.getProficiency(creatureAbilities);
        const creatureStats = MarkdownParser.getCreatureStats(markdownText);

        let actor = await Actor.create({
            name: MarkdownParser.getCreatureName(markdownText),
            type: "npc",
            img: "",
            sort: 12000,
            data: this._makeDataStructure(markdownText, creatureProficiency, creatureAbilities, creatureStats),
            token: {},
            items: [],
            flags: {}
        });

        if (creatureAbilities) ItemCreator.abilitiesAdder(actor, creatureAbilities, creatureStats);
        if (creatureLegendaryActions) ItemCreator.abilitiesAdder(actor, creatureLegendaryActions, creatureStats);
        if (creatureSpells) await ItemCreator.spellsAdder(actor, creatureSpells);
    }

}

export default ActorCreator.getInstance();