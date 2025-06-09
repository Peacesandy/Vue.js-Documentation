// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Vue.js',
			logo: {
				src: "./public/vue-svgrepo-com.svg", // path relative to the public folder
				alt: "Your Project Logo", // alt text for accessibility
			},
			favicon: '/vue-svgrepo-com.svg',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'Introduction', slug: 'guides/example' },
						{ label: 'Quickstart', slug: 'guides/quickstart' },
					],
				},
				{
					label: 'Essentials',
					autogenerate: { directory: 'reference' },
				},
				{
					label: 'Components In-Depth',
					autogenerate: { directory: 'components' },
				},
				{
					label: 'Reusability',
					autogenerate: { directory: 'Reusability' },
				},
				{
					label: 'Builtin Components',
					autogenerate: { directory: 'BuiltinComponents' },
				},
				{
					label: 'Scaling Up',
					autogenerate: { directory: 'ScalingUp' },
				},
				{
					label: 'Best Practices',
					autogenerate: { directory: 'BestPractices' },
				},
			],
		}),
	],
});
