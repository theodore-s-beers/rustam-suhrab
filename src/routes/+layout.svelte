<script lang="ts">
	import "../app.css";
	let { children } = $props();
</script>

<div class="font-persian mx-auto bg-gray-50 p-4 pb-20">
	{@render children()}
</div>
