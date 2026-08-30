import type { Action } from "svelte/action";
import { justifyWithKashida } from "bekesh";

const DESKTOP_QUERY = "(min-width: 48rem)";

interface HemistichState {
	node: HTMLElement;
	text: string;
	visible: boolean;
	version: number;
}

const states = new Set<HemistichState>();
const statesByNode = new WeakMap<Element, HemistichState>();
let desktopMedia: MediaQueryList | undefined;
let observer: IntersectionObserver | undefined;
let mediaListenerInitialized = false;

function reset(state: HemistichState) {
	state.version += 1;
	state.node.textContent = state.text;
	state.node.style.removeProperty("text-align-last");
	state.node.style.removeProperty("word-spacing");
}

function canvasFont(style: CSSStyleDeclaration) {
	return `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

async function justify(state: HemistichState) {
	reset(state);
	if (!desktopMedia?.matches || !state.visible || !state.text) return;

	const version = state.version;
	const style = getComputedStyle(state.node);
	let result;
	try {
		result = await justifyWithKashida({
			text: state.text,
			targetWidth: state.node.getBoundingClientRect().width,
			font: canvasFont(style),
		});
	} catch (error) {
		console.warn("Could not justify Persian hemistich", error);
		return;
	}

	if (version !== state.version || !desktopMedia?.matches || !state.visible) return;
	state.node.textContent = result.displayText;
	state.node.style.textAlignLast = "auto";
	state.node.style.wordSpacing = `${result.wordSpacing}px`;
}

function handleMediaChange() {
	for (const state of states) {
		if (desktopMedia?.matches && state.visible) void justify(state);
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

export const justifyHemistich: Action<HTMLElement, string> = (node, text) => {
	initializeBrowserState();
	const state: HemistichState = {
		node,
		text,
		visible: observer === undefined,
		version: 0,
	};

	states.add(state);
	statesByNode.set(node, state);
	observer?.observe(node);
	if (state.visible) void justify(state);

	return {
		update(nextText) {
			state.text = nextText;
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
