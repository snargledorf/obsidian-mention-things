import { MentionSettings } from './types';

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: MentionSettings = {
    mentionTypes: [],
    matchStart: true,
};

/**
 * List of allowed signs for mentions
 */
export const ALLOWED_SIGNS = [
    '@',
    '%',
    '&',
    '!',
    '?',
    '+',
    ';',
    '.',
    '=',
    '^',
    '§',
    '$',
    '-',
    '_',
    '(',
    '{',
];
