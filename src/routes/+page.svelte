<script lang="ts">
	import { onMount } from "svelte";
	import type { ReturnLine } from "$lib/types";
	import { sampleLines } from "$lib/sample";

	let lines: ReturnLine[] = $state(sampleLines);

	let selectedLine: ReturnLine | null = $state(null);
	let tooltipPos = $state({ top: 0, left: 0 });

	function handleClick(event: Event, line: ReturnLine) {
		const target = event.currentTarget as HTMLDivElement;
		const rect = target.getBoundingClientRect();

		tooltipPos = {
			top: rect.bottom + window.scrollY + 6,
			left: window.innerWidth / 2 - 24,
		};

		selectedLine = selectedLine === line ? null : line;
	}

	onMount(async () => {
		const params = new URLSearchParams();
		params.append("start-vol", "2");
		params.append("start-pg", "117");
		params.append("start-line", "1");
		params.append("end-vol", "2");
		params.append("end-pg", "199");
		params.append("end-line", "5");
		params.append("editor", "tsb");

		try {
			const res = await fetch(
				`https://shahnama-transcription.pages.dev/api/transcribed-lines?${params.toString()}`,
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

{#if selectedLine}
	<div
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

<div class="flex justify-center">
	<div
		role="button"
		tabindex="0"
		onclick={(e) => handleClick(e, lines[0])}
		onkeydown={(e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleClick(e, lines[0]);
			}
		}}
		class="mr-10 mb-8 text-4xl"
	>
		{lines[0].headingText}
	</div>
</div>

<div dir="rtl" lang="fa" class="flex flex-col place-items-center gap-4 text-lg">
	{#each lines as line, i (`${line.volumeNumber}-${line.pageNumber}-${line.numberWithinPage}`)}
		{#if line.isHeading && i > 0}
			<div
				role="button"
				tabindex="0"
				onclick={(e) => handleClick(e, line)}
				onkeydown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleClick(e, line);
					}
				}}
				class="mt-4 mr-10 mb-6 text-3xl"
			>
				{line.headingText}
			</div>
		{:else if i > 0}
			<div class="flex gap-2">
				<div class="w-12">{line.numberListed?.toLocaleString("fa", { useGrouping: false })}</div>
				<div
					role="button"
					tabindex="0"
					onclick={(e) => handleClick(e, line)}
					onkeydown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							handleClick(e, line);
						}
					}}
					class="ml-14 w-64 font-medium [text-align-last:justify]"
				>
					{line.hemistichOne}
				</div>
				<div
					role="button"
					tabindex="0"
					onclick={(e) => handleClick(e, line)}
					onkeydown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							handleClick(e, line);
						}
					}}
					class="w-64 font-medium [text-align-last:justify]"
				>
					{line.hemistichTwo}
				</div>
				<div class="w-2 text-left text-xs text-green-700">
					{line.hasNotes ? "پ" : ""}
				</div>
			</div>
		{/if}
	{/each}
</div>
