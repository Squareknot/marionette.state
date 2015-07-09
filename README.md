marionette.state
================

One-way state architecture for a Marionette.js app.

## Installation

```
npm install marionette.state
bower install marionette-state
git clone git://github.com/Squareknot/marionette.state.git
```

## Documentation

- [Reasoning](#reasoning)
- [Examples](#examples)
  - [Stateful View](#stateful-view)
  - [View Directly Dependent upon Application State](#view-directly-dependent-upon-application-state)
  - [View Indirectly Dependent upon Application State](#view-indirectly-dependent-upon-application-state)
  - [View Indirectly Dependent upon Application State with Business Service](#view-indirectly-dependent-upon-application-state-with-business-service)
  - [Sub-Applications](#sub-applications)
  - [Sub-Views](#sub-views)
- [State API](#state-api)
  - [Class Properties](#class-properties)
  - [Initialization Options](#initialization-options)
  - [Methods](#methods)
- [State Functions API](#state-functions-api)

## Reasoning

A Marionette View is a DOM representation of a Backbone model. When the model updates, so does the view.  Here is a quick example:

```js
// Region to attach views
var region = new Mn.Region({ el: '#region' });

// Model synced with '/rest-endpoint'
var model = new Backbone.Model({ url: '/rest-endpoint' });

// View will re-render when the model changes
var View = Mn.ItemView({
  modelEvents: {
    'change': 'render'
  }
});

// Create the view
var view = new View({ model: model });

// Fetch the latest data
model.fetch().done(function () {
  // Show the view with initial data
  region.show(view);
});

// Updating the model later will cause the view to re-render.
model.fetch();
```

This is great for views that are only interested in representing simple content.  Consider more complex, yet quite common, scenarios:

* **A view renders core content but also reacts to user interaction.**  E.g., a view renders a list of people, but the end user is able to select individal items with a "highlight" effect before saving changes.
* **A view renders core content but also depends on external state.**  E.g., a view renders a person's profile, but if the profile belongs to the authenticated user then enable "edit" features.
* **Multiple views share a core content model but each have unique view states.**  E.g., multiple views render a user profile object, but in completely different ways that require unique view states: an avatar beside a comment, a short bio available when hovering over an avatar, a full user profile display.

Common solutions:

* Store view states in the core content model, but override `toJSON` to avoid sending those attributes to the server.
* Store view states in the core content model shared between views, but avoid naming collisions or other confusion (which view is "enabled"?).
* Store view states directly on the view object and follow each "set" with "if different" statements so you know when a state has changed.

Each of these solutions works up until a point, but side effects mount as complexity rises: Logic-heavy views, views unreliably reflecting state changes, models doing too much leading to excessive re-renders, accidentally transmitting state data to server on save.

Separating state into its own entity and then maintaining that entity with one-way data binding solves each of these problems without the side effects of other solutions.  It is a pattern simple enough to implement using pure Marionette code, but this library seeks to simplify the implementation further by providing a state toolset.

`Mn.State` allows a view to _seamlessly depend on any source of state_ while keeping state logic self-contained and eliminates the temptation to pollute core content models with view-specific state.  Best of all, `Mn.State` does this by providing declarative and expressive tools rather than over-engineering for every use case, much like the Marionette library itself.

## Examples

In each of these examples, views are demonstrated without core content models for simplicity.  This emphasizes that state management is occurring independently from renderable core content.  Adding core content models should be familiar to any Marionette developer.

### Stateful View

From time to time, a view needs to support interactions that only affect itself.  On refresh, these states are reset.  In this example, a transient view spawns it own, also transient, State.

State flow for a simple interactive view:

1. A view is rendered with some initial state.
2. The user interacts with the view, triggering a state change.
3. The view reacts by updating the DOM according to the new state.

Solved with Mn.State:

<img src="https://docs.google.com/drawings/d/1MM7iAEzqIMYNvmasTfoO2uwR3TD9oaxuVwUKDslI8mo/pub?w=916&amp;h=269" width=640>

1. A view renders initial state.
2. The view triggers events that are handled by view state.
3. View state reacts to view events, changing its attributes.
4. The view reacts to state changes, updating the DOM.

```js
// Listens to view events and updates view state attributes.
var ToggleState = Mn.State.extend({
  defaultState: {
    active: false
  },

  componentEvents: {
    'toggle': 'onToggle'
  },

  onToggle: function () {
    var active = this.get('active');
    this.set('active', !active);
  }
});

// A toggle button that is alternately "active" or not.
var ToggleView = Mn.ItemView({
  template: 'Toggle Me',
  tagName: 'button',

  triggers: {
    'click .js-toggle': 'toggle'
  },

  stateEvents: {
    'change:active': 'onChangeActive'
  },

  // Create and sync with my own State.
  initialize() {
    this.state = new ToggleState({ component: this });
    Mn.State.syncEntityEvents(this, this.state, this.stateEvents, 'render');
  },

  // Active class will be added/removed on render and on 'active' change.
  onChangeActive(state, active) {
    if (active) {
      this.$el.addClass('is-active');
    } else {
      this.$el.removeClass('is-active');
    }
  }
});

var appRegion = new Region({ el: '#app-region' });
var toggleView = new ToggleView();
appRegion.show(toggleView);
```

### View Directly Dependent upon Application State

Relatively often, it is convenient for a view to depend on long-lived application state.  This example uses authentication status to demonstrate binding a view directly to the state of the application.

State flow for a simple view that depends directly upon long-lived application state:

1. A view is rendered with current app state.
2. The view triggers an app-level event, changing the app state.
3. The view reacts to app state changes, updating the DOM.

Solved with Mn.State:

<img src="https://docs.google.com/drawings/d/1ehZaWzewoxyN4qqxAvTBNm9gJDt4YOasRKjxEQSx6L0/pub?w=916&amp;h=269" width=640>

1. View renders initial app state.
2. View trigger events that are handled by the app state.
3. App state reacts to events, changing app state.
4. View reacts to app state changes, updating the DOM.

```js
// Listens to application level events and updates app State attributes.
var AppState = Mn.State.extend({
  defaultState: {
    authenticated: false
  },

  componentEvents: {
    'login': 'onLogin',
    'logout': 'onLogout'
  },

  onLogin() {
    this.set('authenticated', true);
  },

  onLogout() {
    this.set('authenticated', false);
  }
});

// Alternately a login or logout button depending on app authentication state.
var ToggleAuthView = Mn.ItemView({
  template: 'This Button Label Will Be Replaced',
  tagName: 'button',

  triggers: {
    'click': 'loginLogout'
  },

  appStateEvents: {
    'change:authenticated': 'onChangeAuthenticated'
  },

  // Bind to app State.
  initialize(options={}) {
    this.appState = options.appState;
    this.appChannel = Radio.channel('app');
    Mn.State.syncEntityEvents(this, this.appState, this.appStateEvents, 'render');
  },

  // Button text will be updated on every render and `action` change.
  onChangeAuthenticated(appState, authenticated) {
    if (authenticated) {
      this.$el.text('Logout');
    } else {
      this.$el.text('Login');
    }
  },

  // Login/logout toggle will always fire the appropriate action.
  loginLogout() {
    if (this.appState.get('authenticated')) {
      Radio.trigger('app', 'logout');
    } else {
      Radio.request('app', 'login');
    }
  }
});

var appChannel = Radio.channel('app');
var appState = new AppState({ component: appChannel });
var toggleAuthView = new ToggleAuthView({ appState: appState });

var appRegion = new Region({ el: '#app-region' });
appRegion.show(toggleAuthView);
```

### View Indirectly Dependent upon Application State

Sometimes a view has its own, transient, internal state that is related to long-lived application state.  While this particular example doesn't require that layer of indirection to achieve its goal (a Login/Logout button), the goal here is to demonstrate all that is necessary to achieve two tiers of State.

State flow for a simple view that depends indirectly on long-lived application state:

1. View is rendered with initial state reliant upon current app state.
2. View triggers an app-level event, changing the app state.
3. App state change effects a view state change.
4. View reacts to view state changes, updating the DOM.

Solved with Mn.State:

<img src="https://docs.google.com/drawings/d/1Cqrf81pYEwITbZlNYKKTvEGPUBUBC1vzdt6S_g0gvzM/pub?w=884&amp;h=562" width=640>

1. View state synchronizes with app state.
2. View renders initial view state.
2. View triggers events that are handled by app state.
3. App state reacts to events, changing app state.
5. View state reacts to app state changes, synchronizing.
6. View reacts to view state changes, updating the DOM.

```js
// Listens to application level events and updates state attributes.
var AppState = Mn.State.extend({
  defaultState: {
    authenticated: false
  },

  componentEvents: {
    'login': 'onLogin',
    'logout': 'onLogout'
  },

  onLogin() {
    this.set('authenticated', true);
  },

  onLogout() {
    this.set('authenticated', false);
  }
});

// Syncs with application State.
var ToggleAuthState = Mn.State.extend({
  defaultState: {
    action: 'login'
  },

  appStateEvents: {
    'change:authenticated': 'onChangeAuthenticated'
  },

  initialize(options={}) {
    this.appState = options.appState;
    this.syncEntityEvents(this.appState, this.appStateEvents);
  },

  // Called on initialize and on change app 'authenticated'.
  onChangeAuthenticated(appState, authenticated) {
    if (authenticated) {
      this.set('action', 'logout');
    } else {
      this.set('action', 'login');
    }
  }
});

// Alternately a login or logout button depending on app authentication state.
var ToggleAuthView = Mn.ItemView({
  template: 'This Button Label Will Be Replaced',
  tagName: 'button',

  triggers: {
    'click': 'loginLogout'
  },

  stateEvents: {
    'change:action': 'onChangeAction'
  },

  // Create and bind to my own State, which is injected with app State.
  initialize(options={}) {
    this.appChannel = Radio.channel('app');
    this.state = new ToggleAuthState({
      appState: options.appState,
      component: this
    });
    Mn.State.syncEntityEvents(this, this.state, this.stateEvents, 'render');
  },

  // Button text will be updated on every render and 'action' change.
  onChangeAction(state, action) {
    this.$el.text(action);
  },

  // Login/logout toggle will always fire the appropriate action.
  loginLogout() {
    this.appChannel.trigger(this.state.get('action'));
  }
});

var appChannel = Radio.channel('app');
var appState = new AppState({ component: appChannel });
var toggleAuthView = new ToggleAuthView({ appState: appState });

var appRegion = new Region({ el: '#app-region' });
appRegion.show(toggleAuthView);
```

### View Indirectly Dependent upon Application State with Business Service

An application with a business layer for handling persistence to a server is just one more step--the addition of an app controller that responds to Radio requests.

State flow for a simple view that depends indirectly on long-lived application state connected to a business service:

1. View is rendered with initial state reliant upon current app state.
2. View makes an app-level request, affecting business objects and resulting in an app state change.
3. App state change causes a view state change.
4. View reacts to view state changes, updating the DOM.

Solved with Mn.State:

<img src="https://docs.google.com/drawings/d/1mhmOwNhoP4a9dV8jejpQAac03gGOehT7ZQnQwNDHi5o/pub?w=915&amp;h=618" width=640>

1. View state synchronizes with app state.
2. View renders initial view state.
2. View triggers events that are handled by app state.
3. App state reacts to events, changing app state.
5. View state reacts to app state changes, synchronizing.
6. View reacts to view state changes, updating the DOM.

```js
// Listens to application level events and updates state attributes.
var AppState = Mn.State.extend({
  defaultState: {
    authenticated: false
  },

  componentEvents: {
    'login': 'onLogin',
    'logout': 'onLogout'
  },

  onLogin() {
    this.set('authenticated', true);
  },

  onLogout() {
    this.set('authenticated', false);
  }
});

// App controller fields application level requests and triggers application events.
var AppController = Mn.Object.extend({
  radioRequests() { return {
    'login': this.login,
    'logout': this.logout
  }},

  initialize(options={}) {
    this.channel = Radio.channel('app');
    this.state = new AppState({
      component: this.channel
    });
    Radio.reply('app', this.radioRequests(), this);
  },

  login() {
    // Assume Backbone.$.ajax is shimmed to return ES6 Promises.
    return Backbone.$.ajax('/api/session', { method: 'POST' })
      .then(() => {
        this.trigger('login');
      })
      .catch(() => {
        this.trigger('logout');
      });
  },

  logout() {
    return Backbone.$.ajax('/api/session', { method: 'DELETE' })
      .then(() => {
        this.trigger('logout');
      });
  }
});

// Syncs with application State.
var ToggleAuthState = Mn.State.extend({
  defaultState: {
    action: 'login'
  },

  appStateEvents: {
    'change:authenticated': 'onChangeAuthenticated'
  },

  // Sync with application state.
  initialize(options={}) {
    this.appState = options.appState;
    this.syncEntityEvents(this.appState, this.appStateEvents);
  },

  // Called on initialize and on change app 'authenticated'.
  onChangeAuthenticated(appState, authenticated) {
    if (authenticated) {
      this.set('action', 'logout');
    } else {
      this.set('action', 'login');
    }
  }
});

// Alternately a login or logout button depending on app authentication state.
var ToggleAuthView = Mn.ItemView({
  template: 'This Button Label Will Be Replaced',
  tagName: 'button',

  triggers: {
    'click': 'loginLogout'
  },

  stateEvents: {
    'change:action': 'onChangeAction'
  },

  // Create and sync with my own State injected with app State.
  initialize(options={}) {
    this.appChannel = Radio.channel('app');
    this.state = new ToggleAuthState({
      appState: options.appState,
      component: this
    });
    Mn.State.syncEntityEvents(this, this.state, this.stateEvents, 'render');
  },

  // Button text will be updated on every render and 'action' change.
  onChangeAction(state, action) {
    this.$el.text(action);
  },

  // Login/logout toggle will always fire the appropriate action.
  loginLogout() {
    this.appChannel.request(this.state.get('action'));
  }
});

var appController = new AppController();
var appState = appController.getState();
var toggleAuthView = new ToggleAuthView({ appState: appState });

var appRegion = new Region({ el: '#app-region' });
appRegion.show(toggleAuthView);
```

### Sub-Applications

Within an application modularized into sub-applications, state can cascade from app -> sub-app -> view.  In this particular configuration, Radio can be used to make both sub-application and application requests.

<img src="https://docs.google.com/drawings/d/1NXH3_U2d_FkImq7J-il3o7wXdcwEi_4OvXX2L_DPRHI/pub?w=1086&amp;h=921" width=640>

### Sub-Views

Within a deeply nested, complex view that requires a deeper layer of state, perhaps for child views within a CollectionView, state can cascade from app -> view -> sub-view.

<img src="https://docs.google.com/drawings/d/1ISI1y-UtU_fZgxBp4b-R9dstfrABSOrADiuUtjDJPKE/pub?w=1086&amp;h=921" width=640>

## State API

### Class Properties

##### `modelClass`

Optional Backbone.Model class to instantiate, otherwise a pure Backbone.Model will be used.

##### `defaultState`

Optional default state attributes hash.  These will be applied to the underlying model when it is initialized.

##### `componentEvents`

Optional hash of component event bindings.  Enabled by passing `{ component: <Marionette object> }` as an option or by using a StateBehavior, in which case `component` is the view.

### Initialization Options

##### `initialState`

Optional initial state attributes.  These attributes are combined with `defaultState` for initializing the underlying state model, and become the basis for future `reset()` calls.

##### `component`

Optional Marionette object to which to bind lifecycle and events.  The `componentEvents` events hash is bound to `component`.  When `component` is destroyed the State instance is also destroyed, unless `preventDestroy: true` is also passed.

##### `preventDestroy`

Only applies when `component` is provided.  By default, the State instance is destroyed when `component` is destroyed, but`preventDestroy: true` will prevent this behavior.

### Methods

##### `getModel()`

Returns the underlying model.

##### `getInitialState()`

A clone of model's attributes at initialization.

##### `get(attr)`

Proxy to model `get(attr)`.

##### `set(key, val, options)`

Proxy to model `set(key, val, options)`.

##### `reset(attrs, options)`

Resets model to its attributes at initialization.  If any `attrs` are provided, they will override the initial value.  `options` are passed to the underlying model `#set`.

##### `getChanged()`

Proxy to model `changedAttributes()`.

##### `getPrevious()`

Proxy to model `previousAttributes()`.

##### `hasAnyChanaged(...attrs)`

Determine if any of the passed attributes were changed during the last modification.  Example:

```js
var StatefulView = Mn.ItemView.extend({
  template: false,

  stateEvents: {
    'change': 'onStateChange'
  },

  initialize(options={}) {
    this.state = options.state;
    Mn.State.syncEntityEvents(this, this.state, this.stateEvents, 'render');
  },

  onStateChange(state) {
    if (!state.hasAnyChanged('foo', 'bar')) {
      this.$el.addClass('is-foo-bar');
    } else {
      this.$el.removeClass('is-foo-bar');
    }
  }
});
```

##### `bindComponent(component, options)`

Bind `componentEvents` to `component` and cascade destroy to self when component fires 'destroy'.  This prevents a state from outliving its component and causing a memory leak.  To prevent self-destroy behavior, pass `preventDestroy: true` as an option.

##### `unbindComponent(component)`

Unbind `componentEvents` from `component` and stop listening to component 'destroy' event.

##### `syncEntityEvents(entity, bindings, event)`

Attaches event bindings `bindings` to `entity` using `Mn.bindEntityEvents`.  Ensures initial state is synchronized as well by calling `bindings` handlers whenever State fires `event` or else calls them immediately if `event` is not defined.  Returns a `Syncing` instance, which contains a single public method `#stop` that may be used to cancel the syncing.

## State Functions API

##### `syncEntityEvents(target, entity, bindings, event)`

Attaches event bindings `bindings` to `entity` using `Mn.bindEntityEvents` in the context of `target`.  Ensures initial state is synchronized as well by calling `bindings` handlers whenever `target` fires `event` or else calls them immediately if `event` is not defined.

Event handlers are called with the same arguments [as defined in Backbone](http://backbonejs.org/#Events-catalog).  Only the following event bindings will be synchronized.

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

Notably, Collection `add` and `remove` event handlers will not be synchronized, because they do not have a backing value (the added or removed element is not known until the event occurs).  However, one may combine them with `reset` if one is interested in a syncable state that also tracks with changes in the collection.

Just like Backbone, all handlers will be called for all supported events.  In the following binding, both `handler1` and `handler2` will be called twice on sync--once with the value of `foo` and once with the value of `bar`:

```js
{ 'change:foo change:bar': 'handler1 handler2' }
```

###### Example without syncEntityEvents

```js
var View = Mn.ItemView.extend({

  entityEvents: {
    'change:foo': 'onChangeFoo'
  }

  initialize() {
    this.entity = new Backbone.Model({
      foo: true 
    });
    this.bindEntityEvents(this.entity, this.entityEvents);
  },

  onChangeFoo(entity, foo) {
    if (foo) {
      this.$el.addClass('foo');
    } else {
      this.$el.removeClass('foo');
    }
  },

  onRender() {
    this.onChangeFoo(this.entity, this.entity.get('foo'));
  }
});
```

###### Example with syncEntityEvents

```js
var View = Mn.ItemView.extend({

  entityEvents: {
    'change:foo': 'onChangeFoo'
  }

  initialize() {
    this.entity = new Backbone.Model({
      foo: 1 
    });
    Mn.State.syncEntityEvents(this, this.entity, this.entityEvents, 'render');
  },

  onChangeFoo(entity, foo) {
    if (foo) {
      this.$el.addClass('foo');
    } else {
      this.$el.removeClass('foo');
    }
  }
);
```
