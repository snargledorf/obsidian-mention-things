import { PathToLinkDetail, SignToPathToLinkDetails } from "src/types";
import { LinkSignTree } from "./types";

export class MentionLinkLookup {	
	constructor(linkSignTree: LinkSignTree) {
		this.linkSignTree = linkSignTree;
	}

	public getMentionNamesBySign(sign: string): string[] {
		return this.mentionSignToNames[sign] || [];
	}

	public getMentionSignToLinksByName(name: string): SignToPathToLinkDetails {
		return this.mentionNamesToLinks[name] || {};
	}

	public getMentionLinksBySignAndName(sign: string, name: string): PathToLinkDetail {
		if (!this.mentionNamesToLinks[name] || !this.mentionNamesToLinks[name][sign]) {
			return {};
		}

		return this.mentionNamesToLinks[name][sign];
	}

	public getMentionLinsBySign(sign: string): PathToLinkDetail[] {
		const names = this.mentionSignToNames[sign];
		if (!names) {
			return [];
		}

		const signLinks: PathToLinkDetail[] = [];

		for (const name in names) {
			const signToLinksForName = this.mentionNamesToLinks[name];
			if (!signToLinksForName) {
				continue;
			}

			const signLinksForName = signToLinksForName[sign];
			if (signToLinksForName) {
				signLinks.push(signLinksForName);
			}
		}

		return signLinks;
	}
}
