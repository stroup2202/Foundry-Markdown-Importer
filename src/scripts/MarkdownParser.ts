class MarkdownParser {
    private static _instance: MarkdownParser;

    private constructor() {
    }

    public static getInstance(): MarkdownParser {
        if (!MarkdownParser._instance) MarkdownParser._instance = new MarkdownParser();
        return MarkdownParser._instance;
    }

    private _skillsToShortMap: { [key: string]: string } = {
        'Acrobatics': 'acr',
        'Animal Handling': 'ani',
        'Arcana': 'arc',
        'Athletics ': 'ath',
        'Deception': 'dec',
        'History': 'his',
        'Insight': 'ins',
        'Intimidation': 'itm',
        'Investigation': 'inv',
        'Medicine': 'med',
        'Nature': 'nat',
        'Perception': 'prc',
        'Performance': 'prf',
        'Persuasion': 'per',
        'Religion ': 'rel',
        'Sleight of Hand': 'slt',
        'Stealth': 'ste',
        'Survival': 'sur',
    };

    private _sizesMap: { [key: string]: string } = {
        "Gargantuan": "grg",
        "Huge": "huge",
        "Medium": "med",
        "Small": "sm",
        "Tiny": "tiny"
    }

    /**
     * Returns a creature's name
     *
     * @param text - markdown text
     * @private
     */
    private _getCreatureName(text: string): string {
        return text.match(/> ## (.+)/)[1];
    }

    private _getCreatureSizeAndAlignment(text: string): object {
        const match = text.match(/\*(\w+) (\w+).*, (.*?)\*/);
        return {
            size: match[1],
            race: match[2],
            alignment: match[3]
        }
    }

    /**
     * Returns an object that contains the creatures AC and the source of that armor class
     *
     * @Fields: AC, source
     *
     * @param text - markdown text
     * @private
     */
    private _getCreatureACAndSource(text: string): object {
        const match = text.match(/ \*\*Armor Class\*\* ([0-9]+) ?(.*)?/);
        return {
            AC: match[1],
            source: match[2]
        };
    }

    /**
     * Returns an object that contains the creatures HP and the formula to calculate it
     *
     * @Fields: HP, formula
     *
     * @param text - markdown text
     * @private
     */
    private _getCreatureHP(text: string): object {
        const match = text.match(/ \*\*Hit Points\*\* ([0-9]+) \((.*?)\)/);
        return {
            HP: match[1],
            formula: match[2]
        };
    }

    /**
     * Returns an object that contains a creature's speed
     *
     * @Fields: value, special
     *
     * @param text - markdown text
     * @private
     */
    private _getCreatureSpeed(text: string): object {
        const speedMatch = text.match(/\*\*Speed\*\* ([0-9]+ ft.),? ?(.*)?/);
        return {value: speedMatch[1], special: speedMatch[2]};
    }

    /**
     * Returns a creature's stats
     *
     * @Fields: Str, Dex, Con, Int, Wis, Cha
     *
     * @param text - markdown text
     * @private
     */
    private _getCreatureStats(text: string): object {
        const stats = [...text.matchAll(/\|([0-9]+) \([+-][0-9]+\)/g)];
        const updatedStats = {Str: 0, Dex: 0, Con: 0, Int: 0, Wis: 0, Cha: 0};
        stats.forEach((stat, index) => {
            updatedStats[Object.keys(updatedStats)[index]] = (stat[1]);
        })
        return updatedStats;
    }

    /**
     * Returns a creature's saving throws as an object
     *
     * @ExampleFields: Str, Dex
     *
     * @param text - markdown text
     * @private
     */
    private _getSavingThrowMods(text: string): object {
        const savesObject = {};
        const match = text.match(/\*\*Saving Throws\*\* (.*)/);
        if (!match) return;
        const savesMatch = [...match[1].matchAll(/(\w{3}) \+([0-9]+)/g)];
        savesMatch.forEach((save) => {
            savesObject[save[1]] = save[2];
        })
        return savesObject;
    }

    /**
     * Returns a creature's skills
     *
     * @ExampleFields: Perception, Insist
     *
     * @param text - markdown text
     * @private
     */
    private _getSkills(text: string): object {
        const skillsObject = {};
        const match = text.match(/\*\*Skills\*\* (.*)/);
        if (!match) return;
        const skills = [...match[0].matchAll(/(\w+) \+([0-9]+)/g)];
        skills.forEach((skill) => {
            skillsObject[skill[1]] = skill[2];
        })
        return skillsObject;
    }

    /**
     * Returns a creature's damage modifiers (Vulnerability, Resistance, Immunity)
     *
     * @ExampleFields: Immunity, Vulnerability
     *
     * @param text - markdown text
     * @private
     */
    private _getDamageModifiers(text: string): object {
        const modifiersObject = {}
        const match = [...text.matchAll(/\*\*Damage (\w+)\*\* (.*)/g)];
        match.forEach((modifier) => {
            modifiersObject[modifier[1]] = modifier[2];
        })
        return modifiersObject;
    }

    /**
     * Returns a creature's senses
     *
     * @ExampleFields: vision, passive Perception
     *
     * @param text - markdown text
     * @private
     */
    private _getSenses(text: string): object {
        const sensesObject = {};
        const match = [...text.match(/\*\*Senses\*\* ?(.*)?,? (passive Perception) ([0-9]+)/)];
        sensesObject["vision"] = match[1];
        sensesObject[match[2]] = match[3];
        return sensesObject;
    }

    /**
     * Returns a creature's languages as a string
     *
     * @param text - markdown text
     * @private
     */
    private _getLanguages(text: string): string {
        return [...text.match(/\*\*Languages\*\* (.*)/)][1];
    }

    /**
     * Returns a creature's challange rating
     *
     * @Fields: CR, XP
     *
     * @param text - markdown text
     * @private
     */
    private _getChallenge(text: string): object {
        const match = text.match(/\*\*Challenge\*\* (([0-9]+\/[0-9]+)|([0-9]+)) \((.*) XP\)/)
        return {CR: eval(match[1]), XP: Number(match[4].replace(',', ''))};
    }

    /**
     * Returns an attack's range.
     *
     * The object contains 2 fields, one for the ranges represented by a single number and one for ranges
     * represented with in the short/long style.
     *
     * @Fields: singleRange -> value, units, shape ; doubleRange -> short, long, units
     *
     * @param text - markdown text
     * @private
     */
    private _getAttackRange(text: string): object {
        let singleRangeMatch = text.match(/ ([0-9]+)([ \-])(ft|feet|foot)( line| cone| cube| sphere)?/);
        let doubleRangeMatch = text.match(/ ([0-9]+)\/([0-9]+) (\w+)/);
        const rangeObject = {
            singleRange: {value: null, units: null, shape: null},
            doubleRange: {short: null, long: null, units: null}
        };

        if (singleRangeMatch) {
            rangeObject.singleRange.value = singleRangeMatch[1];
            rangeObject.singleRange.units = singleRangeMatch[3];
            rangeObject.singleRange.shape = singleRangeMatch[4];
        }
        if (doubleRangeMatch) {
            rangeObject.doubleRange.short = doubleRangeMatch[1];
            rangeObject.doubleRange.long = doubleRangeMatch[2];
            rangeObject.doubleRange.units = doubleRangeMatch[3];
        }

        return rangeObject;
    }

    /**
     * Returns an attack's damage
     *
     * @param text - markdown text
     * @private
     */
    private _getAttackDamage(text: string): object {
        const match = [...text.matchAll(/\(([0-9]+d[0-9]+)( \+ ([0-9]+))?\) (\w+) damage/g)];
        const attackObject = [];
        match.forEach((attack) => {
            attackObject.push([`${attack[1]} ${attack[2] ? '+ @mod' : ''}`, attack[4], attack[3]]);
        })
        return attackObject
    }

    /**
     * Returns an attack's save DC and ability
     *
     * @Fields: DC, ability
     *
     * @param text - markdown text
     * @private
     */
    private _getAttackSave(text: string): object {
        let match = text.match(/DC ([0-9]+) (\w+)/);
        if (!match) return;
        const saveObject = {};
        saveObject["DC"] = match[1];
        saveObject["ability"] = match[2];
        return saveObject;
    }

    /**
     * Returns an attacks to hit modifier
     *
     * @param text - markdown text
     * @private
     */
    private _getAttackHit(text: string): number {
        const match = text.match(/([+-] ?[0-9]+) to hit/)
        if (match) return Number(match[1].replace(' ', ''));
        return;
    }

    /**
     * Returns an attack
     *
     * @Fields: damage, range, save, hit, target
     *
     * @param text - markdown text
     * @private
     */
    private _getAttack(text: string): object {
        const attackObject = {};
        attackObject['damage'] = this._getAttackDamage(text);
        attackObject['range'] = this._getAttackRange(text);
        attackObject['save'] = this._getAttackSave(text);
        attackObject['hit'] = this._getAttackHit(text);
        attackObject['target'] = 1;
        return attackObject;
    }

    /**
     * Returns a creature's spellcasting details
     *
     * @Fields: level -> spellcaster level, modifier -> spellcasting ability modifier
     *
     * @param text - markdown text
     * @private
     */
    private _getSpellcastingStats(text: string): object {
        const spellcastingLevel = [...text.match(/([0-9]+)\w{1,2}-level spellcaster/)];
        const spellcastingModifier = [...text.match(/spellcasting ability is (\w+)/)];
        return {level: spellcastingLevel[1], modifier: spellcastingModifier[1]};
    }

    /**
     * Returns a creature's abilities
     *
     * @Fields: description, data
     * @Note: `data` field may vary depending on the type of ability that is parsed
     *
     * @param text - markdown text
     * @private
     */
    private _getAbilities(text: string): object {
        const match = [...text.matchAll(/\*\*\*(.*?)\*\*\* (.*)/g)];
        const abilitiesObject = {};
        match.forEach((ability) => {
            abilitiesObject[ability[1]] = {
                description: ability[2],
                data: {}
            };
            if (ability[1] === 'Spellcasting.') abilitiesObject[ability[1]].data = this._getSpellcastingStats(ability[2]);
            else abilitiesObject[ability[1]].data = this._getAttack(ability[2]);
        })
        return abilitiesObject;
    }

    /**
     * Returns a creature's legendary actions
     *
     * @Field description, data, cost
     * @Note1 data field may vary depending on the type of action parsed
     * @Note2 cost field is by default 1, will be modified if the name of the action has a (Costs x Actions) structure
     *
     * @param text
     * @private
     */
    private _getLegendaryActions(text: string): object {
        const match = [...text.matchAll(/> \*\*(.*?)( \(Costs ([0-9]+) Actions\))?\.\*\* (.*)/g)];
        const actionObject = {};
        match.forEach((action) => {
            actionObject[action[1]] = {
                description: action[4],
                data: {},
                cost: 1
            };
            actionObject[action[1]].data = this._getAttack(action[4]);
            actionObject[action[1]].cost = action[3] ? action[3] : 1;
        })
        return actionObject;
    }

    /**
     * Returns a creature's spell list
     *
     * @ExampleFields: Cantrips, 1, 2, 3, 4
     * @Note: The function only returns the spell name because 5e stat block have only the names of the spells i guess...
     *
     * @param text - markdown text
     * @private
     */
    private _getSpells(text: string): object {
        const matchedSpells = [...text.matchAll(/(Cantrips|([0-9]+)\w{1,2} level) \(.*\): _(.*)_/g)];
        const spellsObject = {};
        matchedSpells.forEach((spell) => {
            const typeOfSpell = spell[2] ? spell[2] : spell[1];
            spellsObject[typeOfSpell] = spell[3].replace("*", "").split(", ");
        })
        return spellsObject;
    }

    /**
     * Returns the ability modifier given the ability score
     *
     * @param abilityScore - ability score, example 20 -> returns +5
     * @private
     */
    private _getAbilityModifier(abilityScore: number): number {
        return Math.floor(abilityScore / 2 - 5);
    }

    /**
     * Returns a creature's proficiency
     * The proficiency is calculated using an attack where the to hit score has the prof added adn the + to the damage roll doesn't
     *
     * @param abilities - an object of all the creatures abilities
     * @private
     */
    private _getProficiency(abilities: object): number {
        for (const key in abilities) {
            if (!abilities.hasOwnProperty(key)) continue;
            if (abilities[key]?.data?.hit && abilities[key]?.data?.damage[0][2])
                return abilities[key].data.hit - abilities[key].data.damage[0][2];
        }
        return 0;
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
        const creatureSkills = this._getSkills(text);
        const skillsObject = {};
        for (const skill in creatureSkills) {
            if (!creatureSkills.hasOwnProperty(skill)) continue;
            skillsObject[this._skillsToShortMap[skill]] = {value: Math.floor(creatureSkills[skill] / proficiency)};
        }
        return skillsObject
    }

    public async parser(markdownText) {
        const creatureSizeAndAlignment = this._getCreatureSizeAndAlignment(markdownText);
        const creatureArmor = this._getCreatureACAndSource(markdownText);
        const creatureHP = this._getCreatureHP(markdownText);
        const creatureStats = this._getCreatureStats(markdownText);
        const creatureSaves = this._getSavingThrowMods(markdownText);
        const creatureDamageModifiers = this._getDamageModifiers(markdownText);
        const creatureSenses = this._getSenses(markdownText);
        const creatureLanguages = this._getLanguages(markdownText);
        const creatureChallenge = this._getChallenge(markdownText);
        const creatureAbilities = this._getAbilities(markdownText);
        const creatureLegendaryActions = this._getLegendaryActions(markdownText);
        const creatureSpells = this._getSpells(markdownText);
        const creatureProficiency = this._getProficiency(creatureAbilities);
        let actor = await Actor.create({
            name: this._getCreatureName(markdownText),
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
                    speed: this._getCreatureSpeed(markdownText),
                    prof: creatureProficiency
                },
                details: {
                    alignment: creatureSizeAndAlignment['alignment'],
                    type: creatureSizeAndAlignment['race'],
                    cr: creatureChallenge['CR'],
                    xp: {value: creatureChallenge['XP']}
                },
                traits: {
                    size: this._sizesMap[creatureSizeAndAlignment['size']],
                    languages: {custom: creatureLanguages},
                    senses: creatureSenses['vision']
                },
                skills: this._makeSkillsStructure(markdownText, creatureProficiency)

            },
            token: {},
            items: [],
            flags: {}
        });
    }
}

export default MarkdownParser.getInstance();