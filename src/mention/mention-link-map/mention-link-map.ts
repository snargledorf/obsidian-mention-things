import { MentionLinkLookup } from "./mention-link-lookup";
import { LinkSignTree, LinkTreeNode, PathNameKeys } from "./types";
import { parseLinkPartsFromAlias, parseLinkPartsFromPath } from "../link-utils";
import { LinkType } from "src/types";

export class MentionLinkMap {
	private linkSignTree: LinkSignTree = {};
	private pathsWithLinkNodes: PathNameKeys = {};

	public addFilenameByPath(path: string): boolean {
		const linkParts = parseLinkPartsFromPath(path);
		if (!linkParts) {
			return false;
		}

		const { sign, name, fileName } = linkParts;

		this.addLink(name, sign, path, fileName, 'filename');
		return true;
	}

	public removeFilenameByPath(path: string): boolean {
		const linkParts = parseLinkPartsFromPath(path);
		if (!linkParts) {
			return false;
		}

		const { sign, name } = linkParts;

		this.removeLink(sign, name, path, 'filename');
		return true;
	}

	public addAlias(alias: string, path: string): boolean {
		const aliasLinkParts = parseLinkPartsFromAlias(alias);
		if (!aliasLinkParts) {
			return false;
		}

		const { sign, name } = aliasLinkParts;

		const fileName = parseLinkPartsFromPath(path)?.fileName;
		if (!fileName) {
			return false;
		}

		this.addLink(name, sign, path, fileName, 'alias');		
		return true;
	}

	public removeAlias(alias: string, path: string): boolean {
		const aliasLinkParts = parseLinkPartsFromAlias(alias);
		if (!aliasLinkParts) {
			return false;
		}

		const { sign, name } = aliasLinkParts;

		this.removeLink(sign, name, path, 'alias');
		return true;
	}

	public removeAllLinksForPath(path: string): boolean {
		const pathSignsWithLinkNodes = this.pathsWithLinkNodes[path];
		if (!pathSignsWithLinkNodes) {
			return false;
		}

		for (const sign in pathSignsWithLinkNodes) {
			const signNameKeys = pathSignsWithLinkNodes[sign];
			for (const nameKey of signNameKeys) {
				const node = this.getLinkNode(sign, nameKey);
				delete node.paths[path];
				this.pruneEmptyNodes(node);
			}
		}

		delete this.pathsWithLinkNodes[path];

		return true;
	}

	removeLink(sign: string, name: string, path: string, type: LinkType) {		
		const nameKey = this.getNameKey(name);		
		const node = this.getLinkNode(sign, nameKey);

		const pathLinks = node.paths[path]?.links;
		if (!pathLinks) {
			return;
		}

		const aliasIndex = pathLinks.findIndex(link => link.name === name && link.type === type);
		if (!aliasIndex) {
			return false;
		}

		pathLinks.splice(aliasIndex, 1);

		// Prune any references to this path/name key if there are no more links under it
		if (pathLinks.length === 0) {
			delete node.paths[path];
			this.pruneEmptyNodes(node);
			
			this.pathsWithLinkNodes[path][sign].remove(nameKey);
		}
	}

	private pruneEmptyNodes(node: LinkTreeNode) {
		let currentNode: LinkTreeNode | undefined = node;
		do {
			if (Object.keys(currentNode.paths).length === 0 && Object.keys(currentNode.nodes).length === 0) {
				delete currentNode.parent?.nodes[currentNode.key];
			}

			currentNode = currentNode.parent;
		} while (currentNode);
	}

	private getNameKey(name: string) {
		return name.toLowerCase();
	}

	private addLink(name: string, sign: string, path: string, fileName: string, type: LinkType) {
		const nameKey = this.getNameKey(name);
		const node = this.getLinkNode(sign, nameKey);

		const pathDetails = node.paths[path] ??= {
			fileName,
			links: []
		};

		pathDetails.links.push({
			name,
			type
		});

		const pathSigns = this.pathsWithLinkNodes[path] ??= {};
		const pathSignNameKeys = pathSigns[sign] ??= [];

		pathSignNameKeys.push(nameKey);
	}

	private getLinkNode(sign: string, nameKey: string): LinkTreeNode {
		let currentNode = this.linkSignTree[sign] ??= {
			key: sign,
			nodes: {},
			paths: {}
		};

		for (const nodeKey of nameKey) {
			currentNode = currentNode.nodes[nodeKey] ??= {
				key: nodeKey,
				parent: currentNode,
				nodes: {},
				paths: {}
			};
		}

		return currentNode;
	}

	public buildLookup(): MentionLinkLookup {
		return new MentionLinkLookup(this.linkSignTree);
	}
}
