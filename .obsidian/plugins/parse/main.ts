import { Plugin, TFile, View, Workspace, WorkspaceLeaf } from 'obsidian';
import {exec} from "child_process";

const tableString = `
# some text here

and some text here too

| column(Column,string) | secondColum(Second Column, string) | 
| --------------------- | ---------------------------------- |
| data                  | data in second column              |
test

`;



// console.log(tableString);

class DataTableView extends View {
    static type = 'data-table'
    getViewType(): string {
        return DataTableView.type;
    }

    getDisplayText(): string {
        return 'Data Table View';
    }

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }


}

export default class DataTablePlugin extends Plugin {
    workspace: Workspace;

    async onload() {
        this.workspace = this.app.workspace;
        const path = (this.app.vault.adapter as any).basePath;
        const files = this.app.vault.getMarkdownFiles();
        exec(`cd ${path} && git status`, (err, stdout) => {
            if (!err) {
                console.log(stdout);
            }
        });

        this.registerMarkdownPostProcessor(async (el, ctx) => {
            const map = new Map();
            // console.log(this.app.vault.getFiles());
            const files = this.app.vault.getMarkdownFiles();
            for (const file of files) {
                const cache = this.app.metadataCache.getCache(file.path);
                if (cache?.tags?.length) {
                    const cachedData = await this.getCacheData(file)

                    map.set(file.path, {
                        name: file.name,
                        tags: cache?.tags.map(t => t.tag),
                        data: cachedData
                    });
                }   
            }
            // console.log(map)
            // let dataviewCode = el.find('code.language-datatableview');
            // if (dataviewCode) {
            //     console.log(dataviewCode);
                
            // }
        });

        // if (!this.workspace.layoutReady) {
		// 	this.workspace.on("layout-ready", async () => {

        //     });
		// }
    }

    private async getCacheData(file: TFile): Promise<string> {
        return await this.app.vault.cachedRead(file);
    }
}