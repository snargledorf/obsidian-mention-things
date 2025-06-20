import { EditorSuggestContext } from "obsidian";

/**
 * Plugin settings interface
 */
export interface MentionSettings {
	mentionTypes: MentionSignsSettings;
	matchStart?: boolean;
	maxMatchLength?: number;
	stopCharacters?: string;
}

export interface MentionSignsSettings {
	[sign: string]: MentionSignSettings;
}

/**
 * Represents a type of mention with its sign and label
 */
export interface MentionSignSettings {
	label?: string;
	templatePath?: string;
}

export enum LinkTypes {
	alias,
	filename,
	all = alias | filename
}

export interface SignToNameKeys {
	[sign: string]: string[];
}

export interface NameKeyToSignToPathToLinkDetails {
	[nameKey: string]: SignToPathToLinkDetails;
}

export interface SignToPathToLinkDetails {
	[sign: string]: PathToLinkDetail;
}

export interface PathToLinkDetail {
	[path: string]: LinkDetail;
}

export interface Link {
	sign: string;
	path: string;
	name: string;
	fileName: string;
	type: LinkTypes;
}

export interface LinkDetail {
	name: string;
	fileName: string;
	type: LinkTypes;
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
	link: Link;
	mentionType: MentionSignSettings;
	context: EditorSuggestContext;
}
