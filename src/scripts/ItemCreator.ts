import MarkdownParser from "./MarkdownParser";

class ItemCreator {
    private static _instance: ItemCreator;

    private constructor() {
    }

    public static getInstance(): ItemCreator {
        if (!ItemCreator._instance) ItemCreator._instance = new ItemCreator();
        return ItemCreator._instance;
    }


    /**
     * Returns an array of all the compendiums that have the identifier `spell` in their name
     *
     * @private
     */
    private async _getCompendiums() {
        const packKeys = game.packs.keys();
        const spellCompendiums = [];
        for (const key of packKeys) {
            if (key.includes('spell')) {
                const pack = game.packs.get(key);
                await pack.getIndex()
                spellCompendiums.push(pack)
            }
        }
        return spellCompendiums;
    }

    /**
     * Returns an entity from the compendium
     *
     * @param compendiums - source compendiums
     * @param spellName - name of the spell
     * @private
     */
    private async _getEntityFromCompendium(compendiums, spellName) {
        for (const compendium of compendiums) {
            let entry = compendium.index.find(e => e.name.toLowerCase() === spellName);
            if (entry) {
                return await compendium.getEntry(entry._id);
            }
        }
        ui.notifications.warn(`${spellName} not found`);
        return ;

    }

    /**
     * Converts the array of names to the array of spell entities for the createEmbeddedEntity
     *
     * @param spells - array of spells
     * @param compendium - a compendium to get the entity structure from
     * @private
     */
    private async _prepareSpellsArray(spells: Array<string>, compendium): Promise<Array<any>> {
        for (let spell of spells) {
            let index = spells.indexOf(spell);
            spells[index] = await this._getEntityFromCompendium(compendium, spell.toLowerCase().trim());
        }

        return spells.filter(el=> el != null)
    }

    /**
     * Returns an array of all the spells entity
     *
     * @param spells - an object that contains all the spells
     * @private
     */
    private async _prepareSpellsObject(spells: object): Promise<object> {
        const compendiums = await this._getCompendiums();
        let spellsArray = [];
        for (const key in spells) {
            if (!spells.hasOwnProperty(key)) continue;
            const newSpells = await this._prepareSpellsArray(spells[key], compendiums);
            Array.prototype.push.apply(spellsArray, newSpells);
        }
        return spellsArray;
    }

    /**
     * Adds all the spells to the actor object
     *
     * @param actor - owner of the spells
     * @param spells - an array of spell names
     */
    public async spellsAdder(actor: any, spells: object): Promise<void> {
        if (!spells) return;
        const spellList = await this._prepareSpellsObject(spells);

        await actor.createEmbeddedEntity("OwnedItem", spellList);
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
            structure['range'] = abilityRange.doubleRange.short ? Number(abilityRange.doubleRange) : Number(abilityRange.singleRange)
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
            if (actorStats.hasOwnProperty(key))
                if (Number(ability?.data?.damage[0][2]) === MarkdownParser.getAbilityModifier(actorStats[key])) return key.toLowerCase();
        }
        return;
    }

    /**
     * Returns an object for the activation of an attack
     *
     * @param ability - ability to get the activation of
     * @private
     */
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
        try {
            await actor.createEmbeddedEntity("OwnedItem", thisItem);
        }
        catch (e) {
            ui.notifications.error(`There has been an error while creating ${itemName}`);
            console.error(e);
        }

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
            if (abilities.hasOwnProperty(key))
                this.itemCreator(actor, key, abilities[key], actorStats);
        }
    }

}

export default ItemCreator.getInstance();