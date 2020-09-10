import ActorCreator from "./ActorCreator";

export default class ImportWindow extends Application {

    static get defaultOptions()
    {
        const options = super.defaultOptions;
        options.id = "md-importer";
        options.template = "modules\\Foundry-Markdown-Importer\\templates\\importer.html"
        options.resizable = false;
        options.height = "auto";
        options.width = 400;
        options.minimizable = true;
        options.title = "Markdown Importer"
        return options;
    }
    activateListeners(html) {
        super.activateListeners(html);
        html.find(".text-input").change(()=>{
            // @ts-ignore
            ActorCreator.actorCreator($("[name='text']")[0].value);
        })
    }
}
