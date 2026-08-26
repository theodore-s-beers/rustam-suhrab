export interface ReturnLine {
	volumeNumber: number;
	pageNumber: number;
	numberWithinPage: number;
	editor: string;
	isHeading: boolean;
	hasNotes: boolean;
	numberListed?: number;
	headingText?: string;
	hemistichOne?: string;
	hemistichTwo?: string;
}

export interface DictionaryEntry {
	id: number;
	page: number;
	lang: string;
	headword_full: string;
	headword_persian: string;
	abjad: number;
	headword_latin: string;
	definitions: string;
}
