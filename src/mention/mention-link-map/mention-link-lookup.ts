import { Link } from "src/types";
import { MentionLinkMap } from "./mention-link-map";

export class MentionLinkLookup {
	private map: MentionLinkMap;

	constructor(map: MentionLinkMap) {
		this.map = map;
	}
	
	public getLinks(sign: string, name: string): Link[] {
		return this.map.getLinks(sign, name);
	}
}
