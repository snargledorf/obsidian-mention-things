import { App, PluginSettingTab, Setting } from 'obsidian';
import { AvailableSigns } from '../types';
import { ALLOWED_SIGNS } from '../constants';
import MentionThingsPlugin from '../main';

/**
 * Settings tab for the Mention Things plugin
 */
export class SettingsTab extends PluginSettingTab {
	private plugin: MentionThingsPlugin;

	constructor(app: App, plugin: MentionThingsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Display the settings tab
	 */
	display(): void {
		const { containerEl } = this;
		let usedSigns = this.plugin.settings.mentionTypes
			.map(object => object.sign)
			.filter((sign): sign is string => sign !== undefined);

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Mention Things' });

		// Render mention types section
		this.renderMentionTypesSection(containerEl, usedSigns);

		// Render general settings section
		this.renderGeneralSettings(containerEl);
	}

	/**
	 * Render the mention types section of the settings
	 */
	private renderMentionTypesSection(containerEl: HTMLElement, usedSigns: string[]): void {
		containerEl.createEl('h3', { text: 'Mention Types' });

		// Render each mention type
		this.plugin.settings.mentionTypes.forEach((value, index) => {
			this.renderMentionTypeRow(containerEl, value, index, usedSigns);
		});

		// Add button for new type
		new Setting(containerEl)
			.addButton(cb => {
				cb.setButtonText('New Type')
					.setCta()
					.onClick(async () => {
						this.plugin.settings.mentionTypes.push({});
						await this.plugin.saveSettings();
						this.display();
					});
			});
	}

	/**
	 * Render a single mention type row
	 */
	private renderMentionTypeRow(containerEl: HTMLElement, value: any, index: number, usedSigns: string[]): void {
		const setting = new Setting(containerEl);
		const availableSigns = this.getAvailableSigns(usedSigns, value?.sign);

		// Sign dropdown
		setting.addDropdown(
			list => list
				.addOptions(availableSigns)
				.setValue(value?.sign || '')
				.onChange(async (value) => {
					this.plugin.settings.mentionTypes[index].sign = value;
					await this.plugin.saveSettings();
					this.display();
				}),
		);

		// Label text field
		setting.addText(
			text => text
				.setPlaceholder('Label. Example "Person"')
				.setValue(value?.label || '')
				.onChange(async (value) => {
					this.plugin.settings.mentionTypes[index].label = value;
					await this.plugin.saveSettings();
				})
				.inputEl.addClass('type_label'),
		);

		// Delete button
		setting.addExtraButton(
			button => button
				.setIcon('cross')
				.setTooltip('Delete')
				.onClick(async () => {
					this.plugin.settings.mentionTypes.splice(index, 1);
					await this.plugin.saveSettings();
					this.display();
				}),
		);

		setting.infoEl.remove();
	}

	/**
	 * Render general settings section
	 */
	private renderGeneralSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'General Settings' });

		new Setting(containerEl)
			.setName('Match from start')
			.setDesc('Whether to suggest only items that start with the search term. When disabled, any part of the name can match the search term')
			.addToggle(
				toggle => toggle
					.setValue(this.plugin.settings.matchStart ?? false)
					.onChange(async (value) => {
						this.plugin.settings.matchStart = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	/**
	 * Get available signs for the dropdown
	 * @param usedSigns Array of signs already in use
	 * @param currentSign Current sign for this type (to allow keeping the same sign)
	 * @returns Object mapping signs to display values
	 */
	private getAvailableSigns(usedSigns: string[], currentSign?: string): AvailableSigns {
		const availableSigns: AvailableSigns = {};

		ALLOWED_SIGNS.forEach(sign => {
			if (currentSign === sign || !usedSigns.includes(sign)) {
				availableSigns[sign] = `${sign}Name`;
			}
		});

		return availableSigns;
	}
}
