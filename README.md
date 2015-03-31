marionette.state
================

One-way data flow architecture for stateful components within a Backbone.Marionette app.

## Installation

```
git clone git://github.com/Squareknot/marionette.state.git
bower install marionette.state
npm install marionette.state
```

## Documentation

- [Introduction](#introduction)
- [Architectural Pattern](#architectural-pattern)
- [Examples](#examples)
  - [Radio Button](#radio-button)
  - [Radio Button Group Synced with External Model](#radio-button-group-synced-with-application-model)
- [Marionette.State API](#marionette-state-api)
  - [Class Properties](#class-properties)
  - [Initialization Options](#initialization-options)
  - [Methods](#methods)
- [Marionette.State.Behavior API](#marionette-state-behavior-api)
  - [Behavior Options](#behavior-options)
  - [View Side Effects](#view-side-effects)
- [Marionette.State Functions API](#marionette-state-functions-api)

## Introduction

A Marionette View is a DOM representation of a Backbone model. When the model updates, so does the view.  Here is a quick example:

```js
// Region to attach views
var region = new Marionette.Region({ el: '#main' });

// Model synced with '/rest-endpoint'
var model = new Backbone.Model({ url: '/rest-endpoint' });

// View will re-render when the model changes
var View = Marionette.ItemView({
  modelEvents: { 'change': 'render' }
});

// Create the view
var view = new View({ model: model });

// Fetch the latest data and, once ready, show the view
model.fetch().done(function () {
  region.show(view);
});

// Updating the model later will cause the view to re-render.
model.fetch();
```

This is great for simple views that are only interested in representing a single model.  What should one do when a view depends on other states, such as user interaction or application state?  Is it good idea to store view-specific state attributes directly on its model?  Is using plain Javascript properties on the View object okay?

`Marionette.State` allows a view to _seamlessly depend on any source of state_ while keeping view state logic self-contained and eliminating the temptation to pollute a server-syncronized data model with view-specific state.  Best of all, `Marionette.State` does this by providing declarative and expressive tools rather than over-engineering for every use case, much like the Marionette library itself.

## Architectural Pattern

Before launching into the details, it will be helpful to examine a sturdy architectural pattern that has been recently popularlized by Facebook's Flux architecture: one-way data binding.  Given the sheer decision-making power handed to a Backbone developer, a pattern such as this can go a long way toward simplifying and standardizing code organization and data flow.

Consider the following common scenario on the component (view) level:

1. A component is rendered with some data
2. A user interacts with the component
3. The component reacts by updating its visual state, perhaps requesting more data

It is easy to start writing all the logic necessary to handle state updates in the view itself and mash view state attributes into the data model, but this quickly becomes inelegant at best and a 300+ line mess at worst.  What if the state logic could be separated and the data model left to handle strictly persisted data?  The architecture might look like this:

<img class="diagram" src="https://docs.google.com/drawings/d/13_kBAF5IIl2MbJkPDo4rj_U0VG-QKRv8mWkkwYIJFPI/pub?w=960&amp;h=720" height=320>

1. A view only renders _dumb updates_ of data and state.
2. The view _triggers events_ that are handled by a service (`Marionette.State`).
3. The service reacts to both _view events_ and _application state changes_.
4. The service triggers application events.
5. The application reacts to application events and may trigger data _and/or_ application state updates.
6. The view reacts to data and state changes, again performing only _dumb updates_, and the cycle repeats.

This uni-directional flow of state allows each entity to do a single job--the job it does best.  The view renders data and state.  The `Marionette.State` service consolidates view events and application state changes into view state. The application performs business level actions and ultimately updates data models and application state.  `Marionette.State` is simply a tool that streamlines view state management and dependencies on application state.

## Examples

### Toggle Button

In this example, a toggle button is "active" or "inactive" and its state is toggled with a click.  This state is not persisted, but it is reflected in the DOM.  The initial state is assumed to be "inactive".  Marionette.State manages the 'active' state by converting view events into state changes.  ToggleView's only responsibility is to react to state changes through the 'stateEvents' hash.

```js
var ToggleState = Marionette.State.extend({
  
  defaults: {
    active: false
  },

  componentEvents: {
    'toggle:active': 'onToggleActive'
  },

  onToggleActive: function () {
    var active = !this.get('active');
    this.set('active', active);
  }
});

var ToggleView = Marionette.ItemView.extend({
  
  template: '<%= label %>',
  tagName: 'button',

  behaviors: {
    behaviorClass: Marionette.State.Behavior,
    stateClass: ToggleState
  },

  modelEvents: {
    'change': 'render'
  },

  // Handlers are automatically onRender in addition to on changes.
  // This onRender behavior avoids boilerplate and keeps DOM synchronized with state.
  stateEvents: {
    'change:active', 'onChangeActive'
  },

  triggers: {
    'click': 'toggle:active'
  },

  onChangeActive: function(state, active) {
    if (active) this.$el.addClass('active');
    else this.$el.removeClass('active');
  }
});

// Create a toggle button
var buttonModel = new Backbone.Model({
  id: 1,
  label: 'foo'
});
var toggleView = new ToggleView({
  model: buttonModel
});

// Show the toggle button
var mainRegion = new Region({
  el: "#main"
});
mainRegion.show(toggleView);
```

### Radio Button Group Synced with External Model

In this example, a ToggleView is extended with Radio button-group behavior using Marionette.State to handle the logic.  Note that the view is identical except for switching out the logic (State) driving it.  This is possible because view logic is completely isolated from the view, leaving the view responsible for simple updates.

```js
var UserPreferenceState = Marionette.State.extend({

  defaults: {
    active: false
  },
  
  userEvents: {
    'change:userPreference', 'onChangeUserPreference'
  },

  initialize: function (options) {
    options = options || {};
    this.radioModel = options.radioModel;
    this.user = options.user;

    // Marionette.State.syncEntityEvents is similar to Marionette.bindEntityEvents, except here
    // it synchronizes state by calling change handlers immediately in addition to on changes.
    this.syncEntityEvents(user, userEvents);
  },

  // Use Backbone.Radio channel for application event: setting the user preference.
  onToggleActive: function () {
    if (!this.get('active')) {
      Backbone.Radio.command('user', 'set:userPreference', this.radioModel.id);
    }
  },

  // Whenever the user's preference radio changes, update 'active' state by the following rules:
  // - If current userPreference matches this one, set 'active' state to true.
  // - If current userPreference does not match this one, set 'active' state to false.
  onChangeUserPreference: function (user, userPreference) {
    var active = userPreference === this.radioModel.id;
    this.set('active', active);
  }
});

// Extends ToggleView only in its state management
var UserPreferenceView = ToggleView.extend({
  
  behaviors: {
    behaviorClass: Marionette.State.Behavior,
    stateClass: UserPreferenceState,
    mapOptions: {
      radioModel: 'model', // Pass the view's 'model' option to RadioState as 'radioModel'
      user: true           // Pass the view's 'user' option to RadioState as 'user'
    }
  },
});

var UserPreferencesView = Marionette.CollectionView.extend({

  childView: UserPreferenceView,

  // Accepts a 'user' option that is passed to child views
  initialize: function (options) {
    options = options || {};

    this.childViewOptions = {
      user: options.user
    }
  }
});

// Create the application user model
var user = new Backbone.Model({
  userPreference: 1
});

// Set up global Backbone.Radio handler for changing userPreference
Backbone.Radio.comply('user', 'set:userPreference', function (userPreference) {
  user.set('userPreference', userPreference);
});

// Initialize possible user preferences
var userPreferences = new Backbone.Collection([
  { id: 1, label: 'foo' },
  { id: 2, label: 'bar' },
  { id: 3, label: 'baz' }
]);

// Create user preferences selection view
var userPreferencesView = new UserPreferencesView({
  collection: userPreferences,
  user: user
});

// Show user preferences selection view
var mainRegion = new Region({
  el: "#main"
});
mainRegion.show(userPreferencesView);
```

## Marionette.State API

### Class Properties

#### `modelClass`

Optional state model class to instantiate, otherwise a pure Backbone.Model will be used.

#### `defaultState`

Optional default state attributes hash.  These will be applied to the underlying model when it is initialized.

#### `componentEvents`

Optional hash of component event bindings.  Enabled by passing `{ component: <Marionette object> }` as an option or by using a StateBehavior, in which case `component` is the view.

### Initialization Options

#### `component`

Optional Marionette object to which to bind lifecycle and events.  When `component` is destroyed the State instance is also destroyed.  The `componentEvents` events hash is also bound to `component`.  When using State with a StateBehavior, `component` is automatically set to the view.

#### `initialState`

Optional initial state attributes.  These attributes are combined with `defaultState` for initializing the underlying state model, and become the basis for future `reset()` calls.

### Methods

#### `setState(attrs)`

Resets the underlying state model and `initialState` (destructively) to conform to the passed attrs.  Future calls to `reset()` will return to this point.

#### `getModel()`

Returns the underlying state model.

#### `getInitialState()`

Returns a clone of the initial state hash leveraged by `reset()`.

#### `reset()`

Resets the state model to its value as of initialization or the last `setState()`.

#### `set(attrs, options)`

Proxy to state model `set(attrs, options)`.

#### `get(attr)`

Proxy to state model `get(attr)`.

#### `setComponent(eventedObj)`

Bind lifetime to an evented (Backbone.Events) object, e.g. a Backbone.Model or a Marionette object.  If the object has a `destroy` method, State will be destroyed automatically along with the object.  `componentEvents` are also bound to this object.

#### `getComponent()`

Returns current component.

#### `syncEntityEvents(entity, entityEvents)`

Binds `entityEvents` to `entity` exactly like `Marionette.bindEntityEvents`, but also calls handlers immediately for the purpose of initializing state.  See [Marionette.State Functions API](#marionette-state-functions-api): `syncEntityEvents`.

## Marionette.State.Behavior API

A StateBehavior adds Marionette.State seamlessly to a view, turning a view into a sophisticated component with separated view logic at almost no cost (next to no code bloat). 

### Behavior Options

#### `stateClass`

Type of Marionette.State to instantiate

#### `initialState`

Optional initial state attrs

#### `stateOptions`

Options to pass to Marionette.State

#### `mapOptions`

Map view options to Marionette.State options, as follows:

- `{ stateOption: 'viewOption' } ` - `view.options.viewOption` will be passed as `stateOption`.
- `{ stateOption: 'viewOption.property' }` - `view.options.viewOption.property` will be passed as `stateOption`.
- `{ stateOption: true }` - `view.options.stateOptions` will be passed as `stateOption`.
- `{ stateOption: function(viewOptions) }` - At view initialization time, return value of function given `view.options` will be passed as `stateOption`.

Using `mapOptions`, the view can be treated as a sophisticated "component", including receiving component options, but instead of managing component options internally it may proxy them to the State instance.

#### `serialize`

Whether to serialize state into template (default false).  State will be serialized underneath the `state` property.  For example:

```
var OkayState = Marionette.State.extend({
  
  defaultState: {
    disabled: 'disabled'
  }
});

var OkayView = Marionette.ItemView.extend({

  template: '<button <%= state.disabled %>>Okay</button>'
  
  behaviors: {
    State: {
      behaviorClass: Marionette.State.Behavior,
      stateClass: OkayState,
      serialize: true
    }
  }

  stateEvents: {
    'change': 'render'
  }
})
```

#### `syncEvent`

View event on which to call state handlers, keeping the DOM in sync with state. Defaults to 'render'.

### View Side Effects

#### `view.state`

On initialization, StateBehavior will set the `state` property on the View to the underlying state model of the State instance (`State.getModel()`).  This is useful for manually determining specific state values on the fly or passing to child views to keep them in sync with the overall component.

_Please note:_ A View calling `this.state.set()` is an anti-pattern, as it violates the one-way data flow described in the introduction.

## Marionette.State Functions API

#### `syncEntityEvents(target, entity, entityEvents, event)`

Binds `entityEvents` handlers located on `target` to `entity` using `Marionette.bindEntityEvents`, but then calls handlers either immediately or on `event` to ensure `target` is synchronized with `entity` state.  This synchronization step is timed as follows:

- If `event` is provided, then call handlers whenever `target` fires `event`.
- If `event` is not provided, then call handlers immediately.

**Example keeping a View synchronized with a state entity using syncEntityEvents.**

```js
var View = Marionette.ItemView.extend({

  entityEvents: {
    'change:foo': 'onChangeFoo',
    'change:bar': 'onChangeBar'
  }

  initialize: function (options) {
    this.entity = new Backbone.Model({
      foo: 1,
      bar: 2  
    });
    Marionette.State.syncEntityEvents(this, this.entity, this.entityEvents, 'render');
  },

  onChangeFoo: function (entity, foo) {
    if (foo) this.$el.addClass('foo');
    else this.$el.removeClass('foo');
  },

  onChangeBar: function (entity, bar) {
    if (bar) this.$el.addClass('bar');
    else this.$el.removeClass('bar');
  }
);
```

**Example keeping a View synchronized with a state entity _without_ using syncEntityEvents.**

```js
var View = Marionette.ItemView.extend({

  entityEvents: {
    'change:foo': 'onChangeFoo',
    'change:bar': 'onChangeBar'
  }

  initialize: function (options) {
    this.entity = new Backbone.Model({
      foo: 1,
      bar: 2  
    });
    Marionette.bindEntityEvents(this, this.entity, this.entityEvents);
  },

  onChangeFoo: function (entity, foo) {
    if (foo) this.$el.addClass('foo');
    else this.$el.removeClass('foo');
  },

  onChangeBar: function (entity, bar) {
    if (bar) this.$el.addClass('bar');
    else this.$el.removeClass('bar');
  },

  onRender: function () {
    this.onChangeFoo(this.entity, this.entity.get('foo'));
    this.onChangeBar(this.entity, this.entity.get('bar'));
  }
});
```

Event handlers are called with the same API as [Backbone.Model/Collection events](http://backbonejs.org/#Events-catalog).  Only the following events trigger state synchronization.

```
Backbone.Model
  'all'          (model)
  'change'       (model)
  'change:value' (model, value)
Backbone.Collection
  'all'          (collection)
  'reset'        (collection)
  'change'       (collection)
```

Notably, Collection `add` and `remove` events do not trigger state synchronization, because they do not have to do with initial state, but rather iterative state.  However, one may combine them, such as `add remove reset`, if one is interested in both initial and iterative state, since `add` and `remove` will not trigger additional handler calls--only `reset` will.

For event mappings with multiple events matching the rules above, all handlers are called for each event.  This is closest to Backbone.Events behavior, but be careful because you may accidently trigger more handler calls than you intended.  In the following example, both handlers are each called with values of 'foo' and 'bar':

```
// These entityEvents
entityEvents: {
  'change:foo change:bar': 'onChangeFoo onChangeBar'
}

// Result in these calls
target.doSomething(model, model.get('foo'))
target.doSomethingElse(model, model.get('foo'))
target.doSomething(model, model.get('bar'))
target.doSomethingElse(model, model.get('bar'))
```

If one must react to two specific value changes with one or more of the same handlers, consider using a global 'change' event then checking the entity's [`changedAttributes()`](http://backbonejs.org/#Model-changedAttributes) object for the existence of the desired properties.  This is also the best approach for a familiar related scenario:

`modelEvents: { 'change:foo change:bar': 'render' }` is best handled by
`modelEvents: { 'change': 'onChange' }`, where `onChange` checks `model.changedAttributes()` for `foo` and `bar`.
