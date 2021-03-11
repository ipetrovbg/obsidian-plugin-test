'use strict';

var obsidian = require('obsidian');
var child_process = require('child_process');

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
            const rootPath = obsidian.normalizePath(this.app.vault.adapter.basePath);
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
            this.registerDomEvent(document, 'keydown', (evt) => {
                if (evt.which === 83 && evt.metaKey || evt.ctrlKey && evt.which === 83) {
                    this.executeSyncCallback(rootPath);
                }
            });
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
        const gitChangesCommand = `cd "${rootPath}" && git status -s`;
        new obsidian.Notice(this.gitChangesMessage);
        this.executeChangesCount(rootPath, count => {
            if (count) {
                child_process.exec(gitChangesCommand, ((error, changes) => {
                    if (!error) {
                        new obsidian.Notice(changes, 20000);
                    }
                    else {
                        new obsidian.Notice('Error.');
                    }
                }));
            }
            else {
                new obsidian.Notice("You don't have any changes");
            }
        });
    }
    executeChangesCount(rootPath, callback) {
        const os = process.platform;
        let gitChangesCountCommand = "";
        if (os === 'win32') {
            gitChangesCountCommand = `cd "${rootPath}" && git status -s | find /c /v ""`;
        }
        else if (os === 'darwin') {
            gitChangesCountCommand = `cd "${rootPath}" && git status -s | egrep "" | wc -l`;
        }
        if (!callback) {
            new obsidian.Notice(this.gitChangesCountMessage);
        }
        child_process.exec(gitChangesCountCommand, ((error, count) => {
            if (!error) {
                if (callback) {
                    callback(+count);
                }
                else {
                    new obsidian.Notice(`You have ${count} ${+count === 1 ? 'change' : 'changes'}`, 10000);
                }
            }
            else {
                new obsidian.Notice('Error.');
            }
        }));
    }
    executeBranchCommand(rootPath, callback) {
        const gitBranchCommand = `cd "${rootPath}" && git branch`;
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
                new obsidian.Notice('Error.');
            }
        }));
    }
    executePullCallback(rootPath) {
        const gitPullCommand = `cd "${rootPath}" && git pull`;
        new obsidian.Notice(this.gitPullMessage);
        child_process.exec(gitPullCommand, (err) => {
            this.handleGitCommand(err, () => {
                this.renderChanges(rootPath);
            });
        });
    }
    executeCommitCallback(rootPath) {
        const gitCommitCommand = `cd "${rootPath}" && git add . && git commit -m "sync"`;
        new obsidian.Notice(this.gitCommitMessage);
        child_process.exec(gitCommitCommand, (err) => {
            this.handleGitCommand(err, () => {
                this.renderChanges(rootPath);
            });
        });
    }
    executeSyncCallback(rootPath) {
        const gitSyncCommand = `cd "${rootPath}" && git add . && git commit -m "sync" && git push`;
        new obsidian.Notice(this.gitSyncMessage);
        child_process.exec(gitSyncCommand, (err) => {
            this.handleGitCommand(err, () => {
                this.renderChanges(rootPath);
            });
        });
    }
    executePushCallback(rootPath) {
        const gitPushCommand = `cd "${rootPath}" && git push`;
        new obsidian.Notice(this.gitPushMessage);
        child_process.exec(gitPushCommand, (err) => {
            this.handleGitCommand(err, () => {
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
}

module.exports = GitHubSyncPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNldHRpbmdzLXRhYi50cyIsIm1haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyohICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcclxuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XHJcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xyXG4gICAgICAgIHdoaWxlIChfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXhwb3J0U3RhcihtLCBvKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XHJcbiAgICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xyXG4gICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XHJcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAobyAmJiBpID49IG8ubGVuZ3RoKSBvID0gdm9pZCAwO1xyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XHJcbiAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XHJcbiAgICBpZiAoIW0pIHJldHVybiBvO1xyXG4gICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XHJcbiAgICBmaW5hbGx5IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWQoKSB7XHJcbiAgICBmb3IgKHZhciBhciA9IFtdLCBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcclxuICAgICAgICBhciA9IGFyLmNvbmNhdChfX3JlYWQoYXJndW1lbnRzW2ldKSk7XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XHJcbiAgICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcclxuICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcclxuICAgICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcclxuICAgICAgICAgICAgcltrXSA9IGFbal07XHJcbiAgICByZXR1cm4gcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXkodG8sIGZyb20pIHtcclxuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGZyb20ubGVuZ3RoLCBqID0gdG8ubGVuZ3RoOyBpIDwgaWw7IGkrKywgaisrKVxyXG4gICAgICAgIHRvW2pdID0gZnJvbVtpXTtcclxuICAgIHJldHVybiB0bztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaWYgKGdbbl0pIGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHJlc3VtZShuLCB2KSB7IHRyeSB7IHN0ZXAoZ1tuXSh2KSk7IH0gY2F0Y2ggKGUpIHsgc2V0dGxlKHFbMF1bM10sIGUpOyB9IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAocikgeyByLnZhbHVlIGluc3RhbmNlb2YgX19hd2FpdCA/IFByb21pc2UucmVzb2x2ZShyLnZhbHVlLnYpLnRoZW4oZnVsZmlsbCwgcmVqZWN0KSA6IHNldHRsZShxWzBdWzJdLCByKTsgfVxyXG4gICAgZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkgeyByZXN1bWUoXCJuZXh0XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gcmVqZWN0KHZhbHVlKSB7IHJlc3VtZShcInRocm93XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKGYsIHYpIHsgaWYgKGYodiksIHEuc2hpZnQoKSwgcS5sZW5ndGgpIHJlc3VtZShxWzBdWzBdLCBxWzBdWzFdKTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0RlbGVnYXRvcihvKSB7XHJcbiAgICB2YXIgaSwgcDtcclxuICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiwgZnVuY3Rpb24gKGUpIHsgdGhyb3cgZTsgfSksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaVtuXSA9IG9bbl0gPyBmdW5jdGlvbiAodikgeyByZXR1cm4gKHAgPSAhcCkgPyB7IHZhbHVlOiBfX2F3YWl0KG9bbl0odikpLCBkb25lOiBuID09PSBcInJldHVyblwiIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XHJcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgcHJpdmF0ZU1hcCkge1xyXG4gICAgaWYgKCFwcml2YXRlTWFwLmhhcyhyZWNlaXZlcikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXR0ZW1wdGVkIHRvIGdldCBwcml2YXRlIGZpZWxkIG9uIG5vbi1pbnN0YW5jZVwiKTtcclxuICAgIH1cclxuICAgIHJldHVybiBwcml2YXRlTWFwLmdldChyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0KHJlY2VpdmVyLCBwcml2YXRlTWFwLCB2YWx1ZSkge1xyXG4gICAgaWYgKCFwcml2YXRlTWFwLmhhcyhyZWNlaXZlcikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXR0ZW1wdGVkIHRvIHNldCBwcml2YXRlIGZpZWxkIG9uIG5vbi1pbnN0YW5jZVwiKTtcclxuICAgIH1cclxuICAgIHByaXZhdGVNYXAuc2V0KHJlY2VpdmVyLCB2YWx1ZSk7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn1cclxuIiwiaW1wb3J0IHtBcHAsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmd9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCBHaXRIdWJTeW5jUGx1Z2luIGZyb20gXCIuL21haW5cIjtcblxuZXhwb3J0IGNsYXNzIEdpdEh1YlNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgICBwbHVnaW46IEdpdEh1YlN5bmNQbHVnaW47XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBHaXRIdWJTeW5jUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICAgICAgbGV0IHtjb250YWluZXJFbH0gPSB0aGlzO1xuICAgICAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDInLCB7dGV4dDogJ0dpdEh1YiB2YXVsdCBzeW5jaHJvbml6YXRpb24gcGx1Z2luJ30pO1xuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHt0ZXh0OiAnVGhpcyBwbHVnaW4gYWxsb3dzIHlvdSB0byBzeW5jaHJvbml6ZSB5b3VyIHZhdWx0IHdpdGggR2l0SHViLid9KTtcbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ3AnLCB7dGV4dDogJ1lvdSBuZWVkIHRvIGhhdmUgR2l0SHViIGFjY291bnQgYXMgcHJlcmVxdWlzaXRlIGFuZCBpbiB0aGUgZm9sZGVyLCB3aGVyZSBpdFxcJ3MgeW91ciB2YXVsdCB5b3UgaGF2ZSB0byBpbml0aWFsaXplIGdpdCByZXBvc2l0b3J5Lid9KTtcbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ3AnLCB7dGV4dDogJ0lmIHlvdSBoYXZlIHRoZXNlIHNldHVwIHlvdSBhcmUgcmVhZHkhJ30pO1xuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHt0ZXh0OiAnVGhpcyBwbHVnaW4gd2lsbCBcImxpc3RlblwiIGZvciBDdHJsICsgcyBjb21iaW5hdGlvbiBhbmQgaXQgaXMgZ29pbmcgdG8gcGVyZm9ybSBnaXQgcHVzaCB0byB5b3VyIHJlcG9zaXRvcnkuJ30pO1xuXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgbm9ybWFsaXplUGF0aCwgTm90aWNlLCBQbHVnaW4sIFdvcmtzcGFjZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7ZXhlYywgRXhlY0V4Y2VwdGlvbn0gZnJvbSBcImNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7R2l0SHViU2V0dGluZ1RhYn0gZnJvbSAnLi9zZXR0aW5ncy10YWInO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdpdEh1YlN5bmNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICAgIHByaXZhdGUgZ2l0U3luY01lc3NhZ2UgPSAnR2l0IFN5bmNpbmcuLi4nO1xuICAgIHByaXZhdGUgZ2l0UHVsbE1lc3NhZ2UgPSAnR2l0IFB1bGwuLi4nO1xuICAgIHByaXZhdGUgZ2l0UHVzaE1lc3NhZ2UgPSAnR2l0IFB1c2guLi4nO1xuICAgIHByaXZhdGUgZ2l0Q29tbWl0TWVzc2FnZSA9ICdHaXQgQ29tbWl0Li4uJztcbiAgICBwcml2YXRlIGdpdEJyYW5jaE1lc3NhZ2UgPSAnR2l0IEJyYW5jaCc7XG4gICAgcHJpdmF0ZSBnaXRDaGFuZ2VzQ291bnRNZXNzYWdlID0gJ0dpdCBDaGFuZ2VzIENvdW50aW5nLi4nO1xuICAgIHByaXZhdGUgZ2l0Q2hhbmdlc01lc3NhZ2UgPSAnR2l0IENoYW5nZXMuLic7XG5cbiAgICBwdWJsaWMgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuXG4gICAgICAgIGNvbnN0IHJvb3RQYXRoID0gbm9ybWFsaXplUGF0aCgodGhpcy5hcHAudmF1bHQuYWRhcHRlciBhcyBhbnkpLmJhc2VQYXRoKTtcblxuICAgICAgICB0aGlzLmFkZFN0YXR1c0Jhckl0ZW0oKS5jcmVhdGVTcGFuKHtjbHM6ICdnaXQnfSwgZWwgPT5cbiAgICAgICAgICAgIHRoaXMuY291bnRBbmRSZW5kZXJHaXRDaGFuZ2VzKGVsLCByb290UGF0aCkpO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2dpdC1jaGFuZ2VzJyxcbiAgICAgICAgICAgIG5hbWU6ICdHaXQgQ2hhbmdlcycsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5leGVjdXRlQ2hhbmdlcyhyb290UGF0aClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZ2l0LWNoYW5nZXMtY291bnQnLFxuICAgICAgICAgICAgbmFtZTogJ0dpdCBDaGFuZ2VzIENvdW50JyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmV4ZWN1dGVDaGFuZ2VzQ291bnQocm9vdFBhdGgsIGNvdW50ID0+IHtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBZb3UgaGF2ZSAke2NvdW50fSAkeyArY291bnQgPT09IDEgPyAnY2hhbmdlJyA6ICdjaGFuZ2VzJ31gLCAxMDAwMCk7XG4gICAgICAgICAgICAgICAgdGhpcy5leGVjdXRlQnJhbmNoQ29tbWFuZChyb290UGF0aCwgYnJhbmNoID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZ2l0RWwgPSAodGhpcy5hcHAgYXMgYW55KS5zdGF0dXNCYXIuY29udGFpbmVyRWwuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnZ2l0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb3VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdpdEVsICYmIGdpdEVsLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdpdEVsWzBdLmlubmVySFRNTCA9IGAke2JyYW5jaH0gJHtjb3VudCA9PT0gMSA/ICdbJyArIGNvdW50ICsgJyBjaGFuZ2VdJyA6ICdbJyArIGNvdW50ICsgJyBjaGFuZ2VzXSd9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChnaXRFbCAmJiBnaXRFbC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnaXRFbFswXS5pbm5lckhUTUwgPSBgJHticmFuY2h9IFtubyBjaGFuZ2VzXWA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2dpdC1wdWxsJyxcbiAgICAgICAgICAgIG5hbWU6ICdHaXQgUHVsbCcsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5leGVjdXRlUHVsbENhbGxiYWNrKHJvb3RQYXRoKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdnaXQtY29tbWl0LWFuZC1wdXNoJyxcbiAgICAgICAgICAgIG5hbWU6ICdHaXQgQ29tbWl0IGFuZCBQdXNoJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmV4ZWN1dGVTeW5jQ2FsbGJhY2socm9vdFBhdGgpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2dpdC1jb21taXQnLFxuICAgICAgICAgICAgbmFtZTogJ0dpdCBDb21taXQnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZXhlY3V0ZUNvbW1pdENhbGxiYWNrKHJvb3RQYXRoKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdnaXQtYnJhbmNoJyxcbiAgICAgICAgICAgIG5hbWU6ICdHaXQgQnJhbmNoJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmV4ZWN1dGVCcmFuY2hDb21tYW5kKHJvb3RQYXRoKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdnaXQtcHVzaCcsXG4gICAgICAgICAgICBuYW1lOiAnR2l0IFB1c2gnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZXhlY3V0ZVB1c2hDYWxsYmFjayhyb290UGF0aClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5leGVjdXRlUHVsbENhbGxiYWNrKHJvb3RQYXRoKTtcblxuICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZG9jdW1lbnQsICdrZXlkb3duJywgKGV2dDogS2V5Ym9hcmRFdmVudCkgPT4ge1xuXHRcdFx0aWYgKGV2dC53aGljaCA9PT0gODMgJiYgZXZ0Lm1ldGFLZXkgfHwgZXZ0LmN0cmxLZXkgJiYgZXZ0LndoaWNoID09PSA4Mykge1xuICAgICAgICAgICAgICAgIHRoaXMuZXhlY3V0ZVN5bmNDYWxsYmFjayhyb290UGF0aCk7XG4gICAgICAgICAgICB9XG5cdFx0fSk7XG5cbiAgICAgICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBHaXRIdWJTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG5cbiAgICB9XG5cbiAgICBwcml2YXRlIGNvdW50QW5kUmVuZGVyR2l0Q2hhbmdlcyhlbDogSFRNTEVsZW1lbnQsIHJvb3RQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5leGVjdXRlQnJhbmNoQ29tbWFuZChyb290UGF0aCwgYnJhbmNoID0+IHtcbiAgICAgICAgICAgIHRoaXMuZXhlY3V0ZUNoYW5nZXNDb3VudChyb290UGF0aCwgY291bnQgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChjb3VudCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLmlubmVySFRNTCA9IGAke2JyYW5jaH0gJHtjb3VudCA9PT0gMSA/ICdbJyArIGNvdW50ICsgJyBjaGFuZ2VdJyA6ICdbJyArIGNvdW50ICsgJyBjaGFuZ2VzXSd9YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuaW5uZXJIVE1MID0gYCR7YnJhbmNofSBbbm8gY2hhbmdlc11gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgcmVuZGVyQ2hhbmdlcyhyb290UGF0aDogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGdpdEVsID0gKHRoaXMuYXBwIGFzIGFueSkuc3RhdHVzQmFyLmNvbnRhaW5lckVsLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2dpdCcpO1xuXG4gICAgICAgIGlmIChnaXRFbCAmJiBnaXRFbC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuY291bnRBbmRSZW5kZXJHaXRDaGFuZ2VzKGdpdEVsWzBdLCByb290UGF0aCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGV4ZWN1dGVDaGFuZ2VzKHJvb3RQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgZ2l0Q2hhbmdlc0NvbW1hbmQgPSBgY2QgXCIke3Jvb3RQYXRofVwiICYmIGdpdCBzdGF0dXMgLXNgO1xuICAgICAgICBuZXcgTm90aWNlKHRoaXMuZ2l0Q2hhbmdlc01lc3NhZ2UpO1xuXG4gICAgICAgIHRoaXMuZXhlY3V0ZUNoYW5nZXNDb3VudChyb290UGF0aCwgY291bnQgPT4ge1xuICAgICAgICAgICAgaWYgKGNvdW50KSB7XG4gICAgICAgICAgICAgICAgZXhlYyhnaXRDaGFuZ2VzQ29tbWFuZCwgKChlcnJvciwgY2hhbmdlcykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGNoYW5nZXMsIDIwMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0Vycm9yLicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKFwiWW91IGRvbid0IGhhdmUgYW55IGNoYW5nZXNcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgZXhlY3V0ZUNoYW5nZXNDb3VudChyb290UGF0aDogc3RyaW5nLCBjYWxsYmFjaz86IChjb3VudDogbnVtYmVyKSA9PiB2b2lkKSB7XG4gICAgICAgIGNvbnN0IG9zID0gcHJvY2Vzcy5wbGF0Zm9ybTtcbiAgICAgICAgbGV0IGdpdENoYW5nZXNDb3VudENvbW1hbmQgPSBcIlwiO1xuICAgICAgICBpZiAob3MgPT09ICd3aW4zMicpIHtcbiAgICAgICAgICAgIGdpdENoYW5nZXNDb3VudENvbW1hbmQgPSBgY2QgXCIke3Jvb3RQYXRofVwiICYmIGdpdCBzdGF0dXMgLXMgfCBmaW5kIC9jIC92IFwiXCJgO1xuICAgICAgICB9IGVsc2UgaWYgKG9zID09PSAnZGFyd2luJykge1xuICAgICAgICAgICAgZ2l0Q2hhbmdlc0NvdW50Q29tbWFuZCA9IGBjZCBcIiR7cm9vdFBhdGh9XCIgJiYgZ2l0IHN0YXR1cyAtcyB8IGVncmVwIFwiXCIgfCB3YyAtbGA7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmICghY2FsbGJhY2spIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UodGhpcy5naXRDaGFuZ2VzQ291bnRNZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4ZWMoZ2l0Q2hhbmdlc0NvdW50Q29tbWFuZCwgKChlcnJvciwgY291bnQpID0+IHtcbiAgICAgICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soK2NvdW50KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBZb3UgaGF2ZSAke2NvdW50fSAkeyArY291bnQgPT09IDEgPyAnY2hhbmdlJyA6ICdjaGFuZ2VzJ31gLCAxMDAwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKCdFcnJvci4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZXhlY3V0ZUJyYW5jaENvbW1hbmQocm9vdFBhdGg6IHN0cmluZywgY2FsbGJhY2s/OiAoYnJhbmNoOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgICAgICAgY29uc3QgZ2l0QnJhbmNoQ29tbWFuZCA9IGBjZCBcIiR7cm9vdFBhdGh9XCIgJiYgZ2l0IGJyYW5jaGA7XG4gICAgICAgIGlmICghY2FsbGJhY2spIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UodGhpcy5naXRCcmFuY2hNZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBleGVjKGdpdEJyYW5jaENvbW1hbmQsICgoZXJyb3IsIGJyYW5jaEluZm8pID0+IHtcbiAgICAgICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYFlvdSBhcmUgb24gJHticmFuY2hJbmZvfSBicmFuY2hgLCAxMDAwMCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soYnJhbmNoSW5mbyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKCdFcnJvci4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZXhlY3V0ZVB1bGxDYWxsYmFjayhyb290UGF0aDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGdpdFB1bGxDb21tYW5kID0gYGNkIFwiJHtyb290UGF0aH1cIiAmJiBnaXQgcHVsbGA7XG4gICAgICAgIG5ldyBOb3RpY2UodGhpcy5naXRQdWxsTWVzc2FnZSk7XG4gICAgICAgIGV4ZWMoZ2l0UHVsbENvbW1hbmQsIChlcnIpID0+IHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlR2l0Q29tbWFuZChlcnIsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckNoYW5nZXMocm9vdFBhdGgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgZXhlY3V0ZUNvbW1pdENhbGxiYWNrKHJvb3RQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgZ2l0Q29tbWl0Q29tbWFuZCA9IGBjZCBcIiR7cm9vdFBhdGh9XCIgJiYgZ2l0IGFkZCAuICYmIGdpdCBjb21taXQgLW0gXCJzeW5jXCJgO1xuICAgICAgICBuZXcgTm90aWNlKHRoaXMuZ2l0Q29tbWl0TWVzc2FnZSk7XG4gICAgICAgIGV4ZWMoZ2l0Q29tbWl0Q29tbWFuZCwgKGVycikgPT4ge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVHaXRDb21tYW5kKGVyciwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQ2hhbmdlcyhyb290UGF0aCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBleGVjdXRlU3luY0NhbGxiYWNrKHJvb3RQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgZ2l0U3luY0NvbW1hbmQgPSBgY2QgXCIke3Jvb3RQYXRofVwiICYmIGdpdCBhZGQgLiAmJiBnaXQgY29tbWl0IC1tIFwic3luY1wiICYmIGdpdCBwdXNoYDtcbiAgICAgICAgbmV3IE5vdGljZSh0aGlzLmdpdFN5bmNNZXNzYWdlKTtcbiAgICAgICAgZXhlYyhnaXRTeW5jQ29tbWFuZCwgKGVycikgPT4ge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVHaXRDb21tYW5kKGVyciwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQ2hhbmdlcyhyb290UGF0aCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBleGVjdXRlUHVzaENhbGxiYWNrKHJvb3RQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgZ2l0UHVzaENvbW1hbmQgPSBgY2QgXCIke3Jvb3RQYXRofVwiICYmIGdpdCBwdXNoYDtcbiAgICAgICAgbmV3IE5vdGljZSh0aGlzLmdpdFB1c2hNZXNzYWdlKTtcbiAgICAgICAgZXhlYyhnaXRQdXNoQ29tbWFuZCwgKGVycikgPT4ge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVHaXRDb21tYW5kKGVyciwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQ2hhbmdlcyhyb290UGF0aCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVHaXRDb21tYW5kKGVycjogRXhlY0V4Y2VwdGlvbiB8IG51bGwsIGNhbGxiYWNrPzogKCkgPT4gdm9pZCkge1xuICAgICAgICBpZiAobmV3IFJlZ0V4cCgnTm8gY29uZmlndXJlZCBwdXNoIGRlc3RpbmF0aW9uJykudGVzdChlcnI/Lm1lc3NhZ2UpKSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiWW91IG5lZWQgdG8gc2V0dXAgZ2l0IHJlcG9zaXRvcnkuXCIpO1xuICAgICAgICB9IGVsc2UgaWYgKG5ldyBSZWdFeHAoJ1RoZXJlIGlzIG5vIHRyYWNraW5nIGluZm9ybWF0aW9uIGZvciB0aGUgY3VycmVudCBicmFuY2gnKS50ZXN0KGVycj8ubWVzc2FnZSkpIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJUaGVyZSBpcyBubyB0cmFja2luZyBpbmZvcm1hdGlvbiBmb3IgdGhlIGN1cnJlbnQgYnJhbmNoXCIpO1xuICAgICAgICB9IGVsc2UgaWYgKGVyciAmJiBuZXcgUmVnRXhwKGBDb21tYW5kIGZhaWxlZDogJHtlcnIuY21kfWApLnRlc3QoZXJyPy5tZXNzYWdlKSkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIk5vdGhpbmcgaGFzIGNoYW5nZWQuXCIpO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChlcnIpIHtcbiAgICAgICAgICAgbmV3IE5vdGljZShcIkFscmVhZHkgdXAgdG8gZGF0ZS5cIik7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIkRvbmUuXCIpO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfVxufVxuIl0sIm5hbWVzIjpbIlBsdWdpblNldHRpbmdUYWIiLCJQbHVnaW4iLCJub3JtYWxpemVQYXRoIiwiTm90aWNlIiwiZXhlYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBdURBO0FBQ08sU0FBUyxTQUFTLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFO0FBQzdELElBQUksU0FBUyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBTyxLQUFLLFlBQVksQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxVQUFVLE9BQU8sRUFBRSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO0FBQ2hILElBQUksT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsT0FBTyxDQUFDLEVBQUUsVUFBVSxPQUFPLEVBQUUsTUFBTSxFQUFFO0FBQy9ELFFBQVEsU0FBUyxTQUFTLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtBQUNuRyxRQUFRLFNBQVMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtBQUN0RyxRQUFRLFNBQVMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBRTtBQUN0SCxRQUFRLElBQUksQ0FBQyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxVQUFVLElBQUksRUFBRSxDQUFDLEVB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
