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

        return {
            ...this._makeResistancesStructure(creatureDamageModifiers),
            size: MarkdownParser.convertSizes(creatureSizeAndAlignment['size']),
            languages: {
                custom: creatureLanguages
            },
            senses: creatureSenses['vision']
        };
    }

    /**
     * Returns a foundry friendly structure for the details part
     *
     * @param markdownText - text to be parsed
     * @param abilities - object structure of all abilities to get the spellcasting level if needed
     * @private
     */
    private _makeDetailsStructure(markdownText: string, abilities): object {
        const creatureSizeAndAlignment = MarkdownParser.getCreatureSizeAndAlignment(markdownText);
        const creatureChallenge = MarkdownParser.getChallenge(markdownText);

        return {
            alignment: creatureSizeAndAlignment['alignment'],
            type: creatureSizeAndAlignment['race'],
            cr: creatureChallenge['CR'],
            xp: {
                value: creatureChallenge['XP']
            },
            spellLevel: abilities?.Spellcasting?.data?.level
        };
    }

    /**
     * Returns a foundry friendly structure for the HP
     *
     * @param markdownText - text to be parsed
     * @private
     */
    private _makeHpStructure(markdownText: string): object {
        const creatureHP = MarkdownParser.getCreatureHP(markdownText);
        return {
            value: Number(creatureHP['HP']),
            max: Number(creatureHP['HP']),
            formula: creatureHP['formula']
        };
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
        const creatureArmor = MarkdownParser.getCreatureACAndSource(markdownText);

        return {
            ac: {
                value: Number(creatureArmor['AC'])
            },
            hp: this._makeHpStructure(markdownText),
            speed: MarkdownParser.getCreatureSpeed(markdownText),
            prof: creatureProficiency,
            spellcasting: MarkdownParser.shortenAbilities(abilities?.Spellcasting?.data?.modifier)
        };
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

    private _makeProps(markdownText: string): any {
        const props = {
            name: MarkdownParser.getCreatureName(markdownText),
            abilities: MarkdownParser.getAbilities(markdownText),
            legendaryActions: MarkdownParser.getLegendaryActions(markdownText),
            spells: MarkdownParser.getSpells(markdownText),
            stats: MarkdownParser.getCreatureStats(markdownText)
        }
        props['proficiency'] = MarkdownParser.getProficiency(props.abilities);
        return props
    }

    public async actorCreator(markdownText: string) {
        const props = this._makeProps(markdownText);

        let actor = await Actor.create({
            name: props.name,
            type: "npc",
            img: "",
            sort: 12000, //here to make it be last item in the list, not sure what 12000 means, i copy pasted this from somewhere
            data: this._makeDataStructure(markdownText, props.proficiency, props.abilities, props.stats),
            token: {},
            items: [],
            flags: {}
        }, {renderSheet: true});

        if (props.abilities) ItemCreator.abilitiesAdder(actor, props.abilities, props.stats);
        if (props.legendaryActions) ItemCreator.abilitiesAdder(actor, props.legendaryActions, props.stats);
        if (props.spells) await ItemCreator.spellsAdder(actor, props.spells);
    }

}

export default ActorCreator.getInstance();