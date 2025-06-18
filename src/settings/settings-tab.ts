import { App, PluginSettingTab, Setting } from 'obsidian';
import { AvailableSigns, MentionType } from '../types';
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

		containerEl.empty();

		new Setting(containerEl).setName('Mention Things').setHeading();

		// Render mention types section
		this.renderMentionTypesSection(containerEl);

		// Render general settings section
		this.renderGeneralSettings(containerEl);
	}

	/**
	 * Render the mention types section of the settings
	 */
	private renderMentionTypesSection(containerEl: HTMLElement): void {
		// Render each mention type
		for (const sign in this.plugin.settings.mentionTypes) {
			const mentionType = this.plugin.settings.mentionTypes[sign];
			this.renderMentionTypeRow(containerEl, mentionType);
		}

		if (this.hasAvailableSigns()) {
			// Add button for new type
			this.renderNewTypeButton(containerEl);
		}
	}

	private hasAvailableSigns() {
		return Object.keys(this.getAvailableSigns('')).length > 0;
	}

	private renderNewTypeButton(containerEl: HTMLElement) {
		new Setting(containerEl)
			.addButton(cb => {
				cb.setButtonText('New type')
					.setCta()
					.onClick(async () => {
						const firstAvailableSign = Object.keys(this.getAvailableSigns(''))[0];
						this.plugin.settings.mentionTypes[firstAvailableSign] = { sign: firstAvailableSign };
						await this.plugin.saveSettings();
						this.display();
					});
			});
	}

	/**
	 * Render a single mention type row
	 */
	private renderMentionTypeRow(containerEl: HTMLElement, mentionType: MentionType): void {
		const setting = new Setting(containerEl);
		const availableSigns = this.getAvailableSigns(mentionType.sign);

		// Sign dropdown
		setting.addDropdown(
			list => list
				.addOptions(availableSigns)
				.setValue(mentionType?.sign)
				.onChange(async (value) => {
					mentionType.sign = value;
					await this.plugin.saveSettings();
					this.display();
				}),
		);

		// Label text field
		setting.addText(
			text => text
				.setPlaceholder('Type label, for example "Person"')
				.setValue(mentionType?.label || '')
				.onChange(async (value) => {
					mentionType.label = value;
					await this.plugin.saveSettings();
				})
				.inputEl.addClass('type_label'),
		);

		// Template path text field
		setting.addText(
			text => text
				.setPlaceholder('Path to template file (optional)')
				.setValue(mentionType?.templatePath || '')				
				.onChange(async (value) => {
					mentionType.templatePath = value;
					await this.plugin.saveSettings();
				})
				.inputEl.addClass('type_template'),
		);

		// Delete button
		setting.addExtraButton(
			button => button
				.setIcon('cross')
				.setTooltip('Delete')
				.onClick(async () => {
					delete this.plugin.settings.mentionTypes[mentionType.sign];
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
		new Setting(containerEl).setName('General settings').setHeading();

		// Match from start setting
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

		// Max match length setting
		new Setting(containerEl)
			.setName('Max match length')
			.setDesc('Maximum number of characters to match (3-50)')
			.addSlider(slider => {
				slider
					.setLimits(3, 50, 1)
					.setValue(this.plugin.settings.maxMatchLength ?? 15)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxMatchLength = value;
						await this.plugin.saveSettings();
					});
			});

		// Stop characters setting
		new Setting(containerEl)
			.setName('Stop characters')
			.setDesc('Characters that will stop the matching process. Leave empty to disable.')
			.addText(text => {
				text
					.setPlaceholder('?!"\'`:;/#+*=&%$§<>')
					.setValue(this.plugin.settings.stopCharacters ?? '?!"\'`:;/#+*=&%$§<>')
					.onChange(async (value) => {
						// Sanitize: remove duplicate characters
						const uniqueChars = [...new Set(value.split(''))].join('');
						this.plugin.settings.stopCharacters = uniqueChars;
						await this.plugin.saveSettings();
					});
			});
	}

	/**
	 * Get available signs for the dropdown
	 * @param usedSigns Array of signs already in use
	 * @param currentSign Current sign for this type (to allow keeping the same sign)
	 * @returns Object mapping signs to display values
	 */
	private getAvailableSigns(currentSign?: string): AvailableSigns {
		const availableSigns: AvailableSigns = {};

		ALLOWED_SIGNS.forEach(sign => {
			if (currentSign === sign || !this.plugin.settings.mentionTypes[sign]) {
				availableSigns[sign] = `${sign}Name`;
			}
		});

		return availableSigns;
	}
}
