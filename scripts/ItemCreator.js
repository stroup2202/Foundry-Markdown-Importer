import MarkdownParser from "./MarkdownParser";
import Utilts from "./Utilts";

class ItemCreator {

    /**
     * Returns an array of all the compendiums that have the identifier `spell` in their name
     *
     * @private
     */
    async _getCompendiums() {
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
    async _getEntityFromCompendium(compendiums, spellName) {
        for (const compendium of compendiums) {
            let entry = compendium.index.find(e => e.name.toLowerCase() === spellName);
            if (entry) {
                return await compendium.getEntry(entry._id);
            }
        }
        Utilts.notificationCreator('warn', `${spellName} not found`)
        return ;

    }

    /**
     * Converts the array of names to the array of spell entities for the createEmbeddedEntity
     *
     * @param spells - array of spells
     * @param compendium - a compendium to get the entity structure from
     * @private
     */
     async _prepareSpellsArray(spells, compendium) {
        for (let spell of spells) {
            let index = spells.indexOf(spell);
            spells[index] = JSON.parse(JSON.stringify(await this._getEntityFromCompendium(compendium, spell.toLowerCase().trim())));
        }

        return spells.filter(el=> el != null)
    }

    /**
     * Returns an array of all the spells entity
     *
     * @param spells - an object that contains all the spells
     * @private
     */
    async _prepareSpellsObject(spells) {
        const compendiums = await this._getCompendiums();
        let spellsArray = [];
        for (const key in spells) {
            if (!spells.hasOwnProperty(key)) continue;
            const newSpells = await this._prepareSpellsArray(spells[key], compendiums);
            spellsArray = [
                ...spellsArray,
                ...newSpells
            ]
        }
        return spellsArray;
    }

    /**
     * Adds all the spells to the actor object
     *
     * @param actor - owner of the spells
     * @param spells - an array of spell names
     */
    async spellsAdder(actor, spells) {
        if (!spells) return;
        const spellList = await this._prepareSpellsObject(spells);

        await actor.createEmbeddedDocuments("Item", [...spellList]);
    }

    /**
     * Removes the to hit value from the damage array
     *
     * @param abilityData - data of the ability currently being cleaned
     * @private
     */
    _cleanAbilityDamage(abilityData) {
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
    _makeRangeTargetStructure(abilityRange) {
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
    _getAttackAbility(ability, actorStats) {
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
    _getActivation(ability) {
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
    async itemCreator(actor, itemName, itemData, actorStats) {
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
            await actor.createEmbeddedDocuments("Item", [thisItem]);
        }
        catch (e) {
            Utilts.notificationCreator('error', `There has been an error while creating ${itemName}`)
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
    async abilitiesAdder(actor, abilities, actorStats) {
        for (const key in abilities) {
            if (abilities.hasOwnProperty(key))
                await this.itemCreator(actor, key, abilities[key], actorStats);
        }
    }

}

export default ItemCreator.getInstance();