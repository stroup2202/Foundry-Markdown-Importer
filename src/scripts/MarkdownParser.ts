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
        return savesMatch;
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

    private _getChallenge(text: string):object{
        const match = [...text.match(/\*\*Challenge\*\* ([0-9]+) \((.*)\)/)]
        return {CR:match[1],XP:match[2]};
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
        console.log(creatureArmor);
    }
}

export default MarkdownParser.getInstance();