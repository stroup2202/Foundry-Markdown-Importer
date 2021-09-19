import {getAbilityModifier} from "./MarkdownParser.js";
import {notificationCreator} from "./Utilts.js";

/**
 * Returns an array of all the compendiums that have the identifier `spell` in their name
 *
 * @private
 */
const _getCompendiums = async () => {
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
const _getEntityFromCompendium = async (compendiums, spellName) => {
    for (const compendium of compendiums) {
        let entry = compendium.index.find(e => e.name.toLowerCase() === spellName);
        if (entry) {
            return await compendium.getDocument(entry._id);
        }
    }
    notificationCreator('warn', `${spellName} not found`)
}

/**
 * Converts the array of names to the array of spell entities for the createEmbeddedEntity
 *
 * @param spells - array of spells
 * @param compendium - a compendium to get the entity structure from
 * @private
 */

const _prepareSpellsArray = async (spells, compendium, key) => {
    if (!spells) return [];
    for (let spell of spells) {
        let index = spells.indexOf(spell);
        spells[index] = JSON.parse(JSON.stringify(await _getEntityFromCompendium(compendium, spell.toLowerCase().trim())));

        if (key.includes('/')) {
            const [value, period] = key.split('/');
            spells[index].data.uses = {
                value: value,
                max: value,
                per: period
            }
            spells[index].data.preparation = {
                mode: 'innate',
                prepared: true
            }
        }
        if (key === 'atWill') {
            spells[index].data.preparation = {
                mode: 'atwill',
                prepared: true
            }
        }
    }

    return spells.filter(el => el != null)
}

/**
 * Returns an array of all the spells entity
 *
 * @param spells - an object that contains all the spells
 * @private
 */

const _prepareSpellsObject = async (spells) => {
    const compendiums = await _getCompendiums();
    let spellsArray = [];
    for (const key in spells) {
        if (!spells.hasOwnProperty(key)) continue;
        const newSpells = await _prepareSpellsArray(spells[key], compendiums, key);
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

const spellsAdder = async (actor, spells) => {
    if (!spells) return;
    const spellList = await _prepareSpellsObject(spells);
    console.log([...spellList])

    await actor.createEmbeddedDocuments("Item", [...spellList]);
}

/**
 * Removes the to hit value from the damage array
 *
 * @param abilityData - data of the ability currently being cleaned
 * @private
 */
const _cleanAbilityDamage = (abilityData) => {
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
const _makeRangeTargetStructure = (abilityRange) => {
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
const _getAttackAbility = (ability, actorStats) => {
    if (!ability?.data?.damage?.[0]) return;
    for (const key in actorStats) {
        if (actorStats.hasOwnProperty(key))
            if (Number(ability?.data?.damage[0][2]) === getAbilityModifier(actorStats[key])) return key.toLowerCase();
    }
}

/**
 * Returns an object for the activation of an attack
 *
 * @param ability - ability to get the activation of
 * @private
 */
const _getActivation = (ability) => {
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

const itemCreator = async (actor, itemName, itemData, actorStats) => {
    let thisItem = {
        name: itemName,
        type: itemData?.data?.damage?.[0]?.[2] ? 'weapon' : 'feat',
        data: {
            description: {value: itemData['description']},
            activation: _getActivation(itemData),
            ability: _getAttackAbility(itemData, actorStats),
            actionType: itemData?.data?.damage?.[0]?.[2] ? 'mwak' : null,
            damage: {
                parts: _cleanAbilityDamage(itemData?.['data']?.['damage'])
            },
            save: itemData?.['data']?.['save'],
            equipped: true,
        },
    }
    Object.assign(thisItem.data, _makeRangeTargetStructure(itemData?.['data']?.['range']));
    try {
        await actor.createEmbeddedDocuments("Item", [thisItem]);
    } catch (e) {
        notificationCreator('error', `There has been an error while creating ${itemName}`)
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
const abilitiesAdder = async (actor, abilities, actorStats) => {
    for (const key in abilities) {
        if (abilities.hasOwnProperty(key))
            await itemCreator(actor, key, abilities[key], actorStats);
    }
}

export {abilitiesAdder, spellsAdder}
