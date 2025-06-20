import { MentionLinkLookup } from "./mention-link-lookup";
import { LinkTreeNode, PathNameKeys } from "./link-tree-types";
import { parseLinkPartsFromAlias, parseLinkPartsFromPath } from "../link-utils";
import { Link, LinkTypes } from "src/types";
import { formatNameKey, LinkTree } from "./link-tree";

export class MentionLinkMap {
	private linkTree: LinkTree = new LinkTree();
	private pathsWithLinkNodes: PathNameKeys = {};

	public pathHasLinks(path: string): boolean {
		return Object.values(this.pathsWithLinkNodes[path]).flat().length !== 0;
	}

	public addFilenameLink(path: string): boolean {
		const linkParts = parseLinkPartsFromPath(path);
		if (!linkParts) {
			return false;
		}

		const { sign, name } = linkParts;

		this.addLink(name, sign, path, LinkTypes.filename);
		return true;
	}

	public removeFilenameLink(path: string): boolean {
		const linkParts = parseLinkPartsFromPath(path);
		if (!linkParts) {
			return false;
		}

		const { sign, name } = linkParts;

		this.removeLink(sign, name, path, LinkTypes.filename);
		return true;
	}

	public addAliasLink(alias: string, path: string): boolean {
		const aliasLinkParts = parseLinkPartsFromAlias(alias);
		if (!aliasLinkParts) {
			return false;
		}

		const { sign, name } = aliasLinkParts;

		const fileName = parseLinkPartsFromPath(path)?.fileName;
		if (!fileName) {
			return false;
		}

		this.addLink(name, sign, path, LinkTypes.alias);		
		return true;
	}

	public removeAliasLink(alias: string, path: string): boolean {
		const aliasLinkParts = parseLinkPartsFromAlias(alias);
		if (!aliasLinkParts) {
			return false;
		}

		const { sign, name } = aliasLinkParts;

		this.removeLink(sign, name, path, LinkTypes.alias);
		return true;
	}

	public removeLinks(path: string, type?: LinkTypes): boolean {
		const pathSignsWithLinkNodes = this.pathsWithLinkNodes[path];
		if (!pathSignsWithLinkNodes) {
			return false;
		}

		let linksRemoved = false;

		for (const sign in pathSignsWithLinkNodes) {
			const signNameKeys = pathSignsWithLinkNodes[sign];
			for (const nameKey of signNameKeys) {
				if (type) {
					linksRemoved = this.removeLink(sign, nameKey, path, type) || linksRemoved;
				} else {
					linksRemoved = this.removeLink(sign, nameKey, path, LinkTypes.all) || linksRemoved;
				}
			}
		}

		return true;
	}

	public updatePath(originalPath: string, newPath: string): boolean {
		const pathSignsWithLinkNodes = this.pathsWithLinkNodes[originalPath];
		if (!pathSignsWithLinkNodes) {
			return this.addFilenameLink(newPath);
		}

		const copyOfSignsWithLinkNodes = Object.entries(pathSignsWithLinkNodes);

		let updated = false;

		for (const signAndNames of copyOfSignsWithLinkNodes) {
			const sign = signAndNames[0];
			const copyOfNames = [...signAndNames[1]];
			for (const name of copyOfNames) {
				const node = this.linkTree.getLinkNode(sign, name);

				const pathDetails = node.paths[originalPath];

				if (!pathDetails) {
					continue;
				}

				const copyOfPathLinks = [...pathDetails.links];
				for (const link of copyOfPathLinks) {
					this.removeLink(sign, link.name, originalPath, link.type);
					
					const fileName = parseLinkPartsFromPath(newPath)?.fileName;
					if (!fileName) {
						continue;
					}

					updated = this.addLink(link.name, sign, newPath, link.type) || updated;
				}
			}
		}

		return updated;
	}

	public getLinks(sign: string, name: string): Link[] {
		const node = this.linkTree.getLinkNode(sign, name);
		return this.getLinksRecursively(sign, node);
	}

	private getLinksRecursively(sign: string, node: LinkTreeNode): Link[] {
		const links = Object.entries(node.paths).flatMap(([path, pathDetails]) => {
			return pathDetails.links.flatMap(link => {
				return {
					sign,
					name: link.name,
					type: link.type,
					fileName: pathDetails.fileName,
					path
				}
			});
		});

		for (const childNode of Object.values(node.nodes)) {
			links.push(...this.getLinksRecursively(sign, childNode));
		}

		return links;
	}

	private removeLink(sign: string, name: string, path: string, types: LinkTypes): boolean {
		const node = this.linkTree.getLinkNode(sign, name);

		const pathLinks = node.paths[path]?.links;
		if (!pathLinks) {
			return false;
		}

		const linkIndex = pathLinks.findIndex(link => link.name === name && link.type === types);
		if (linkIndex === -1) {
			return false;
		}

		pathLinks.splice(linkIndex, 1);

		// Prune any references to this path/name key if there are no more links under it
		if (pathLinks.length === 0) {
			delete node.paths[path];
			this.pruneEmptyNodes(node);
			
			this.pathsWithLinkNodes[path][sign].remove(formatNameKey(name));

			if (this.pathsWithLinkNodes[path][sign].length === 0) {
				delete this.pathsWithLinkNodes[path][sign];

				if (Object.keys(this.pathsWithLinkNodes[path]).length === 0) {
					delete this.pathsWithLinkNodes[path];
				}
			}
		}

		return true;
	}

	private pruneEmptyNodes(node: LinkTreeNode) {
		let currentNode: LinkTreeNode | undefined = node;
		do {
			if (Object.keys(currentNode.paths).length === 0 && Object.keys(currentNode.nodes).length === 0) {
				delete currentNode.parent?.nodes[currentNode.key];
			} else {
				break;
			}

			currentNode = currentNode.parent;
		} while (currentNode);
	}

	private addLink(name: string, sign: string, path: string, type: LinkTypes): boolean {
		const node = this.linkTree.getLinkNode(sign, name);

		const fileName = parseLinkPartsFromPath(path)?.fileName;
		if (!fileName) {
			return false;
		}

		const pathDetails = node.paths[path] ??= {
			fileName,
			links: []
		};

		if (pathDetails.links.find(link => {
			return link.type === type && link.name === name;
		})) {
			return false;
		}

		pathDetails.links.push({
			name,
			type
		});

		const pathSigns = this.pathsWithLinkNodes[path] ??= {};
		const pathSignNameKeys = pathSigns[sign] ??= [];

		const nameKey = formatNameKey(name);
		if (!pathSignNameKeys.contains(nameKey)) {
			pathSignNameKeys.push(nameKey);
		}

		return true;
	}

	public getLookup(): MentionLinkLookup {
		return new MentionLinkLookup(this);
	}
}
