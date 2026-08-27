<script lang="ts">
	import "../app.css";
	let { children } = $props();
</script>

<div class="mx-auto p-4 pb-28 font-persian md:pb-20">
	{@render children()}
</div>
