import ImportWindow from "./ImportWindow.js";

Hooks.on("renderSidebarTab", async (app, html) => {
    if (app?.options?.id == "actors") {
        let button = $("<button class='import-markdown'><i class='fas fa-file-import'></i>Tetra Cube Import</button>");
        button.on('click', ()=> {
            new ImportWindow().render(true);
        });
        html.find(".directory-footer").append(button);
    }
})

Hooks.on("renderActorSheet", (sheet)=>{
    console.log(sheet);
})