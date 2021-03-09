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
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            const rootPath = obsidian.normalizePath(this.app.vault.adapter.basePath);
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
    executeBranchCommand(rootPath) {
        const gitBranchCommand = `cd "${rootPath}" && git branch`;
        new obsidian.Notice(this.gitBranchMessage);
        child_process.exec(gitBranchCommand, ((error, branchInfo) => {
            if (!error) {
                new obsidian.Notice(`You are on ${branchInfo} branch`, 10000);
            }
            else {
                new obsidian.Notice('Error.');
            }
        }));
    }
    executePullCallback(rootPath) {
        const gitPullCommand = `cd "${rootPath}" && git pull`;
        new obsidian.Notice(this.gitPullMessage);
        child_process.exec(gitPullCommand, this.handleGitCommand.bind(this));
    }
    executeCommitCallback(rootPath) {
        const gitCommitCommand = `cd "${rootPath}" && git add . && git commit -m "sync"`;
        new obsidian.Notice(this.gitCommitMessage);
        child_process.exec(gitCommitCommand, this.handleGitCommand.bind(this));
    }
    executeSyncCallback(rootPath) {
        const gitSyncCommand = `cd "${rootPath}" && git add . && git commit -m "sync" && git push`;
        new obsidian.Notice(this.gitSyncMessage);
        child_process.exec(gitSyncCommand, this.handleGitCommand.bind(this));
    }
    executePushCallback(rootPath) {
        const gitPushCommand = `cd "${rootPath}" && git push`;
        new obsidian.Notice(this.gitPushMessage);
        child_process.exec(gitPushCommand, this.handleGitCommand.bind(this));
    }
    handleGitCommand(err) {
        if (new RegExp('No configured push destination').test(err === null || err === void 0 ? void 0 : err.message)) {
            new obsidian.Notice("You need to setup git repository.");
        }
        else if (new RegExp('There is no tracking information for the current branch').test(err === null || err === void 0 ? void 0 : err.message)) {
            new obsidian.Notice("There is no tracking information for the current branch");
        }
        else if (err && new RegExp(`Command failed: ${err.cmd}`).test(err === null || err === void 0 ? void 0 : err.message)) {
            new obsidian.Notice("Nothing has changed.");
        }
        else if (err) {
            new obsidian.Notice("Already up to date.");
        }
        else {
            new obsidian.Notice("Done.");
        }
    }
}

module.exports = GitHubSyncPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNldHRpbmdzLXRhYi50cyIsIm1haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyohICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcclxuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XHJcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xyXG4gICAgICAgIHdoaWxlIChfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXhwb3J0U3RhcihtLCBvKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XHJcbiAgICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xyXG4gICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XHJcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAobyAmJiBpID49IG8ubGVuZ3RoKSBvID0gdm9pZCAwO1xyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XHJcbiAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XHJcbiAgICBpZiAoIW0pIHJldHVybiBvO1xyXG4gICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XHJcbiAgICBmaW5hbGx5IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWQoKSB7XHJcbiAgICBmb3IgKHZhciBhciA9IFtdLCBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcclxuICAgICAgICBhciA9IGFyLmNvbmNhdChfX3JlYWQoYXJndW1lbnRzW2ldKSk7XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XHJcbiAgICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcclxuICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcclxuICAgICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcclxuICAgICAgICAgICAgcltrXSA9IGFbal07XHJcbiAgICByZXR1cm4gcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXkodG8sIGZyb20pIHtcclxuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGZyb20ubGVuZ3RoLCBqID0gdG8ubGVuZ3RoOyBpIDwgaWw7IGkrKywgaisrKVxyXG4gICAgICAgIHRvW2pdID0gZnJvbVtpXTtcclxuICAgIHJldHVybiB0bztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaWYgKGdbbl0pIGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHJlc3VtZShuLCB2KSB7IHRyeSB7IHN0ZXAoZ1tuXSh2KSk7IH0gY2F0Y2ggKGUpIHsgc2V0dGxlKHFbMF1bM10sIGUpOyB9IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAocikgeyByLnZhbHVlIGluc3RhbmNlb2YgX19hd2FpdCA/IFByb21pc2UucmVzb2x2ZShyLnZhbHVlLnYpLnRoZW4oZnVsZmlsbCwgcmVqZWN0KSA6IHNldHRsZShxWzBdWzJdLCByKTsgfVxyXG4gICAgZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkgeyByZXN1bWUoXCJuZXh0XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gcmVqZWN0KHZhbHVlKSB7IHJlc3VtZShcInRocm93XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKGYsIHYpIHsgaWYgKGYodiksIHEuc2hpZnQoKSwgcS5sZW5ndGgpIHJlc3VtZShxWzBdWzBdLCBxWzBdWzFdKTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0RlbGVnYXRvcihvKSB7XHJcbiAgICB2YXIgaSwgcDtcclxuICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiwgZnVuY3Rpb24gKGUpIHsgdGhyb3cgZTsgfSksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaVtuXSA9IG9bbl0gPyBmdW5jdGlvbiAodikgeyByZXR1cm4gKHAgPSAhcCkgPyB7IHZhbHVlOiBfX2F3YWl0KG9bbl0odikpLCBkb25lOiBuID09PSBcInJldHVyblwiIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XHJcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgcHJpdmF0ZU1hcCkge1xyXG4gICAgaWYgKCFwcml2YXRlTWFwLmhhcyhyZWNlaXZlcikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXR0ZW1wdGVkIHRvIGdldCBwcml2YXRlIGZpZWxkIG9uIG5vbi1pbnN0YW5jZVwiKTtcclxuICAgIH1cclxuICAgIHJldHVybiBwcml2YXRlTWFwLmdldChyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0KHJlY2VpdmVyLCBwcml2YXRlTWFwLCB2YWx1ZSkge1xyXG4gICAgaWYgKCFwcml2YXRlTWFwLmhhcyhyZWNlaXZlcikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXR0ZW1wdGVkIHRvIHNldCBwcml2YXRlIGZpZWxkIG9uIG5vbi1pbnN0YW5jZVwiKTtcclxuICAgIH1cclxuICAgIHByaXZhdGVNYXAuc2V0KHJlY2VpdmVyLCB2YWx1ZSk7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn1cclxuIiwiaW1wb3J0IHtBcHAsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmd9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCBHaXRIdWJTeW5jUGx1Z2luIGZyb20gXCIuL21haW5cIjtcblxuZXhwb3J0IGNsYXNzIEdpdEh1YlNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgICBwbHVnaW46IEdpdEh1YlN5bmNQbHVnaW47XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBHaXRIdWJTeW5jUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICAgICAgbGV0IHtjb250YWluZXJFbH0gPSB0aGlzO1xuICAgICAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDInLCB7dGV4dDogJ0dpdEh1YiB2YXVsdCBzeW5jaHJvbml6YXRpb24gcGx1Z2luJ30pO1xuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHt0ZXh0OiAnVGhpcyBwbHVnaW4gYWxsb3dzIHlvdSB0byBzeW5jaHJvbml6ZSB5b3VyIHZhdWx0IHdpdGggR2l0SHViLid9KTtcbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ3AnLCB7dGV4dDogJ1lvdSBuZWVkIHRvIGhhdmUgR2l0SHViIGFjY291bnQgYXMgcHJlcmVxdWlzaXRlIGFuZCBpbiB0aGUgZm9sZGVyLCB3aGVyZSBpdFxcJ3MgeW91ciB2YXVsdCB5b3UgaGF2ZSB0byBpbml0aWFsaXplIGdpdCByZXBvc2l0b3J5Lid9KTtcbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ3AnLCB7dGV4dDogJ0lmIHlvdSBoYXZlIHRoZXNlIHNldHVwIHlvdSBhcmUgcmVhZHkhJ30pO1xuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHt0ZXh0OiAnVGhpcyBwbHVnaW4gd2lsbCBcImxpc3RlblwiIGZvciBDdHJsICsgcyBjb21iaW5hdGlvbiBhbmQgaXQgaXMgZ29pbmcgdG8gcGVyZm9ybSBnaXQgcHVzaCB0byB5b3VyIHJlcG9zaXRvcnkuJ30pO1xuXG4gICAgfVxufVxuIiwiaW1wb3J0IHtDb21tYW5kLCBub3JtYWxpemVQYXRoLCBOb3RpY2UsIFBsdWdpbiwgVEZpbGUsIFdvcmtzcGFjZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7ZXhlYywgRXhlY0V4Y2VwdGlvbn0gZnJvbSBcImNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7R2l0SHViU2V0dGluZ1RhYn0gZnJvbSAnLi9zZXR0aW5ncy10YWInO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdpdEh1YlN5bmNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICAgIHByaXZhdGUgZ2l0U3luY01lc3NhZ2UgPSAnR2l0IFN5bmNpbmcuLi4nO1xuICAgIHByaXZhdGUgZ2l0UHVsbE1lc3NhZ2UgPSAnR2l0IFB1bGwuLi4nO1xuICAgIHByaXZhdGUgZ2l0UHVzaE1lc3NhZ2UgPSAnR2l0IFB1c2guLi4nO1xuICAgIHByaXZhdGUgZ2l0Q29tbWl0TWVzc2FnZSA9ICdHaXQgQ29tbWl0Li4uJztcbiAgICBwcml2YXRlIGdpdEJyYW5jaE1lc3NhZ2UgPSAnR2l0IEJyYW5jaCc7XG5cbiAgICBwdWJsaWMgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuXG5cbiAgICAgICAgY29uc3Qgcm9vdFBhdGggPSBub3JtYWxpemVQYXRoKCh0aGlzLmFwcC52YXVsdC5hZGFwdGVyIGFzIGFueSkuYmFzZVBhdGgpO1xuXG5cblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdnaXQtcHVsbCcsXG4gICAgICAgICAgICBuYW1lOiAnR2l0IFB1bGwnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZXhlY3V0ZVB1bGxDYWxsYmFjayhyb290UGF0aClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZ2l0LWNvbW1pdC1hbmQtcHVzaCcsXG4gICAgICAgICAgICBuYW1lOiAnR2l0IENvbW1pdCBhbmQgUHVzaCcsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5leGVjdXRlU3luY0NhbGxiYWNrKHJvb3RQYXRoKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdnaXQtY29tbWl0JyxcbiAgICAgICAgICAgIG5hbWU6ICdHaXQgQ29tbWl0JyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmV4ZWN1dGVDb21taXRDYWxsYmFjayhyb290UGF0aClcbiAgICAgICAgfSk7XG5cblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdnaXQtYnJhbmNoJyxcbiAgICAgICAgICAgIG5hbWU6ICdHaXQgQnJhbmNoJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmV4ZWN1dGVCcmFuY2hDb21tYW5kKHJvb3RQYXRoKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdnaXQtcHVzaCcsXG4gICAgICAgICAgICBuYW1lOiAnR2l0IFB1c2gnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZXhlY3V0ZVB1c2hDYWxsYmFjayhyb290UGF0aClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5leGVjdXRlUHVsbENhbGxiYWNrKHJvb3RQYXRoKTtcblxuICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZG9jdW1lbnQsICdrZXlkb3duJywgKGV2dDogS2V5Ym9hcmRFdmVudCkgPT4ge1xuXHRcdFx0aWYgKGV2dC53aGljaCA9PT0gODMgJiYgZXZ0Lm1ldGFLZXkgfHwgZXZ0LmN0cmxLZXkgJiYgZXZ0LndoaWNoID09PSA4Mykge1xuICAgICAgICAgICAgICAgIHRoaXMuZXhlY3V0ZVN5bmNDYWxsYmFjayhyb290UGF0aCk7XG4gICAgICAgICAgICB9XG5cdFx0fSk7XG5cbiAgICAgICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBHaXRIdWJTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG5cbiAgICB9XG5cbiAgICBwcml2YXRlIGV4ZWN1dGVCcmFuY2hDb21tYW5kKHJvb3RQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgZ2l0QnJhbmNoQ29tbWFuZCA9IGBjZCBcIiR7cm9vdFBhdGh9XCIgJiYgZ2l0IGJyYW5jaGA7XG4gICAgICAgIG5ldyBOb3RpY2UodGhpcy5naXRCcmFuY2hNZXNzYWdlKTtcbiAgICAgICAgZXhlYyhnaXRCcmFuY2hDb21tYW5kLCAoKGVycm9yLCBicmFuY2hJbmZvKSA9PiB7XG4gICAgICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShgWW91IGFyZSBvbiAke2JyYW5jaEluZm99IGJyYW5jaGAsIDEwMDAwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnRXJyb3IuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGV4ZWN1dGVQdWxsQ2FsbGJhY2socm9vdFBhdGg6IHN0cmluZykge1xuICAgICAgICBjb25zdCBnaXRQdWxsQ29tbWFuZCA9IGBjZCBcIiR7cm9vdFBhdGh9XCIgJiYgZ2l0IHB1bGxgO1xuICAgICAgICBuZXcgTm90aWNlKHRoaXMuZ2l0UHVsbE1lc3NhZ2UpO1xuICAgICAgICBleGVjKGdpdFB1bGxDb21tYW5kLCB0aGlzLmhhbmRsZUdpdENvbW1hbmQuYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBleGVjdXRlQ29tbWl0Q2FsbGJhY2socm9vdFBhdGg6IHN0cmluZykge1xuICAgICAgICBjb25zdCBnaXRDb21taXRDb21tYW5kID0gYGNkIFwiJHtyb290UGF0aH1cIiAmJiBnaXQgYWRkIC4gJiYgZ2l0IGNvbW1pdCAtbSBcInN5bmNcImA7XG4gICAgICAgIG5ldyBOb3RpY2UodGhpcy5naXRDb21taXRNZXNzYWdlKTtcbiAgICAgICAgZXhlYyhnaXRDb21taXRDb21tYW5kLCB0aGlzLmhhbmRsZUdpdENvbW1hbmQuYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBleGVjdXRlU3luY0NhbGxiYWNrKHJvb3RQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgZ2l0U3luY0NvbW1hbmQgPSBgY2QgXCIke3Jvb3RQYXRofVwiICYmIGdpdCBhZGQgLiAmJiBnaXQgY29tbWl0IC1tIFwic3luY1wiICYmIGdpdCBwdXNoYDtcbiAgICAgICAgbmV3IE5vdGljZSh0aGlzLmdpdFN5bmNNZXNzYWdlKTtcbiAgICAgICAgZXhlYyhnaXRTeW5jQ29tbWFuZCwgdGhpcy5oYW5kbGVHaXRDb21tYW5kLmJpbmQodGhpcykpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZXhlY3V0ZVB1c2hDYWxsYmFjayhyb290UGF0aDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGdpdFB1c2hDb21tYW5kID0gYGNkIFwiJHtyb290UGF0aH1cIiAmJiBnaXQgcHVzaGA7XG4gICAgICAgIG5ldyBOb3RpY2UodGhpcy5naXRQdXNoTWVzc2FnZSk7XG4gICAgICAgIGV4ZWMoZ2l0UHVzaENvbW1hbmQsIHRoaXMuaGFuZGxlR2l0Q29tbWFuZC5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZUdpdENvbW1hbmQoZXJyOiBFeGVjRXhjZXB0aW9uIHwgbnVsbCkge1xuICAgICAgICBpZiAobmV3IFJlZ0V4cCgnTm8gY29uZmlndXJlZCBwdXNoIGRlc3RpbmF0aW9uJykudGVzdChlcnI/Lm1lc3NhZ2UpKSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiWW91IG5lZWQgdG8gc2V0dXAgZ2l0IHJlcG9zaXRvcnkuXCIpO1xuICAgICAgICB9IGVsc2UgaWYgKG5ldyBSZWdFeHAoJ1RoZXJlIGlzIG5vIHRyYWNraW5nIGluZm9ybWF0aW9uIGZvciB0aGUgY3VycmVudCBicmFuY2gnKS50ZXN0KGVycj8ubWVzc2FnZSkpIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJUaGVyZSBpcyBubyB0cmFja2luZyBpbmZvcm1hdGlvbiBmb3IgdGhlIGN1cnJlbnQgYnJhbmNoXCIpO1xuICAgICAgICB9IGVsc2UgaWYgKGVyciAmJiBuZXcgUmVnRXhwKGBDb21tYW5kIGZhaWxlZDogJHtlcnIuY21kfWApLnRlc3QoZXJyPy5tZXNzYWdlKSkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIk5vdGhpbmcgaGFzIGNoYW5nZWQuXCIpO1xuICAgICAgICB9IGVsc2UgaWYgKGVycikge1xuICAgICAgICAgICBuZXcgTm90aWNlKFwiQWxyZWFkeSB1cCB0byBkYXRlLlwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJEb25lLlwiKTtcbiAgICAgICAgfVxuXG4gICAgfVxufVxuIl0sIm5hbWVzIjpbIlBsdWdpblNldHRpbmdUYWIiLCJQbHVnaW4iLCJub3JtYWxpemVQYXRoIiwiTm90aWNlIiwiZXhlYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBdURBO0FBQ08sU0FBUyxTQUFTLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFO0FBQzdELElBQUksU0FBUyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBTyxLQUFLLFlBQVksQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMs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
