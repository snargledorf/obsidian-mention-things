import { App, EditorSuggest, Editor, EditorPosition, TFile } from 'obsidian';
import { MentionSettings, MentionSuggestion } from '../types';
import { MentionManager } from '../mention/mention-manager';
import { getTypeDef, createMentionLink } from '../mention/link-utils';

/**
 * Provides suggestion functionality for mentions in the editor
 */
export class SuggestionProvider extends EditorSuggest<MentionSuggestion> {
	private settings: MentionSettings;
	private mentionManager: MentionManager;
	private currSign: string = '';
	private fileMaps: any;

	constructor(app: App, settings: MentionSettings, mentionManager: MentionManager) {
		super(app);
		this.settings = settings;
		this.mentionManager = mentionManager;
		this.fileMaps = mentionManager.getFileMaps();
	}

	/**
	 * Update the suggestions map
	 */
	setSuggestionsMap(maps: any): void {
		this.fileMaps = maps;
	}

	/**
	 * Determine if suggestions should be triggered
	 */
	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
		const usedSigns = this.mentionManager.getUsedSigns();

		let charsLeftOfCursor = editor.getLine(cursor.line).substring(0, cursor.ch);

		if (!charsLeftOfCursor) {
			return null;
		}

		let signIndex = -1;

		for (let sign of usedSigns) {
			let index = charsLeftOfCursor.lastIndexOf(sign);

			if (index !== -1 && index > signIndex) {
				signIndex = index;
				this.currSign = sign;
			}
		}

		if (signIndex < 0) {
			return null;
		}

		let query = signIndex >= 0 && charsLeftOfCursor.substring(signIndex + 1);

		if (
			query
			&& !query.includes(']]')
			&& (
				// if it's a sign at the start of a line
				signIndex === 0
				// or if there's a space character before it
				|| charsLeftOfCursor[signIndex - 1] === ' '
			)
		) {
			return {
				start: { line: cursor.line, ch: signIndex },
				end: { line: cursor.line, ch: cursor.ch },
				query,
			};
		}

		return null;
	}

	/**
	 * Get suggestions based on the query
	 */
	getSuggestions(context: EditorSuggestContext): MentionSuggestion[] {
		let suggestions: MentionSuggestion[] = [];
		let map = this.fileMaps[this.currSign] || {};

		for (let key in map) {
			let isMatch;

			if (!key) {
				continue;
			}

			const term = context.query.toLowerCase();

			if (this.settings.matchStart) {
				isMatch = key.startsWith(term);
			} else {
				isMatch = key.includes(term);
			}

			if (isMatch) {
				suggestions.push({
					suggestionType: 'set',
					displayText: map[key].name.trim(),
					linkName: map[key].name,
					context,
				});
			}
		}

		// Always add option to create new item
		suggestions.push({
			suggestionType: 'create',
			displayText: context.query,
			linkName: context.query,
			context,
		});

		return suggestions;
	}

	/**
	 * Render a suggestion in the dropdown
	 */
	renderSuggestion(value: MentionSuggestion, el: HTMLElement): void {
		if (value.suggestionType === 'create') {
			const type = getTypeDef(this.settings.mentionTypes, this.currSign);
			const label = type?.label || 'Item';

			el.setText(`Create ${label}: ${value.displayText}`);
		} else {
			el.setText(value.displayText);
		}
	}

	/**
	 * Handle selection of a suggestion
	 */
	selectSuggestion(value: MentionSuggestion, evt: MouseEvent | KeyboardEvent): void {
		const link = createMentionLink(this.currSign, value.linkName);

		value.context.editor.replaceRange(
			link,
			value.context.start,
			value.context.end,
		);
	}
}

// Type definition for EditorSuggest trigger info
interface EditorSuggestTriggerInfo {
	start: EditorPosition;
	end: EditorPosition;
	query: string;
}

// Type definition for EditorSuggest context
interface EditorSuggestContext {
	start: EditorPosition;
	end: EditorPosition;
	query: string;
	editor: Editor;
}
