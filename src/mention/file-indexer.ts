import { App, TFile } from 'obsidian';
import { MentionSettings } from '../types';
import { getLinkFromPath, getLinkFromAlias } from './link-utils';
import { MentionLinkMap as MentionLinkMap } from './mention-link-map/mention-link-map';
import { MentionLinkLookup as MentionLinkLookup } from './mention-link-map/mention-link-lookup';

/**
 * Handles indexing and tracking mentionable files
 */
export class FileIndexer {
	private app: App;
	private settings: MentionSettings;
	private mentionMap: MentionLinkMap = new MentionLinkMap();

	constructor(app: App, settings: MentionSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Initialize the file index by scanning all files in the vault
	 */
	initialize(): MentionLinkLookup {
		// Get all files in the vault using the proper Obsidian API
		const filesWithAliases = this.app.vault.getAllLoadedFiles()
			.filter(absFile => absFile instanceof TFile && absFile.extension === 'md')
			.map(absFile => {
				const file = absFile as TFile;
				return {
					file,
					aliases: this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases as string[] ?? []
				};
			});

		// Process each file
		for (const fileWithAliases of filesWithAliases) {
			this.mentionMap.addFilenameByPath(fileWithAliases.file.path);
			
			for (const alias of fileWithAliases.aliases) {
				this.mentionMap.addAlias(alias, fileWithAliases.file.path);
			}
		}

		return this.getLookup();
	}

	/**
	 * Get the current file maps
	 */
	getLookup(): MentionLinkLookup {
		return this.mentionMap.buildLookup();
	}

	fileCreated(file: TFile) {
		return this.fileModified(file);
	}

	fileDeleted(file: TFile): boolean {
		return this.mentionMap.removeAllLinksForPath(file.path);
	}

	/**
	 * Update the file index when a file is renamed
	 */
	fileRenamed(file: TFile, originalPath: string): boolean {
		
	}

	fileModified(file: TFile) {
		let needsUpdate = false;

		// Handle new or updated file
		const addItem = getLinkFromPath(file.path, this.settings);
		if (addItem) {
			this.addLinkToMap(addItem);
			needsUpdate = true;
		}

		const fileAliases: string[] = this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases;
		if (fileAliases) {
			fileAliases.forEach(alias => {
				const aliasLink = getLinkFromAlias(alias, file, this.settings);
				if (aliasLink) {
					this.addLinkToMap(aliasLink);
					needsUpdate = true;
				}
			});
		}

		return needsUpdate;
	}
}
