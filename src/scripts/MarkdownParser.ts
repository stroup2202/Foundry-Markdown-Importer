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

    private _getCreatureACAndSource(text: string): object {
        const match = text.match(/ \*\*Armor Class\*\* ([0-9]+) ?(.*)?/);
        return {
            AC: match[1],
            source: match[2]
        };
    }

    private _getCreatureHP(text: string): object {
        const match = text.match(/ \*\*Hit Points\*\* ([0-9]+) \((.*?)\)/);
        return {
            HP: match[1],
            formula: match[2]
        };
    }

    private _getCreatureSpeed(text: string): object {
        const speedMatch = text.match(/\*\*Speed\*\* ([0-9]+ ft.),? ?(.*)?/);
        return {value: speedMatch[1], special: speedMatch[2]};
    }

    private _getCreatureStats(text: string): object {
        const stats = [...text.matchAll(/\|([0-9]+) \([+-][0-9]+\)/g)];
        const updatedStats = {Str: 0, Dex: 0, Con: 0, Int: 0, Wis: 0, Cha: 0};
        stats.forEach((stat, index) => {
            updatedStats[Object.keys(updatedStats)[index]] = (stat[1]);
        })
        return updatedStats;
    }

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

    private _getSkills(text: string): object {
        const skillsObject = {};
        const match = [...text.match(/\*\*Skills\*\* (.*)/g)][0];
        const skills = [...match.matchAll(/(\w+) \+([0-9]+)/g)];
        skills.forEach((skill) => {
            skillsObject[skill[1]] = skill[2];
        })
        return skillsObject;
    }

    private _getDamageModifiers(text: string): object {
        const modifiersObject = {}
        const match = [...text.matchAll(/\*\*Damage (\w+)\*\* (.*)/g)];
        match.forEach((modifier) => {
            modifiersObject[modifier[1]] = modifier[2];
        })
        return modifiersObject;
    }

    private _getSenses(text: string): object {
        const sensesObject = {};
        const match = [...text.match(/\*\*Senses\*\* ?(.*)?,? (passive Perception) ([0-9]+)/)];
        sensesObject["vision"] = match[1];
        sensesObject[match[2]] = match[3];
        return sensesObject;
    }

    private _getLanguages(text: string): string {
        return [...text.match(/\*\*Languages\*\* (.*)/)][1];
    }

    private _getChallenge(text: string): object {
        const match = text.match(/\*\*Challenge\*\* (([0-9]+\/[0-9]+)|([0-9]+)) \((.*)\)/)
        return {CR: match[1], XP: match[4]};
    }

    private _getAttackRange(text: string): object {
        let singleRangeMatch = text.match(/ ([0-9]+)([ \-])(ft|feet|foot)( line| cone| cube| sphere)?/);
        let doubleRangeMatch = text.match(/ ([0-9]+)\/([0-9]+) (\w+)/);
        const rangeObject = {
            singleRange: {value: null, units: null, shape: null},
            doubleRangeMatch: {short: null, long: null, units: null}
        };

        if (singleRangeMatch) {
            rangeObject.singleRange.value = singleRangeMatch[1];
            rangeObject.singleRange.units = singleRangeMatch[3];
            rangeObject.singleRange.shape = singleRangeMatch[4];
        }
        if (doubleRangeMatch) {
            rangeObject.doubleRangeMatch.short = doubleRangeMatch[1];
            rangeObject.doubleRangeMatch.long = doubleRangeMatch[2];
            rangeObject.doubleRangeMatch.units = doubleRangeMatch[3];
        }

        return rangeObject;
    }

    private _getAttackDamage(text: string): object {
        const match = [...text.matchAll(/\(([0-9]+d[0-9]+)( \+ ([0-9]+))?\) (\w+) damage/g)];
        const attackObject = [];
        match.forEach((attack) => {
            attackObject.push([`${attack[1]} ${attack[2] ? '+ @mod' : ''}`, attack[4], attack[3]]);
        })
        return attackObject
    }

    private _getAttackSave(text: string): object {
        let match = text.match(/DC ([0-9]+) (\w+)/);
        if (!match) return;
        match = [...match];
        const saveObject = {};
        saveObject["DC"] = match[1];
        saveObject["ability"] = match[2];
        return saveObject;
    }

    private _getAttackHit(text: string): number {
        const match = text.match(/([+-] ?[0-9]+) to hit/)
        if (match) return Number(match[1].replace(' ', ''));
        return;
    }

    private _getAttack(text: string): object {
        const attackObject = {};
        attackObject['damage'] = this._getAttackDamage(text);
        attackObject['range'] = this._getAttackRange(text);
        attackObject['save'] = this._getAttackSave(text);
        attackObject['hit'] = this._getAttackHit(text);
        attackObject['target'] = 1;
        return attackObject;
    }

    private _getSpellcastingStats(text: string): object {
        const spellcastingLevel = [...text.match(/([0-9]+)\w{1,2}-level spellcaster/)];
        const spellcastingModifier = [...text.match(/spellcasting ability is (\w+)/)];
        return {level: spellcastingLevel[1], modifier: spellcastingModifier[1]};
    }

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

    private _getSpells(text: string): object {
        const matchedSpells = [...text.matchAll(/(Cantrips|([0-9]+)\w{1,2} level) \(.*\): _(.*)_/g)];
        const spellsObject = {};
        matchedSpells.forEach((spell) => {
            const typeOfSpell = spell[2] ? spell[2] : spell[1];
            spellsObject[typeOfSpell] = spell[3].replace("*", "").split(", ");
        })
        return spellsObject;
    }

    private _getAbilityModifier(abilityScore: number): number {
        return Math.floor(abilityScore / 2 - 5);
    }

    private _getProficiency(abilities: object): number {
        for (const key in abilities) {
            if (!abilities.hasOwnProperty(key)) continue;
            if (abilities[key]?.data?.hit && abilities[key]?.data?.damage[0][2])
                return abilities[key].data.hit - abilities[key].data.damage[0][2];
        }
        return 0;
    }

    private _makeAbilitiesStructure(stats: object, saves: object, proficiency: number): object {
        const abilitiesObject = {}
        for (const stat in stats) {
            if (!stats.hasOwnProperty(stat)) continue;
            abilitiesObject[stat.toLowerCase()] = {
                value: stats[stat],
                proficient: saves[stat] ? 1 : 0,
                prof: proficiency
            };
        }
        return abilitiesObject
    }

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
                    ac: {value: creatureArmor['AC']},
                    hp: {
                        value: creatureHP['HP'],
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
                    size: creatureSizeAndAlignment['size']
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