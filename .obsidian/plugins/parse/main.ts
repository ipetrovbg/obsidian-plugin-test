import { normalizePath, Notice, Plugin, Workspace } from 'obsidian';
import {exec, ExecException} from "child_process";
import {GitHubSettingTab} from './settings-tab';


export default class GitHubSyncPlugin extends Plugin {
    private gitSyncMessage = 'Git Syncing...';
    private gitPullMessage = 'Git Pull...';
    private gitPushMessage = 'Git Push...';
    private gitCommitMessage = 'Git Commit...';
    private gitBranchMessage = 'Git Branch';
    private gitChangesCountMessage = 'Git Changes Counting..';
    private gitChangesMessage = 'Git Changes..';

    public async onload(): Promise<void> {

        const rootPath = normalizePath((this.app.vault.adapter as any).basePath);

        this.addStatusBarItem().createSpan({cls: 'git'}, el =>
            this.countAndRenderGitChanges(el, rootPath));

        this.addCommand({
            id: 'git-changes',
            name: 'Git Changes',
            callback: () => this.executeChanges(rootPath)
        });

        this.addCommand({
            id: 'git-changes-count',
            name: 'Git Changes Count',
            callback: () => this.executeChangesCount(rootPath, count => {
                new Notice(`You have ${count} ${ +count === 1 ? 'change' : 'changes'}`, 10000);
                this.executeBranchCommand(rootPath, branch => {
                    const gitEl = (this.app as any).statusBar.containerEl.getElementsByClassName('git');
                    if (count) {
                        if (gitEl && gitEl.length) {
                            gitEl[0].innerHTML = `${branch} ${count === 1 ? '[' + count + ' change]' : '[' + count + ' changes]'}`;
                        }
                    } else {
                        if (gitEl && gitEl.length) {
                            gitEl[0].innerHTML = `${branch} [no changes]`;
                        }
                    }
                });
            })
        });

        this.addCommand({
            id: 'git-pull',
            name: 'Git Pull',
            callback: () => this.executePullCallback(rootPath)
        });

        this.addCommand({
            id: 'git-commit-and-push',
            name: 'Git Commit and Push',
            callback: () => this.executeSyncCallback(rootPath)
        });

        this.addCommand({
            id: 'git-commit',
            name: 'Git Commit',
            callback: () => this.executeCommitCallback(rootPath)
        });

        this.addCommand({
            id: 'git-branch',
            name: 'Git Branch',
            callback: () => this.executeBranchCommand(rootPath)
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

    private countAndRenderGitChanges(el: HTMLElement, rootPath: string) {
        this.executeBranchCommand(rootPath, branch => {
            this.executeChangesCount(rootPath, count => {
                if (count) {
                    if (el) {
                        el.innerHTML = `${branch} ${count === 1 ? '[' + count + ' change]' : '[' + count + ' changes]'}`;
                    }
                } else {
                    if (el) {
                        el.innerHTML = `${branch} [no changes]`;
                    }
                }
            });
        });
    }

    private renderChanges(rootPath: string): void {
        const gitEl = (this.app as any).statusBar.containerEl.getElementsByClassName('git');

        if (gitEl && gitEl.length) {
            this.countAndRenderGitChanges(gitEl[0], rootPath);
        }
    }

    private executeChanges(rootPath: string) {
        const gitChangesCommand = `cd "${rootPath}" && git status -s`;
        new Notice(this.gitChangesMessage);

        this.executeChangesCount(rootPath, count => {
            if (count) {
                exec(gitChangesCommand, ((error, changes) => {
                    if (!error) {
                        new Notice(changes, 20000);
                    } else {
                        new Notice('Error.');
                    }
                }));
            } else {
                new Notice("You don't have any changes");
            }
        });
    }

    private executeChangesCount(rootPath: string, callback?: (count: number) => void) {
        const os = process.platform;
        let gitChangesCountCommand = "";
        if (os === 'win32') {
            gitChangesCountCommand = `cd "${rootPath}" && git status -s | find /c /v ""`;
        } else if (os === 'darwin') {
            gitChangesCountCommand = `cd "${rootPath}" && git status -s | egrep "" | wc -l`;
        }


        if (!callback) {
            new Notice(this.gitChangesCountMessage);
        }

        exec(gitChangesCountCommand, ((error, count) => {
            if (!error) {
                if (callback) {
                    callback(+count);
                } else {
                    new Notice(`You have ${count} ${ +count === 1 ? 'change' : 'changes'}`, 10000);
                }
            } else {
                new Notice('Error.');
            }
        }));
    }

    private executeBranchCommand(rootPath: string, callback?: (branch: string) => void) {
        const gitBranchCommand = `cd "${rootPath}" && git branch`;
        if (!callback) {
            new Notice(this.gitBranchMessage);
        }
        exec(gitBranchCommand, ((error, branchInfo) => {
            if (!error) {
                if (!callback) {
                    new Notice(`You are on ${branchInfo} branch`, 10000);
                } else {
                    callback(branchInfo);
                }
            } else {
                new Notice('Error.');
            }
        }));
    }

    private executePullCallback(rootPath: string) {
        const gitPullCommand = `cd "${rootPath}" && git pull`;
        new Notice(this.gitPullMessage);
        exec(gitPullCommand, (err) => {
            this.handleGitCommand(err, () => {
                this.renderChanges(rootPath);
            });
        });
    }

    private executeCommitCallback(rootPath: string) {
        const gitCommitCommand = `cd "${rootPath}" && git add . && git commit -m "sync"`;
        new Notice(this.gitCommitMessage);
        exec(gitCommitCommand, (err) => {
            this.handleGitCommand(err, () => {
                this.renderChanges(rootPath);
            });
        });
    }

    private executeSyncCallback(rootPath: string) {
        const gitSyncCommand = `cd "${rootPath}" && git add . && git commit -m "sync" && git push`;
        new Notice(this.gitSyncMessage);
        exec(gitSyncCommand, (err) => {
            this.handleGitCommand(err, () => {
                this.renderChanges(rootPath);
            });
        });
    }

    private executePushCallback(rootPath: string) {
        const gitPushCommand = `cd "${rootPath}" && git push`;
        new Notice(this.gitPushMessage);
        exec(gitPushCommand, (err) => {
            this.handleGitCommand(err, () => {
                this.renderChanges(rootPath);
            });
        });
    }

    private handleGitCommand(err: ExecException | null, callback?: () => void) {
        if (new RegExp('No configured push destination').test(err?.message)) {
            new Notice("You need to setup git repository.");
        } else if (new RegExp('There is no tracking information for the current branch').test(err?.message)) {
            new Notice("There is no tracking information for the current branch");
        } else if (err && new RegExp(`Command failed: ${err.cmd}`).test(err?.message)) {
            new Notice("Nothing has changed.");
            if (callback) {
                callback();
            }
        } else if (err) {
           new Notice("Already up to date.");
            if (callback) {
                callback();
            }
        } else {
            new Notice("Done.");
            if (callback) {
                callback();
            }
        }

    }
}
