import { App } from 'obsidian';
import { MentionSettings, FileMaps } from '../types';
import { FileIndexer } from './file-indexer';

/**
 * Core mention functionality manager
 */
export class MentionManager {
	private settings: MentionSettings;
	private fileIndexer: FileIndexer;

	constructor(app: App, settings: MentionSettings) {
		this.settings = settings;
		this.fileIndexer = new FileIndexer(app, settings);
	}

	/**
	 * Initialize the mention manager
	 */
	initialize(): FileMaps {
		return this.fileIndexer.initialize();
	}

	/**
	 * Get the current file maps
	 */
	getFileMaps(): FileMaps {
		return this.fileIndexer.getFileMaps();
	}

	/**
	 * Handle file events (create, delete, rename)
	 * @param fileEvent File event data
	 * @param originalPath Original path for rename events
	 * @returns Whether the file maps were updated
	 */
	handleFileEvent(fileEvent: {
		path: string,
		deleted?: boolean
	}, originalPath?: string): boolean {
		return this.fileIndexer.updateIndex(fileEvent.path, originalPath);
	}

	/**
	 * Get all used signs from the settings
	 */
	getUsedSigns(): string[] {
		return this.settings.mentionTypes.map(object => object.sign).filter(Boolean) as string[];
	}

	/**
	 * Update settings with new values
	 * @param settings New settings
	 */
	updateSettings(settings: MentionSettings): void {
		this.settings = settings;

		// Re-initialize file maps with new settings
		this.initialize();
	}
}
