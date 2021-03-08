import {App, PluginSettingTab, Setting} from 'obsidian';
import GitHubSyncPlugin from "./main";

export class GitHubSettingTab extends PluginSettingTab {
    plugin: GitHubSyncPlugin;

    constructor(app: App, plugin: GitHubSyncPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let {containerEl} = this;
        containerEl.empty();
        containerEl.createEl('h2', {text: 'GitHub vault synchronization plugin'});
        containerEl.createEl('p', {text: 'This plugin allows you to synchronize your vault with GitHub.'});
        containerEl.createEl('p', {text: 'You need to have GitHub account as prerequisite and in the folder, where it\'s your vault you have to initialize git repository.'});
        containerEl.createEl('p', {text: 'If you have these setup you are ready!'});
        containerEl.createEl('p', {text: 'This plugin will "listen" for Ctrl + s combination and it is going to perform git push to your repository.'});

    }
}
