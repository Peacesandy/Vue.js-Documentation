---
title: Reactivity in Depth​
description: A reference page in my new Starlight docs site.
---

One of Vue’s most distinctive features is the unobtrusive reactivity system. Component state consists of reactive JavaScript objects. When you modify them, the view updates. It makes state management simple and intuitive, but it’s also important to understand how it works to avoid some common gotchas. In this section, we are going to dig into some of the lower-level details of Vue’s reactivity system.

## What is Reactivity?​

This term comes up in programming quite a bit these days, but what do people mean when they say it? Reactivity is a programming paradigm that allows us to adjust to changes in a declarative manner. The canonical example that people usually show, because it’s a great one, is an Excel spreadsheet:

| A   | B   | C   |
| --- | --- | --- |
|     |     |     |
| 1   |     |     |
| 2   |     |     |
| 3   |     |     |

Here cell A2 is defined via a formula of = A0 + A1 (you can click on A2 to view or edit the formula), so the spreadsheet gives us 3. No surprises there. But if you update A0 or A1, you'll notice that A2 automagically updates too.

JavaScript doesn’t usually work like this. If we were to write something comparable in JavaScript:

```js
let A0 = 1;
let A1 = 2;
let A2 = A0 + A1;

console.log(A2); // 3

A0 = 2;
console.log(A2); // Still 3
```

When we mutate A0, A2 does not change automatically.

So how would we do this in JavaScript? First, in order to re-run the code that updates A2, let's wrap it in a function:

```js
let A2;

function update() {
	A2 = A0 + A1;
}
```

Then, we need to define a few terms:

- The update() function produces a side effect, or effect for short, because it modifies the state of the program.

- A0 and A1 are considered dependencies of the effect, as their values are used to perform the effect. The effect is said to be a subscriber to its dependencies.

What we need is a magic function that can invoke update() (the effect) whenever A0 or A1 (the dependencies) change:

```js
whenDepsChange(update);
```

This whenDepsChange() function has the following tasks:

- Track when a variable is read. E.g. when evaluating the expression A0 + A1, both A0 and A1 are read.

- If a variable is read when there is a currently running effect, make that effect a subscriber to that variable. E.g. because A0 and A1 are read when update() is being executed, update() becomes a subscriber to both A0 and A1 after the first call.

- Detect when a variable is mutated. E.g. when A0 is assigned a new value, notify all its subscriber effects to re-run.

---

## How Reactivity Works in Vue​

We can't really track the reading and writing of local variables like in the example. There's just no mechanism for doing that in vanilla JavaScript. What we can do though, is intercept the reading and writing of object properties.

There are two ways of intercepting property access in JavaScript: getter / setters and Proxies. Vue 2 used getter / setters exclusively due to browser support limitations. In Vue 3, Proxies are used for reactive objects and getter / setters are used for refs. Here's some pseudo-code that illustrates how they work:

```js
function reactive(obj) {
	return new Proxy(obj, {
		get(target, key) {
			track(target, key);
			return target[key];
		},
		set(target, key, value) {
			target[key] = value;
			trigger(target, key);
		},
	});
}

function ref(value) {
	const refObject = {
		get value() {
			track(refObject, "value");
			return value;
		},
		set value(newValue) {
			value = newValue;
			trigger(refObject, "value");
		},
	};
	return refObject;
}
```

:::tip
Code snippets here and below are meant to explain the core concepts in the simplest form possible, so many details are omitted, and edge cases ignored.
:::

This explains a few limitations of reactive objects that we have discussed in the fundamentals section:

When you assign or destructure a reactive object's property to a local variable, accessing or assigning to that variable is non-reactive because it no longer triggers the get / set proxy traps on the source object. Note this "disconnect" only affects the variable binding - if the variable points to a non-primitive value such as an object, mutating the object would still be reactive.

The returned proxy from reactive(), although behaving just like the original, has a different identity if we compare it to the original using the === operator.

Inside track(), we check whether there is a currently running effect. If there is one, we lookup the subscriber effects (stored in a Set) for the property being tracked, and add the effect to the Set:

```js
// This will be set right before an effect is about
// to be run. We'll deal with this later.
let activeEffect;

function track(target, key) {
	if (activeEffect) {
		const effects = getSubscribersForProperty(target, key);
		effects.add(activeEffect);
	}
}
```

Effect subscriptions are stored in a global WeakMap `<target, Map<key, Set<effect>>>` data structure. If no subscribing effects Set was found for a property (tracked for the first time), it will be created. This is what the `getSubscribersForProperty()` function does, in short. For simplicity, we will skip its details.

Inside `trigger()`, we again lookup the subscriber effects for the property. But this time we invoke them instead:

```js
function trigger(target, key) {
	const effects = getSubscribersForProperty(target, key);
	effects.forEach((effect) => effect());
}
```

Now let's circle back to the whenDepsChange() function:

```js
function whenDepsChange(update) {
	const effect = () => {
		activeEffect = effect;
		update();
		activeEffect = null;
	};
	effect();
}
```

It wraps the raw update function in an effect that sets itself as the current active effect before running the actual update. This enables track() calls during the update to locate the current active effect.

At this point, we have created an effect that automatically tracks its dependencies, and re-runs whenever a dependency changes. We call this a Reactive Effect.

Vue provides an API that allows you to create reactive effects: watchEffect(). In fact, you may have noticed that it works pretty similarly to the magical whenDepsChange() in the example. We can now rework the original example using actual Vue APIs:

```js
import { ref, watchEffect } from "vue";

const A0 = ref(0);
const A1 = ref(1);
const A2 = ref();

watchEffect(() => {
	// tracks A0 and A1
	A2.value = A0.value + A1.value;
});

// triggers the effect
A0.value = 2;
```

Using a reactive effect to mutate a ref isn't the most interesting use case - in fact, using a computed property makes it more declarative:

```js
import { ref, computed } from "vue";

const A0 = ref(0);
const A1 = ref(1);
const A2 = computed(() => A0.value + A1.value);

A0.value = 2;
```

Internally, computed manages its invalidation and re-computation using a reactive effect.

So what's an example of a common and useful reactive effect? Well, updating the DOM! We can implement simple "reactive rendering" like this:

```js
import { ref, watchEffect } from "vue";

const count = ref(0);

watchEffect(() => {
	document.body.innerHTML = `Count is: ${count.value}`;
});

// updates the DOM
count.value++;
```

In fact, this is pretty close to how a Vue component keeps the state and the DOM in sync - each component instance creates a reactive effect to render and update the DOM. Of course, Vue components use much more efficient ways to update the DOM than innerHTML. This is discussed in Rendering Mechanism

---

## Runtime vs. Compile-time Reactivity​

Vue's reactivity system is primarily runtime-based: the tracking and triggering are all performed while the code is running directly in the browser. The pros of runtime reactivity are that it can work without a build step, and there are fewer edge cases. On the other hand, this makes it constrained by the syntax limitations of JavaScript, leading to the need of value containers like Vue refs.

Some frameworks, such as Svelte, choose to overcome such limitations by implementing reactivity during compilation. It analyzes and transforms the code in order to simulate reactivity. The compilation step allows the framework to alter the semantics of JavaScript itself - for example, implicitly injecting code that performs dependency analysis and effect triggering around access to locally defined variables. The downside is that such transforms require a build step, and altering JavaScript semantics is essentially creating a language that looks like JavaScript but compiles into something else.

The Vue team did explore this direction via an experimental feature called Reactivity Transform, but in the end we have decided that it would not be a good fit for the project due to the reasoning here.

---

## Reactivity Debugging​

It's great that Vue's reactivity system automatically tracks dependencies, but in some cases we may want to figure out exactly what is being tracked, or what is causing a component to re-render.

### Component Debugging Hooks​

We can debug what dependencies are used during a component's render and which dependency is triggering an update using the onRenderTracked and onRenderTriggered lifecycle hooks. Both hooks will receive a debugger event which contains information on the dependency in question. It is recommended to place a debugger statement in the callbacks to interactively inspect the dependency:

```js
<script setup>
import { onRenderTracked, onRenderTriggered } from 'vue'

onRenderTracked((event) => {
  debugger
})

onRenderTriggered((event) => {
  debugger
})
</script>
```

:::tip
Component debug hooks only work in development mode.
:::

The debug event objects have the following type:

```js
type DebuggerEvent = {
  effect: ReactiveEffect
  target: object
  type:
    | TrackOpTypes /* 'get' | 'has' | 'iterate' */
    | TriggerOpTypes /* 'set' | 'add' | 'delete' | 'clear' */
  key: any
  newValue?: any
  oldValue?: any
  oldTarget?: Map<any, any> | Set<any>
}
```

### Computed Debugging​

We can debug computed properties by passing computed() a second options object with onTrack and onTrigger callbacks:

- onTrack will be called when a reactive property or ref is tracked as a dependency.
- onTrigger will be called when the watcher callback is triggered by the mutation of a dependency.

Both callbacks will receive debugger events in the same format as component debug hooks:

```js
const plusOne = computed(() => count.value + 1, {
	onTrack(e) {
		// triggered when count.value is tracked as a dependency
		debugger;
	},
	onTrigger(e) {
		// triggered when count.value is mutated
		debugger;
	},
});

// access plusOne, should trigger onTrack
console.log(plusOne.value);

// mutate count.value, should trigger onTrigger
count.value++;
```

:::tip
onTrack and onTrigger computed options only work in development mode.
:::

### Watcher Debugging​

Similar to computed(), watchers also support the onTrack and onTrigger options:

```js
watch(source, callback, {
	onTrack(e) {
		debugger;
	},
	onTrigger(e) {
		debugger;
	},
});

watchEffect(callback, {
	onTrack(e) {
		debugger;
	},
	onTrigger(e) {
		debugger;
	},
});
```

:::tip
onTrack and onTrigger watcher options only work in development mode.
:::

---

## Integration with External State Systems

Vue's reactivity system works by deeply converting plain JavaScript objects into reactive proxies. The deep conversion can be unnecessary or sometimes unwanted when integrating with external state management systems (e.g. if an external solution also uses Proxies).

The general idea of integrating Vue's reactivity system with an external state management solution is to hold the external state in a shallowRef. A shallow ref is only reactive when its .value property is accessed - the inner value is left intact. When the external state changes, replace the ref value to trigger updates.

### Immutable Data​

If you are implementing an undo / redo feature, you likely want to take a snapshot of the application's state on every user edit. However, Vue's mutable reactivity system isn't best suited for this if the state tree is large, because serializing the entire state object on every update can be expensive in terms of both CPU and memory costs.

Immutable data structures solve this by never mutating the state objects - instead, it creates new objects that share the same, unchanged parts with old ones. There are different ways of using immutable data in JavaScript, but we recommend using Immer with Vue because it allows you to use immutable data while keeping the more ergonomic, mutable syntax.

We can integrate Immer with Vue via a simple composable:

```js
import { produce } from "immer";
import { shallowRef } from "vue";

export function useImmer(baseState) {
	const state = shallowRef(baseState);
	const update = (updater) => {
		state.value = produce(state.value, updater);
	};

	return [state, update];
}
```

### State Machines​

State Machine is a model for describing all the possible states an application can be in, and all the possible ways it can transition from one state to another. While it may be overkill for simple components, it can help make complex state flows more robust and manageable.

One of the most popular state machine implementations in JavaScript is XState. Here's a composable that integrates with it:

```js
import { createMachine, interpret } from "xstate";
import { shallowRef } from "vue";

export function useMachine(options) {
	const machine = createMachine(options);
	const state = shallowRef(machine.initialState);
	const service = interpret(machine)
		.onTransition((newState) => (state.value = newState))
		.start();
	const send = (event) => service.send(event);

	return [state, send];
}
```

Try it in the Playground

### RxJS​

RxJS is a library for working with asynchronous event streams. The VueUse library provides the @vueuse/rxjs add-on for connecting RxJS streams with Vue's reactivity system.

---

## Connection to Signals​

Quite a few other frameworks have introduced reactivity primitives similar to refs from Vue's Composition API, under the term "signals":

- Solid Signals
- Angular Signals
- Preact Signals
- Qwik Signals

Fundamentally, signals are the same kind of reactivity primitive as Vue refs. It's a value container that provides dependency tracking on access, and side-effect triggering on mutation. This reactivity-primitive-based paradigm isn't a particularly new concept in the frontend world: it dates back to implementations like Knockout observables and Meteor Tracker from more than a decade ago. Vue Options API and the React state management library MobX are also based on the same principles, but hide the primitives behind object properties.

Although not a necessary trait for something to qualify as signals, today the concept is often discussed alongside the rendering model where updates are performed through fine-grained subscriptions. Due to the use of Virtual DOM, Vue currently relies on compilers to achieve similar optimizations. However, we are also exploring a new Solid-inspired compilation strategy, called Vapor Mode, that does not rely on Virtual DOM and takes more advantage of Vue's built-in reactivity system.

### API Design Trade-Offs​

The design of Preact and Qwik's signals are very similar to Vue's shallowRef: all three provide a mutable interface via the .value property. We will focus the discussion on Solid and Angular signals.

### Solid Signals​

Solid's `createSignal()` API design emphasizes read / write segregation. Signals are exposed as a read-only getter and a separate setter:

```js
const [count, setCount] = createSignal(0);

count(); // access the value
setCount(1); // update the value
```

Notice how the count signal can be passed down without the setter. This ensures that the state can never be mutated unless the setter is also explicitly exposed. Whether this safety guarantee justifies the more verbose syntax could be subject to the requirement of the project and personal taste - but in case you prefer this API style, you can easily replicate it in Vue:

```js
import { shallowRef, triggerRef } from "vue";

export function createSignal(value, options) {
	const r = shallowRef(value);
	const get = () => r.value;
	const set = (v) => {
		r.value = typeof v === "function" ? v(r.value) : v;
		if (options?.equals === false) triggerRef(r);
	};
	return [get, set];
}
```

Try it in the Playground

### Angular Signals​

Angular is undergoing some fundamental changes by foregoing dirty-checking and introducing its own implementation of a reactivity primitive. The Angular Signal API looks like this:

```js
const count = signal(0);

count(); // access the value
count.set(1); // set new value
count.update((v) => v + 1); // update based on previous value
```

Again, we can easily replicate the API in Vue:

```js
import { shallowRef } from "vue";

export function signal(initialValue) {
	const r = shallowRef(initialValue);
	const s = () => r.value;
	s.set = (value) => {
		r.value = value;
	};
	s.update = (updater) => {
		r.value = updater(r.value);
	};
	return s;
}
```

Try it in the Playground

Compared to Vue refs, Solid and Angular's getter-based API style provide some interesting trade-offs when used in Vue components:

- () is slightly less verbose than .value, but updating the value is more verbose.

- There is no ref-unwrapping: accessing values always require (). This makes value access consistent everywhere. This also means you can pass raw signals down as component props.

Whether these API styles suit you is to some extent subjective. Our goal here is to demonstrate the underlying similarity and trade-offs between these different API designs. We also want to show that Vue is flexible: you are not really locked into the existing APIs. Should it be necessary, you can create your own reactivity primitive API to suit more specific needs.
