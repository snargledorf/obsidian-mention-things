import { Plugin } from 'obsidian';
import { MentionSettings, FileMaps } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { MentionManager } from './mention/mention-manager';
import { SuggestionProvider } from './editor/suggestion';
import { SettingsTab } from './settings/settings-tab';

export default class MentionThingsPlugin extends Plugin {
    settings: MentionSettings;
    mentionManager: MentionManager;
    suggestionProvider: SuggestionProvider;

    async onload() {
        // Load settings
        await this.loadSettings();

        // Initialize the mention manager
        this.mentionManager = new MentionManager(this.app, this.settings);
        
        // Initialize the suggestion provider
        this.suggestionProvider = new SuggestionProvider(
            this.app, 
            this.settings, 
            this.mentionManager
        );
        
        // Register the suggestion provider with the editor
        this.registerEditorSuggest(this.suggestionProvider);
        
        // Add the settings tab
        this.addSettingTab(new SettingsTab(this.app, this));
        
        // Register file events
        this.registerFileEvents();
        
        // Initialize when the layout is ready
        this.app.workspace.onLayoutReady(() => {
            const fileMaps = this.mentionManager.initialize();
            this.suggestionProvider.setSuggestionsMap(fileMaps);
        });
    }

    /**
     * Register file event handlers
     */
    private registerFileEvents(): void {
        // Handle file deletion
        this.registerEvent(
            this.app.vault.on('delete', async (file) => {
                const updated = this.mentionManager.handleFileEvent(file);
                if (updated) {
                    this.refreshSuggestions();
                }
            })
        );

        // Handle file creation
        this.registerEvent(
            this.app.vault.on('create', async (file) => {
                const updated = this.mentionManager.handleFileEvent(file);
                if (updated) {
                    this.refreshSuggestions();
                }
            })
        );

        // Handle file renaming
        this.registerEvent(
            this.app.vault.on('rename', async (file, oldPath) => {
                const updated = this.mentionManager.handleFileEvent(file, oldPath);
                if (updated) {
                    this.refreshSuggestions();
                }
            })
        );
    }

    /**
     * Refresh the suggestions list in the editor
     */
    private refreshSuggestions(): void {
        const fileMaps = this.mentionManager.getFileMaps();
        this.suggestionProvider.setSuggestionsMap(fileMaps);
    }

    /**
     * Load settings from disk
     */
    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    /**
     * Save settings to disk
     */
    async saveSettings() {
        await this.saveData(this.settings);
        
        // Update the mention manager with new settings
        if (this.mentionManager) {
            this.mentionManager.updateSettings(this.settings);
            this.refreshSuggestions();
        }
    }
}
