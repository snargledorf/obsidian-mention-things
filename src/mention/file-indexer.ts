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
		return this.fileModified(file);
	}

	fileDeleted(file: TFile): boolean {
		return this.removeFileFromMap(file.path);
	}

	/**
	 * Update the file index when a file is renamed
	 */
	fileRenamed(file: TFile, originalPath: string): boolean {
		const newMentionLink = getLinkFromPath(file.path, this.settings);
				
		if (newMentionLink) {
			return this.updateFilePathInMap(originalPath, newMentionLink);
		} else {
			return this.removeFileFromMap(originalPath);
		}
	}

	fileModified(file: TFile) {
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

	/**
	 * Add a file to the appropriate map
	 */
	private addFileToMap(item: MentionLink): void {
		const sign = item.mentionType.sign;

		if (!sign) {
			return;
		}

		const key = item.name.toLowerCase();
		this.fileMaps[sign] = this.fileMaps[sign] || {};
		this.fileMaps[sign][key] = item;
	}
	
	updateFilePathInMap(originalPath: string, newMentionLink: MentionLink): boolean {
		let updated = false;

		for (const sign in this.fileMaps) {
			const signMap = this.fileMaps[sign];
			for (const name in signMap) {
				if (signMap[name].path === originalPath) {
					signMap[name].path = newMentionLink.path;
					updated = true;
				}
			}
		}
		return updated;
	}

	/**
	 * Remove a file from the map
	 */
	private removeFileFromMap(path: string): boolean {
		let updated = false;
		for (const sign in this.fileMaps) {
			const signMap = this.fileMaps[sign];
			for (const name in signMap) {
				if (signMap[name].path === path) {
					delete signMap[name];
					updated = true;
				}
			}
		}
		return updated;
	}
}
