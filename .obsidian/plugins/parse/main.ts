import { Notice, Plugin } from 'obsidian';
import {exec, ExecException} from "child_process";
import * as path from 'path';
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

        const rootPath = path.normalize((this.app.vault.adapter as any).basePath);


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

        // this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
		// 	if (evt.which === 83 && evt.metaKey || evt.ctrlKey && evt.which === 83) {
        //         this.executeSyncCallback(rootPath);
        //     }
		// });

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
        const command = this.fixWinPath(rootPath);
        const gitChangesCommand = `${command} && git status -s`;
        new Notice(this.gitChangesMessage);

        this.executeChangesCount(rootPath, count => {
            if (count) {
                exec(gitChangesCommand, ((error, changes) => {
                    if (!error) {
                        new Notice(changes, 20000);
                    } else {
                        new Notice('changes Error.');
                        return;
                    }
                }));
            } else {
                new Notice("You don't have any changes");
                return;
            }
        });
    }

    private executeChangesCount(rootPath: string, callback?: (count: number) => void) {
        const command = this.fixWinPath(rootPath);
        const os = process.platform;
        let gitChangesCountCommand = "";
        if (os === 'win32') {
            gitChangesCountCommand = `${command} && git status -s | find /c /v ""`;
        } else if (os === 'darwin') {
            gitChangesCountCommand = `${command} && git status -s | egrep "" | wc -l`;
        }


        if (!callback) {
            new Notice(this.gitChangesCountMessage);
        }

        exec(gitChangesCountCommand, ((error, count, stderr) => {
            if (count && !stderr) {
                if (callback) {
                    callback(+count);
                } else {
                    new Notice(`You have ${count} ${ +count === 1 ? 'change' : 'changes'}`, 10000);
                }
            } else {
                new Notice('Changes Count Error.');
                return;
            }
        }));
    }

    private executeBranchCommand(rootPath: string, callback?: (branch: string) => void) {
        const command = this.fixWinPath(rootPath);
        const gitBranchCommand = `${command} && git branch`;

        if (!callback) {
            new Notice(this.gitBranchMessage);
        }
        exec(gitBranchCommand, ((error, branchInfo, stdErr) => {

            if (branchInfo && !stdErr) {
                if (!callback) {
                    new Notice(`You are on ${branchInfo} branch`, 10000);
                } else {
                    callback(branchInfo);
                }
            } else {
                new Notice('Getting Branch Error.');
                return;
            }
        }));
    }

    private executePullCallback(rootPath: string) {
        const command = this.fixWinPath(rootPath);
        const gitPullCommand = `${command} && git pull`;
        new Notice(this.gitPullMessage);
        exec(gitPullCommand, (err, pullInfo, stdErr) => {
            if (pullInfo && !stdErr) {
                this.handleGitCommand(err);
                return;
            }
            return;
        });
    }

    private executeCommitCallback(rootPath: string) {
        const command = this.fixWinPath(rootPath);
        const gitCommitCommand = `${command} && git add . && git commit -m "sync"`;
        new Notice(this.gitCommitMessage);
        exec(gitCommitCommand, (err, commit, stdErr) => {
            this.handleGitCommand(err, () => {
                if (commit && !stdErr) {
                    this.renderChanges(rootPath);
                    return;
                }
                return;
            });
        });
    }

    private executeSyncCallback(rootPath: string) {
        const command = this.fixWinPath(rootPath);
        const gitSyncCommand = `${command} && git add . && git commit -m "sync" && git push`;
        new Notice(this.gitSyncMessage);
        exec(gitSyncCommand, (err, sync, stdErr) => {
            debugger
            this.handleGitCommand(err, () => {
                if (sync && !stdErr) {
                    this.renderChanges(rootPath);
                    return;
                }
                return;
            });
        });
    }

    private executePushCallback(rootPath: string) {
        const command = this.fixWinPath(rootPath);
        const gitPushCommand = `${command} && git push`;
        new Notice(this.gitPushMessage);
        exec(gitPushCommand, (err, push, stdErr) => {
            this.handleGitCommand(err, () => {
                if (push && !stdErr) {
                    this.renderChanges(rootPath);
                    return;
                }
                return;
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

    private fixWinPath(rootPath: string) {
        const os = process.platform;
        if (os === 'win32') {
            const driveMatch = new RegExp('^[^\*]').exec(rootPath);
            if (driveMatch.length) {
                return `${driveMatch[0].toLowerCase()}: && cd "${rootPath}"`;
            }
            throw new Error('Parsing path error');
        }
        return `cd "${rootPath}"`;
    }
}
