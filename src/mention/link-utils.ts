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
		if (!path.includes('/' + sign)) {
			continue;
		}

		const regex = new RegExp(`/([${sign}]([^/]+))\\.md$`);
		const result = regex.exec(path);

		if (result?.[2]) {
			return {
				mentionType: settings.mentionTypes[sign],
				name: result[2],
				type: 'filename',
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
		if (!alias.startsWith(sign)) {
			continue;
		}

		const aliasRegex = new RegExp(`[${sign}]([^/]+)$`);
		const aliasRegexResult = aliasRegex.exec(alias);

		const fileNameRegex = new RegExp(`([${sign}]([^/]+))\\.md$`);
		const fileNameRegexResult = fileNameRegex.exec(file.name);

		if (aliasRegexResult?.[1] && fileNameRegexResult?.[1]) {
			return {
				mentionType: settings.mentionTypes[sign],
				name: aliasRegexResult[1],
				type: 'alias',
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
	let linkText = mentionLink.fileName;
	if (mentionLink.type === 'alias') {
		linkText = `${linkText}|${mentionLink.mentionType.sign}${mentionLink.name}`;
	}

	return `[[${linkText}]]`;
}
