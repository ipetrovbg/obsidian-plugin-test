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
        containerEl.createEl('p', { text: 'This plugin allows you to synchronize your vault with GitHub.' });
        containerEl.createEl('p', { text: 'You need to have GitHub account as prerequisite and in the folder, where it\'s your vault you have to initialize git repository.' });
        containerEl.createEl('p', { text: 'If you have these setup you are ready!' });
        containerEl.createEl('p', { text: 'This plugin will "listen" for Ctrl + s combination and it is going to perform git push to your repository.' });
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
            if (!error) {
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
        child_process.exec(gitBranchCommand, ((error, branchInfo) => {
            if (!error) {
                if (!callback) {
                    new obsidian.Notice(`You are on ${branchInfo} branch`, 10000);
                }
                else {
                    callback(branchInfo);
                }
            }
            else {
                debugger;
                new obsidian.Notice('Getting Branch Error.');
                return;
            }
        }));
    }
    executePullCallback(rootPath) {
        const command = this.fixWinPath(rootPath);
        const gitPullCommand = `${command} && git pull`;
        new obsidian.Notice(this.gitPullMessage);
        child_process.exec(gitPullCommand, (err) => {
            if (err) {
                return;
            }
            this.handleGitCommand(err);
        });
    }
    executeCommitCallback(rootPath) {
        const command = this.fixWinPath(rootPath);
        const gitCommitCommand = `${command} && git add . && git commit -m "sync"`;
        new obsidian.Notice(this.gitCommitMessage);
        child_process.exec(gitCommitCommand, (err) => {
            this.handleGitCommand(err, () => {
                if (err) {
                    return;
                }
                this.renderChanges(rootPath);
            });
        });
    }
    executeSyncCallback(rootPath) {
        const command = this.fixWinPath(rootPath);
        const gitSyncCommand = `${command} && git add . && git commit -m "sync" && git push`;
        new obsidian.Notice(this.gitSyncMessage);
        child_process.exec(gitSyncCommand, (err) => {
            this.handleGitCommand(err, () => {
                if (err) {
                    return;
                }
                this.renderChanges(rootPath);
            });
        });
    }
    executePushCallback(rootPath) {
        const command = this.fixWinPath(rootPath);
        const gitPushCommand = `${command} && git push`;
        new obsidian.Notice(this.gitPushMessage);
        child_process.exec(gitPushCommand, (err) => {
            this.handleGitCommand(err, () => {
                if (err) {
                    return;
                }
                this.renderChanges(rootPath);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNldHRpbmdzLXRhYi50cyIsIm1haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyohICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcclxuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XHJcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xyXG4gICAgICAgIHdoaWxlIChfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXhwb3J0U3RhcihtLCBvKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XHJcbiAgICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xyXG4gICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XHJcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAobyAmJiBpID49IG8ubGVuZ3RoKSBvID0gdm9pZCAwO1xyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XHJcbiAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XHJcbiAgICBpZiAoIW0pIHJldHVybiBvO1xyXG4gICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XHJcbiAgICBmaW5hbGx5IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWQoKSB7XHJcbiAgICBmb3IgKHZhciBhciA9IFtdLCBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcclxuICAgICAgICBhciA9IGFyLmNvbmNhdChfX3JlYWQoYXJndW1lbnRzW2ldKSk7XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XHJcbiAgICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcclxuICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcclxuICAgICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcclxuICAgICAgICAgICAgcltrXSA9IGFbal07XHJcbiAgICByZXR1cm4gcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXkodG8sIGZyb20pIHtcclxuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGZyb20ubGVuZ3RoLCBqID0gdG8ubGVuZ3RoOyBpIDwgaWw7IGkrKywgaisrKVxyXG4gICAgICAgIHRvW2pdID0gZnJvbVtpXTtcclxuICAgIHJldHVybiB0bztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaWYgKGdbbl0pIGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHJlc3VtZShuLCB2KSB7IHRyeSB7IHN0ZXAoZ1tuXSh2KSk7IH0gY2F0Y2ggKGUpIHsgc2V0dGxlKHFbMF1bM10sIGUpOyB9IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAocikgeyByLnZhbHVlIGluc3RhbmNlb2YgX19hd2FpdCA/IFByb21pc2UucmVzb2x2ZShyLnZhbHVlLnYpLnRoZW4oZnVsZmlsbCwgcmVqZWN0KSA6IHNldHRsZShxWzBdWzJdLCByKTsgfVxyXG4gICAgZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkgeyByZXN1bWUoXCJuZXh0XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gcmVqZWN0KHZhbHVlKSB7IHJlc3VtZShcInRocm93XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKGYsIHYpIHsgaWYgKGYodiksIHEuc2hpZnQoKSwgcS5sZW5ndGgpIHJlc3VtZShxWzBdWzBdLCBxWzBdWzFdKTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0RlbGVnYXRvcihvKSB7XHJcbiAgICB2YXIgaSwgcDtcclxuICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiwgZnVuY3Rpb24gKGUpIHsgdGhyb3cgZTsgfSksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaVtuXSA9IG9bbl0gPyBmdW5jdGlvbiAodikgeyByZXR1cm4gKHAgPSAhcCkgPyB7IHZhbHVlOiBfX2F3YWl0KG9bbl0odikpLCBkb25lOiBuID09PSBcInJldHVyblwiIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XHJcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgcHJpdmF0ZU1hcCkge1xyXG4gICAgaWYgKCFwcml2YXRlTWFwLmhhcyhyZWNlaXZlcikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXR0ZW1wdGVkIHRvIGdldCBwcml2YXRlIGZpZWxkIG9uIG5vbi1pbnN0YW5jZVwiKTtcclxuICAgIH1cclxuICAgIHJldHVybiBwcml2YXRlTWFwLmdldChyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0KHJlY2VpdmVyLCBwcml2YXRlTWFwLCB2YWx1ZSkge1xyXG4gICAgaWYgKCFwcml2YXRlTWFwLmhhcyhyZWNlaXZlcikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXR0ZW1wdGVkIHRvIHNldCBwcml2YXRlIGZpZWxkIG9uIG5vbi1pbnN0YW5jZVwiKTtcclxuICAgIH1cclxuICAgIHByaXZhdGVNYXAuc2V0KHJlY2VpdmVyLCB2YWx1ZSk7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn1cclxuIiwiaW1wb3J0IHtBcHAsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmd9IGZyb20gJ29ic2lkaWFuJztcclxuaW1wb3J0IEdpdEh1YlN5bmNQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEdpdEh1YlNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcclxuICAgIHBsdWdpbjogR2l0SHViU3luY1BsdWdpbjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBHaXRIdWJTeW5jUGx1Z2luKSB7XHJcbiAgICAgICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xyXG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG4gICAgfVxyXG5cclxuICAgIGRpc3BsYXkoKTogdm9pZCB7XHJcbiAgICAgICAgbGV0IHtjb250YWluZXJFbH0gPSB0aGlzO1xyXG4gICAgICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XHJcbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gyJywge3RleHQ6ICdHaXRIdWIgdmF1bHQgc3luY2hyb25pemF0aW9uIHBsdWdpbid9KTtcclxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHt0ZXh0OiAnVGhpcyBwbHVnaW4gYWxsb3dzIHlvdSB0byBzeW5jaHJvbml6ZSB5b3VyIHZhdWx0IHdpdGggR2l0SHViLid9KTtcclxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHt0ZXh0OiAnWW91IG5lZWQgdG8gaGF2ZSBHaXRIdWIgYWNjb3VudCBhcyBwcmVyZXF1aXNpdGUgYW5kIGluIHRoZSBmb2xkZXIsIHdoZXJlIGl0XFwncyB5b3VyIHZhdWx0IHlvdSBoYXZlIHRvIGluaXRpYWxpemUgZ2l0IHJlcG9zaXRvcnkuJ30pO1xyXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdwJywge3RleHQ6ICdJZiB5b3UgaGF2ZSB0aGVzZSBzZXR1cCB5b3UgYXJlIHJlYWR5ISd9KTtcclxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHt0ZXh0OiAnVGhpcyBwbHVnaW4gd2lsbCBcImxpc3RlblwiIGZvciBDdHJsICsgcyBjb21iaW5hdGlvbiBhbmQgaXQgaXMgZ29pbmcgdG8gcGVyZm9ybSBnaXQgcHVzaCB0byB5b3VyIHJlcG9zaXRvcnkuJ30pO1xyXG5cclxuICAgIH1cclxufVxyXG4iLCJpbXBvcnQgeyBOb3RpY2UsIFBsdWdpbiB9IGZyb20gJ29ic2lkaWFuJztcclxuaW1wb3J0IHtleGVjLCBFeGVjRXhjZXB0aW9ufSBmcm9tIFwiY2hpbGRfcHJvY2Vzc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQge0dpdEh1YlNldHRpbmdUYWJ9IGZyb20gJy4vc2V0dGluZ3MtdGFiJztcclxuXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHaXRIdWJTeW5jUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcclxuICAgIHByaXZhdGUgZ2l0U3luY01lc3NhZ2UgPSAnR2l0IFN5bmNpbmcuLi4nO1xyXG4gICAgcHJpdmF0ZSBnaXRQdWxsTWVzc2FnZSA9ICdHaXQgUHVsbC4uLic7XHJcbiAgICBwcml2YXRlIGdpdFB1c2hNZXNzYWdlID0gJ0dpdCBQdXNoLi4uJztcclxuICAgIHByaXZhdGUgZ2l0Q29tbWl0TWVzc2FnZSA9ICdHaXQgQ29tbWl0Li4uJztcclxuICAgIHByaXZhdGUgZ2l0QnJhbmNoTWVzc2FnZSA9ICdHaXQgQnJhbmNoJztcclxuICAgIHByaXZhdGUgZ2l0Q2hhbmdlc0NvdW50TWVzc2FnZSA9ICdHaXQgQ2hhbmdlcyBDb3VudGluZy4uJztcclxuICAgIHByaXZhdGUgZ2l0Q2hhbmdlc01lc3NhZ2UgPSAnR2l0IENoYW5nZXMuLic7XHJcblxyXG4gICAgcHVibGljIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHJcbiAgICAgICAgY29uc3Qgcm9vdFBhdGggPSBwYXRoLm5vcm1hbGl6ZSgodGhpcy5hcHAudmF1bHQuYWRhcHRlciBhcyBhbnkpLmJhc2VQYXRoKTtcclxuXHJcblxyXG4gICAgICAgIHRoaXMuYWRkU3RhdHVzQmFySXRlbSgpLmNyZWF0ZVNwYW4oe2NsczogJ2dpdCd9LCBlbCA9PlxyXG4gICAgICAgICAgICB0aGlzLmNvdW50QW5kUmVuZGVyR2l0Q2hhbmdlcyhlbCwgcm9vdFBhdGgpKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgICAgICAgaWQ6ICdnaXQtY2hhbmdlcycsXHJcbiAgICAgICAgICAgIG5hbWU6ICdHaXQgQ2hhbmdlcycsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmV4ZWN1dGVDaGFuZ2VzKHJvb3RQYXRoKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICAgICAgICBpZDogJ2dpdC1jaGFuZ2VzLWNvdW50JyxcclxuICAgICAgICAgICAgbmFtZTogJ0dpdCBDaGFuZ2VzIENvdW50JyxcclxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZXhlY3V0ZUNoYW5nZXNDb3VudChyb290UGF0aCwgY291bnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShgWW91IGhhdmUgJHtjb3VudH0gJHsgK2NvdW50ID09PSAxID8gJ2NoYW5nZScgOiAnY2hhbmdlcyd9YCwgMTAwMDApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGVjdXRlQnJhbmNoQ29tbWFuZChyb290UGF0aCwgYnJhbmNoID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBnaXRFbCA9ICh0aGlzLmFwcCBhcyBhbnkpLnN0YXR1c0Jhci5jb250YWluZXJFbC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdnaXQnKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY291bnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdpdEVsICYmIGdpdEVsLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2l0RWxbMF0uaW5uZXJIVE1MID0gYCR7YnJhbmNofSAke2NvdW50ID09PSAxID8gJ1snICsgY291bnQgKyAnIGNoYW5nZV0nIDogJ1snICsgY291bnQgKyAnIGNoYW5nZXNdJ31gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdpdEVsICYmIGdpdEVsLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2l0RWxbMF0uaW5uZXJIVE1MID0gYCR7YnJhbmNofSBbbm8gY2hhbmdlc11gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgICAgICAgIGlkOiAnZ2l0LXB1bGwnLFxyXG4gICAgICAgICAgICBuYW1lOiAnR2l0IFB1bGwnLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5leGVjdXRlUHVsbENhbGxiYWNrKHJvb3RQYXRoKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICAgICAgICBpZDogJ2dpdC1jb21taXQtYW5kLXB1c2gnLFxyXG4gICAgICAgICAgICBuYW1lOiAnR2l0IENvbW1pdCBhbmQgUHVzaCcsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmV4ZWN1dGVTeW5jQ2FsbGJhY2socm9vdFBhdGgpXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgICAgICAgIGlkOiAnZ2l0LWNvbW1pdCcsXHJcbiAgICAgICAgICAgIG5hbWU6ICdHaXQgQ29tbWl0JyxcclxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZXhlY3V0ZUNvbW1pdENhbGxiYWNrKHJvb3RQYXRoKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICAgICAgICBpZDogJ2dpdC1icmFuY2gnLFxyXG4gICAgICAgICAgICBuYW1lOiAnR2l0IEJyYW5jaCcsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmV4ZWN1dGVCcmFuY2hDb21tYW5kKHJvb3RQYXRoKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICAgICAgICBpZDogJ2dpdC1wdXNoJyxcclxuICAgICAgICAgICAgbmFtZTogJ0dpdCBQdXNoJyxcclxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZXhlY3V0ZVB1c2hDYWxsYmFjayhyb290UGF0aClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5leGVjdXRlUHVsbENhbGxiYWNrKHJvb3RQYXRoKTtcclxuXHJcbiAgICAgICAgLy8gdGhpcy5yZWdpc3RlckRvbUV2ZW50KGRvY3VtZW50LCAna2V5ZG93bicsIChldnQ6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuXHRcdC8vIFx0aWYgKGV2dC53aGljaCA9PT0gODMgJiYgZXZ0Lm1ldGFLZXkgfHwgZXZ0LmN0cmxLZXkgJiYgZXZ0LndoaWNoID09PSA4Mykge1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5leGVjdXRlU3luY0NhbGxiYWNrKHJvb3RQYXRoKTtcclxuICAgICAgICAvLyAgICAgfVxyXG5cdFx0Ly8gfSk7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgR2l0SHViU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNvdW50QW5kUmVuZGVyR2l0Q2hhbmdlcyhlbDogSFRNTEVsZW1lbnQsIHJvb3RQYXRoOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLmV4ZWN1dGVCcmFuY2hDb21tYW5kKHJvb3RQYXRoLCBicmFuY2ggPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmV4ZWN1dGVDaGFuZ2VzQ291bnQocm9vdFBhdGgsIGNvdW50ID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChjb3VudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5pbm5lckhUTUwgPSBgJHticmFuY2h9ICR7Y291bnQgPT09IDEgPyAnWycgKyBjb3VudCArICcgY2hhbmdlXScgOiAnWycgKyBjb3VudCArICcgY2hhbmdlc10nfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWwuaW5uZXJIVE1MID0gYCR7YnJhbmNofSBbbm8gY2hhbmdlc11gO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZW5kZXJDaGFuZ2VzKHJvb3RQYXRoOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCBnaXRFbCA9ICh0aGlzLmFwcCBhcyBhbnkpLnN0YXR1c0Jhci5jb250YWluZXJFbC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdnaXQnKTtcclxuXHJcbiAgICAgICAgaWYgKGdpdEVsICYmIGdpdEVsLmxlbmd0aCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvdW50QW5kUmVuZGVyR2l0Q2hhbmdlcyhnaXRFbFswXSwgcm9vdFBhdGgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGV4ZWN1dGVDaGFuZ2VzKHJvb3RQYXRoOiBzdHJpbmcpIHtcclxuICAgICAgICBjb25zdCBjb21tYW5kID0gdGhpcy5maXhXaW5QYXRoKHJvb3RQYXRoKTtcclxuICAgICAgICBjb25zdCBnaXRDaGFuZ2VzQ29tbWFuZCA9IGAke2NvbW1hbmR9ICYmIGdpdCBzdGF0dXMgLXNgO1xyXG4gICAgICAgIG5ldyBOb3RpY2UodGhpcy5naXRDaGFuZ2VzTWVzc2FnZSk7XHJcblxyXG4gICAgICAgIHRoaXMuZXhlY3V0ZUNoYW5nZXNDb3VudChyb290UGF0aCwgY291bnQgPT4ge1xyXG4gICAgICAgICAgICBpZiAoY291bnQpIHtcclxuICAgICAgICAgICAgICAgIGV4ZWMoZ2l0Q2hhbmdlc0NvbW1hbmQsICgoZXJyb3IsIGNoYW5nZXMpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoY2hhbmdlcywgMjAwMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ2NoYW5nZXMgRXJyb3IuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKFwiWW91IGRvbid0IGhhdmUgYW55IGNoYW5nZXNcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGV4ZWN1dGVDaGFuZ2VzQ291bnQocm9vdFBhdGg6IHN0cmluZywgY2FsbGJhY2s/OiAoY291bnQ6IG51bWJlcikgPT4gdm9pZCkge1xyXG4gICAgICAgIGNvbnN0IGNvbW1hbmQgPSB0aGlzLmZpeFdpblBhdGgocm9vdFBhdGgpO1xyXG4gICAgICAgIGNvbnN0IG9zID0gcHJvY2Vzcy5wbGF0Zm9ybTtcclxuICAgICAgICBsZXQgZ2l0Q2hhbmdlc0NvdW50Q29tbWFuZCA9IFwiXCI7XHJcbiAgICAgICAgaWYgKG9zID09PSAnd2luMzInKSB7XHJcbiAgICAgICAgICAgIGdpdENoYW5nZXNDb3VudENvbW1hbmQgPSBgJHtjb21tYW5kfSAmJiBnaXQgc3RhdHVzIC1zIHwgZmluZCAvYyAvdiBcIlwiYDtcclxuICAgICAgICB9IGVsc2UgaWYgKG9zID09PSAnZGFyd2luJykge1xyXG4gICAgICAgICAgICBnaXRDaGFuZ2VzQ291bnRDb21tYW5kID0gYCR7Y29tbWFuZH0gJiYgZ2l0IHN0YXR1cyAtcyB8IGVncmVwIFwiXCIgfCB3YyAtbGA7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgaWYgKCFjYWxsYmFjaykge1xyXG4gICAgICAgICAgICBuZXcgTm90aWNlKHRoaXMuZ2l0Q2hhbmdlc0NvdW50TWVzc2FnZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBleGVjKGdpdENoYW5nZXNDb3VudENvbW1hbmQsICgoZXJyb3IsIGNvdW50LCBzdGRlcnIpID0+IHtcclxuICAgICAgICAgICAgaWYgKCFlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soK2NvdW50KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShgWW91IGhhdmUgJHtjb3VudH0gJHsgK2NvdW50ID09PSAxID8gJ2NoYW5nZScgOiAnY2hhbmdlcyd9YCwgMTAwMDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnQ2hhbmdlcyBDb3VudCBFcnJvci4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGV4ZWN1dGVCcmFuY2hDb21tYW5kKHJvb3RQYXRoOiBzdHJpbmcsIGNhbGxiYWNrPzogKGJyYW5jaDogc3RyaW5nKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IHRoaXMuZml4V2luUGF0aChyb290UGF0aCk7XHJcbiAgICAgICAgY29uc3QgZ2l0QnJhbmNoQ29tbWFuZCA9IGAke2NvbW1hbmR9ICYmIGdpdCBicmFuY2hgO1xyXG5cclxuICAgICAgICBpZiAoIWNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgIG5ldyBOb3RpY2UodGhpcy5naXRCcmFuY2hNZXNzYWdlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZXhlYyhnaXRCcmFuY2hDb21tYW5kLCAoKGVycm9yLCBicmFuY2hJbmZvKSA9PiB7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShgWW91IGFyZSBvbiAke2JyYW5jaEluZm99IGJyYW5jaGAsIDEwMDAwKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soYnJhbmNoSW5mbyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBkZWJ1Z2dlclxyXG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnR2V0dGluZyBCcmFuY2ggRXJyb3IuJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBleGVjdXRlUHVsbENhbGxiYWNrKHJvb3RQYXRoOiBzdHJpbmcpIHtcclxuICAgICAgICBjb25zdCBjb21tYW5kID0gdGhpcy5maXhXaW5QYXRoKHJvb3RQYXRoKTtcclxuICAgICAgICBjb25zdCBnaXRQdWxsQ29tbWFuZCA9IGAke2NvbW1hbmR9ICYmIGdpdCBwdWxsYDtcclxuICAgICAgICBuZXcgTm90aWNlKHRoaXMuZ2l0UHVsbE1lc3NhZ2UpO1xyXG4gICAgICAgIGV4ZWMoZ2l0UHVsbENvbW1hbmQsIChlcnIpID0+IHtcclxuICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlR2l0Q29tbWFuZChlcnIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZXhlY3V0ZUNvbW1pdENhbGxiYWNrKHJvb3RQYXRoOiBzdHJpbmcpIHtcclxuICAgICAgICBjb25zdCBjb21tYW5kID0gdGhpcy5maXhXaW5QYXRoKHJvb3RQYXRoKTtcclxuICAgICAgICBjb25zdCBnaXRDb21taXRDb21tYW5kID0gYCR7Y29tbWFuZH0gJiYgZ2l0IGFkZCAuICYmIGdpdCBjb21taXQgLW0gXCJzeW5jXCJgO1xyXG4gICAgICAgIG5ldyBOb3RpY2UodGhpcy5naXRDb21taXRNZXNzYWdlKTtcclxuICAgICAgICBleGVjKGdpdENvbW1pdENvbW1hbmQsIChlcnIpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVHaXRDb21tYW5kKGVyciwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQ2hhbmdlcyhyb290UGF0aCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZXhlY3V0ZVN5bmNDYWxsYmFjayhyb290UGF0aDogc3RyaW5nKSB7XHJcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IHRoaXMuZml4V2luUGF0aChyb290UGF0aCk7XHJcbiAgICAgICAgY29uc3QgZ2l0U3luY0NvbW1hbmQgPSBgJHtjb21tYW5kfSAmJiBnaXQgYWRkIC4gJiYgZ2l0IGNvbW1pdCAtbSBcInN5bmNcIiAmJiBnaXQgcHVzaGA7XHJcbiAgICAgICAgbmV3IE5vdGljZSh0aGlzLmdpdFN5bmNNZXNzYWdlKTtcclxuICAgICAgICBleGVjKGdpdFN5bmNDb21tYW5kLCAoZXJyKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlR2l0Q29tbWFuZChlcnIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckNoYW5nZXMocm9vdFBhdGgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGV4ZWN1dGVQdXNoQ2FsbGJhY2socm9vdFBhdGg6IHN0cmluZykge1xyXG4gICAgICAgIGNvbnN0IGNvbW1hbmQgPSB0aGlzLmZpeFdpblBhdGgocm9vdFBhdGgpO1xyXG4gICAgICAgIGNvbnN0IGdpdFB1c2hDb21tYW5kID0gYCR7Y29tbWFuZH0gJiYgZ2l0IHB1c2hgO1xyXG4gICAgICAgIG5ldyBOb3RpY2UodGhpcy5naXRQdXNoTWVzc2FnZSk7XHJcbiAgICAgICAgZXhlYyhnaXRQdXNoQ29tbWFuZCwgKGVycikgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUdpdENvbW1hbmQoZXJyLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJDaGFuZ2VzKHJvb3RQYXRoKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlR2l0Q29tbWFuZChlcnI6IEV4ZWNFeGNlcHRpb24gfCBudWxsLCBjYWxsYmFjaz86ICgpID0+IHZvaWQpIHtcclxuICAgICAgICBpZiAobmV3IFJlZ0V4cCgnTm8gY29uZmlndXJlZCBwdXNoIGRlc3RpbmF0aW9uJykudGVzdChlcnI/Lm1lc3NhZ2UpKSB7XHJcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJZb3UgbmVlZCB0byBzZXR1cCBnaXQgcmVwb3NpdG9yeS5cIik7XHJcbiAgICAgICAgfSBlbHNlIGlmIChuZXcgUmVnRXhwKCdUaGVyZSBpcyBubyB0cmFja2luZyBpbmZvcm1hdGlvbiBmb3IgdGhlIGN1cnJlbnQgYnJhbmNoJykudGVzdChlcnI/Lm1lc3NhZ2UpKSB7XHJcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJUaGVyZSBpcyBubyB0cmFja2luZyBpbmZvcm1hdGlvbiBmb3IgdGhlIGN1cnJlbnQgYnJhbmNoXCIpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZXJyICYmIG5ldyBSZWdFeHAoYENvbW1hbmQgZmFpbGVkOiAke2Vyci5jbWR9YCkudGVzdChlcnI/Lm1lc3NhZ2UpKSB7XHJcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJOb3RoaW5nIGhhcyBjaGFuZ2VkLlwiKTtcclxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChlcnIpIHtcclxuICAgICAgICAgICBuZXcgTm90aWNlKFwiQWxyZWFkeSB1cCB0byBkYXRlLlwiKTtcclxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbmV3IE5vdGljZShcIkRvbmUuXCIpO1xyXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZml4V2luUGF0aChyb290UGF0aDogc3RyaW5nKSB7XHJcbiAgICAgICAgY29uc3Qgb3MgPSBwcm9jZXNzLnBsYXRmb3JtO1xyXG4gICAgICAgIGlmIChvcyA9PT0gJ3dpbjMyJykge1xyXG4gICAgICAgICAgICBjb25zdCBkcml2ZU1hdGNoID0gbmV3IFJlZ0V4cCgnXlteXFwqXScpLmV4ZWMocm9vdFBhdGgpO1xyXG4gICAgICAgICAgICBpZiAoZHJpdmVNYXRjaC5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBgJHtkcml2ZU1hdGNoWzBdLnRvTG93ZXJDYXNlKCl9OiAmJiBjZCBcIiR7cm9vdFBhdGh9XCJgO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGFyc2luZyBwYXRoIGVycm9yJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBgY2QgXCIke3Jvb3RQYXRofVwiYDtcclxuICAgIH1cclxufVxyXG4iXSwibmFtZXMiOlsiUGx1Z2luU2V0dGluZ1RhYiIsIlBsdWdpbiIsInBhdGgubm9ybWFsaXplIiwiTm90aWNlIiwiZXhlYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQXVEQTtBQUNPLFNBQVMsU0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRTtBQUM3RCxJQUFJLFNBQVMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sS0FBSyxZQUFZLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsVUFBVSxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNoSCxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUMvRCxRQUFRLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7QUFDbkcsUUFBUSxTQUFTLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7QUFDdEcsUUFBUSxTQUFTLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUU7QUFDdEgsUUFBUSxJQUFJLENBQUMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsVUFBVSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7QUFDOUUsS0FBSyxDQUFD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
