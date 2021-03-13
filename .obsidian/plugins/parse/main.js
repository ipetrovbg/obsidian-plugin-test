'use strict';

var obsidian = require('obsidian');
var child_process = require('child_process');
var path = require('path');

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

class GitHubSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        let { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'GitHub vault synchronization plugin' });
        containerEl.createEl('hr');
        containerEl.createEl('h3', { text: 'Prerequisites' });
        containerEl.createEl('p', { text: 'This plugin allows you to synchronize your vault with GitHub.' });
        containerEl.createDiv({}, div => {
            const text = containerEl.createEl('span', { text: '1. You need to have GitHub account. ' });
            const link = containerEl.createEl('a', {
                text: 'Create GitHub account.',
                attr: { href: 'https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&cad=rja&uact=8&ved=2ahUKEwj_xbqEh67vAhUvx4UKHTtqByYQFjAAegQIAxAD&url=https%3A%2F%2Fgithub.com%2Fjoin&usg=AOvVaw0H9TK-nu7JfXaoNeNMgJEk' }
            });
            div.appendChild(text)
                .appendChild(link);
        });
        containerEl.createDiv({}, div => {
            const text = containerEl.createEl('span', { text: '2. In the folder where it\'s your vault, you have to initialize git repository. ' });
            const link = containerEl.createEl('a', {
                text: 'Setup git repository',
                attr: { href: 'https://docs.github.com/en/github/importing-your-projects-to-github/adding-an-existing-project-to-github-using-the-command-line' }
            });
            div.appendChild(text)
                .appendChild(link);
        });
        containerEl.createEl('h4', { text: 'You are ready!' });
        containerEl.createEl('hr');
        containerEl.createDiv({}, div => {
            const email = containerEl.createEl('input', { value: 'ipetrovbg@gmail.com' });
            const text = containerEl.createSpan({ text: 'If you have any questions feel free to contact me on ' });
            text.appendChild(email);
            div.appendChild(text);
        });
    }
}

class GitHubSyncPlugin extends obsidian.Plugin {
    constructor() {
        super(...arguments);
        this.gitSyncMessage = 'Git Syncing...';
        this.gitPullMessage = 'Git Pull...';
        this.gitPushMessage = 'Git Push...';
        this.gitCommitMessage = 'Git Commit...';
        this.gitBranchMessage = 'Git Branch';
        this.gitChangesCountMessage = 'Git Changes Counting..';
        this.gitChangesMessage = 'Git Changes..';
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            const rootPath = path.normalize(this.app.vault.adapter.basePath);
            this.addStatusBarItem().createSpan({ cls: 'git' }, el => this.countAndRenderGitChanges(el, rootPath));
            this.addCommand({
                id: 'git-changes',
                name: 'Git Changes',
                callback: () => this.executeChanges(rootPath)
            });
            this.addCommand({
                id: 'git-changes-count',
                name: 'Git Changes Count',
                callback: () => this.executeChangesCount(rootPath, count => {
                    new obsidian.Notice(`You have ${count} ${+count === 1 ? 'change' : 'changes'}`, 10000);
                    this.executeBranchCommand(rootPath, branch => {
                        const gitEl = this.app.statusBar.containerEl.getElementsByClassName('git');
                        if (count) {
                            if (gitEl && gitEl.length) {
                                gitEl[0].innerHTML = `${branch} ${count === 1 ? '[' + count + ' change]' : '[' + count + ' changes]'}`;
                            }
                        }
                        else {
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
        });
    }
    countAndRenderGitChanges(el, rootPath) {
        this.executeBranchCommand(rootPath, branch => {
            this.executeChangesCount(rootPath, count => {
                if (count) {
                    if (el) {
                        el.innerHTML = `${branch} ${count === 1 ? '[' + count + ' change]' : '[' + count + ' changes]'}`;
                    }
                }
                else {
                    if (el) {
                        el.innerHTML = `${branch} [no changes]`;
                    }
                }
            });
        });
    }
    renderChanges(rootPath) {
        const gitEl = this.app.statusBar.containerEl.getElementsByClassName('git');
        if (gitEl && gitEl.length) {
            this.countAndRenderGitChanges(gitEl[0], rootPath);
        }
    }
    executeChanges(rootPath) {
        const command = this.fixWinPath(rootPath);
        const gitChangesCommand = `${command} && git status -s`;
        new obsidian.Notice(this.gitChangesMessage);
        this.executeChangesCount(rootPath, count => {
            if (count) {
                child_process.exec(gitChangesCommand, ((error, changes) => {
                    if (!error) {
                        new obsidian.Notice(changes, 20000);
                    }
                    else {
                        new obsidian.Notice('changes Error.');
                        return;
                    }
                }));
            }
            else {
                new obsidian.Notice("You don't have any changes");
                return;
            }
        });
    }
    executeChangesCount(rootPath, callback) {
        const command = this.fixWinPath(rootPath);
        const os = process.platform;
        let gitChangesCountCommand = "";
        if (os === 'win32') {
            gitChangesCountCommand = `${command} && git status -s | find /c /v ""`;
        }
        else if (os === 'darwin') {
            gitChangesCountCommand = `${command} && git status -s | egrep "" | wc -l`;
        }
        if (!callback) {
            new obsidian.Notice(this.gitChangesCountMessage);
        }
        child_process.exec(gitChangesCountCommand, ((error, count, stderr) => {
            if (count && !stderr) {
                if (callback) {
                    callback(+count);
                }
                else {
                    new obsidian.Notice(`You have ${count} ${+count === 1 ? 'change' : 'changes'}`, 10000);
                }
            }
            else {
                new obsidian.Notice('Changes Count Error.');
                return;
            }
        }));
    }
    executeBranchCommand(rootPath, callback) {
        const command = this.fixWinPath(rootPath);
        const gitBranchCommand = `${command} && git branch`;
        if (!callback) {
            new obsidian.Notice(this.gitBranchMessage);
        }
        child_process.exec(gitBranchCommand, ((error, branchInfo, stdErr) => {
            if (branchInfo && !stdErr) {
                if (!callback) {
                    new obsidian.Notice(`You are on ${branchInfo} branch`, 10000);
                }
                else {
                    callback(branchInfo);
                }
            }
            else {
                new obsidian.Notice('Getting Branch Error.');
                return;
            }
        }));
    }
    executePullCallback(rootPath) {
        const command = this.fixWinPath(rootPath);
        const gitPullCommand = `${command} && git pull`;
        new obsidian.Notice(this.gitPullMessage);
        child_process.exec(gitPullCommand, (err, pullInfo, stdErr) => {
            if (pullInfo && !stdErr) {
                this.handleGitCommand(err);
                return;
            }
            return;
        });
    }
    executeCommitCallback(rootPath) {
        const command = this.fixWinPath(rootPath);
        const gitCommitCommand = `${command} && git add . && git commit -m "sync"`;
        new obsidian.Notice(this.gitCommitMessage);
        child_process.exec(gitCommitCommand, (err, commit, stdErr) => {
            this.handleGitCommand(err, () => {
                if (commit && !stdErr) {
                    this.renderChanges(rootPath);
                    return;
                }
                return;
            });
        });
    }
    executeSyncCallback(rootPath) {
        const command = this.fixWinPath(rootPath);
        const gitSyncCommand = `${command} && git add . && git commit -m "sync" && git push`;
        new obsidian.Notice(this.gitSyncMessage);
        child_process.exec(gitSyncCommand, (err, sync) => {
            this.handleGitCommand(err, () => {
                if (sync) {
                    this.renderChanges(rootPath);
                    return;
                }
                return;
            });
        });
    }
    executePushCallback(rootPath) {
        const command = this.fixWinPath(rootPath);
        const gitPushCommand = `${command} && git push`;
        new obsidian.Notice(this.gitPushMessage);
        child_process.exec(gitPushCommand, (err, push, stdErr) => {
            this.handleGitCommand(err, () => {
                if (push && !stdErr) {
                    this.renderChanges(rootPath);
                    return;
                }
                return;
            });
        });
    }
    handleGitCommand(err, callback) {
        if (new RegExp('No configured push destination').test(err === null || err === void 0 ? void 0 : err.message)) {
            new obsidian.Notice("You need to setup git repository.");
        }
        else if (new RegExp('There is no tracking information for the current branch').test(err === null || err === void 0 ? void 0 : err.message)) {
            new obsidian.Notice("There is no tracking information for the current branch");
        }
        else if (err && new RegExp(`Command failed: ${err.cmd}`).test(err === null || err === void 0 ? void 0 : err.message)) {
            new obsidian.Notice("Nothing has changed.");
            if (callback) {
                callback();
            }
        }
        else if (err) {
            new obsidian.Notice("Already up to date.");
            if (callback) {
                callback();
            }
        }
        else {
            new obsidian.Notice("Done.");
            if (callback) {
                callback();
            }
        }
    }
    fixWinPath(rootPath) {
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

module.exports = GitHubSyncPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNldHRpbmdzLXRhYi50cyIsIm1haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyohICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcclxuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XHJcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xyXG4gICAgICAgIHdoaWxlIChfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXhwb3J0U3RhcihtLCBvKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XHJcbiAgICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xyXG4gICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XHJcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAobyAmJiBpID49IG8ubGVuZ3RoKSBvID0gdm9pZCAwO1xyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XHJcbiAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XHJcbiAgICBpZiAoIW0pIHJldHVybiBvO1xyXG4gICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XHJcbiAgICBmaW5hbGx5IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWQoKSB7XHJcbiAgICBmb3IgKHZhciBhciA9IFtdLCBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcclxuICAgICAgICBhciA9IGFyLmNvbmNhdChfX3JlYWQoYXJndW1lbnRzW2ldKSk7XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XHJcbiAgICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcclxuICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcclxuICAgICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcclxuICAgICAgICAgICAgcltrXSA9IGFbal07XHJcbiAgICByZXR1cm4gcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXkodG8sIGZyb20pIHtcclxuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGZyb20ubGVuZ3RoLCBqID0gdG8ubGVuZ3RoOyBpIDwgaWw7IGkrKywgaisrKVxyXG4gICAgICAgIHRvW2pdID0gZnJvbVtpXTtcclxuICAgIHJldHVybiB0bztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaWYgKGdbbl0pIGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHJlc3VtZShuLCB2KSB7IHRyeSB7IHN0ZXAoZ1tuXSh2KSk7IH0gY2F0Y2ggKGUpIHsgc2V0dGxlKHFbMF1bM10sIGUpOyB9IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAocikgeyByLnZhbHVlIGluc3RhbmNlb2YgX19hd2FpdCA/IFByb21pc2UucmVzb2x2ZShyLnZhbHVlLnYpLnRoZW4oZnVsZmlsbCwgcmVqZWN0KSA6IHNldHRsZShxWzBdWzJdLCByKTsgfVxyXG4gICAgZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkgeyByZXN1bWUoXCJuZXh0XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gcmVqZWN0KHZhbHVlKSB7IHJlc3VtZShcInRocm93XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKGYsIHYpIHsgaWYgKGYodiksIHEuc2hpZnQoKSwgcS5sZW5ndGgpIHJlc3VtZShxWzBdWzBdLCBxWzBdWzFdKTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0RlbGVnYXRvcihvKSB7XHJcbiAgICB2YXIgaSwgcDtcclxuICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiwgZnVuY3Rpb24gKGUpIHsgdGhyb3cgZTsgfSksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaVtuXSA9IG9bbl0gPyBmdW5jdGlvbiAodikgeyByZXR1cm4gKHAgPSAhcCkgPyB7IHZhbHVlOiBfX2F3YWl0KG9bbl0odikpLCBkb25lOiBuID09PSBcInJldHVyblwiIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XHJcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgcHJpdmF0ZU1hcCkge1xyXG4gICAgaWYgKCFwcml2YXRlTWFwLmhhcyhyZWNlaXZlcikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXR0ZW1wdGVkIHRvIGdldCBwcml2YXRlIGZpZWxkIG9uIG5vbi1pbnN0YW5jZVwiKTtcclxuICAgIH1cclxuICAgIHJldHVybiBwcml2YXRlTWFwLmdldChyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0KHJlY2VpdmVyLCBwcml2YXRlTWFwLCB2YWx1ZSkge1xyXG4gICAgaWYgKCFwcml2YXRlTWFwLmhhcyhyZWNlaXZlcikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXR0ZW1wdGVkIHRvIHNldCBwcml2YXRlIGZpZWxkIG9uIG5vbi1pbnN0YW5jZVwiKTtcclxuICAgIH1cclxuICAgIHByaXZhdGVNYXAuc2V0KHJlY2VpdmVyLCB2YWx1ZSk7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn1cclxuIiwiaW1wb3J0IHsgQXBwLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSAnb2JzaWRpYW4nO1xyXG5pbXBvcnQgR2l0SHViU3luY1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgR2l0SHViU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xyXG4gICAgcGx1Z2luOiBHaXRIdWJTeW5jUGx1Z2luO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IEdpdEh1YlN5bmNQbHVnaW4pIHtcclxuICAgICAgICBzdXBlcihhcHAsIHBsdWdpbik7XHJcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcbiAgICB9XHJcblxyXG4gICAgZGlzcGxheSgpOiB2b2lkIHtcclxuICAgICAgICBsZXQge2NvbnRhaW5lckVsfSA9IHRoaXM7XHJcbiAgICAgICAgY29udGFpbmVyRWwuZW1wdHkoKTtcclxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDInLCB7dGV4dDogJ0dpdEh1YiB2YXVsdCBzeW5jaHJvbml6YXRpb24gcGx1Z2luJ30pO1xyXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdocicpO1xyXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHt0ZXh0OiAnUHJlcmVxdWlzaXRlcyd9KTtcclxuXHJcbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ3AnLCB7dGV4dDogJ1RoaXMgcGx1Z2luIGFsbG93cyB5b3UgdG8gc3luY2hyb25pemUgeW91ciB2YXVsdCB3aXRoIEdpdEh1Yi4nfSk7XHJcbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRGl2KHt9LCBkaXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gY29udGFpbmVyRWwuY3JlYXRlRWwoJ3NwYW4nLCB7dGV4dDogJzEuIFlvdSBuZWVkIHRvIGhhdmUgR2l0SHViIGFjY291bnQuICd9KTtcclxuICAgICAgICAgICAgY29uc3QgbGluayA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdhJywge1xyXG4gICAgICAgICAgICAgICAgdGV4dDogJ0NyZWF0ZSBHaXRIdWIgYWNjb3VudC4nLFxyXG4gICAgICAgICAgICAgICAgYXR0cjoge2hyZWY6ICdodHRwczovL3d3dy5nb29nbGUuY29tL3VybD9zYT10JnJjdD1qJnE9JmVzcmM9cyZzb3VyY2U9d2ViJmNkPSZjYWQ9cmphJnVhY3Q9OCZ2ZWQ9MmFoVUtFd2pfeGJxRWg2N3ZBaFV2eDRVS0hUdHFCeVlRRmpBQWVnUUlBeEFEJnVybD1odHRwcyUzQSUyRiUyRmdpdGh1Yi5jb20lMkZqb2luJnVzZz1BT3ZWYXcwSDlUSy1udTdKZlhhb05lTk1nSkVrJ31cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgZGl2LmFwcGVuZENoaWxkKHRleHQpXHJcbiAgICAgICAgICAgICAgICAuYXBwZW5kQ2hpbGQobGluayk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRGl2KHt9LCBkaXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gY29udGFpbmVyRWwuY3JlYXRlRWwoJ3NwYW4nLCB7dGV4dDogJzIuIEluIHRoZSBmb2xkZXIgd2hlcmUgaXRcXCdzIHlvdXIgdmF1bHQsIHlvdSBoYXZlIHRvIGluaXRpYWxpemUgZ2l0IHJlcG9zaXRvcnkuICd9KTtcclxuICAgICAgICAgICAgY29uc3QgbGluayA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdhJywge1xyXG4gICAgICAgICAgICAgICAgdGV4dDogJ1NldHVwIGdpdCByZXBvc2l0b3J5JyxcclxuICAgICAgICAgICAgICAgIGF0dHI6IHtocmVmOiAnaHR0cHM6Ly9kb2NzLmdpdGh1Yi5jb20vZW4vZ2l0aHViL2ltcG9ydGluZy15b3VyLXByb2plY3RzLXRvLWdpdGh1Yi9hZGRpbmctYW4tZXhpc3RpbmctcHJvamVjdC10by1naXRodWItdXNpbmctdGhlLWNvbW1hbmQtbGluZSd9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBkaXYuYXBwZW5kQ2hpbGQodGV4dClcclxuICAgICAgICAgICAgICAgIC5hcHBlbmRDaGlsZChsaW5rKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDQnLCB7dGV4dDogJ1lvdSBhcmUgcmVhZHkhJ30pO1xyXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdocicpO1xyXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZURpdih7fSwgZGl2ID0+IHtcclxuICAgICAgICAgICAgY29uc3QgZW1haWwgPSBjb250YWluZXJFbC5jcmVhdGVFbCgnaW5wdXQnLCB7dmFsdWU6ICdpcGV0cm92YmdAZ21haWwuY29tJ30pO1xyXG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gY29udGFpbmVyRWwuY3JlYXRlU3Bhbih7dGV4dDogJ0lmIHlvdSBoYXZlIGFueSBxdWVzdGlvbnMgZmVlbCBmcmVlIHRvIGNvbnRhY3QgbWUgb24gJ30pO1xyXG4gICAgICAgICAgICB0ZXh0LmFwcGVuZENoaWxkKGVtYWlsKTtcclxuICAgICAgICAgICAgZGl2LmFwcGVuZENoaWxkKHRleHQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7IE5vdGljZSwgUGx1Z2luIH0gZnJvbSAnb2JzaWRpYW4nO1xyXG5pbXBvcnQge2V4ZWMsIEV4ZWNFeGNlcHRpb259IGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7R2l0SHViU2V0dGluZ1RhYn0gZnJvbSAnLi9zZXR0aW5ncy10YWInO1xyXG5cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdpdEh1YlN5bmNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xyXG4gICAgcHJpdmF0ZSBnaXRTeW5jTWVzc2FnZSA9ICdHaXQgU3luY2luZy4uLic7XHJcbiAgICBwcml2YXRlIGdpdFB1bGxNZXNzYWdlID0gJ0dpdCBQdWxsLi4uJztcclxuICAgIHByaXZhdGUgZ2l0UHVzaE1lc3NhZ2UgPSAnR2l0IFB1c2guLi4nO1xyXG4gICAgcHJpdmF0ZSBnaXRDb21taXRNZXNzYWdlID0gJ0dpdCBDb21taXQuLi4nO1xyXG4gICAgcHJpdmF0ZSBnaXRCcmFuY2hNZXNzYWdlID0gJ0dpdCBCcmFuY2gnO1xyXG4gICAgcHJpdmF0ZSBnaXRDaGFuZ2VzQ291bnRNZXNzYWdlID0gJ0dpdCBDaGFuZ2VzIENvdW50aW5nLi4nO1xyXG4gICAgcHJpdmF0ZSBnaXRDaGFuZ2VzTWVzc2FnZSA9ICdHaXQgQ2hhbmdlcy4uJztcclxuXHJcbiAgICBwdWJsaWMgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cclxuICAgICAgICBjb25zdCByb290UGF0aCA9IHBhdGgubm9ybWFsaXplKCh0aGlzLmFwcC52YXVsdC5hZGFwdGVyIGFzIGFueSkuYmFzZVBhdGgpO1xyXG5cclxuXHJcbiAgICAgICAgdGhpcy5hZGRTdGF0dXNCYXJJdGVtKCkuY3JlYXRlU3Bhbih7Y2xzOiAnZ2l0J30sIGVsID0+XHJcbiAgICAgICAgICAgIHRoaXMuY291bnRBbmRSZW5kZXJHaXRDaGFuZ2VzKGVsLCByb290UGF0aCkpO1xyXG5cclxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICAgICAgICBpZDogJ2dpdC1jaGFuZ2VzJyxcclxuICAgICAgICAgICAgbmFtZTogJ0dpdCBDaGFuZ2VzJyxcclxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZXhlY3V0ZUNoYW5nZXMocm9vdFBhdGgpXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgICAgICAgIGlkOiAnZ2l0LWNoYW5nZXMtY291bnQnLFxyXG4gICAgICAgICAgICBuYW1lOiAnR2l0IENoYW5nZXMgQ291bnQnLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5leGVjdXRlQ2hhbmdlc0NvdW50KHJvb3RQYXRoLCBjb3VudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBZb3UgaGF2ZSAke2NvdW50fSAkeyArY291bnQgPT09IDEgPyAnY2hhbmdlJyA6ICdjaGFuZ2VzJ31gLCAxMDAwMCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4ZWN1dGVCcmFuY2hDb21tYW5kKHJvb3RQYXRoLCBicmFuY2ggPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGdpdEVsID0gKHRoaXMuYXBwIGFzIGFueSkuc3RhdHVzQmFyLmNvbnRhaW5lckVsLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2dpdCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb3VudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2l0RWwgJiYgZ2l0RWwubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnaXRFbFswXS5pbm5lckhUTUwgPSBgJHticmFuY2h9ICR7Y291bnQgPT09IDEgPyAnWycgKyBjb3VudCArICcgY2hhbmdlXScgOiAnWycgKyBjb3VudCArICcgY2hhbmdlc10nfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2l0RWwgJiYgZ2l0RWwubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnaXRFbFswXS5pbm5lckhUTUwgPSBgJHticmFuY2h9IFtubyBjaGFuZ2VzXWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgICAgICAgaWQ6ICdnaXQtcHVsbCcsXHJcbiAgICAgICAgICAgIG5hbWU6ICdHaXQgUHVsbCcsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmV4ZWN1dGVQdWxsQ2FsbGJhY2socm9vdFBhdGgpXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgICAgICAgIGlkOiAnZ2l0LWNvbW1pdC1hbmQtcHVzaCcsXHJcbiAgICAgICAgICAgIG5hbWU6ICdHaXQgQ29tbWl0IGFuZCBQdXNoJyxcclxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZXhlY3V0ZVN5bmNDYWxsYmFjayhyb290UGF0aClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgICAgICAgaWQ6ICdnaXQtY29tbWl0JyxcclxuICAgICAgICAgICAgbmFtZTogJ0dpdCBDb21taXQnLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5leGVjdXRlQ29tbWl0Q2FsbGJhY2socm9vdFBhdGgpXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgICAgICAgIGlkOiAnZ2l0LWJyYW5jaCcsXHJcbiAgICAgICAgICAgIG5hbWU6ICdHaXQgQnJhbmNoJyxcclxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZXhlY3V0ZUJyYW5jaENvbW1hbmQocm9vdFBhdGgpXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgICAgICAgIGlkOiAnZ2l0LXB1c2gnLFxyXG4gICAgICAgICAgICBuYW1lOiAnR2l0IFB1c2gnLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5leGVjdXRlUHVzaENhbGxiYWNrKHJvb3RQYXRoKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmV4ZWN1dGVQdWxsQ2FsbGJhY2socm9vdFBhdGgpO1xyXG5cclxuICAgICAgICAvLyB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZG9jdW1lbnQsICdrZXlkb3duJywgKGV2dDogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG5cdFx0Ly8gXHRpZiAoZXZ0LndoaWNoID09PSA4MyAmJiBldnQubWV0YUtleSB8fCBldnQuY3RybEtleSAmJiBldnQud2hpY2ggPT09IDgzKSB7XHJcbiAgICAgICAgLy8gICAgICAgICB0aGlzLmV4ZWN1dGVTeW5jQ2FsbGJhY2socm9vdFBhdGgpO1xyXG4gICAgICAgIC8vICAgICB9XHJcblx0XHQvLyB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBHaXRIdWJTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY291bnRBbmRSZW5kZXJHaXRDaGFuZ2VzKGVsOiBIVE1MRWxlbWVudCwgcm9vdFBhdGg6IHN0cmluZykge1xyXG4gICAgICAgIHRoaXMuZXhlY3V0ZUJyYW5jaENvbW1hbmQocm9vdFBhdGgsIGJyYW5jaCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuZXhlY3V0ZUNoYW5nZXNDb3VudChyb290UGF0aCwgY291bnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvdW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLmlubmVySFRNTCA9IGAke2JyYW5jaH0gJHtjb3VudCA9PT0gMSA/ICdbJyArIGNvdW50ICsgJyBjaGFuZ2VdJyA6ICdbJyArIGNvdW50ICsgJyBjaGFuZ2VzXSd9YDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5pbm5lckhUTUwgPSBgJHticmFuY2h9IFtubyBjaGFuZ2VzXWA7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlbmRlckNoYW5nZXMocm9vdFBhdGg6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IGdpdEVsID0gKHRoaXMuYXBwIGFzIGFueSkuc3RhdHVzQmFyLmNvbnRhaW5lckVsLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2dpdCcpO1xyXG5cclxuICAgICAgICBpZiAoZ2l0RWwgJiYgZ2l0RWwubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY291bnRBbmRSZW5kZXJHaXRDaGFuZ2VzKGdpdEVsWzBdLCByb290UGF0aCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZXhlY3V0ZUNoYW5nZXMocm9vdFBhdGg6IHN0cmluZykge1xyXG4gICAgICAgIGNvbnN0IGNvbW1hbmQgPSB0aGlzLmZpeFdpblBhdGgocm9vdFBhdGgpO1xyXG4gICAgICAgIGNvbnN0IGdpdENoYW5nZXNDb21tYW5kID0gYCR7Y29tbWFuZH0gJiYgZ2l0IHN0YXR1cyAtc2A7XHJcbiAgICAgICAgbmV3IE5vdGljZSh0aGlzLmdpdENoYW5nZXNNZXNzYWdlKTtcclxuXHJcbiAgICAgICAgdGhpcy5leGVjdXRlQ2hhbmdlc0NvdW50KHJvb3RQYXRoLCBjb3VudCA9PiB7XHJcbiAgICAgICAgICAgIGlmIChjb3VudCkge1xyXG4gICAgICAgICAgICAgICAgZXhlYyhnaXRDaGFuZ2VzQ29tbWFuZCwgKChlcnJvciwgY2hhbmdlcykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShjaGFuZ2VzLCAyMDAwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnY2hhbmdlcyBFcnJvci4nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJZb3UgZG9uJ3QgaGF2ZSBhbnkgY2hhbmdlc1wiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZXhlY3V0ZUNoYW5nZXNDb3VudChyb290UGF0aDogc3RyaW5nLCBjYWxsYmFjaz86IChjb3VudDogbnVtYmVyKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IHRoaXMuZml4V2luUGF0aChyb290UGF0aCk7XHJcbiAgICAgICAgY29uc3Qgb3MgPSBwcm9jZXNzLnBsYXRmb3JtO1xyXG4gICAgICAgIGxldCBnaXRDaGFuZ2VzQ291bnRDb21tYW5kID0gXCJcIjtcclxuICAgICAgICBpZiAob3MgPT09ICd3aW4zMicpIHtcclxuICAgICAgICAgICAgZ2l0Q2hhbmdlc0NvdW50Q29tbWFuZCA9IGAke2NvbW1hbmR9ICYmIGdpdCBzdGF0dXMgLXMgfCBmaW5kIC9jIC92IFwiXCJgO1xyXG4gICAgICAgIH0gZWxzZSBpZiAob3MgPT09ICdkYXJ3aW4nKSB7XHJcbiAgICAgICAgICAgIGdpdENoYW5nZXNDb3VudENvbW1hbmQgPSBgJHtjb21tYW5kfSAmJiBnaXQgc3RhdHVzIC1zIHwgZWdyZXAgXCJcIiB8IHdjIC1sYDtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBpZiAoIWNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgIG5ldyBOb3RpY2UodGhpcy5naXRDaGFuZ2VzQ291bnRNZXNzYWdlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGV4ZWMoZ2l0Q2hhbmdlc0NvdW50Q29tbWFuZCwgKChlcnJvciwgY291bnQsIHN0ZGVycikgPT4ge1xyXG4gICAgICAgICAgICBpZiAoY291bnQgJiYgIXN0ZGVycikge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soK2NvdW50KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShgWW91IGhhdmUgJHtjb3VudH0gJHsgK2NvdW50ID09PSAxID8gJ2NoYW5nZScgOiAnY2hhbmdlcyd9YCwgMTAwMDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnQ2hhbmdlcyBDb3VudCBFcnJvci4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGV4ZWN1dGVCcmFuY2hDb21tYW5kKHJvb3RQYXRoOiBzdHJpbmcsIGNhbGxiYWNrPzogKGJyYW5jaDogc3RyaW5nKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IHRoaXMuZml4V2luUGF0aChyb290UGF0aCk7XHJcbiAgICAgICAgY29uc3QgZ2l0QnJhbmNoQ29tbWFuZCA9IGAke2NvbW1hbmR9ICYmIGdpdCBicmFuY2hgO1xyXG5cclxuICAgICAgICBpZiAoIWNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgIG5ldyBOb3RpY2UodGhpcy5naXRCcmFuY2hNZXNzYWdlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZXhlYyhnaXRCcmFuY2hDb21tYW5kLCAoKGVycm9yLCBicmFuY2hJbmZvLCBzdGRFcnIpID0+IHtcclxuXHJcbiAgICAgICAgICAgIGlmIChicmFuY2hJbmZvICYmICFzdGRFcnIpIHtcclxuICAgICAgICAgICAgICAgIGlmICghY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBZb3UgYXJlIG9uICR7YnJhbmNoSW5mb30gYnJhbmNoYCwgMTAwMDApO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhicmFuY2hJbmZvKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0dldHRpbmcgQnJhbmNoIEVycm9yLicpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZXhlY3V0ZVB1bGxDYWxsYmFjayhyb290UGF0aDogc3RyaW5nKSB7XHJcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IHRoaXMuZml4V2luUGF0aChyb290UGF0aCk7XHJcbiAgICAgICAgY29uc3QgZ2l0UHVsbENvbW1hbmQgPSBgJHtjb21tYW5kfSAmJiBnaXQgcHVsbGA7XHJcbiAgICAgICAgbmV3IE5vdGljZSh0aGlzLmdpdFB1bGxNZXNzYWdlKTtcclxuICAgICAgICBleGVjKGdpdFB1bGxDb21tYW5kLCAoZXJyLCBwdWxsSW5mbywgc3RkRXJyKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChwdWxsSW5mbyAmJiAhc3RkRXJyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUdpdENvbW1hbmQoZXJyKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBleGVjdXRlQ29tbWl0Q2FsbGJhY2socm9vdFBhdGg6IHN0cmluZykge1xyXG4gICAgICAgIGNvbnN0IGNvbW1hbmQgPSB0aGlzLmZpeFdpblBhdGgocm9vdFBhdGgpO1xyXG4gICAgICAgIGNvbnN0IGdpdENvbW1pdENvbW1hbmQgPSBgJHtjb21tYW5kfSAmJiBnaXQgYWRkIC4gJiYgZ2l0IGNvbW1pdCAtbSBcInN5bmNcImA7XHJcbiAgICAgICAgbmV3IE5vdGljZSh0aGlzLmdpdENvbW1pdE1lc3NhZ2UpO1xyXG4gICAgICAgIGV4ZWMoZ2l0Q29tbWl0Q29tbWFuZCwgKGVyciwgY29tbWl0LCBzdGRFcnIpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVHaXRDb21tYW5kKGVyciwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvbW1pdCAmJiAhc3RkRXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJDaGFuZ2VzKHJvb3RQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZXhlY3V0ZVN5bmNDYWxsYmFjayhyb290UGF0aDogc3RyaW5nKSB7XHJcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IHRoaXMuZml4V2luUGF0aChyb290UGF0aCk7XHJcbiAgICAgICAgY29uc3QgZ2l0U3luY0NvbW1hbmQgPSBgJHtjb21tYW5kfSAmJiBnaXQgYWRkIC4gJiYgZ2l0IGNvbW1pdCAtbSBcInN5bmNcIiAmJiBnaXQgcHVzaGA7XHJcbiAgICAgICAgbmV3IE5vdGljZSh0aGlzLmdpdFN5bmNNZXNzYWdlKTtcclxuICAgICAgICBleGVjKGdpdFN5bmNDb21tYW5kLCAoZXJyLCBzeW5jKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlR2l0Q29tbWFuZChlcnIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChzeW5jKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJDaGFuZ2VzKHJvb3RQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZXhlY3V0ZVB1c2hDYWxsYmFjayhyb290UGF0aDogc3RyaW5nKSB7XHJcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IHRoaXMuZml4V2luUGF0aChyb290UGF0aCk7XHJcbiAgICAgICAgY29uc3QgZ2l0UHVzaENvbW1hbmQgPSBgJHtjb21tYW5kfSAmJiBnaXQgcHVzaGA7XHJcbiAgICAgICAgbmV3IE5vdGljZSh0aGlzLmdpdFB1c2hNZXNzYWdlKTtcclxuICAgICAgICBleGVjKGdpdFB1c2hDb21tYW5kLCAoZXJyLCBwdXNoLCBzdGRFcnIpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVHaXRDb21tYW5kKGVyciwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHB1c2ggJiYgIXN0ZEVycikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQ2hhbmdlcyhyb290UGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVHaXRDb21tYW5kKGVycjogRXhlY0V4Y2VwdGlvbiB8IG51bGwsIGNhbGxiYWNrPzogKCkgPT4gdm9pZCkge1xyXG4gICAgICAgIGlmIChuZXcgUmVnRXhwKCdObyBjb25maWd1cmVkIHB1c2ggZGVzdGluYXRpb24nKS50ZXN0KGVycj8ubWVzc2FnZSkpIHtcclxuICAgICAgICAgICAgbmV3IE5vdGljZShcIllvdSBuZWVkIHRvIHNldHVwIGdpdCByZXBvc2l0b3J5LlwiKTtcclxuICAgICAgICB9IGVsc2UgaWYgKG5ldyBSZWdFeHAoJ1RoZXJlIGlzIG5vIHRyYWNraW5nIGluZm9ybWF0aW9uIGZvciB0aGUgY3VycmVudCBicmFuY2gnKS50ZXN0KGVycj8ubWVzc2FnZSkpIHtcclxuICAgICAgICAgICAgbmV3IE5vdGljZShcIlRoZXJlIGlzIG5vIHRyYWNraW5nIGluZm9ybWF0aW9uIGZvciB0aGUgY3VycmVudCBicmFuY2hcIik7XHJcbiAgICAgICAgfSBlbHNlIGlmIChlcnIgJiYgbmV3IFJlZ0V4cChgQ29tbWFuZCBmYWlsZWQ6ICR7ZXJyLmNtZH1gKS50ZXN0KGVycj8ubWVzc2FnZSkpIHtcclxuICAgICAgICAgICAgbmV3IE5vdGljZShcIk5vdGhpbmcgaGFzIGNoYW5nZWQuXCIpO1xyXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGVycikge1xyXG4gICAgICAgICAgIG5ldyBOb3RpY2UoXCJBbHJlYWR5IHVwIHRvIGRhdGUuXCIpO1xyXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiRG9uZS5cIik7XHJcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmaXhXaW5QYXRoKHJvb3RQYXRoOiBzdHJpbmcpIHtcclxuICAgICAgICBjb25zdCBvcyA9IHByb2Nlc3MucGxhdGZvcm07XHJcbiAgICAgICAgaWYgKG9zID09PSAnd2luMzInKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRyaXZlTWF0Y2ggPSBuZXcgUmVnRXhwKCdeW15cXCpdJykuZXhlYyhyb290UGF0aCk7XHJcbiAgICAgICAgICAgIGlmIChkcml2ZU1hdGNoLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGAke2RyaXZlTWF0Y2hbMF0udG9Mb3dlckNhc2UoKX06ICYmIGNkIFwiJHtyb290UGF0aH1cImA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXJzaW5nIHBhdGggZXJyb3InKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGBjZCBcIiR7cm9vdFBhdGh9XCJgO1xyXG4gICAgfVxyXG59XHJcbiJdLCJuYW1lcyI6WyJQbHVnaW5TZXR0aW5nVGFiIiwiUGx1Z2luIiwicGF0aC5ub3JtYWxpemUiLCJOb3RpY2UiLCJleGVjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBdURBO0FBQ08sU0FBUyxTQUFTLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFO0FBQzdELElBQUksU0FBUyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBTyxLQUFLLFlBQVksQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxVQUFVLE9BQU8sRUFBRSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO0FBQ2hILElBQUksT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsT0FBTyxDQUFDLEVBQUUsVUFBVSxPQUFPLEVBQUUsTUFBTSxFQUFFO0FBQy9E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
