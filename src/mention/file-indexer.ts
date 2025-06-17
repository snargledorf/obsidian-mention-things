import { App, TFile } from 'obsidian';
import { MentionSettings, FileMaps, MentionLink } from '../types';
import { getLinkFromPath, getLinkFromAlias } from './link-utils';

/**
 * Handles indexing and tracking mentionable files
 */
export class FileIndexer {
	private app: App;
	private settings: MentionSettings;
	private fileMaps: FileMaps = {};

	constructor(app: App, settings: MentionSettings) {
		this.app = app;
		this.settings = settings;
	}

	/**
	 * Initialize the file index by scanning all files in the vault
	 */
	initialize(): FileMaps {
		this.fileMaps = {};

		// Get all files in the vault using the proper Obsidian API
		const files = this.app.vault.getAllLoadedFiles();

		// Process each file
		files.forEach(file => {
			if (file instanceof TFile && file.extension === 'md') {
				const mentionLink = getLinkFromPath(file.path, this.settings);
				if (mentionLink) {
					this.addFileToMap(mentionLink);
				}

				const fileAliases: string[] = this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases;
				if (fileAliases) {
					fileAliases.forEach(alias => {
						const aliasLink = getLinkFromAlias(alias, file, this.settings);
						if (aliasLink) {
							this.addFileToMap(aliasLink);
						}
					});
				}
			}
		});

		return this.fileMaps;
	}

	/**
	 * Get the current file maps
	 */
	getFileMaps(): FileMaps {
		return this.fileMaps;
	}

	fileCreated(file: TFile) {
		let needsUpdate = false;

		// Handle new or updated file
		const addItem = getLinkFromPath(file.path, this.settings);
		if (addItem) {
			this.addFileToMap(addItem);
			needsUpdate = true;
		}

		const fileAliases: string[] = this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases;
		if (fileAliases) {
			fileAliases.forEach(alias => {
				const aliasLink = getLinkFromAlias(alias, file, this.settings);
				if (aliasLink) {
					this.addFileToMap(aliasLink);
					needsUpdate = true;
				}
			});
		}

		return needsUpdate;
	}

	fileDeleted(file: TFile): boolean {
		let needsUpdate = false;

		// If the file doesn't exist, it might have been deleted
		const removeItem = getLinkFromPath(file.path, this.settings);
		if (removeItem) {
			this.removeFileFromMap(removeItem);
			needsUpdate = true;
		}

		const fileAliases: string[] = this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases;
		if (fileAliases) {
			fileAliases.forEach(alias => {
				const aliasLinkToRemove = getLinkFromAlias(alias, file, this.settings);
				if (aliasLinkToRemove) {
					this.removeFileFromMap(aliasLinkToRemove);
					needsUpdate = true;
				}
			});
		}

		return needsUpdate;
	}

	/**
	 * Update the file index when a file is created, deleted, or renamed
	 */
	fileRenamed(file: TFile, originalPath?: string): boolean {
		// The fileCreated function will update the path
		return this.fileCreated(file);
	}

	/**
	 * Add a file to the appropriate map
	 */
	private addFileToMap(item: MentionLink): void {
		const sign = item.type.sign;

		if (!sign) {
			return;
		}

		const key = item.name.toLowerCase();
		this.fileMaps[sign] = this.fileMaps[sign] || {};
		this.fileMaps[sign][key] = item;
	}

	/**
	 * Remove a file from the map
	 */
	private removeFileFromMap(item: MentionLink): void {
		const sign = item.type.sign;

		if (!sign || !this.fileMaps[sign]) {
			return;
		}

		const key = item.name.toLowerCase();
		delete this.fileMaps[sign][key];
	}
}
