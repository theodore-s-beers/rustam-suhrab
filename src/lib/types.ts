export interface ReturnLine {
	volumeNumber: number;
	pageNumber: number;
	numberWithinPage: number;
	editor: string;
	heading: boolean;
	headingText?: string;
	numberListed?: number;
	hemistichOne: Hemistich;
	hemistichTwo: Hemistich;
}

interface Hemistich {
	text?: string;
	hasNotes?: boolean;
}
