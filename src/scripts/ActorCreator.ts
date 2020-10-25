import MarkdownParser from "./MarkdownParser";
import ItemCreator from "./ItemCreator";

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
     * @param propSkills - object containing all the skills data from the parser
     * @param proficiency - proficiency score
     * @private
     */
    private _makeSkillsStructure(propSkills: any, proficiency: number): object {
        const skillsObject = {};
        for (const skill in propSkills.skills) {
            if (!propSkills.skills.hasOwnProperty(skill)) continue;
            skillsObject[MarkdownParser.shortenSkills(skill)] = {value: Math.floor(propSkills.skills[skill] / proficiency)};
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
        const conditionsDefault = ['blinded', 'charmed', 'deafened', 'diseased', 'exhaustion', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'];
        const defaultResistances = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
        const structure = {};
        for (const key in modifiers) {
            if (!modifiers.hasOwnProperty(key)) continue;
            const modifier = modifiers[key];
            const standardRes = [];
            const customRes = [];
            modifier.split(', ').forEach((mod) => {
                if (conditionsDefault.includes(mod) || defaultResistances.includes(mod)) standardRes.push(mod);
                else customRes.push(mod);
            })
            structure[MarkdownParser.convertResistance(key)] = {
                value: standardRes,
                custom: customRes.join(';')
            }
        }
        return structure;
    }

    /**
     * Returns a foundry friendly structure for the traits part of the actor
     *
     * @private
     * @param propsTraits - object containing all the traits data extracted from the parser
     */
    private _makeTraitsStructure(propsTraits: any): object {
        return {
            ...this._makeResistancesStructure(propsTraits.damageModifiers),
            size: MarkdownParser.convertSizes(propsTraits.size),
            languages: {
                custom: propsTraits.languages
            },
            senses: propsTraits.senses['vision']
        };
    }

    /**
     * Returns a foundry friendly structure for the details part
     *
     * @param propsDetails - object containing all the details data from the parser
     * @param abilities - object structure of all abilities to get the spellcasting level if needed
     * @private
     */
    private _makeDetailsStructure(propsDetails: any, abilities): object {
        return {
            alignment: propsDetails.alignment,
            type: propsDetails.race,
            cr: propsDetails.challenge['CR'],
            xp: {
                value: propsDetails.challenge['XP']
            },
            spellLevel: abilities?.Spellcasting?.data?.level
        };
    }

    /**
     * Returns a foundry friendly structure for the HP
     *
     * @private
     * @param propsHP - object that contains all the hp data extracted from markdown
     */
    private _makeHpStructure(propsHP: any): object {
        return {
            value: Number(propsHP['HP']),
            max: Number(propsHP['HP']),
            formula: propsHP['formula']
        };
    }

    /**
     * Returns a foundry friendly structure for the attributes tab
     *
     * @param propsAttributes - object containing all the attributes extracted from markdown
     * @param creatureProficiency - creature's proficiency modifier
     * @param abilities - abilities object for extracting the spellcaster abilities of the creature
     * @private
     */
    private _makeAttributesStructure(propsAttributes: any, creatureProficiency: number, abilities): object {
        return {
            ac: {
                value: Number(propsAttributes.armor['AC'])
            },
            hp: this._makeHpStructure(propsAttributes.hp),
            speed: propsAttributes.speed,
            prof: creatureProficiency,
            spellcasting: MarkdownParser.shortenAbilities(abilities?.Spellcasting?.data?.modifier)
        };
    }

    /**
     * Returns the resources structure
     *
     * @param propsRes - object that contains the resources from the parser
     * @private
     */
    private _makeResourcesStructure(propsRes: any): object {
        return {
            legact: {
                value: propsRes?.numberOfLegendaryActions,
                max: propsRes?.numberOfLegendaryActions
            },
            legres: {
                value: propsRes?.numberOfLegendaryResistances,
                max: propsRes?.numberOfLegendaryResistances
            }
        }
    }

    /**
     * Returns a foundry friendly structure for the data field of the actor
     *
     * @param propsData - an object that contains all the data extracted from the parser
     * @param creatureProficiency - proficiency of the actor
     * @param creatureAbilities - abilities object of the actor
     * @param creatureStats - stats of the actor
     * @private
     */
    private _makeDataStructure(propsData: any, creatureProficiency: number, creatureAbilities: object, creatureStats: object): object {
        return {
            abilities: this._makeAbilitiesStructure(creatureStats, propsData.savingThrowMods, creatureProficiency),
            attributes: this._makeAttributesStructure(propsData.attributes, creatureProficiency, creatureAbilities),
            details: this._makeDetailsStructure(propsData.details, creatureAbilities),
            traits: this._makeTraitsStructure(propsData.traits),
            skills: this._makeSkillsStructure(propsData.skills, creatureProficiency),
            resources: this._makeResourcesStructure(propsData.resources),
            spells: propsData.spellslots
        };
    }

    /**
     * Returns an object of all the data parsed
     *
     * @param markdownText - input text
     * @private
     */
    private _makeProps(markdownText: string): any {
        const sizeAndAlignment = MarkdownParser.getCreatureSizeAndAlignment(markdownText);
        const props = {
            name: MarkdownParser.getCreatureName(markdownText),
            abilities: MarkdownParser.getAbilities(markdownText),
            legendaryActions: MarkdownParser.getLegendaryActions(markdownText),
            spells: MarkdownParser.getSpells(markdownText),
            stats: MarkdownParser.getCreatureStats(markdownText),
            data: {
                savingThrowMods: MarkdownParser.getSavingThrowMods(markdownText),
                attributes: {
                    armor: MarkdownParser.getCreatureACAndSource(markdownText),
                    speed: MarkdownParser.getCreatureSpeed(markdownText),
                    hp: MarkdownParser.getCreatureHP(markdownText)
                },
                details: {
                    alignment: sizeAndAlignment['alignment'],
                    race: sizeAndAlignment['race'],
                    challenge: MarkdownParser.getChallenge(markdownText)
                },
                traits: {
                    size: sizeAndAlignment['size'],
                    languages: MarkdownParser.getLanguages(markdownText).toLocaleLowerCase(),
                    senses: MarkdownParser.getSenses(markdownText),
                    damageModifiers: MarkdownParser.getDamageModifiers(markdownText),
                },
                skills: {
                    skills: MarkdownParser.getSkills(markdownText)
                },
                resources: {
                    numberOfLegendaryActions: MarkdownParser.getNumberOfLegendaryActions(markdownText),
                    numberOfLegendaryResistances: MarkdownParser.getNumberOfLegendaryResistances(markdownText)
                },
                spellslots: MarkdownParser.getSpellSlots(markdownText)
            }
        }
        // @ts-ignore
        props['proficiency'] = Math.max(Math.floor((props?.data?.details?.challenge?.CR - 1) / 4) + 2, 2);
        return props;
    }

    public async actorCreator(markdownText: string) {
        const props = this._makeProps(markdownText);

        let actor = await Actor.create({
            name: props.name,
            type: "npc",
            img: "",
            sort: 12000, //here to make it be last item in the list, not sure what 12000 means, i copy pasted this from somewhere
            data: this._makeDataStructure(props.data, props.proficiency, props.abilities, props.stats),
            token: {},
            items: [],
            flags: {}
        }, {renderSheet: true});

        if (props.abilities) await ItemCreator.abilitiesAdder(actor, props.abilities, props.stats);
        if (props.legendaryActions) await ItemCreator.abilitiesAdder(actor, props.legendaryActions, props.stats);
        if (props.spells) await ItemCreator.spellsAdder(actor, props.spells);
    }

}

export default ActorCreator.getInstance();