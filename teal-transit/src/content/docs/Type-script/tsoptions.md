---
title: TypeScript with Options API
description: A reference page in my new Starlight docs site.
---

> This page assumes you've already read the overview on Using Vue with
> TypeScript.

:::tip
While Vue does support TypeScript usage with Options API, it is recommended to use Vue with TypeScript via Composition API as it offers simpler, more efficient and more robust type inference.
:::

---

## Typing Component Props​

Type inference for props in Options API requires wrapping the component with defineComponent(). With it, Vue is able to infer the types for the props based on the props option, taking additional options such as required: true and default into account:

```js
import { defineComponent } from "vue";

export default defineComponent({
	// type inference enabled
	props: {
		name: String,
		id: [Number, String],
		msg: { type: String, required: true },
		metadata: null,
	},
	mounted() {
		this.name; // type: string | undefined
		this.id; // type: number | string | undefined
		this.msg; // type: string
		this.metadata; // type: any
	},
});
```

However, the runtime props options only support using constructor functions as a prop's type - there is no way to specify complex types such as objects with nested properties or function call signatures.

To annotate complex props types, we can use the PropType utility type:

```js
import { defineComponent } from 'vue'
import type { PropType } from 'vue'

interface Book {
  title: string
  author: string
  year: number
}

export default defineComponent({
  props: {
    book: {
      // provide more specific type to `Object`
      type: Object as PropType<Book>,
      required: true
    },
    // can also annotate functions
    callback: Function as PropType<(id: number) => void>
  },
  mounted() {
    this.book.title // string
    this.book.year // number

    // TS Error: argument of type 'string' is not
    // assignable to parameter of type 'number'
    this.callback?.('123')
  }
})
```

### Caveats​

If your TypeScript version is less than 4.7, you have to be careful when using function values for validator and default prop options - make sure to use arrow functions:

```js
import { defineComponent } from 'vue'
import type { PropType } from 'vue'

interface Book {
  title: string
  year?: number
}

export default defineComponent({
  props: {
    bookA: {
      type: Object as PropType<Book>,
      // Make sure to use arrow functions if your TypeScript version is less than 4.7
      default: () => ({
        title: 'Arrow Function Expression'
      }),
      validator: (book: Book) => !!book.title
    }
  }
})
```

This prevents TypeScript from having to infer the type of this inside these functions, which, unfortunately, can cause the type inference to fail. It was a previous design limitation, and now has been improved in TypeScript 4.7.

---

## Typing Component Emits​

We can declare the expected payload type for an emitted event using the object syntax of the emits option. Also, all non-declared emitted events will throw a type error when called:

```js
import { defineComponent } from "vue";

export default defineComponent({
	emits: {
		addBook(payload: { bookName: string }) {
			// perform runtime validation
			return payload.bookName.length > 0;
		},
	},
	methods: {
		onSubmit() {
			this.$emit("addBook", {
				bookName: 123, // Type error!
			});

			this.$emit("non-declared-event"); // Type error!
		},
	},
});
```

## Typing Computed Properties​

A computed property infers its type based on its return value:

```js
import { defineComponent } from "vue";

export default defineComponent({
	data() {
		return {
			message: "Hello!",
		};
	},
	computed: {
		greeting() {
			return this.message + "!";
		},
	},
	mounted() {
		this.greeting; // type: string
	},
});
```

In some cases, you may want to explicitly annotate the type of a computed property to ensure its implementation is correct:

```js
import { defineComponent } from "vue";

export default defineComponent({
	data() {
		return {
			message: "Hello!",
		};
	},
	computed: {
		// explicitly annotate return type
		greeting(): string {
			return this.message + "!";
		},

		// annotating a writable computed property
		greetingUppercased: {
			get(): string {
				return this.greeting.toUpperCase();
			},
			set(newValue: string) {
				this.message = newValue.toUpperCase();
			},
		},
	},
});
```

Explicit annotations may also be required in some edge cases where TypeScript fails to infer the type of a computed property due to circular inference loops.

---

## Typing Event Handlers​

When dealing with native DOM events, it might be useful to type the argument we pass to the handler correctly. Let's take a look at this example:

```js
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  methods: {
    handleChange(event) {
      // `event` implicitly has `any` type
      console.log(event.target.value)
    }
  }
})
</script>

<template>
  <input type="text" @change="handleChange" />
</template>
```

Without type annotation, the event argument will implicitly have a type of any. This will also result in a TS error if "strict": true or "noImplicitAny": true are used in tsconfig.json. It is therefore recommended to explicitly annotate the argument of event handlers. In addition, you may need to use type assertions when accessing the properties of event:

```js
import { defineComponent } from 'vue'

export default defineComponent({
  methods: {
    handleChange(event: Event) {
      console.log((event.target as HTMLInputElement).value)
    }
  }
})
```

---

## Augmenting Global Properties​

Some plugins install globally available properties to all component instances via app.config.globalProperties. For example, we may install this.$http for data-fetching or this.$translate for internationalization. To make this play well with TypeScript, Vue exposes a ComponentCustomProperties interface designed to be augmented via TypeScript module augmentation:

```js
import axios from 'axios'

declare module 'vue' {
  interface ComponentCustomProperties {
    $http: typeof axios
    $translate: (key: string) => string
  }
}
```

See also:

- TypeScript unit tests for component type extensions

### Type Augmentation Placement​

We can put this type augmentation in a .ts file, or in a project-wide \*.d.ts file. Either way, make sure it is included in tsconfig.json. For library / plugin authors, this file should be specified in the types property in package.json.

In order to take advantage of module augmentation, you will need to ensure the augmentation is placed in a TypeScript module. That is to say, the file needs to contain at least one top-level import or export, even if it is just export {}. If the augmentation is placed outside of a module, it will overwrite the original types rather than augmenting them!

```js
// Does not work, overwrites the original types.
declare module 'vue' {
  interface ComponentCustomProperties {
    $translate: (key: string) => string
  }
}
ts
// Works correctly
export {}

declare module 'vue' {
  interface ComponentCustomProperties {
    $translate: (key: string) => string
  }
}
```

---

## Augmenting Custom Options​

Some plugins, for example vue-router, provide support for custom component options such as beforeRouteEnter:

```js
import { defineComponent } from "vue";

export default defineComponent({
	beforeRouteEnter(to, from, next) {
		// ...
	},
});
```

Without proper type augmentation, the arguments of this hook will implicitly have any type. We can augment the ComponentCustomOptions interface to support these custom options:

```js
import { Route } from 'vue-router'

declare module 'vue' {
  interface ComponentCustomOptions {
    beforeRouteEnter?(to: Route, from: Route, next: () => void): void
  }
}
```

Now the beforeRouteEnter option will be properly typed. Note this is just an example - well-typed libraries like vue-router should automatically perform these augmentations in their own type definitions.

The placement of this augmentation is subject to the same restrictions as global property augmentations.

See also:

- TypeScript unit tests for component type extensions
