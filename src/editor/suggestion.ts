import { App, EditorSuggest, Editor, EditorPosition, TFile, EditorSuggestContext, EditorSuggestTriggerInfo } from 'obsidian';
import { MentionManager } from '../mention/mention-manager';
import { createMentionLink } from '../mention/link-utils';
import {
	MentionSettings,
	MentionSuggestion,
	MentionSignSettings,
	Link,
	LinkTypes
} from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import * as path from 'path';
import { MentionLinkLookup } from 'src/mention/mention-link-map/mention-link-lookup';

/**
 * Provides suggestion functionality for mentions in the editor
 */
export class SuggestionProvider extends EditorSuggest<MentionSuggestion> {
	private settings: MentionSettings;
	private mentionManager: MentionManager;
	private lookup: MentionLinkLookup;

	constructor(app: App, settings: MentionSettings, mentionManager: MentionManager) {
		super(app);
		this.settings = settings;
		this.mentionManager = mentionManager;
		this.lookup = mentionManager.getLookup();
	}

	/**
	 * Update the suggestions map
	 */
	setSuggestionsMap(lookup: MentionLinkLookup): void {
		this.lookup = lookup;
	}

	/**
	 * Determine if suggestions should be triggered
	 */
	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
		const charsLeftOfCursor = editor.getLine(cursor.line).substring(0, cursor.ch);

		if (!charsLeftOfCursor) {
			return null;
		}

		// Find the most recent mention sign
		const { signIndex, name, query } = this.findMostRecentMentionType(charsLeftOfCursor);

		if (signIndex < 0) {
			return null;
		}

		// Check various conditions that would prevent showing suggestions
		if (!this.shouldShowSuggestions(name, signIndex, charsLeftOfCursor)) {
			return null;
		}

		return {
			start: { line: cursor.line, ch: signIndex },
			end: { line: cursor.line, ch: cursor.ch },
			query: query
		};
	}

	/**
	 * Determine if suggestions should be shown based on various conditions
	 */
	private shouldShowSuggestions(name: string, signIndex: number, charsLeftOfCursor: string): boolean {
		if (!name) {
			return false;
		}

		// Check if query includes closing brackets
		if (name.includes(']]')) {
			return false;
		}

		// Check if query exceeds max length
		const maxMatchLength = this.settings.maxMatchLength ?? DEFAULT_SETTINGS.maxMatchLength;
		if (maxMatchLength && name.length > maxMatchLength) {
			return false;
		}

		// Check if query contains any stop characters
		const stopCharacters = this.settings.stopCharacters ?? DEFAULT_SETTINGS.stopCharacters;
		if (stopCharacters) {
			for (const char of stopCharacters) {
				if (name.includes(char)) {
					return false;
				}
			}
		}

		// Check if sign is at start of line or has a space before it
		return (
			signIndex === 0 ||
			charsLeftOfCursor[signIndex - 1] === ' '
		);
	}

	/**
	 * Get suggestions based on the query
	 */
	getSuggestions(context: EditorSuggestContext): MentionSuggestion[] {
		let suggestions: MentionSuggestion[] = [];

		const { sign, name } = this.findMostRecentMentionType(context.query);
		const links = this.lookup.getLinks(sign, name);

		// Add matching existing items
		suggestions = this.getMatchingSuggestions(name, links, context);

		// Check if we should add option to create new item
		
		if (context.query.substring(1).length > 0) {
			suggestions.push(this.createNewItemSuggestion(context, sign));
		}

		return suggestions;
	}

	/**
	 * Find the most recent mention sign in the text
	 */
	private findMostRecentMentionType(text: string): { signIndex: number, sign: string, name: string, query: string } {
		let signIndex = -1;
		let foundSign = '';

		for (const sign in this.settings.mentionTypes) {
			const index = text.lastIndexOf(sign);

			if (index !== -1 && index > signIndex) {
				signIndex = index;
				foundSign = sign;
			}
		}

		const query = text.substring(signIndex);

		return { signIndex, sign: foundSign, name: text.substring(signIndex + 1), query };
	}

	/**
	 * Get suggestions that match the search term
	 */
	private getMatchingSuggestions(name: string, links: Link[], context: EditorSuggestContext): MentionSuggestion[] {
		const suggestions: MentionSuggestion[] = [];

		for (const link of links) {
			if (this.isMatch(link, name)) {				
				const displayText = link.type === LinkTypes.alias ? `${link.name} (${link.fileName})` : link.name;

				const mentionTypeSettings = this.settings.mentionTypes[link.sign];

				suggestions.push({
					suggestionType: 'set',
					displayText: displayText,
					link: link,
					context,
					mentionType: mentionTypeSettings,
				});
			}
		}

		suggestions.sort((a, b) => a.displayText.localeCompare(b.displayText));

		return suggestions;
	}

	/**
	 * Check if an item matches the search term based on settings
	 */
	private isMatch(link: Link, name: string): boolean {
		if (this.settings.matchStart) {
			return link.name.startsWith(name);
		} else {
			return link.name.includes(name);
		}
	}

	/**
	 * Create a suggestion for creating a new item
	 */
	private createNewItemSuggestion(context: EditorSuggestContext, sign: string): MentionSuggestion {
		let path = context.query + '.md';

		const mentionTypeSettings = this.settings.mentionTypes[sign];
		if (mentionTypeSettings.label) {
			path = `${mentionTypeSettings.label}/${context.query}.md`;
		}
		
		return {
			suggestionType: 'create',
			displayText: context.query,
			link: {
				path,
				sign,
				name: context.query.substring(1),
				fileName: context.query,
				type: LinkTypes.filename,
			},
			mentionType: mentionTypeSettings,
			context
		};
	}

	/**
	 * Render a suggestion in the dropdown
	 */
	renderSuggestion(value: MentionSuggestion, el: HTMLElement): void {
		if (value.suggestionType === 'create') {
			const type = value.mentionType;
			const label = type?.label || 'Item';

			el.setText(`Create ${label}: ${value.displayText}`);
		} else {
			el.setText(value.displayText);
		}
	}

	/**
	 * Handle selection of a suggestion
	 */
	async selectSuggestion(value: MentionSuggestion, evt: MouseEvent | KeyboardEvent): Promise<void> {
		if (value.suggestionType === 'create') {
			await this.createSuggestionFile(value);
		}

		const link = createMentionLink(value.link);

		value.context.editor.replaceRange(
			link,
			value.context.start,
			value.context.end
		);
	}

	private async createSuggestionFile(value: MentionSuggestion) : Promise<void> {
		const dir = path.dirname(value.link.path);

		this.app.vault.createFolder(dir);

		const contents = await this.loadMentionTypeTemplate(value.mentionType);
		await this.app.vault.create(value.link.path, contents);
	}

	private async loadMentionTypeTemplate(mentionType: MentionSignSettings) : Promise<string> {
		let contents = '';
		
		let templatePath = mentionType.templatePath;
		if (templatePath) {
			if (!templatePath.endsWith('.md')) {
				templatePath += '.md';
			}

			const templateFile = this.app.vault.getFileByPath(templatePath);

			if (templateFile) {
				contents = await this.app.vault.read(templateFile);
			}
		}

		return contents;
	}
}
