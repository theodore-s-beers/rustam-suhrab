<script lang="ts">
	import "../app.css";
	let { children } = $props();
</script>

<div class="mx-auto p-4 pb-20 font-persian">
	{@render children()}
</div>
