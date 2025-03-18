import { MentionSettings } from './types';

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: MentionSettings = {
	mentionTypes: [],
	matchStart: true,
	maxMatchLength: 15,
	stopCharacters: '?!"\'`:;/#+*=&%$§<>',
};

/**
 * List of allowed signs for mentions
 */
export const ALLOWED_SIGNS_STRING = '@#+!$%^&*~=-:;><|';
export const ALLOWED_SIGNS = ALLOWED_SIGNS_STRING.split('');
