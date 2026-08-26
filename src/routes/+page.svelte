<script lang="ts">
	import { onMount } from "svelte";
	import type { ReturnLine } from "$lib/types";
	import snapshotLines from "$lib/snapshot.json";
	import { SvelteURLSearchParams } from "svelte/reactivity";

	let lines: ReturnLine[] = $state(snapshotLines as ReturnLine[]);

	let selectedLine: ReturnLine | null = $state(null);
	let tooltipPos = $state({ top: 0, left: 0 });

	function handleClick(event: Event, line: ReturnLine) {
		const target = event.currentTarget as HTMLButtonElement;
		const rect = target.getBoundingClientRect();
		const tooltipHalfWidth = 128;
		const tooltipMargin = 8;
		const desiredLeft = rect.left + window.scrollX + rect.width / 2;
		const minLeft = window.scrollX + tooltipHalfWidth + tooltipMargin;
		const maxLeft = window.scrollX + window.innerWidth - tooltipHalfWidth - tooltipMargin;

		tooltipPos = {
			top: rect.bottom + window.scrollY + 6,
			left: Math.min(Math.max(desiredLeft, minLeft), Math.max(minLeft, maxLeft)),
		};

		selectedLine = selectedLine === line ? null : line;
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
		if (e.key === "Escape") {
			selectedLine = null;
			const focusedEl = document.activeElement;
			if (focusedEl instanceof HTMLElement) focusedEl.blur();
		}
	}}
/>

{#snippet detailsButton(line: ReturnLine)}
	<button
		type="button"
		onclick={(event) => handleClick(event, line)}
		aria-label="Show line details"
		aria-expanded={selectedLine === line}
		aria-controls="line-details"
		title="Show line details"
		class="flex size-5 shrink-0 items-center justify-center self-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 aria-expanded:bg-gray-200 aria-expanded:text-gray-700"
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
	<div
		id="line-details"
		role="tooltip"
		style="top: {tooltipPos.top}px; left: {tooltipPos.left}px"
		class="absolute z-10 w-64 -translate-x-1/2 rounded-md border border-gray-600 bg-gray-200 px-2.5 py-2 font-sans text-sm"
	>
		<div class="mb-1">
			Vol. <code class="text-pink-800">{selectedLine.volumeNumber}</code>, pg.
			<code class="text-pink-800">{selectedLine.pageNumber}</code>, line
			<code class="text-pink-800">{selectedLine.numberWithinPage}</code> (relative)
		</div>

		<div class="flex">
			<a
				href="https://read.akvan.dev/km/{selectedLine.volumeNumber}/{selectedLine.pageNumber}"
				target="_blank"
				rel="noreferrer"
				class="text-blue-800 hover:underline"
			>
				View page image
			</a>

			<span class="ml-auto italic">Esc to clear</span>
		</div>
	</div>
{/if}

<div dir="rtl" lang="fa" class="mb-10 flex justify-center">
	<div class="text-4xl">{lines[0].headingText}</div>
</div>

<div dir="rtl" lang="fa" class="flex flex-col place-items-center gap-4 text-lg">
	{#each lines as line, i (`${line.volumeNumber}-${line.pageNumber}-${line.numberWithinPage}`)}
		{#if line.isHeading && i > 0}
			<div class="mt-4 mb-6 text-3xl">{line.headingText}</div>
		{:else if i > 0}
			<div class="flex gap-2">
				<div class="w-12">{line.numberListed?.toLocaleString("fa", { useGrouping: false })}</div>
				<div class="ml-14 w-64 font-medium [text-align-last:justify]">
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
