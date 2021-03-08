import { normalizePath, Notice, Plugin, TFile, Workspace } from 'obsidian';
import { exec } from "child_process";
import {GitHubSettingTab} from './settings-tab';


export default class GitHubSyncPlugin extends Plugin {
    private gitSyncMessage = 'Git Syncing...';
    public async onload(): Promise<void> {

        const rootPath = normalizePath((this.app.vault.adapter as any).basePath);
        const readyCmd = `cd '${rootPath}' && git pull`;
        new Notice(this.gitSyncMessage);
        exec(readyCmd, (err, stdout) => {
            if (err) {
                return;
            }
            new Notice(stdout);
        });

        this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			if (evt.which === 83 && evt.metaKey) {
                const command = `cd '${rootPath}' && git add . && git commit -m "sync" && git push`;

                new Notice(this.gitSyncMessage);

                exec(command, (err, stdout, stdErr) => {
                    if (err) {
                        new Notice("Already up to date.");
                    } else {
                        new Notice("Done.");
                    }
                });
                
            }
		});

        this.addSettingTab(new GitHubSettingTab(this.app, this));

    }
}
