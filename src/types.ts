import { EditorSuggestContext } from "obsidian";

/**
 * Plugin settings interface
 */
export interface MentionSettings {
	mentionTypes: MentionTypes;
	matchStart?: boolean;
	maxMatchLength?: number;
	stopCharacters?: string;
}

export interface MentionTypes {
	[sign: string]: MentionType;
}

/**
 * Represents a type of mention with its sign and label
 */
export interface MentionType {
	sign: string;
	label?: string;
}

/**
 * Represents a link to a mentioned item
 */
export interface MentionLink {
	mentionType: MentionType;
	name: string;
	type: 'alias' | 'filename';
	fileName: string;
	path: string;
}

/**
 * Structure for storing mentionable files
 */
export interface FileMaps {
	[sign: string]: {
		[name: string]: MentionLink;
	};
}

/**
 * Available signs for dropdown selection
 */
export interface AvailableSigns {
	[sign: string]: string;
}

/**
 * Suggestion item structure
 */
export interface MentionSuggestion {
	suggestionType: 'set' | 'create';
	displayText: string;
	mentionLink: MentionLink;
	context: EditorSuggestContext;
}
