<script lang="ts">
	import "../app.css";
	let { children } = $props();
</script>

<div class="font-persian mx-auto p-4 pb-20">
	{@render children()}
</div>
