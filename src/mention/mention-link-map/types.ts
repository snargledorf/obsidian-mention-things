import { LinkType } from "src/types";

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
				type: LinkType;
				name: string;
			}[];
		};
	};
}

export interface LinkSignTree {
	[sign: string]: LinkTreeNode;
}

export interface PathNameKeys {
	[path: string]: {
		[sign: string]: string[]
	};
}
