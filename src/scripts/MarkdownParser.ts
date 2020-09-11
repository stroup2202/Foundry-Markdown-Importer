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

    private _resistanceMap: { [key: string]: string } = {
        "Damage Immunities": "di",
        "Damage Vulnerabilities": "dv",
        "Damage Resistances": "dr",
        "Condition Immunities": "ci"
    }

    private _abilitiesMap: { [key: string]: string } = {
        'Strength': 'str',
        'Dexterity': 'dex',
        'Constitution': 'con',
        'Intelligence': 'int',
        "Wisdom": 'wis',
        "Charisma": 'cha'
    }

    public shortenAbilities(ability: string): string {
        return this._abilitiesMap[ability];
    }

    public shortenSkills(skill: string): string {
        return this._skillsToShortMap[skill];
    }

    public convertSizes(size: string): string {
        return this._sizesMap[size];
    }

    public convertResistance(resistance: string): string {
        return this._resistanceMap[resistance];
    }

    /**
     * Returns a creature's name
     *
     * @param text - markdown text
     */
    public getCreatureName(text: string): string {
        const match = text.match(/> ## (.+)/);
        if (!match) return;
        return match[1];
    }

    public getCreatureSizeAndAlignment(text: string): object {
        const match = text.match(/\*(\w+) (\w+).*, (.*?)\*/);
        if (!match) return;
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
     */
    public getCreatureACAndSource(text: string): object {
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
     */
    public getCreatureHP(text: string): object {
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
     */
    public getCreatureSpeed(text: string): object {
        const speedMatch = text.match(/\*\*Speed\*\* ([0-9]+ ft.),? ?(.*)?/);
        return {value: speedMatch[1], special: speedMatch[2]};
    }

    /**
     * Returns a creature's stats
     *
     * @Fields: Str, Dex, Con, Int, Wis, Cha
     *
     * @param text - markdown text
     */
    public getCreatureStats(text: string): object {
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
     */
    public getSavingThrowMods(text: string): object {
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
     */
    public getSkills(text: string): object {
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
     */
    public getDamageModifiers(text: string): object {
        const modifiersObject = {}
        const damageMatch = [...text.matchAll(/\*\*(Damage \w+)\*\* (.*)/g)];
        const conditionMatch = [...text.matchAll(/\*\*(Condition Immunities)\*\* (.*)/g)]
        damageMatch.forEach((modifier) => {
            modifiersObject[modifier[1]] = modifier[2];
        })
        conditionMatch.forEach((modifier) => {
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
     */
    public getSenses(text: string): object {
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
     */
    public getLanguages(text: string): string {
        return [...text.match(/\*\*Languages\*\* (.*)/)][1];
    }

    /**
     * Returns a creature's challange rating
     *
     * @Fields: CR, XP
     *
     * @param text - markdown text
     */
    public getChallenge(text: string): object {
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
     */
    public getAttackRange(text: string): object {
        let singleRangeMatch = text.match(/ ([0-9]+)([ \-])(ft|feet|foot)( line| cone| cube| sphere)?/);
        let doubleRangeMatch = text.match(/ ([0-9]+)\/([0-9]+) (\w+)/);
        const rangeObject = {
            singleRange: {value: null, units: null, type: null},
            doubleRange: {value: null, long: null, units: null}
        };


        if (singleRangeMatch) {
            if (singleRangeMatch[4]) singleRangeMatch[4] = singleRangeMatch[4].replace(' ', '');
            rangeObject.singleRange.value = singleRangeMatch[1];
            rangeObject.singleRange.units = 'ft';
            rangeObject.singleRange.type = singleRangeMatch[4];
        }
        if (doubleRangeMatch) {
            rangeObject.doubleRange.value = doubleRangeMatch[1];
            rangeObject.doubleRange.long = doubleRangeMatch[2];
            rangeObject.doubleRange.units = 'ft';
        }

        return rangeObject;
    }

    /**
     * Returns an attack's damage
     *
     * @param text - markdown text
     */
    public getAttackDamage(text: string): object {
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
     */
    public getAttackSave(text: string): object {
        let match = text.match(/DC ([0-9]+) (\w+)/);
        if (!match) return;
        const saveObject = {};
        saveObject["dc"] = match[1];
        saveObject["ability"] = this.shortenAbilities(match[2]);
        return saveObject;
    }

    /**
     * Returns an attacks to hit modifier
     *
     * @param text - markdown text
     */
    public getAttackHit(text: string): number {
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
     */
    public getAttack(text: string): object {
        const attackObject = {};
        attackObject['damage'] = this.getAttackDamage(text);
        attackObject['range'] = this.getAttackRange(text);
        attackObject['save'] = this.getAttackSave(text);
        attackObject['hit'] = this.getAttackHit(text);
        attackObject['target'] = 1;
        return attackObject;
    }

    /**
     * Returns a creature's spellcasting details
     *
     * @Fields: level -> spellcaster level, modifier -> spellcasting ability modifier
     *
     * @param text - markdown text
     */
    public getSpellcastingStats(text: string): object {
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
     */
    public getAbilities(text: string): object {
        const match = [...text.matchAll(/\*\*\*(.*?)\*\*\* (.*)/g)];
        const abilitiesObject = {};
        match.forEach((ability) => {
            abilitiesObject[ability[1]] = {
                description: ability[2],
                data: {}
            };
            if (ability[1] === 'Spellcasting.') abilitiesObject[ability[1]].data = this.getSpellcastingStats(ability[2]);
            else abilitiesObject[ability[1]].data = this.getAttack(ability[2]);
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
     */
    public getLegendaryActions(text: string): object {
        const match = [...text.matchAll(/> \*\*(.*?)( \(Costs ([0-9]+) Actions\))?\.\*\* (.*)/g)];
        const legendaryActionDescription = text.match(/> (.* can take [0-9]+ legendary actions, .*)/);
        const actionObject = {};
        match.forEach((action) => {
            actionObject[action[1]] = {
                description: action[4],
                data: {},
                cost: 1
            };
            actionObject[action[1]].data = this.getAttack(action[4]);
            actionObject[action[1]].cost = action[3] ? action[3] : 1;
        })
        actionObject['Legendary Actions'] = {
            description: legendaryActionDescription?.[1],
            data: this.getAttack(legendaryActionDescription?.[1])
        }
        return actionObject;
    }

    /**
     * Returns a creature's spell list
     *
     * @ExampleFields: Cantrips, 1, 2, 3, 4
     * @Note: The function only returns the spell name because 5e stat block have only the names of the spells i guess...
     *
     * @param text - markdown text
     */
    public getSpells(text: string): object {
        const matchedSpells = [...text.matchAll(/(Cantrips|([0-9]+)\w{1,2} level) \(.*\): _(.*)_/g)];
        const spellsObject = {};
        matchedSpells.forEach((spell) => {
            const typeOfSpell = spell[2] ? spell[2] : spell[1];
            spellsObject[typeOfSpell] = spell[3].replace("*", "").split(", ");
        })
        return spellsObject;
    }

    /**
     * Returns a creature's proficiency
     * The proficiency is calculated using an attack where the to hit score has the prof added adn the + to the damage roll doesn't
     *
     * @param abilities - an object of all the creatures abilities
     */
    public getProficiency(abilities: object): number {
        for (const key in abilities) {
            if (!abilities.hasOwnProperty(key)) continue;
            if (abilities[key]?.data?.hit && abilities[key]?.data?.damage[0][2])
                return abilities[key].data.hit - abilities[key].data.damage[0][2];
        }
        return 0;
    }

    /**
     * Returns the ability modifier given the ability score
     *
     * @param abilityScore - ability score, example 20 -> returns +5
     */
    public getAbilityModifier(abilityScore: number): number {
        return Math.floor(abilityScore / 2 - 5);
    }
}

export default MarkdownParser.getInstance();