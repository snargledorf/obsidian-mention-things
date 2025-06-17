import { TFile } from 'obsidian';
import { MentionSettings, MentionLink } from '../types';

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

	for (const sign in settings.mentionTypes) {
		const type = settings.mentionTypes[sign];

		if (!type?.sign) {
			continue;
		}

		if (!path.includes('/' + type.sign)) {
			continue;
		}

		const regex = new RegExp(`/(${type.sign}([^/]+))\\.md$`);
		const result = regex.exec(path);

		if (result?.[2]) {
			return {
				type: type,
				name: result[2],
				fileName: result[1],
				path,
			};
		}
	}

	return null;
}

export function getLinkFromAlias(alias: string, file: TFile, settings: MentionSettings): MentionLink | null {
	if (file.extension !== 'md') {
		return null;
	}

	for (const sign in settings.mentionTypes) {
		const type = settings.mentionTypes[sign];

		if (!type?.sign || !alias.startsWith(type.sign)) {
			continue;
		}

		const aliasRegex = new RegExp(`${type.sign}([^/]+)$`);
		const aliasRegexResult = aliasRegex.exec(alias);

		const fileNameRegex = new RegExp(`(${type.sign}([^/]+))\\.md$`);
		const fileNameRegexResult = fileNameRegex.exec(file.name);

		if (aliasRegexResult?.[1] && fileNameRegexResult?.[1]) {
			return {
				type: type,
				name: aliasRegexResult[1],
				fileName: fileNameRegexResult[1],
				path: file.path,
			};
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
export function createMentionLink(mentionLink: MentionLink): string {
	let linkText = mentionLink.type.sign + mentionLink.name;
	if (mentionLink.fileName !== linkText) {
		linkText = `${linkText}|${linkText}`;
	}

	return `[[${linkText}]]`;
}
