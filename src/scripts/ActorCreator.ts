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
    private _makeTraitsStructure(markdownText: string): object {
        const creatureSizeAndAlignment = MarkdownParser.getCreatureSizeAndAlignment(markdownText);
        const creatureLanguages = MarkdownParser.getLanguages(markdownText).toLocaleLowerCase();
        const creatureSenses = MarkdownParser.getSenses(markdownText);
        const creatureDamageModifiers = MarkdownParser.getDamageModifiers(markdownText);

        const traits = this._makeResistancesStructure(creatureDamageModifiers);
        traits['size'] = MarkdownParser.convertSizes(creatureSizeAndAlignment['size']);
        traits['languages'] = {value: creatureLanguages.split(', ')}; //TODO make a way to separate known languages from custom ones
        traits['senses'] = creatureSenses['vision'];

        return traits;
    }

    /**
     * Returns a foundry friendly structure for the details part
     *
     * @param markdownText - text to be parsed
     * @private
     */
    private _makeDetailsStructure(markdownText: string): object {
        const structure = {};
        const creatureSizeAndAlignment = MarkdownParser.getCreatureSizeAndAlignment(markdownText);
        const creatureChallenge = MarkdownParser.getChallenge(markdownText);

        structure['alignment'] = creatureSizeAndAlignment['alignment'];
        structure['type'] = creatureSizeAndAlignment['race'];
        structure['cr'] = creatureChallenge['CR']
        structure['xp'] = {value: creatureChallenge['XP']};

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
     * @private
     */
    private _makeAttributesStructure(markdownText: string, creatureProficiency: number): object {
        const structure = {};
        const creatureArmor = MarkdownParser.getCreatureACAndSource(markdownText);

        structure['ac'] = {value: Number(creatureArmor['AC'])};
        structure['hp'] = this._makeHpStructure(markdownText);
        structure['speed'] = MarkdownParser.getCreatureSpeed(markdownText);
        structure['prof'] = creatureProficiency;

        return structure;
    }

    private _cleanAbilityDamage(abilityData) {
        abilityData.forEach((ability) => {
            ability.pop();
        })
        return abilityData;
    }

    private _makeRangeTargetStructure(abilityRange): object {
        const structure = {};
        if (abilityRange.singleRange.type) {
            structure['target'] = abilityRange.singleRange;
            structure['range'] = {
                value: null,
                long: null,
                units: 'self'
            }
        } else {
            structure['range'] = abilityRange.doubleRange.short ? abilityRange.doubleRange : abilityRange.singleRange
        }
        return structure;
    }

    private _getAttackAbility (ability: any, actorStats: object): string {
        if(!ability?.data?.damage[0]) return ;
        for(const key in actorStats){
            if(!actorStats.hasOwnProperty(key)) continue;
            if (Number(ability?.data?.damage[0][2]) === MarkdownParser.getAbilityModifier(actorStats[key])) return key.toLowerCase();
        }
        return;
    }

    public async itemCreator(actor: any, abilityName: string, abilityData: any, actorStats: object): Promise<void> {
        abilityData['data']['range'] = this._makeRangeTargetStructure(abilityData['data']['range']);
        let thisItem = {
            name: abilityName,
            type: "feat",
            data: {
                description: {value: abilityData['description']},
                ability: this._getAttackAbility(abilityData, actorStats),
                damage: {
                    parts: this._cleanAbilityDamage(abilityData['data']['damage'])
                },
                save: abilityData['data']['save'],
                equipped: true,
            },
        }
        Object.assign(thisItem.data, abilityData.data.range);
        await actor.createEmbeddedEntity("OwnedItem", thisItem);

    }

    public abilitiesAdder(actor: any, abilities: object, actorStats: object): void {
        for (const key in abilities) {
            if (!abilities.hasOwnProperty(key)) continue;
            this.itemCreator(actor, key, abilities[key], actorStats);
        }
    }


    public async actorCreator(markdownText: string) {
        const creatureStats = MarkdownParser.getCreatureStats(markdownText);
        const creatureSaves = MarkdownParser.getSavingThrowMods(markdownText);
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
                attributes: this._makeAttributesStructure(markdownText, creatureProficiency),
                details: this._makeDetailsStructure(markdownText),
                traits: this._makeTraitsStructure(markdownText),
                skills: this._makeSkillsStructure(markdownText, creatureProficiency)

            },
            token: {},
            items: [],
            flags: {}
        });
        if (creatureAbilities) this.abilitiesAdder(actor, creatureAbilities, creatureStats);
    }

}

export default ActorCreator.getInstance();