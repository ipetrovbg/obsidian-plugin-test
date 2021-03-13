import { App, PluginSettingTab, Setting } from 'obsidian';
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
        containerEl.createEl('hr');
        containerEl.createEl('h3', {text: 'Prerequisites'});

        containerEl.createEl('p', {text: 'This plugin allows you to synchronize your vault with GitHub.'});
        containerEl.createDiv({}, div => {
            const text = containerEl.createEl('span', {text: '1. You need to have GitHub account. '});
            const link = containerEl.createEl('a', {
                text: 'Create GitHub account.',
                attr: {href: 'https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&cad=rja&uact=8&ved=2ahUKEwj_xbqEh67vAhUvx4UKHTtqByYQFjAAegQIAxAD&url=https%3A%2F%2Fgithub.com%2Fjoin&usg=AOvVaw0H9TK-nu7JfXaoNeNMgJEk'}
            })
            div.appendChild(text)
                .appendChild(link);
        });
        containerEl.createDiv({}, div => {
            const text = containerEl.createEl('span', {text: '2. In the folder where it\'s your vault, you have to initialize git repository. '});
            const link = containerEl.createEl('a', {
                text: 'Setup git repository',
                attr: {href: 'https://docs.github.com/en/github/importing-your-projects-to-github/adding-an-existing-project-to-github-using-the-command-line'}
            });
            div.appendChild(text)
                .appendChild(link);
        });
        containerEl.createEl('h4', {text: 'You are ready!'});
        containerEl.createEl('hr');
        containerEl.createDiv({}, div => {
            const email = containerEl.createEl('input', {value: 'ipetrovbg@gmail.com'});
            const text = containerEl.createSpan({text: 'If you have any questions feel free to contact me on '});
            text.appendChild(email);
            div.appendChild(text);
        });
    }
}
