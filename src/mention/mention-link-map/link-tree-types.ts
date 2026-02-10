import { LinkTypes } from "src/types";

export interface LinkTreeNode {
	key: string;
	parent?: LinkTreeNode;
	nodes: {
		[nodeKey: string]: LinkTreeNode;
	};
	paths: {
		[path: string]: {
			fileName: string;
			links: {
				type: LinkTypes;
				name: string;
			}[];
		};
	};
}

export class LinkTreeRoot {
	[sign: string]: LinkTreeNode;
}

export interface PathNameKeys {
	[path: string]: {
		[sign: string]: string[]
	};
}
