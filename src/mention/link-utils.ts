import { TFile } from 'obsidian';
import { MentionSettings, Link } from '../types';
import { ALLOWED_SIGNS } from 'src/constants';

const filePathRegex = new RegExp(`/(?<fileName>(?<sign>[${ALLOWED_SIGNS.join('\\')}])(?<name>[^/]+))\\.md$`);
const aliasRegex = new RegExp(`(?<sign>[${ALLOWED_SIGNS.join('\\')}])(?<name>[^/]+)$`);

/**
 * Extract mention information from a file path
 * @param path File path to analyze
 * @param settings Plugin settings
 * @returns MentionLink object if the path matches a mention pattern, null otherwise
 */
export function getLinkFromPath(path: string, settings?: MentionSettings): Link | null {
	const linkParts = parseLinkPartsFromPath(path);
	
	if (!linkParts?.sign || !settings?.mentionTypes[linkParts.sign]) {
		return null;
	}

	return { path, type: 'filename', ...linkParts };
}

export function parseLinkPartsFromPath(path: string) : { sign: string, name: string, fileName: string } | null {
	const result = filePathRegex.exec(path);

	if (!result?.groups) {
		return null;
	}

	const { sign, name, fileName } = result.groups;
	
	return {
		sign,
		name,
		fileName
	}
}

export function getLinkFromAlias(alias: string, file: TFile, settings: MentionSettings): Link | null {
	if (file.extension !== 'md') {
		return null;
	}

	const aliasLinkParts = parseLinkPartsFromAlias(alias);
	if (!aliasLinkParts) {
		return null;
	}

	const { sign, name } = aliasLinkParts;

	if (!settings.mentionTypes[sign]) {
		return null;
	}

	const { path } = file;

	const pathLinkParts = parseLinkPartsFromPath(path);

	if (!pathLinkParts) {
		return null;
	}

	const { fileName } = pathLinkParts;
	
	return {
		sign,
		path,
		name,
		fileName,
		type: 'alias'
	}
}

export function parseLinkPartsFromAlias(alias: string): { sign: string, name: string } | null {
	const aliasResult = aliasRegex.exec(alias);

	if (!aliasResult?.groups) {
		return null;
	}

	const { sign, name } = aliasResult.groups;

	return {
		sign,
		name
	};
}

/**
 * Create a link string for a mention
 * @param sign The mention sign
 * @param name The name to link to
 * @returns Formatted link string
 */
export function createMentionLink(mentionLink: Link): string {
	let linkText = mentionLink.fileName;
	if (mentionLink.type === 'alias') {
		linkText = `${linkText}|${mentionLink.sign}${mentionLink.name}`;
	}

	return `[[${linkText}]]`;
}
