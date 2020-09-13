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

    /**
     * Removes the to hit value from the damage array
     *
     * @param abilityData - data of the ability currently being cleaned
     * @private
     */
    private _cleanAbilityDamage(abilityData) {
        if (!abilityData) return abilityData;
        abilityData.forEach((ability) => {
            ability.pop();
        })
        return abilityData;
    }

    /**
     * Returns a foundry friendly structure for range and target
     *
     * @param abilityRange - ability.data.range data that came from the parser
     * @private
     */
    private _makeRangeTargetStructure(abilityRange): object {
        const structure = {};
        if (!abilityRange) return structure;
        if (abilityRange?.singleRange?.type) {
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

    /**
     * Returns the ability that is used for the attack
     *
     * @param ability - ability data
     * @param actorStats - the stats of the actor
     * @private
     */
    private _getAttackAbility(ability: any, actorStats: object): string {
        if (!ability?.data?.damage?.[0]) return;
        for (const key in actorStats) {
            if (!actorStats.hasOwnProperty(key)) continue;
            if (Number(ability?.data?.damage[0][2]) === MarkdownParser.getAbilityModifier(actorStats[key])) return key.toLowerCase();
        }
        return;
    }

    private _getActivation(ability: any): object {
        const activationObject = {type: '', cost: 0, condition: ''};
        if (ability?.cost) {
            activationObject.type = 'legendary';
            activationObject.cost = ability.cost;
        } else if (ability?.data?.damage?.length !== 0 || ability?.data?.save) {
            activationObject.type = 'action';
            activationObject.cost = 1;
        }
        return activationObject;
    }

    /**
     * Creates the item to be added to the actor
     *
     * @param actor - actor that is the owner of the item
     * @param itemName - the name of the item
     * @param itemData - data of the item from the parser
     * @param actorStats - stats of the actor
     */
    public async itemCreator(actor: any, itemName: string, itemData: any, actorStats: object): Promise<void> {
        let thisItem = {
            name: itemName,
            type: itemData?.data?.damage?.[0]?.[2] ? 'weapon' : 'feat',
            data: {
                description: {value: itemData['description']},
                activation: this._getActivation(itemData),
                ability: this._getAttackAbility(itemData, actorStats),
                actionType: itemData?.data?.damage?.[0]?.[2] ? 'mwak' : null,
                damage: {
                    parts: this._cleanAbilityDamage(itemData?.['data']?.['damage'])
                },
                save: itemData?.['data']?.['save'],
                equipped: true,
            },
        }
        Object.assign(thisItem.data, this._makeRangeTargetStructure(itemData?.['data']?.['range']));
        await actor.createEmbeddedEntity("OwnedItem", thisItem);

    }

    /**
     * Adds all abilities to the actor
     *
     * @param actor - owner of the abilities
     * @param abilities - abilities object
     * @param actorStats - stats of the actor
     */
    public abilitiesAdder(actor: any, abilities: object, actorStats: object): void {
        for (const key in abilities) {
            if (!abilities.hasOwnProperty(key)) continue;
            this.itemCreator(actor, key, abilities[key], actorStats);
        }
    }

    /**
     * Makes text have first letters of each words uppercase and the rest lowercase
     *
     * @param text - text to be converted
     * @private
     */
    private _makeTitleCase(text: string): string {
        const lowerCaseWords = ['the', 'of', 'in'];
        const words = text.trim().split(" ");

        for (let i = 0; i < words.length; i++) {
            if (!lowerCaseWords.includes(words[i])) words[i] = words[i][0].toUpperCase() + words[i].substr(1);
        }

        return words.join(" ");
    }

    private async _getCompendiums() {
        const pack = game.packs.get("dnd5e.spells");
        await pack.getIndex();
        return pack;
    }

    private async _getEntityFromCompendium(compendium, spellName) {
        let entry = compendium.index.find(e => e.name === spellName);
        return await compendium.getEntry(entry._id);
    }

    private async _prepareSpellsArray(spells: Array<string>, compendium): Promise<Array<any>> {
        for (let spell of spells) {
            let index = spells.indexOf(spell);
            spell = this._makeTitleCase(spell);
            spells[index] = await this._getEntityFromCompendium(compendium, spell)
        }

        return spells;
    }

    private async _prepareSpellsObject(spells: object): Promise<object> {
        const compendium = await this._getCompendiums();
        let spellsArray = [];
        for (const key in spells) {
            if (!spells.hasOwnProperty(key)) continue;
            const newSpells = await this._prepareSpellsArray(spells[key], compendium);
            Array.prototype.push.apply(spellsArray, newSpells);
        }
        return spells;
    }

    public async spellsAdder(actor: any, spells: object): Promise<void> {
        if (!spells) return;
        await this._prepareSpellsObject(spells);


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
        if (creatureLegendaryActions) this.abilitiesAdder(actor, creatureLegendaryActions, creatureStats);
        if (creatureSpells) this.spellsAdder(actor, creatureSpells);
    }

}

export default ActorCreator.getInstance();