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
            this.workspace = this.app.workspace;
            const rootPath = obsidian.normalizePath(this.app.vault.adapter.basePath);
            this.addStatusBarItem().createSpan({ cls: 'git' }, el => {
                this.countAndRenderGitChanges(el, rootPath);
            });
            this.registerInterval(window.setInterval(() => {
                const gitEl = this.app.statusBar.containerEl.getElementsByClassName('git');
                if (gitEl && gitEl.length) {
                    this.countAndRenderGitChanges(gitEl[0], rootPath);
                }
            }, 10000));
            this.addCommand({
                id: 'git-changes',
                name: 'Git Changes',
                callback: () => this.executeChanges(rootPath)
            });
            this.addCommand({
                id: 'git-changes-count',
                name: 'Git Changes Count',
                callback: () => this.executeChangesCount(rootPath)
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
        const gitChangesCountCommand = `cd "${rootPath}" && git status -s | egrep "" | wc -l`;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNldHRpbmdzLXRhYi50cyIsIm1haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyohICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcclxuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XHJcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xyXG4gICAgICAgIHdoaWxlIChfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXhwb3J0U3RhcihtLCBvKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XHJcbiAgICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xyXG4gICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XHJcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAobyAmJiBpID49IG8ubGVuZ3RoKSBvID0gdm9pZCAwO1xyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XHJcbiAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XHJcbiAgICBpZiAoIW0pIHJldHVybiBvO1xyXG4gICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XHJcbiAgICBmaW5hbGx5IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWQoKSB7XHJcbiAgICBmb3IgKHZhciBhciA9IFtdLCBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcclxuICAgICAgICBhciA9IGFyLmNvbmNhdChfX3JlYWQoYXJndW1lbnRzW2ldKSk7XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XHJcbiAgICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcclxuICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcclxuICAgICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcclxuICAgICAgICAgICAgcltrXSA9IGFbal07XHJcbiAgICByZXR1cm4gcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXkodG8sIGZyb20pIHtcclxuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGZyb20ubGVuZ3RoLCBqID0gdG8ubGVuZ3RoOyBpIDwgaWw7IGkrKywgaisrKVxyXG4gICAgICAgIHRvW2pdID0gZnJvbVtpXTtcclxuICAgIHJldHVybiB0bztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaWYgKGdbbl0pIGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHJlc3VtZShuLCB2KSB7IHRyeSB7IHN0ZXAoZ1tuXSh2KSk7IH0gY2F0Y2ggKGUpIHsgc2V0dGxlKHFbMF1bM10sIGUpOyB9IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAocikgeyByLnZhbHVlIGluc3RhbmNlb2YgX19hd2FpdCA/IFByb21pc2UucmVzb2x2ZShyLnZhbHVlLnYpLnRoZW4oZnVsZmlsbCwgcmVqZWN0KSA6IHNldHRsZShxWzBdWzJdLCByKTsgfVxyXG4gICAgZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkgeyByZXN1bWUoXCJuZXh0XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gcmVqZWN0KHZhbHVlKSB7IHJlc3VtZShcInRocm93XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKGYsIHYpIHsgaWYgKGYodiksIHEuc2hpZnQoKSwgcS5sZW5ndGgpIHJlc3VtZShxWzBdWzBdLCBxWzBdWzFdKTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0RlbGVnYXRvcihvKSB7XHJcbiAgICB2YXIgaSwgcDtcclxuICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiwgZnVuY3Rpb24gKGUpIHsgdGhyb3cgZTsgfSksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaVtuXSA9IG9bbl0gPyBmdW5jdGlvbiAodikgeyByZXR1cm4gKHAgPSAhcCkgPyB7IHZhbHVlOiBfX2F3YWl0KG9bbl0odikpLCBkb25lOiBuID09PSBcInJldHVyblwiIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XHJcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgcHJpdmF0ZU1hcCkge1xyXG4gICAgaWYgKCFwcml2YXRlTWFwLmhhcyhyZWNlaXZlcikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXR0ZW1wdGVkIHRvIGdldCBwcml2YXRlIGZpZWxkIG9uIG5vbi1pbnN0YW5jZVwiKTtcclxuICAgIH1cclxuICAgIHJldHVybiBwcml2YXRlTWFwLmdldChyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0KHJlY2VpdmVyLCBwcml2YXRlTWFwLCB2YWx1ZSkge1xyXG4gICAgaWYgKCFwcml2YXRlTWFwLmhhcyhyZWNlaXZlcikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXR0ZW1wdGVkIHRvIHNldCBwcml2YXRlIGZpZWxkIG9uIG5vbi1pbnN0YW5jZVwiKTtcclxuICAgIH1cclxuICAgIHByaXZhdGVNYXAuc2V0KHJlY2VpdmVyLCB2YWx1ZSk7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn1cclxuIiwiaW1wb3J0IHtBcHAsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmd9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCBHaXRIdWJTeW5jUGx1Z2luIGZyb20gXCIuL21haW5cIjtcblxuZXhwb3J0IGNsYXNzIEdpdEh1YlNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgICBwbHVnaW46IEdpdEh1YlN5bmNQbHVnaW47XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBHaXRIdWJTeW5jUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICAgICAgbGV0IHtjb250YWluZXJFbH0gPSB0aGlzO1xuICAgICAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDInLCB7dGV4dDogJ0dpdEh1YiB2YXVsdCBzeW5jaHJvbml6YXRpb24gcGx1Z2luJ30pO1xuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHt0ZXh0OiAnVGhpcyBwbHVnaW4gYWxsb3dzIHlvdSB0byBzeW5jaHJvbml6ZSB5b3VyIHZhdWx0IHdpdGggR2l0SHViLid9KTtcbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ3AnLCB7dGV4dDogJ1lvdSBuZWVkIHRvIGhhdmUgR2l0SHViIGFjY291bnQgYXMgcHJlcmVxdWlzaXRlIGFuZCBpbiB0aGUgZm9sZGVyLCB3aGVyZSBpdFxcJ3MgeW91ciB2YXVsdCB5b3UgaGF2ZSB0byBpbml0aWFsaXplIGdpdCByZXBvc2l0b3J5Lid9KTtcbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ3AnLCB7dGV4dDogJ0lmIHlvdSBoYXZlIHRoZXNlIHNldHVwIHlvdSBhcmUgcmVhZHkhJ30pO1xuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHt0ZXh0OiAnVGhpcyBwbHVnaW4gd2lsbCBcImxpc3RlblwiIGZvciBDdHJsICsgcyBjb21iaW5hdGlvbiBhbmQgaXQgaXMgZ29pbmcgdG8gcGVyZm9ybSBnaXQgcHVzaCB0byB5b3VyIHJlcG9zaXRvcnkuJ30pO1xuXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgbm9ybWFsaXplUGF0aCwgTm90aWNlLCBQbHVnaW4sIFdvcmtzcGFjZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7ZXhlYywgRXhlY0V4Y2VwdGlvbn0gZnJvbSBcImNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7R2l0SHViU2V0dGluZ1RhYn0gZnJvbSAnLi9zZXR0aW5ncy10YWInO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdpdEh1YlN5bmNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICAgIHByaXZhdGUgd29ya3NwYWNlOiBXb3Jrc3BhY2U7XG4gICAgcHJpdmF0ZSBnaXRTeW5jTWVzc2FnZSA9ICdHaXQgU3luY2luZy4uLic7XG4gICAgcHJpdmF0ZSBnaXRQdWxsTWVzc2FnZSA9ICdHaXQgUHVsbC4uLic7XG4gICAgcHJpdmF0ZSBnaXRQdXNoTWVzc2FnZSA9ICdHaXQgUHVzaC4uLic7XG4gICAgcHJpdmF0ZSBnaXRDb21taXRNZXNzYWdlID0gJ0dpdCBDb21taXQuLi4nO1xuICAgIHByaXZhdGUgZ2l0QnJhbmNoTWVzc2FnZSA9ICdHaXQgQnJhbmNoJztcbiAgICBwcml2YXRlIGdpdENoYW5nZXNDb3VudE1lc3NhZ2UgPSAnR2l0IENoYW5nZXMgQ291bnRpbmcuLic7XG4gICAgcHJpdmF0ZSBnaXRDaGFuZ2VzTWVzc2FnZSA9ICdHaXQgQ2hhbmdlcy4uJztcblxuICAgIHB1YmxpYyBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG5cbiAgICAgICAgdGhpcy53b3Jrc3BhY2UgPSB0aGlzLmFwcC53b3Jrc3BhY2U7XG5cblxuICAgICAgICBjb25zdCByb290UGF0aCA9IG5vcm1hbGl6ZVBhdGgoKHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIgYXMgYW55KS5iYXNlUGF0aCk7XG5cbiAgICAgICAgdGhpcy5hZGRTdGF0dXNCYXJJdGVtKCkuY3JlYXRlU3Bhbih7Y2xzOiAnZ2l0J30sIGVsID0+IHtcblxuICAgICAgICAgICAgdGhpcy5jb3VudEFuZFJlbmRlckdpdENoYW5nZXMoZWwsIHJvb3RQYXRoKTtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICB0aGlzLnJlZ2lzdGVySW50ZXJ2YWwod2luZG93LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGdpdEVsID0gKHRoaXMuYXBwIGFzIGFueSkuc3RhdHVzQmFyLmNvbnRhaW5lckVsLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2dpdCcpO1xuXG4gICAgICAgICAgICBpZiAoZ2l0RWwgJiYgZ2l0RWwubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb3VudEFuZFJlbmRlckdpdENoYW5nZXMoZ2l0RWxbMF0sIHJvb3RQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMTAwMDApKTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdnaXQtY2hhbmdlcycsXG4gICAgICAgICAgICBuYW1lOiAnR2l0IENoYW5nZXMnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZXhlY3V0ZUNoYW5nZXMocm9vdFBhdGgpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2dpdC1jaGFuZ2VzLWNvdW50JyxcbiAgICAgICAgICAgIG5hbWU6ICdHaXQgQ2hhbmdlcyBDb3VudCcsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5leGVjdXRlQ2hhbmdlc0NvdW50KHJvb3RQYXRoKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdnaXQtcHVsbCcsXG4gICAgICAgICAgICBuYW1lOiAnR2l0IFB1bGwnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZXhlY3V0ZVB1bGxDYWxsYmFjayhyb290UGF0aClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZ2l0LWNvbW1pdC1hbmQtcHVzaCcsXG4gICAgICAgICAgICBuYW1lOiAnR2l0IENvbW1pdCBhbmQgUHVzaCcsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5leGVjdXRlU3luY0NhbGxiYWNrKHJvb3RQYXRoKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdnaXQtY29tbWl0JyxcbiAgICAgICAgICAgIG5hbWU6ICdHaXQgQ29tbWl0JyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmV4ZWN1dGVDb21taXRDYWxsYmFjayhyb290UGF0aClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZ2l0LWJyYW5jaCcsXG4gICAgICAgICAgICBuYW1lOiAnR2l0IEJyYW5jaCcsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5leGVjdXRlQnJhbmNoQ29tbWFuZChyb290UGF0aClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZ2l0LXB1c2gnLFxuICAgICAgICAgICAgbmFtZTogJ0dpdCBQdXNoJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmV4ZWN1dGVQdXNoQ2FsbGJhY2socm9vdFBhdGgpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuZXhlY3V0ZVB1bGxDYWxsYmFjayhyb290UGF0aCk7XG5cbiAgICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KGRvY3VtZW50LCAna2V5ZG93bicsIChldnQ6IEtleWJvYXJkRXZlbnQpID0+IHtcblx0XHRcdGlmIChldnQud2hpY2ggPT09IDgzICYmIGV2dC5tZXRhS2V5IHx8IGV2dC5jdHJsS2V5ICYmIGV2dC53aGljaCA9PT0gODMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmV4ZWN1dGVTeW5jQ2FsbGJhY2socm9vdFBhdGgpO1xuICAgICAgICAgICAgfVxuXHRcdH0pO1xuXG4gICAgICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgR2l0SHViU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xuXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjb3VudEFuZFJlbmRlckdpdENoYW5nZXMoZWw6IEhUTUxFbGVtZW50LCByb290UGF0aDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMuZXhlY3V0ZUJyYW5jaENvbW1hbmQocm9vdFBhdGgsIGJyYW5jaCA9PiB7XG4gICAgICAgICAgICB0aGlzLmV4ZWN1dGVDaGFuZ2VzQ291bnQocm9vdFBhdGgsIGNvdW50ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoY291bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5pbm5lckhUTUwgPSBgJHticmFuY2h9ICR7Y291bnQgPT09IDEgPyAnWycgKyBjb3VudCArICcgY2hhbmdlXScgOiAnWycgKyBjb3VudCArICcgY2hhbmdlc10nfWA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLmlubmVySFRNTCA9IGAke2JyYW5jaH0gW25vIGNoYW5nZXNdYDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHJlbmRlckNoYW5nZXMocm9vdFBhdGg6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBnaXRFbCA9ICh0aGlzLmFwcCBhcyBhbnkpLnN0YXR1c0Jhci5jb250YWluZXJFbC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdnaXQnKTtcblxuICAgICAgICBpZiAoZ2l0RWwgJiYgZ2l0RWwubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmNvdW50QW5kUmVuZGVyR2l0Q2hhbmdlcyhnaXRFbFswXSwgcm9vdFBhdGgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBleGVjdXRlQ2hhbmdlcyhyb290UGF0aDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGdpdENoYW5nZXNDb21tYW5kID0gYGNkIFwiJHtyb290UGF0aH1cIiAmJiBnaXQgc3RhdHVzIC1zYDtcbiAgICAgICAgbmV3IE5vdGljZSh0aGlzLmdpdENoYW5nZXNNZXNzYWdlKTtcblxuICAgICAgICB0aGlzLmV4ZWN1dGVDaGFuZ2VzQ291bnQocm9vdFBhdGgsIGNvdW50ID0+IHtcbiAgICAgICAgICAgIGlmIChjb3VudCkge1xuICAgICAgICAgICAgICAgIGV4ZWMoZ2l0Q2hhbmdlc0NvbW1hbmQsICgoZXJyb3IsIGNoYW5nZXMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShjaGFuZ2VzLCAyMDAwMCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKCdFcnJvci4nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShcIllvdSBkb24ndCBoYXZlIGFueSBjaGFuZ2VzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGV4ZWN1dGVDaGFuZ2VzQ291bnQocm9vdFBhdGg6IHN0cmluZywgY2FsbGJhY2s/OiAoY291bnQ6IG51bWJlcikgPT4gdm9pZCkge1xuICAgICAgICBjb25zdCBnaXRDaGFuZ2VzQ291bnRDb21tYW5kID0gYGNkIFwiJHtyb290UGF0aH1cIiAmJiBnaXQgc3RhdHVzIC1zIHwgZWdyZXAgXCJcIiB8IHdjIC1sYDtcblxuICAgICAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKHRoaXMuZ2l0Q2hhbmdlc0NvdW50TWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBleGVjKGdpdENoYW5nZXNDb3VudENvbW1hbmQsICgoZXJyb3IsIGNvdW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCtjb3VudCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShgWW91IGhhdmUgJHtjb3VudH0gJHsgK2NvdW50ID09PSAxID8gJ2NoYW5nZScgOiAnY2hhbmdlcyd9YCwgMTAwMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnRXJyb3IuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGV4ZWN1dGVCcmFuY2hDb21tYW5kKHJvb3RQYXRoOiBzdHJpbmcsIGNhbGxiYWNrPzogKGJyYW5jaDogc3RyaW5nKSA9PiB2b2lkKSB7XG4gICAgICAgIGNvbnN0IGdpdEJyYW5jaENvbW1hbmQgPSBgY2QgXCIke3Jvb3RQYXRofVwiICYmIGdpdCBicmFuY2hgO1xuICAgICAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKHRoaXMuZ2l0QnJhbmNoTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgZXhlYyhnaXRCcmFuY2hDb21tYW5kLCAoKGVycm9yLCBicmFuY2hJbmZvKSA9PiB7XG4gICAgICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBZb3UgYXJlIG9uICR7YnJhbmNoSW5mb30gYnJhbmNoYCwgMTAwMDApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGJyYW5jaEluZm8pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnRXJyb3IuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGV4ZWN1dGVQdWxsQ2FsbGJhY2socm9vdFBhdGg6IHN0cmluZykge1xuICAgICAgICBjb25zdCBnaXRQdWxsQ29tbWFuZCA9IGBjZCBcIiR7cm9vdFBhdGh9XCIgJiYgZ2l0IHB1bGxgO1xuICAgICAgICBuZXcgTm90aWNlKHRoaXMuZ2l0UHVsbE1lc3NhZ2UpO1xuICAgICAgICBleGVjKGdpdFB1bGxDb21tYW5kLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZUdpdENvbW1hbmQoZXJyLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJDaGFuZ2VzKHJvb3RQYXRoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGV4ZWN1dGVDb21taXRDYWxsYmFjayhyb290UGF0aDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGdpdENvbW1pdENvbW1hbmQgPSBgY2QgXCIke3Jvb3RQYXRofVwiICYmIGdpdCBhZGQgLiAmJiBnaXQgY29tbWl0IC1tIFwic3luY1wiYDtcbiAgICAgICAgbmV3IE5vdGljZSh0aGlzLmdpdENvbW1pdE1lc3NhZ2UpO1xuICAgICAgICBleGVjKGdpdENvbW1pdENvbW1hbmQsIChlcnIpID0+IHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlR2l0Q29tbWFuZChlcnIsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckNoYW5nZXMocm9vdFBhdGgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgZXhlY3V0ZVN5bmNDYWxsYmFjayhyb290UGF0aDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGdpdFN5bmNDb21tYW5kID0gYGNkIFwiJHtyb290UGF0aH1cIiAmJiBnaXQgYWRkIC4gJiYgZ2l0IGNvbW1pdCAtbSBcInN5bmNcIiAmJiBnaXQgcHVzaGA7XG4gICAgICAgIG5ldyBOb3RpY2UodGhpcy5naXRTeW5jTWVzc2FnZSk7XG4gICAgICAgIGV4ZWMoZ2l0U3luY0NvbW1hbmQsIChlcnIpID0+IHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlR2l0Q29tbWFuZChlcnIsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckNoYW5nZXMocm9vdFBhdGgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgZXhlY3V0ZVB1c2hDYWxsYmFjayhyb290UGF0aDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGdpdFB1c2hDb21tYW5kID0gYGNkIFwiJHtyb290UGF0aH1cIiAmJiBnaXQgcHVzaGA7XG4gICAgICAgIG5ldyBOb3RpY2UodGhpcy5naXRQdXNoTWVzc2FnZSk7XG4gICAgICAgIGV4ZWMoZ2l0UHVzaENvbW1hbmQsIChlcnIpID0+IHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlR2l0Q29tbWFuZChlcnIsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckNoYW5nZXMocm9vdFBhdGgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlR2l0Q29tbWFuZChlcnI6IEV4ZWNFeGNlcHRpb24gfCBudWxsLCBjYWxsYmFjaz86ICgpID0+IHZvaWQpIHtcbiAgICAgICAgaWYgKG5ldyBSZWdFeHAoJ05vIGNvbmZpZ3VyZWQgcHVzaCBkZXN0aW5hdGlvbicpLnRlc3QoZXJyPy5tZXNzYWdlKSkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIllvdSBuZWVkIHRvIHNldHVwIGdpdCByZXBvc2l0b3J5LlwiKTtcbiAgICAgICAgfSBlbHNlIGlmIChuZXcgUmVnRXhwKCdUaGVyZSBpcyBubyB0cmFja2luZyBpbmZvcm1hdGlvbiBmb3IgdGhlIGN1cnJlbnQgYnJhbmNoJykudGVzdChlcnI/Lm1lc3NhZ2UpKSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiVGhlcmUgaXMgbm8gdHJhY2tpbmcgaW5mb3JtYXRpb24gZm9yIHRoZSBjdXJyZW50IGJyYW5jaFwiKTtcbiAgICAgICAgfSBlbHNlIGlmIChlcnIgJiYgbmV3IFJlZ0V4cChgQ29tbWFuZCBmYWlsZWQ6ICR7ZXJyLmNtZH1gKS50ZXN0KGVycj8ubWVzc2FnZSkpIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJOb3RoaW5nIGhhcyBjaGFuZ2VkLlwiKTtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZXJyKSB7XG4gICAgICAgICAgIG5ldyBOb3RpY2UoXCJBbHJlYWR5IHVwIHRvIGRhdGUuXCIpO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJEb25lLlwiKTtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJQbHVnaW5TZXR0aW5nVGFiIiwiUGx1Z2luIiwibm9ybWFsaXplUGF0aCIsIk5vdGljZSIsImV4ZWMiXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQXVEQTtBQUNPLFNBQVMsU0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRTtBQUM3RCxJQUFJLFNBQVMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sS0FBSyxZQUFZLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsVUFBVSxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNoSCxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUMvRCxRQUFRLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7QUFDbkcsUUFBUSxTQUFTLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENB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
