import { App, Plugin, PluginManifest, TFile } from 'obsidian';
import { DEFAULT_SETTINGS } from './constants';
import { MentionManager } from './mention/mention-manager';
import { SuggestionProvider } from './editor/suggestion';
import { SettingsTab } from './settings/settings-tab';

export default class MentionThingsPlugin extends Plugin {
	settings = DEFAULT_SETTINGS;
	mentionManager: MentionManager;
	suggestionProvider: SuggestionProvider;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		// Initialize the mention manager
		this.mentionManager = new MentionManager(app, this.settings);

		// Initialize the suggestion provider
		this.suggestionProvider = new SuggestionProvider(
			app,
			this.settings,
			this.mentionManager,
		);
	}

	async onload() {
		// Load settings
		await this.loadSettings();

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
				if (!(file instanceof TFile)) return;

				const updated = this.mentionManager.handleFileDeleted(file);
				if (updated) {
					this.refreshSuggestions();
				}
			}),
		);

		// Handle file creation
		this.registerEvent(
			this.app.vault.on('create', async (file) => {

				if (!(file instanceof TFile)) return;

				const updated = this.mentionManager.handleFileCreated(file);
				if (updated) {
					this.refreshSuggestions();
				}
			}),
		);

		// Handle file renaming
		this.registerEvent(
			this.app.vault.on('rename', async (file, oldPath) => {

				if (!(file instanceof TFile)) return;

				const updated = this.mentionManager.handleFileRenamed(file, oldPath);
				if (updated) {
					this.refreshSuggestions();
				}
			}),
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
		Object.assign(this.settings, await this.loadData());
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
