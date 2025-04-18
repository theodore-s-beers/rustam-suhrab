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
