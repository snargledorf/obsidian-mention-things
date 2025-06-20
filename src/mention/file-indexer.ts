import { App, TFile } from 'obsidian';
import { LinkTypes, MentionSettings } from '../types';
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
			this.mentionMap.addFilenameLink(fileWithAliases.file.path);
			
			for (const alias of fileWithAliases.aliases) {
				this.mentionMap.addAliasLink(alias, fileWithAliases.file.path);
			}
		}

		return this.getLookup();
	}

	/**
	 * Get the current file maps
	 */
	getLookup(): MentionLinkLookup {
		return this.mentionMap.getLookup();
	}

	fileCreated(file: TFile): boolean {
		return this.fileModified(file);
	}

	fileDeleted(file: TFile): boolean {
		return this.mentionMap.removeLinks(file.path);
	}

	/**
	 * Update the file index when a file is renamed
	 */
	fileRenamed(file: TFile, originalPath: string): boolean {
		return this.mentionMap.updatePath(originalPath, file.path);
	}

	fileModified(file: TFile) {
		let needsUpdate = this.mentionMap.addFilenameLink(file.path);

		const fileAliases = this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases as string[];

		if (fileAliases) {
			for (const alias of fileAliases) {
				needsUpdate = this.mentionMap.addAliasLink(alias, file.path) || needsUpdate;
			}
		} else {
			needsUpdate = this.mentionMap.removeLinks(file.path, LinkTypes.alias) || needsUpdate;
		}

		return needsUpdate;
	}
}
