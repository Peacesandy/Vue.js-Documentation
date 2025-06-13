---
title: Render Functions & JSX
description: A reference page in my new Starlight docs site.
---

Vue recommends using templates to build applications in the vast majority of cases. However, there are situations where we need the full programmatic power of JavaScript. That's where we can use the render function.

> If you are new to the concept of virtual DOM and render functions, make sure to read the Rendering Mechanism chapter first.

---

## Basic Usage​

### Creating Vnodes​

Vue provides an h() function for creating vnodes:

```js
import { h } from "vue";

const vnode = h(
	"div", // type
	{ id: "foo", class: "bar" }, // props
	[
		/* children */
	]
);
```

`h()` is short for hyperscript - which means "JavaScript that produces HTML (hypertext markup language)". This name is inherited from conventions shared by many virtual DOM implementations. A more descriptive name could be `createVNode()`, but a shorter name helps when you have to call this function many times in a render function.

The h() function is designed to be very flexible:

```js
// all arguments except the type are optional
h("div");
h("div", { id: "foo" });

// both attributes and properties can be used in props
// Vue automatically picks the right way to assign it
h("div", { class: "bar", innerHTML: "hello" });

// props modifiers such as `.prop` and `.attr` can be added
// with `.` and `^` prefixes respectively
h("div", { ".name": "some-name", "^width": "100" });

// class and style have the same object / array
// value support that they have in templates
h("div", { class: [foo, { bar }], style: { color: "red" } });

// event listeners should be passed as onXxx
h("div", { onClick: () => {} });

// children can be a string
h("div", { id: "foo" }, "hello");

// props can be omitted when there are no props
h("div", "hello");
h("div", [h("span", "hello")]);

// children array can contain mixed vnodes and strings
h("div", ["hello", h("span", "hello")]);
```

The resulting vnode has the following shape:

```js
const vnode = h("div", { id: "foo" }, []);

vnode.type; // 'div'
vnode.props; // { id: 'foo' }
vnode.children; // []
vnode.key; // null
Note;
```

:::note
The full VNode interface contains many other internal properties, but it is strongly recommended to avoid relying on any properties other than the ones listed here. This avoids unintended breakage in case the internal properties are changed.
:::

### Declaring Render Functions​

When using templates with Composition API, the return value of the setup() hook is used to expose data to the template. When using render functions, however, we can directly return the render function instead:

```js
import { ref, h } from "vue";

export default {
	props: {
		/* ... */
	},
	setup(props) {
		const count = ref(1);

		// return the render function
		return () => h("div", props.msg + count.value);
	},
};
```

The render function is declared inside setup() so it naturally has access to the props and any reactive state declared in the same scope.

In addition to returning a single vnode, you can also return strings or arrays:

```js
export default {
  setup() {
    return () => 'hello world!'
  }
}
js
import { h } from 'vue'

export default {
  setup() {
    // use an array to return multiple root nodes
    return () => [
      h('div'),
      h('div'),
      h('div')
    ]
  }
}
```

:::tip
Make sure to return a function instead of directly returning values! The setup() function is called only once per component, while the returned render function will be called multiple times.
:::

If a render function component doesn't need any instance state, they can also be declared directly as a function for brevity:

```js
function Hello() {
	return "hello world!";
}
```

That's right, this is a valid Vue component! See Functional Components for more details on this syntax.

### Vnodes Must Be Unique​

All vnodes in the component tree must be unique. That means the following render function is invalid:

```js
function render() {
	const p = h("p", "hi");
	return h("div", [
		// Yikes - duplicate vnodes!
		p,
		p,
	]);
}
```

If you really want to duplicate the same element/component many times, you can do so with a factory function. For example, the following render function is a perfectly valid way of rendering 20 identical paragraphs:

```js
function render() {
	return h(
		"div",
		Array.from({ length: 20 }).map(() => {
			return h("p", "hi");
		})
	);
}
```

---

## JSX / TSX​

JSX is an XML-like extension to JavaScript that allows us to write code like this:

```js
const vnode = <div>hello</div>;
```

Inside JSX expressions, use curly braces to embed dynamic values:

```js
const vnode = <div id={dynamicId}>hello, {userName}</div>;
```

create-vue and Vue CLI both have options for scaffolding projects with pre-configured JSX support. If you are configuring JSX manually, please refer to the documentation of @vue/babel-plugin-jsx for details.

Although first introduced by React, JSX actually has no defined runtime semantics and can be compiled into various different outputs. If you have worked with JSX before, do note that Vue JSX transform is different from React's JSX transform, so you can't use React's JSX transform in Vue applications. Some notable differences from React JSX include:

- You can use HTML attributes such as class and for as props - no need to use className or htmlFor.
- Passing children to components (i.e. slots) works differently.

Vue's type definition also provides type inference for TSX usage. When using TSX, make sure to specify "jsx": "preserve" in tsconfig.json so that TypeScript leaves the JSX syntax intact for Vue JSX transform to process.

### JSX Type Inference​

Similar to the transform, Vue's JSX also needs different type definitions.

Starting in Vue 3.4, Vue no longer implicitly registers the global JSX namespace. To instruct TypeScript to use Vue's JSX type definitions, make sure to include the following in your tsconfig.json:

```js
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "vue"
    // ...
  }
}
```

You can also opt-in per file by adding a /_ @jsxImportSource vue _/ comment at the top of the file.

If there is code that depends on the presence of the global JSX namespace, you can retain the exact pre-3.4 global behavior by explicitly importing or referencing vue/jsx in your project, which registers the global JSX namespace.

---

## Render Function Recipes​

Below we will provide some common recipes for implementing template features as their equivalent render functions / JSX.

### `v-if​`

Template:

```js
<div>
	<div v-if='ok'>yes</div>
	<span v-else>no</span>
</div>
```

Equivalent render function / JSX:

```js
h("div", [ok.value ? h("div", "yes") : h("span", "no")]);
```

```js
<div>{ok.value ? <div>yes</div> : <span>no</span>}</div>
```

### `v-for​`

Template:

```js
<ul>
  <li v-for="{ id, text } in items" :key="id">
    {{ text }}
  </li>
</ul>
```

Equivalent render function / JSX:

```js
h(
  'ul',
  // assuming `items` is a ref with array value
  items.value.map(({ id, text }) => {
    return h('li', { key: id }, text)
  })
)
jsx
<ul>
  {items.value.map(({ id, text }) => {
    return <li key={id}>{text}</li>
  })}
</ul>
```

### `v-on​`

Props with names that start with on followed by an uppercase letter are treated as event listeners. For example, onClick is the equivalent of @click in templates.

```js
h(
	"button",
	{
		onClick(event) {
			/* ... */
		},
	},
	"Click Me"
);
```

```js
<button
	onClick={(event) => {
		/* ... */
	}}>
	Click Me
</button>
```

### Event Modifiers​

For the .passive, .capture, and .once event modifiers, they can be concatenated after the event name using camelCase.

For example:

```js
h('input', {
  onClickCapture() {
    /* listener in capture mode */
  },
  onKeyupOnce() {
    /* triggers only once */
  },
  onMouseoverOnceCapture() {
    /* once + capture */
  }
})
jsx
<input
  onClickCapture={() => {}}
  onKeyupOnce={() => {}}
  onMouseoverOnceCapture={() => {}}
/>
```

For other event and key modifiers, the withModifiers helper can be used:

```js
import { withModifiers } from 'vue'

h('div', {
  onClick: withModifiers(() => {}, ['self'])
})
jsx
<div onClick={withModifiers(() => {}, ['self'])} />
```

### Components​

To create a vnode for a component, the first argument passed to h() should be the component definition. This means when using render functions, it is unnecessary to register components - you can just use the imported components directly:

```js
import Foo from "./Foo.vue";
import Bar from "./Bar.jsx";

function render() {
	return h("div", [h(Foo), h(Bar)]);
}
jsx;
function render() {
	return (
		<div>
			<Foo />
			<Bar />
		</div>
	);
}
```

As we can see, h can work with components imported from any file format as long as it's a valid Vue component.

Dynamic components are straightforward with render functions:

```js
import Foo from "./Foo.vue";
import Bar from "./Bar.jsx";

function render() {
	return ok.value ? h(Foo) : h(Bar);
}
jsx;
function render() {
	return ok.value ? <Foo /> : <Bar />;
}
```

If a component is registered by name and cannot be imported directly (for example, globally registered by a library), it can be programmatically resolved by using the resolveComponent() helper.

### Rendering Slots​

In render functions, slots can be accessed from the setup() context. Each slot on the slots object is a function that returns an array of vnodes:

```js
export default {
	props: ["message"],
	setup(props, { slots }) {
		return () => [
			// default slot:
			// <div><slot /></div>
			h("div", slots.default()),

			// named slot:
			// <div><slot name="footer" :text="message" /></div>
			h(
				"div",
				slots.footer({
					text: props.message,
				})
			),
		];
	},
};
```

JSX equivalent:

```js
// default
<div>{slots.default()}</div>

// named
<div>{slots.footer({ text: props.message })}</div>
```

### Passing Slots​

Passing children to components works a bit differently from passing children to elements. Instead of an array, we need to pass either a slot function, or an object of slot functions. Slot functions can return anything a normal render function can return - which will always be normalized to arrays of vnodes when accessed in the child component.

```js
// single default slot
h(MyComponent, () => "hello");

// named slots
// notice the `null` is required to avoid
// the slots object being treated as props
h(MyComponent, null, {
	default: () => "default slot",
	foo: () => h("div", "foo"),
	bar: () => [h("span", "one"), h("span", "two")],
});
```

JSX equivalent:

```js
jsx
// default
<MyComponent>{() => 'hello'}</MyComponent>

// named
<MyComponent>{{
  default: () => 'default slot',
  foo: () => <div>foo</div>,
  bar: () => [<span>one</span>, <span>two</span>]
}}</MyComponent>
```

Passing slots as functions allows them to be invoked lazily by the child component. This leads to the slot's dependencies being tracked by the child instead of the parent, which results in more accurate and efficient updates.

### Scoped Slots​

To render a scoped slot in the parent component, a slot is passed to the child. Notice how the slot now has a parameter text. The slot will be called in the child component and the data from the child component will be passed up to the parent component.

```js
// parent component
export default {
	setup() {
		return () =>
			h(MyComp, null, {
				default: ({ text }) => h("p", text),
			});
	},
};
```

Remember to pass null so the slots will not be treated as props.

```js
// child component
export default {
	setup(props, { slots }) {
		const text = ref("hi");
		return () => h("div", null, slots.default({ text: text.value }));
	},
};
```

JSX equivalent:

```js
<MyComponent>
	{{
		default: ({ text }) => <p>{text}</p>,
	}}
</MyComponent>
```

### Built-in Components​

Built-in components such as `<KeepAlive>`, `<Transition>`, `<TransitionGroup>`, `<Teleport>` and `<Suspense>` must be imported for use in render functions:

```js
import { h, KeepAlive, Teleport, Transition, TransitionGroup } from "vue";

export default {
	setup() {
		return () => h(Transition, { mode: "out-in" } /* ... */);
	},
};
```

## `v-model​`

The v-model directive is expanded to modelValue and onUpdate:modelValue props during template compilation—we will have to provide these props ourselves:

```js
export default {
	props: ["modelValue"],
	emits: ["update:modelValue"],
	setup(props, { emit }) {
		return () =>
			h(SomeComponent, {
				modelValue: props.modelValue,
				"onUpdate:modelValue": (value) => emit("update:modelValue", value),
			});
	},
};
```

### Custom Directives​

Custom directives can be applied to a vnode using withDirectives:

```js
import { h, withDirectives } from "vue";

// a custom directive
const pin = {
	mounted() {
		/* ... */
	},
	updated() {
		/* ... */
	},
};

// <div v-pin:top.animate="200"></div>
const vnode = withDirectives(h("div"), [[pin, 200, "top", { animate: true }]]);
```

If the directive is registered by name and cannot be imported directly, it can be resolved using the resolveDirective helper.

### Template Refs​

With the Composition API, when using useTemplateRef() template refs are created by passing the string value as prop to the vnode:

```js
import { h, useTemplateRef } from "vue";

export default {
	setup() {
		const divEl = useTemplateRef("my-div");

		// <div ref="my-div">
		return () => h("div", { ref: "my-div" });
	},
};
```

Usage before 3.5

## Functional Components​

Functional components are an alternative form of component that don't have any state of their own. They act like pure functions: props in, vnodes out. They are rendered without creating a component instance (i.e. no this), and without the usual component lifecycle hooks.

To create a functional component we use a plain function, rather than an options object. The function is effectively the render function for the component.

The signature of a functional component is the same as the setup() hook:

```js
function MyComponent(props, { slots, emit, attrs }) {
	// ...
}
```

Most of the usual configuration options for components are not available for functional components. However, it is possible to define props and emits by adding them as properties:

```js
MyComponent.props = ["value"];
MyComponent.emits = ["click"];
```

If the props option is not specified, then the props object passed to the function will contain all attributes, the same as attrs. The prop names will not be normalized to camelCase unless the props option is specified.

For functional components with explicit props, attribute fallthrough works much the same as with normal components. However, for functional components that don't explicitly specify their props, only the class, style, and onXxx event listeners will be inherited from the attrs by default. In either case, inheritAttrs can be set to false to disable attribute inheritance:

```js
MyComponent.inheritAttrs = false;
```

Functional components can be registered and consumed just like normal components. If you pass a function as the first argument to h(), it will be treated as a functional component.

### Typing Functional Components​

Functional Components can be typed based on whether they are named or anonymous. Vue - Official extension also supports type checking properly typed functional components when consuming them in SFC templates.

Named Functional Component

```js
import type { SetupContext } from "vue";
type FComponentProps = {
	message: string,
};

type Events = {
	sendMessage(message: string): void,
};

function FComponent(props: FComponentProps, context: SetupContext<Events>) {
	return (
		<button onClick={() => context.emit("sendMessage", props.message)}>
			{props.message}{" "}
		</button>
	);
}

FComponent.props = {
	message: {
		type: String,
		required: true,
	},
};

FComponent.emits = {
	sendMessage: (value: unknown) => typeof value === "string",
};
```

_Anonymous Functional Component_

```js
tsx;
import type { FunctionalComponent } from "vue";

type FComponentProps = {
	message: string,
};

type Events = {
	sendMessage(message: string): void,
};

const FComponent: FunctionalComponent<FComponentProps, Events> = (
	props,
	context
) => {
	return (
		<button onClick={() => context.emit("sendMessage", props.message)}>
			{props.message}{" "}
		</button>
	);
};

FComponent.props = {
	message: {
		type: String,
		required: true,
	},
};

FComponent.emits = {
	sendMessage: (value) => typeof value === "string",
};
```
