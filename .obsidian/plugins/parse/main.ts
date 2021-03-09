import {Command, normalizePath, Notice, Plugin, TFile, Workspace } from 'obsidian';
import {exec, ExecException} from "child_process";
import {GitHubSettingTab} from './settings-tab';


export default class GitHubSyncPlugin extends Plugin {
    private gitSyncMessage = 'Git Syncing...';
    private gitPullMessage = 'Git Pull...';
    private gitPushMessage = 'Git Push...';
    private gitCommitMessage = 'Git Commit...';

    public async onload(): Promise<void> {


        const rootPath = normalizePath((this.app.vault.adapter as any).basePath);



        this.addCommand({
            id: 'git-pull',
            name: 'Git Pull',
            callback: () => this.executePullCallback(rootPath)
        });

        this.addCommand({
            id: 'git-sync',
            name: 'Git Sync',
            callback: () => this.executeSyncCallback(rootPath)
        });

        this.addCommand({
            id: 'git-commit',
            name: 'Git Commit',
            callback: () => this.executeCommitCallback(rootPath)
        });

        this.addCommand({
            id: 'git-push',
            name: 'Git Push',
            callback: () => this.executePushCallback(rootPath)
        });

        this.executePullCallback(rootPath);

        this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			if (evt.which === 83 && evt.metaKey || evt.ctrlKey && evt.which === 83) {
                this.executeSyncCallback(rootPath);
            }
		});

        this.addSettingTab(new GitHubSettingTab(this.app, this));

    }

    private executePullCallback(rootPath: string) {
        const gitPullCommand = `cd "${rootPath}" && git pull`;
        new Notice(this.gitPullMessage);
        exec(gitPullCommand, this.handleGitCommand.bind(this));
    }

    private executeCommitCallback(rootPath: string) {
        const gitCommitCommand = `cd "${rootPath}" && git add . && git commit -m "sync"`;
        new Notice(this.gitCommitMessage);
        exec(gitCommitCommand, this.handleGitCommand.bind(this));
    }

    private executeSyncCallback(rootPath: string) {
        const gitSyncCommand = `cd "${rootPath}" && git add . && git commit -m "sync" && git push`;
        new Notice(this.gitSyncMessage);
        exec(gitSyncCommand, this.handleGitCommand.bind(this));
    }

    private executePushCallback(rootPath: string) {
        const gitPushCommand = `cd "${rootPath}" && git push`;
        new Notice(this.gitPushMessage);
        exec(gitPushCommand, this.handleGitCommand.bind(this));
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
