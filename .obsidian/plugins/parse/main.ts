import {Command, normalizePath, Notice, Plugin, TFile, Workspace } from 'obsidian';
import {exec, ExecException} from "child_process";
import {GitHubSettingTab} from './settings-tab';


export default class GitHubSyncPlugin extends Plugin {
    private gitSyncMessage = 'Git Syncing...';
    public async onload(): Promise<void> {


        const rootPath = normalizePath((this.app.vault.adapter as any).basePath);
        const gitPullCommand = `cd "${rootPath}" && git pull`;
        const gitSyncCommand = `cd "${rootPath}" && git add . && git commit -m "sync" && git push`;
        const gitPushCommand = `cd "${rootPath}" && git push`;
        const gitCommitCommand = `cd "${rootPath}" && git add . && git commit -m "sync"`;


        this.addCommand({
            id: 'git-pull',
            name: 'Git Pull',
            callback: () => {

                new Notice("Git Pull...");
                exec(gitPullCommand, this.handleGitCommand.bind(this));
            }
        });

        this.addCommand({
            id: 'git-sync',
            name: 'Git Sync',
            callback: () => {

                new Notice("Git Sync...");
                exec(gitSyncCommand, this.handleGitCommand.bind(this));
            }
        });
        this.addCommand({
            id: 'git-commit',
            name: 'Git Commit',
            callback: () => {

                new Notice("Git Commit...");
                exec(gitCommitCommand, this.handleGitCommand.bind(this));
            }
        });
        this.addCommand({
            id: 'git-push',
            name: 'Git Push',
            callback: () => {

                new Notice("Git Push...");
                exec(gitPushCommand, this.handleGitCommand.bind(this));
            }
        });
        new Notice(this.gitSyncMessage);
        exec(gitPullCommand, this.handleGitCommand.bind(this));

        this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			if (evt.which === 83 && evt.metaKey || evt.ctrlKey && evt.which === 83) {
                const command = `cd "${rootPath}" && git add . && git commit -m "sync" && git push`;

                new Notice(this.gitSyncMessage);

                exec(command, this.handleGitCommand.bind(this));

            }
		});

        this.addSettingTab(new GitHubSettingTab(this.app, this));

    }

    private handleGitCommand(err: ExecException | null) {
        if (new RegExp('No configured push destination').test(err?.message)) {
            new Notice("You need to setup git repository.");
        } else if (new RegExp('There is no tracking information for the current branch').test(err?.message)) {
            new Notice("There is no tracking information for the current branch");
        } else if (err && new RegExp(`Command failed: ${err.cmd}`).test(err?.message)) {
            new Notice("Nothing has changed.");
        } else if (err) {
           new Notice("Already up to date.");
        } else {
            new Notice("Done.");
        }

    }
}
