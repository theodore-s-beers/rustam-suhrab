import { justifyWithKashida, measureDomText } from "bekesh";
import type { Action } from "svelte/action";

const DESKTOP_QUERY = "(min-width: 48rem)";

export interface VerseTexts {
	first: string;
	second: string;
}

interface VerseState {
	node: HTMLElement;
	firstNode: HTMLElement;
	secondNode: HTMLElement;
	texts: VerseTexts;
	visible: boolean;
	version: number;
}

const states = new Set<VerseState>();
const statesByNode = new WeakMap<Element, VerseState>();
let desktopMedia: MediaQueryList | undefined;
let observer: IntersectionObserver | undefined;
let mediaListenerInitialized = false;

function resetHemistich(node: HTMLElement, text: string) {
	node.textContent = text;
	node.style.removeProperty("text-align-last");
	node.style.removeProperty("word-spacing");
}

function reset(state: VerseState) {
	state.version += 1;
	resetHemistich(state.firstNode, state.texts.first);
	resetHemistich(state.secondNode, state.texts.second);
}

function cssFont(style: CSSStyleDeclaration) {
	return `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

function applyResult(node: HTMLElement, displayText: string, wordSpacing: number) {
	node.textContent = displayText;
	node.style.textAlignLast = "auto";
	node.style.wordSpacing = `${wordSpacing}px`;
}

async function justify(state: VerseState) {
	reset(state);
	if (!state.visible || (!state.texts.first && !state.texts.second)) return;

	const version = state.version;
	const desktop = desktopMedia?.matches ?? false;
	const firstFont = cssFont(getComputedStyle(state.firstNode));
	const secondFont = cssFont(getComputedStyle(state.secondNode));
	try {
		await Promise.all([
			document.fonts.load(firstFont, state.texts.first),
			document.fonts.load(secondFont, state.texts.second),
		]);
	} catch (error) {
		console.warn("Could not load the Persian verse font", error);
		return;
	}
	if (version !== state.version || desktop !== desktopMedia?.matches || !state.visible) return;
	const mobileTarget = desktop
		? 0
		: Math.max(
				measureDomText(state.texts.first, firstFont),
				measureDomText(state.texts.second, secondFont),
			);

	try {
		const firstResult = await justifyWithKashida({
			text: state.texts.first,
			targetWidth: desktop ? state.firstNode.getBoundingClientRect().width : mobileTarget,
			font: firstFont,
		});
		const secondResult = await justifyWithKashida({
			text: state.texts.second,
			targetWidth: desktop ? state.secondNode.getBoundingClientRect().width : mobileTarget,
			font: secondFont,
		});

		if (version !== state.version || desktop !== desktopMedia?.matches || !state.visible) return;
		applyResult(state.firstNode, firstResult.displayText, firstResult.wordSpacing);
		applyResult(state.secondNode, secondResult.displayText, secondResult.wordSpacing);
	} catch (error) {
		console.warn("Could not justify Persian verse", error);
	}
}

function handleMediaChange() {
	for (const state of states) {
		if (state.visible) void justify(state);
		else reset(state);
	}
}

function initializeBrowserState() {
	desktopMedia ??= window.matchMedia(DESKTOP_QUERY);
	if (!mediaListenerInitialized) {
		desktopMedia.addEventListener("change", handleMediaChange);
		mediaListenerInitialized = true;
	}

	if ("IntersectionObserver" in window) {
		observer ??= new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const state = statesByNode.get(entry.target);
					if (!state) continue;
					state.visible = entry.isIntersecting;
					if (state.visible) void justify(state);
				}
			},
			{ rootMargin: "400px 0px" },
		);
	}
}

export const justifyVerse: Action<HTMLElement, VerseTexts> = (node, texts) => {
	initializeBrowserState();
	const firstNode = node.querySelector<HTMLElement>('[data-hemistich="first"]');
	const secondNode = node.querySelector<HTMLElement>('[data-hemistich="second"]');
	if (!firstNode || !secondNode) throw new Error("justifyVerse requires two hemistich elements");

	const state: VerseState = {
		node,
		firstNode,
		secondNode,
		texts,
		visible: observer === undefined,
		version: 0,
	};

	states.add(state);
	statesByNode.set(node, state);
	observer?.observe(node);
	if (state.visible) void justify(state);

	return {
		update(nextTexts) {
			state.texts = nextTexts;
			if (state.visible) void justify(state);
			else reset(state);
		},
		destroy() {
			state.version += 1;
			observer?.unobserve(node);
			states.delete(state);
			statesByNode.delete(node);
		},
	};
};
