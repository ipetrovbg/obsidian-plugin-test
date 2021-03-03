import { Events, Notice, Plugin, TFile, View, Workspace, WorkspaceLeaf } from 'obsidian';
import {exec} from "child_process";


export default class DataTablePlugin extends Plugin {
    workspace: Workspace;
    private gitSyncMessage = 'Git Syncing...';
    public async onload(): Promise<void> {

        const rootPath = (this.app.vault.adapter as any).basePath;
        const readyCmd = `cd ${rootPath} && git pull`;
        new Notice(this.gitSyncMessage);
        exec(readyCmd, (err, stdout) => {
            if (err) {
                console.log(err);
                return;                
            }
            new Notice(stdout);
        });
        this.workspace = this.app.workspace;
        
        
        this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			if (evt.which === 83 && evt.metaKey) {
                const command = `cd ${rootPath} && git add . && git commit -m "sync" && git push`;
                new Notice(this.gitSyncMessage);
                exec("ls", console.log);
                exec(command, (err, stdout, stdErr) => {
                    if (err) {
                        new Notice("Git Sync Error");
                        return;                
                    }
                    new Notice(stdout, 20000);
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