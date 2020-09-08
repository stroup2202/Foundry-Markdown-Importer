class MarkdownParser {
    private static _instance: MarkdownParser;

    private constructor() {
    }

    public static getInstance(): MarkdownParser {
        if (!MarkdownParser._instance) MarkdownParser._instance = new MarkdownParser();
        return MarkdownParser._instance;
    }

    private _getCreatureName(text: string): string {
        return [...text.match(/> ## (.+)/)][1];
    }

    private _getCreatureSizeAndAlignment(text: string): string[] {
        const match = [...text.match(/\*(.*?), (.*?)\*/)];
        return [match[1], match[2]];
    }

    private _getCreatureACAndSource(text: string): [string, string] {
        const match = [...text.match(/ \*\*Armor Class\*\* ([0-9]+) \((.*?)\)/)]
        return [match[1], match[2]];
    }

    private _getCreatureHP(text: string): [string, string] {
        const match = [...text.match(/ \*\*Hit Points\*\* ([0-9]+) \((.*?)\)/)]
        return [match[1], match[2]];
    }

    private _getCreatureSpeed(text: string): string[] {
        const firstMatch = [...text.match(/ \*\*Speed\*\* (.*)/)][1];
        const speed = [...firstMatch.matchAll(/(\w+ ?[0-9]+ \w+\.)/g)];
        const updatedSpeed = []
        speed.forEach((sp) => {
            updatedSpeed.push(sp[1]);
        })
        return updatedSpeed;
    }

    private _getCreatureStats(text: string): number[] {
        const stats = [...text.matchAll(/\|([0-9]+) \(\+[0-9]+\)/g)];
        const updatedStats = [];
        stats.forEach((stat) => {
            updatedStats.push(stat[1]);
        })
        return updatedStats;
    }

    private _getSavingThrowMods(text: string): object {
        const savesObject = {};
        const match = [...text.match(/\*\*Saving Throws\*\* (.*)/g)][0];
        const savesMatch = [...match.matchAll(/ (\w{3}) \+([0-9]+)/g)];
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
        const match = [...text.match(/\*\*Senses\*\* (.*), (passive Perception )([0-9]+)/)];
        sensesObject["vision"] = match[1];
        sensesObject[match[2]] = match[3];
        return sensesObject;
    }

    private _getLanguages(text: string): string {
        return [...text.match(/\*\*Languages\*\* (.*)/)][1];
    }

    private _getChallenge(text: string): object {
        const match = [...text.match(/\*\*Challenge\*\* ([0-9]+) \((.*)\)/)]
        return {CR: match[1], XP: match[2]};
    }

    private _isWeaponAttack(text: string): boolean {
        return !!text.match(/_(\w+) Weapon Attack:_/g);
    }

    private _getAttackRange(text: string): object {
        let match = text.match(/([0-9]+)( |-)(ft|feet|foot)( line| cone| cube| sphere)?/)
        if (!match) return;
        match = [...match];
        return {value: match[1], units: match[3], shape: match[4]}
    }

    private _getAttackDamage(text: string): object {
        const match = [...text.matchAll(/\(([0-9]+d[0-9]+)( \+ ([0-9]+))?\) (\w+) damage/g)];
        const attackObject = [];
        match.forEach((attack) => {
            attackObject.push([`${attack[1]} ${attack[2] ? '+ @mod' : ''}`, attack[4]]);
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

    private _getAbilities(text: string): object {
        const match = [...text.matchAll(/\*\*\*(.*?)\*\*\* (.*)/g)];
        const abilitiesObject = {};
        match.forEach((ability) => {
            abilitiesObject[ability[1]] = {
                description: ability[2],
                range: {
                    value: null,
                    units: null
                },
                target: {
                    value: null
                },
                damage: []
            };
            abilitiesObject[ability[1]].range = this._getAttackRange(ability[2]);
            abilitiesObject[ability[1]].target.value = 1;
            abilitiesObject[ability[1]].damage = this._getAttackDamage(ability[2]);
            abilitiesObject[ability[1]].save = this._getAttackSave(ability[2]);
        })
        return abilitiesObject;
    }

    private _getLegendaryActions(text: string): object {
        const match = [...text.matchAll(/> \*\*(.*?)( \(Costs ([0-9]+) Actions\))?\.\*\* (.*)/g)];
        const actionObject = {};
        match.forEach((action)=>{
            actionObject[action[1]] = {
                description: action[4],
                range: {
                    value: null,
                    units: null
                },
                target: {
                    value: 1
                },
                damage: [],
                cost: 1
            };
            actionObject[action[1]].range = this._getAttackRange(action[4]);
            actionObject[action[1]].damage = this._getAttackDamage(action[4]);
            actionObject[action[1]].save = this._getAttackSave(action[4]);
            actionObject[action[1]].cost = action[3]? action[3] : 1;
        })
        return actionObject;
    }

    public parser(markdownText) {
        const creatureName = this._getCreatureName(markdownText);
        const creatureSizeAndAlignment = this._getCreatureSizeAndAlignment(markdownText);
        const creatureArmor = this._getCreatureACAndSource(markdownText);
        const creatureHP = this._getCreatureHP(markdownText);
        const creatureSpeed = this._getCreatureSpeed(markdownText);
        const creatureStats = this._getCreatureStats(markdownText);
        const creatureSaves = this._getSavingThrowMods(markdownText);
        const creatureSkills = this._getSkills(markdownText);
        const creatureDamageModifiers = this._getDamageModifiers(markdownText);
        const creatureSenses = this._getSenses(markdownText);
        const creatureLanguages = this._getLanguages(markdownText);
        const creatureChallenge = this._getChallenge(markdownText);
        const creatureAbilities = this._getAbilities(markdownText);
        const creatureLegendaryActions = this._getLegendaryActions(markdownText);
        console.log(creatureArmor);
    }
}

export default MarkdownParser.getInstance();