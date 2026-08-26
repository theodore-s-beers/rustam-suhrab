<script lang="ts">
	import { onMount } from "svelte";
	import type { ReturnLine } from "$lib/types";
	import snapshotLines from "$lib/snapshot.json";
	import { SvelteURLSearchParams } from "svelte/reactivity";

	let lines: ReturnLine[] = $state(snapshotLines as ReturnLine[]);

	let selectedLine: ReturnLine | null = $state(null);
	let detailsTrigger: HTMLButtonElement | null = null;

	function toggleLineDetails(event: Event, line: ReturnLine) {
		if (selectedLine === line) {
			selectedLine = null;
			detailsTrigger = null;
			return;
		}

		detailsTrigger = event.currentTarget as HTMLButtonElement;
		selectedLine = line;
	}

	function closeLineDetails() {
		selectedLine = null;
		detailsTrigger?.focus();
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
	on:keydown={(e) => {
		if (e.key === "Escape" && selectedLine) closeLineDetails();
	}}
/>

{#snippet detailsButton(line: ReturnLine)}
	<button
		type="button"
		onclick={(event) => toggleLineDetails(event, line)}
		aria-label={selectedLine === line ? "Hide line details" : "Show line details"}
		aria-expanded={selectedLine === line}
		aria-controls="line-details"
		title={selectedLine === line ? "Hide line details" : "Show line details"}
		class="ms-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center self-center rounded-full text-gray-400 transition-[color,background-color,box-shadow] hover:bg-gray-200 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 aria-expanded:bg-blue-100 aria-expanded:text-blue-700 aria-expanded:shadow-[0_0_5px_1px_rgba(147,197,253,0.5)] aria-expanded:hover:bg-blue-100 aria-expanded:hover:text-blue-700"
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
		class="fixed inset-x-0 bottom-0 z-10 border-t border-gray-300 bg-gray-50/95 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] backdrop-blur-sm"
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

<div dir="rtl" lang="fa" class="mb-10 flex justify-center">
	<div class="mr-6 text-4xl">{lines[0].headingText}</div>
</div>

<div dir="rtl" lang="fa" class="flex flex-col place-items-center gap-4 text-lg">
	{#each lines as line, i (`${line.volumeNumber}-${line.pageNumber}-${line.numberWithinPage}`)}
		{#if line.isHeading && i > 0}
			<div class="my-6 mr-6 text-3xl">{line.headingText}</div>
		{:else if i > 0}
			<div class="flex gap-2">
				<div class="w-12">{line.numberListed?.toLocaleString("fa", { useGrouping: false })}</div>
				<div class="ml-12 w-64 font-medium [text-align-last:justify]">
					{line.hemistichOne}
				</div>
				<div class="w-64 font-medium [text-align-last:justify]">
					{line.hemistichTwo}
				</div>
				{@render detailsButton(line)}
			</div>
		{/if}
	{/each}
</div>
