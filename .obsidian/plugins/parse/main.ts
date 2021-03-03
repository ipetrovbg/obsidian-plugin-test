import { Events, Notice, Plugin, TFile, View, Workspace, WorkspaceLeaf } from 'obsidian';
import {exec} from "child_process";


export default class DataTablePlugin extends Plugin {
    workspace: Workspace;

    public async onload(): Promise<void> {

        const rootPath = (this.app.vault.adapter as any).basePath;
        const readyCmd = `cd ${rootPath} && git pull`;
        new Notice(readyCmd);
        exec(readyCmd, (err, stdout) => {
            if (err) {
                console.log(err);
                return;                
            }
            console.log(stdout);
        });
        this.workspace = this.app.workspace;
        
        
        this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			if (evt.which === 83 && evt.metaKey) {
                const command = `cd ${rootPath} && git add . && git commit -m "sync" && git push`;
                new Notice(command);
                exec(command, (err, stdout) => {
                    if (err) {
                        console.log(err);
                        return;                
                    }
                    console.log(stdout);
                });
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