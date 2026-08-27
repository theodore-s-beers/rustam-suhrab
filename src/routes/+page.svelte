<script lang="ts">
	import { onMount } from "svelte";
	import type { DictionaryEntry, ReturnLine } from "$lib/types";
	import snapshotLines from "$lib/snapshot.json";
	import { SvelteMap, SvelteURLSearchParams } from "svelte/reactivity";

	const dictionaryApiUrl = "https://steingass.theobeers.com/api/entries";
	type DictionaryStatus = "idle" | "loading" | "success" | "not-found" | "error";

	let lines: ReturnLine[] = $state(snapshotLines as ReturnLine[]);

	function getLineKey(line: ReturnLine) {
		return `${line.volumeNumber}:${line.pageNumber}:${line.numberWithinPage}:${line.editor}`;
	}

	let selectedLineKey: string | null = $state(null);
	let selectedLine = $derived(
		selectedLineKey ? (lines.find((line) => getLineKey(line) === selectedLineKey) ?? null) : null,
	);
	let detailsTrigger: HTMLButtonElement | null = null;

	let dictionaryWord = $state("");
	let dictionaryEntries: DictionaryEntry[] = $state([]);
	let dictionaryStatus: DictionaryStatus = $state("idle");
	let dictionaryPosition = $state({ top: 0, left: 0, above: false, maxHeight: 320 });
	let dictionaryRequest: AbortController | null = null;
	const dictionaryCache = new SvelteMap<string, DictionaryEntry[]>();

	function toggleLineDetails(event: Event, line: ReturnLine) {
		const lineKey = getLineKey(line);

		if (selectedLineKey === lineKey) {
			selectedLineKey = null;
			detailsTrigger = null;
			return;
		}

		detailsTrigger = event.currentTarget as HTMLButtonElement;
		selectedLineKey = lineKey;
	}

	function closeLineDetails() {
		selectedLineKey = null;
		detailsTrigger?.focus({ preventScroll: true });
		detailsTrigger = null;
	}

	function getStoryLineNumber(line: ReturnLine) {
		let storyLineNumber = 0;

		for (const candidate of lines) {
			if (candidate.isHeading) continue;
			storyLineNumber += 1;

			if (
				candidate.volumeNumber === line.volumeNumber &&
				candidate.pageNumber === line.pageNumber &&
				candidate.numberWithinPage === line.numberWithinPage &&
				candidate.editor === line.editor
			) {
				return storyLineNumber;
			}
		}

		return null;
	}

	function normalizeDictionaryWord(input: string) {
		return input
			.normalize("NFC")
			.replaceAll("ك", "ک")
			.replace(/[ىي]/gu, "ی")
			.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
			.replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, "");
	}

	function plainDictionaryText(input: string) {
		return input
			.replaceAll("\\[", "[")
			.replaceAll("\\]", "]")
			.replace(/\*([^*]+)\*/gu, "$1");
	}

	function getDictionaryQueryParams(word: string, plainText = false) {
		const params = new SvelteURLSearchParams({
			field: "headword_persian",
			"match-type": "exact",
			term: word,
		});

		if (plainText) params.set("plain-text", "true");
		return params;
	}

	function closeDictionaryPopover() {
		dictionaryRequest?.abort();
		dictionaryRequest = null;
		dictionaryWord = "";
		dictionaryEntries = [];
		dictionaryStatus = "idle";
	}

	async function handleDictionaryLookup(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof Element) || !target.closest("[data-dictionary-text]")) return;

		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

		const word = normalizeDictionaryWord(selection.toString().trim());
		if (!word || word.length > 64 || /\s/u.test(word) || !/\p{Script=Arabic}/u.test(word)) return;

		const rect = selection.getRangeAt(0).getBoundingClientRect();
		const popoverWidth = Math.min(448, window.innerWidth - 16);
		const horizontalMargin = 8;
		const minLeft = window.scrollX + popoverWidth / 2 + horizontalMargin;
		const maxLeft = window.scrollX + window.innerWidth - popoverWidth / 2 - horizontalMargin;
		const spaceBelow = window.innerHeight - rect.bottom;
		const above = spaceBelow < 280 && rect.top > spaceBelow;
		const availableHeight = above ? rect.top - 16 : spaceBelow - 16;

		dictionaryPosition = {
			top: window.scrollY + (above ? rect.top - 8 : rect.bottom + 8),
			left: Math.min(
				Math.max(window.scrollX + rect.left + rect.width / 2, minLeft),
				Math.max(minLeft, maxLeft),
			),
			above,
			maxHeight: Math.max(120, Math.min(320, availableHeight)),
		};

		dictionaryRequest?.abort();
		dictionaryRequest = null;
		dictionaryWord = word;
		dictionaryEntries = [];

		const cachedEntries = dictionaryCache.get(word);
		if (cachedEntries) {
			dictionaryEntries = cachedEntries;
			dictionaryStatus = cachedEntries.length > 0 ? "success" : "not-found";
			return;
		}

		dictionaryStatus = "loading";
		const request = new AbortController();
		dictionaryRequest = request;

		try {
			const response = await fetch(`${dictionaryApiUrl}?${getDictionaryQueryParams(word)}`, {
				signal: request.signal,
			});

			if (request !== dictionaryRequest) return;

			if (response.status === 404) {
				dictionaryCache.set(word, []);
				dictionaryStatus = "not-found";
				return;
			}

			if (!response.ok) throw new Error(`${response.status}; ${await response.text()}`);

			const entries: DictionaryEntry[] = await response.json();
			if (request !== dictionaryRequest) return;

			dictionaryCache.set(word, entries);
			dictionaryEntries = entries;
			dictionaryStatus = entries.length > 0 ? "success" : "not-found";
		} catch (error) {
			if (request !== dictionaryRequest) return;
			if (error instanceof DOMException && error.name === "AbortError") return;
			console.error("Error fetching dictionary entries:", error);
			dictionaryStatus = "error";
		} finally {
			if (request === dictionaryRequest) dictionaryRequest = null;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== "Escape") return;

		if (dictionaryStatus !== "idle") closeDictionaryPopover();
		if (selectedLine) closeLineDetails();
	}

	onMount(async () => {
		const params = new SvelteURLSearchParams();
		params.append("start-vol", "2");
		params.append("start-pg", "117");
		params.append("start-line", "1");
		params.append("end-vol", "2");
		params.append("end-pg", "199");
		params.append("end-line", "5");
		params.append("editor", "tsb");

		try {
			const res = await fetch(
				`https://transcribe.akvan.dev/api/transcribed-lines?${params.toString()}`,
			);
			if (!res.ok) throw new Error(`${res.status}; ${await res.text()}`);
			lines = await res.json();
		} catch (err) {
			if (err instanceof Error) console.error("Error fetching data:", err.message);
			else console.error("Unexpected error:", err);
		}
	});
</script>

<svelte:head>
	<meta
		name="description"
		content="A digital version of the story of Rustam and Suhrab, following the edition of Khaleghi-Motlagh"
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://www.theobeers.com/rustam-suhrab/" />
	<meta property="og:image" content="https://www.theobeers.com/rustam-suhrab/og.jpg" />
	<meta property="og:title" content="داستان رستم و سهراب" />
	<meta name="twitter:title" content="داستان رستم و سهراب" />
	<meta name="twitter:card" content="summary_large_image" />

	<title>{lines[0].headingText}</title>
</svelte:head>

<svelte:window
	onkeydown={handleKeydown}
	ondblclick={handleDictionaryLookup}
	onresize={closeDictionaryPopover}
/>

{#snippet detailsButton(line: ReturnLine)}
	{@const isSelected = selectedLineKey === getLineKey(line)}
	<button
		type="button"
		onclick={(event) => toggleLineDetails(event, line)}
		aria-label={isSelected ? "Hide line details" : "Show line details"}
		aria-expanded={isSelected}
		aria-controls="line-details"
		title={isSelected ? "Hide line details" : "Show line details"}
		class="mt-2 flex size-8 shrink-0 cursor-pointer items-center justify-center self-center rounded-full text-gray-400 transition-[color,background-color,box-shadow] hover:bg-gray-200 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 aria-expanded:bg-blue-100 aria-expanded:text-blue-700 aria-expanded:shadow-[0_0_5px_1px_rgba(147,197,253,0.5)] aria-expanded:hover:bg-blue-100 aria-expanded:hover:text-blue-700 md:ms-0.5 md:mt-0 md:size-5"
	>
		<svg
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			aria-hidden="true"
			class="size-4"
		>
			<circle cx="10" cy="10" r="7.5" />
			<path d="M10 9v5M10 6h.01" stroke-linecap="round" />
		</svg>
	</button>
{/snippet}

{#if selectedLine}
	<aside
		id="line-details"
		aria-label="Line details"
		aria-live="polite"
		class="fixed inset-x-0 bottom-0 z-30 border-t border-gray-300 bg-gray-50/95 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] backdrop-blur-sm"
	>
		<div class="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 font-sans text-sm">
			<div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
				<span
					>Line <code class="text-pink-800">{getStoryLineNumber(selectedLine)}</code> (in-story)</span
				>

				<span>
					<span aria-hidden="true" class="me-2 font-bold text-gray-500">•</span>
					Vol.
					<code class="text-pink-800">{selectedLine.volumeNumber}</code>, pg.
					<code class="text-pink-800">{selectedLine.pageNumber}</code>, line
					<code class="text-pink-800">{selectedLine.numberWithinPage}</code>
				</span>

				<span>
					<span aria-hidden="true" class="me-2 font-bold text-gray-500">•</span>
					<a
						href="https://read.akvan.dev/km/{selectedLine.volumeNumber}/{selectedLine.pageNumber}"
						target="_blank"
						rel="noreferrer"
						class="text-blue-800 hover:underline"
					>
						View page image
					</a>
				</span>
			</div>

			<button
				type="button"
				onclick={closeLineDetails}
				aria-label="Close line details"
				title="Close line details"
				class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
			>
				<svg
					viewBox="0 0 20 20"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
					class="size-5"
				>
					<path d="m6 6 8 8M14 6l-8 8" stroke-linecap="round" />
				</svg>
			</button>
		</div>
	</aside>
{/if}

{#if dictionaryStatus !== "idle"}
	<div
		role="dialog"
		aria-label="Steingass dictionary lookup for {dictionaryWord}"
		aria-busy={dictionaryStatus === "loading"}
		style:top={`${dictionaryPosition.top}px`}
		style:left={`${dictionaryPosition.left}px`}
		style:max-height={`${dictionaryPosition.maxHeight}px`}
		class="absolute z-20 w-[calc(100vw-1rem)] max-w-md -translate-x-1/2 overflow-y-auto rounded-md border border-gray-400 bg-gray-50 p-3 font-sans text-sm shadow-lg {dictionaryPosition.above
			? '-translate-y-full'
			: ''}"
	>
		<button
			type="button"
			onclick={closeDictionaryPopover}
			aria-label="Close dictionary lookup"
			title="Close dictionary lookup"
			class="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
		>
			<svg
				viewBox="0 0 20 20"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				aria-hidden="true"
				class="size-4"
			>
				<path d="m6 6 8 8M14 6l-8 8" stroke-linecap="round" />
			</svg>
		</button>

		<div class="pe-8" aria-live="polite">
			{#if dictionaryStatus === "loading"}
				<p class="text-gray-600">
					Looking for an exact match for
					<span dir="rtl" lang="fa" class="font-persian text-lg">{dictionaryWord}</span>…
				</p>
			{:else if dictionaryStatus === "not-found"}
				<p class="text-gray-600">
					No exact entry found for
					<span dir="rtl" lang="fa" class="font-persian text-lg">{dictionaryWord}</span>
				</p>
			{:else if dictionaryStatus === "error"}
				<p class="text-red-700">The dictionary lookup failed. Please try again.</p>
			{:else if dictionaryEntries[0]}
				{@const entry = dictionaryEntries[0]}
				<article>
					<div class="flex flex-wrap items-baseline gap-x-2">
						<span dir="rtl" lang="fa" class="font-persian text-lg">
							{entry.headword_persian}
						</span>
						<span class="italic">{plainDictionaryText(entry.headword_latin)}</span>
					</div>

					<p class="mt-1 line-clamp-3 text-gray-700">
						{plainDictionaryText(entry.definitions)}
					</p>

					<a
						href="https://steingass.theobeers.com/entry/{entry.id}"
						target="_blank"
						rel="noreferrer"
						class="mt-1 inline-block text-blue-800 hover:underline"
					>
						View full entry
					</a>
				</article>

				{#if dictionaryEntries.length > 1}
					<p class="mt-2 border-t border-gray-300 pt-2 text-gray-600">
						Multiple exact matches found;
						<a
							href="https://steingass.theobeers.com/api/entries?{getDictionaryQueryParams(
								dictionaryWord,
								true,
							)}"
							target="_blank"
							rel="noreferrer"
							class="text-blue-800 hover:underline"
						>
							see all</a
						>.
					</p>
				{/if}
			{/if}
		</div>
	</div>
{/if}

<div dir="rtl" lang="fa" class="mb-10 flex justify-center">
	<div class="text-4xl md:mr-6">{lines[0].headingText}</div>
</div>

<div dir="rtl" lang="fa" class="flex flex-col place-items-center gap-4 text-lg">
	{#each lines as line, i (getLineKey(line))}
		{#if line.isHeading && i > 0}
			<div class="my-6 text-3xl md:mr-6">{line.headingText}</div>
		{:else if i > 0}
			<div class="flex w-full max-w-xl flex-col md:w-auto md:max-w-none md:flex-row md:gap-2">
				{#if line.numberListed}
					<div
						class="mb-2 text-center text-gray-500 md:mb-0 md:w-12 md:text-start md:text-gray-950"
					>
						{line.numberListed.toLocaleString("fa", { useGrouping: false })}
					</div>
				{:else}
					<div class="hidden md:block md:w-12"></div>
				{/if}
				<div
					data-dictionary-text
					class="text-center font-medium md:ml-12 md:w-64 md:text-right md:[text-align-last:justify]"
				>
					{line.hemistichOne}
				</div>
				<div
					data-dictionary-text
					class="mt-1 text-center font-medium md:mt-0 md:w-64 md:text-right md:[text-align-last:justify]"
				>
					{line.hemistichTwo}
				</div>
				{@render detailsButton(line)}
				{#if lines[i + 1] && !lines[i + 1].isHeading}
					<hr aria-hidden="true" class="mt-4 w-full border-0 border-t border-gray-200 md:hidden" />
				{/if}
			</div>
		{/if}
	{/each}
</div>
