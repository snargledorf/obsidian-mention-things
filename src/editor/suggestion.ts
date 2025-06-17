import { App, EditorSuggest, Editor, EditorPosition, TFile, EditorSuggestContext, EditorSuggestTriggerInfo } from 'obsidian';
import { MentionManager } from '../mention/mention-manager';
import { createMentionLink } from '../mention/link-utils';
import {
	MentionSettings,
	MentionSuggestion,
	FileMaps,
	MentionLink,
	MentionType
} from '../types';
import { DEFAULT_SETTINGS } from '../constants';

/**
 * Provides suggestion functionality for mentions in the editor
 */
export class SuggestionProvider extends EditorSuggest<MentionSuggestion> {
	private settings: MentionSettings;
	private mentionManager: MentionManager;
	private fileMaps: FileMaps;

	constructor(app: App, settings: MentionSettings, mentionManager: MentionManager) {
		super(app);
		this.settings = settings;
		this.mentionManager = mentionManager;
		this.fileMaps = mentionManager.getFileMaps();
	}

	/**
	 * Update the suggestions map
	 */
	setSuggestionsMap(maps: FileMaps): void {
		this.fileMaps = maps;
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
		const { signIndex } = this.findMostRecentMentionType(charsLeftOfCursor);

		if (signIndex < 0) {
			return null;
		}

		const query = charsLeftOfCursor.substring(signIndex);

		// Check various conditions that would prevent showing suggestions
		if (!this.shouldShowSuggestions(query, signIndex, charsLeftOfCursor)) {
			return null;
		}

		return {
			start: { line: cursor.line, ch: signIndex },
			end: { line: cursor.line, ch: cursor.ch },
			query
		};
	}

	/**
	 * Find the most recent mention sign in the text
	 */
	private findMostRecentMentionType(text: string): { signIndex: number, mentionType: MentionType } {
		let signIndex = -1;
		let foundSign = '';

		for (const sign in this.settings.mentionTypes) {
			const index = text.lastIndexOf(sign);

			if (index !== -1 && index > signIndex) {
				signIndex = index;
				foundSign = sign;
			}
		}

		return { signIndex, mentionType: this.settings.mentionTypes[foundSign] };
	}

	/**
	 * Determine if suggestions should be shown based on various conditions
	 */
	private shouldShowSuggestions(query: string, signIndex: number, charsLeftOfCursor: string): boolean {
		const name = query?.substring(1).trim();
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

		const { mentionType } = this.findMostRecentMentionType(context.query);
		const signMap = this.fileMaps[mentionType.sign] || {};

		// Add matching existing items
		suggestions = this.getMatchingSuggestions(signMap, context);

		// Check if we should add option to create new item
		
		if (context.query.substring(1).length > 0) {
			suggestions.push(this.createNewItemSuggestion(context, mentionType));
		}

		return suggestions;
	}

	/**
	 * Get suggestions that match the search term
	 */
	private getMatchingSuggestions(signMap: { [name: string]: MentionLink; }, context: EditorSuggestContext): MentionSuggestion[] {
		const suggestions: MentionSuggestion[] = [];

		for (const name in signMap) {
			if (!name) {
				continue;
			}

			if (this.isMatch(name, context.query)) {
				const mentionLink = signMap[name];
				
				let displayText = mentionLink.name.trim();
				
				if (mentionLink.fileName !== mentionLink.name) {
					displayText += ` (${mentionLink.fileName})`;
				}

				suggestions.push({
					suggestionType: 'set',
					displayText: displayText,
					mentionLink: mentionLink,
					context,
				});
			}
		}

		suggestions.sort((a, b) => a.displayText.localeCompare(b.displayText));

		return suggestions;
	}

	/**
	 * Check if an item matches the search term based on settings
	 */
	private isMatch(name: string, query: string): boolean {
		const queryText = query.substring(1).toLowerCase();
		if (this.settings.matchStart) {
			return name.startsWith(queryText);
		} else {
			return name.includes(queryText);
		}
	}

	/**
	 * Create a suggestion for creating a new item
	 */
	private createNewItemSuggestion(context: EditorSuggestContext, mentionType: MentionType): MentionSuggestion {
		let path = context.query + '.md';
		if (mentionType.label) {
			path = `${mentionType.label}/${context.query}.md`;
		}
		
		return {
			suggestionType: 'create',
			displayText: context.query,
			mentionLink: {
				name: context.query.substring(1),
				fileName: context.query,
				type: mentionType,
				path: path,
			},
			context,
		};
	}

	/**
	 * Render a suggestion in the dropdown
	 */
	renderSuggestion(value: MentionSuggestion, el: HTMLElement): void {
		if (value.suggestionType === 'create') {
			const type = value.mentionLink.type;
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

		const link = createMentionLink(value.mentionLink);

		value.context.editor.replaceRange(
			link,
			value.context.start,
			value.context.end
		);
	}

	async createSuggestionFile(value: MentionSuggestion) {
		await this.app.vault.create(value.mentionLink.path, '');
	}
}
