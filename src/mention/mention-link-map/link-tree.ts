import { LinkTreeRoot, LinkTreeNode } from "./link-tree-types";

export class LinkTree {
	private linkTreeRoot: LinkTreeRoot = {};

	public getLinkNode(sign: string, name: string): LinkTreeNode {
		const nameKey = formatNameKey(name);

		let currentNode = this.linkTreeRoot[sign] ??= {
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
}

export function formatNameKey(name: string) {
	return name.toLowerCase();
}
