import { MentionSettings, MentionType, MentionLink } from '../types';

/**
 * Extract mention information from a file path
 * @param path File path to analyze
 * @param settings Plugin settings
 * @returns MentionLink object if the path matches a mention pattern, null otherwise
 */
export function getLinkFromPath(path: string, settings: MentionSettings): MentionLink | null {
	if (!path.endsWith('.md')) {
		return null;
	}

	for (let i = 0; i < settings.mentionTypes.length; i++) {
		const type = settings.mentionTypes[i];

		if (!type?.sign) {
			continue;
		}

		if (!path.includes('/' + type.sign)) {
			continue;
		}

		const regex = new RegExp(`/${type.sign}([^/]+)\\.md$`);
		let result = regex.exec(path);

		if (result?.[1]) {
			return {
				sign: type.sign,
				name: result[1],
				path,
			};
		}
	}

	return null;
}

/**
 * Find a mention type definition by its sign
 * @param types Array of mention types
 * @param sign Sign character to look for
 * @returns MentionType if found, null otherwise
 */
export function getTypeDef(types: MentionType[], sign: string): MentionType | null {
	for (let i = 0; i < types.length; i++) {
		if (sign === types[i]?.sign) {
			return types[i];
		}
	}

	return null;
}

/**
 * Create a link string for a mention
 * @param sign The mention sign
 * @param name The name to link to
 * @returns Formatted link string
 */
export function createMentionLink(sign: string, name: string): string {
	return `[[${sign}${name}]]`;
}
