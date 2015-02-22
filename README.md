marionette.state-service
========================

A manager for consolidated application, component, or view state.

## Reasoning

Core Backbone philosophy maintains that all apparent visual state corresponds directly to model attributes, and changes in a model cause a view to update.  This philosophy is implemented perfectly when each and every change to the DOM is rooted in a model change.

In an ideal Backbone app, therefore, the chief problem is mapping all possible application, component, and view states to Backbone models.  Once this problem is solved, views are only responsible for rendering the model states.

Once all states are mapped to models, the second problem is triggering changes to those states.  State changes may involve business logic, enough so that separating business logic from views is an important separation of concerns.  Ideally, views should report events but never change a model directly.

The two problems just described are solved succinctly with a uni-directional flow of events and state changes that operates as follows:

1. View/component/application triggers business event.
2. State service receives event, applies business logic, changes state model.
3. View renders state change.

<img class="diagram" src="https://docs.google.com/drawings/d/13_kBAF5IIl2MbJkPDo4rj_U0VG-QKRv8mWkkwYIJFPI/pub?w=960&amp;h=720" height=480>

In essence, Marionette.StateService is a business logic container, which only exists to 1. Process business events and 2. Change a state model.  By integrating a state model into its API, StateService conveniently makes state a first-class Marionette concept.

## Installation

```
git clone git://github.com/Squareknot/marionette.state-service.git
bower install marionette.state-service
npm install marionette.state-service
```

## Documentation

- [Examples](#examples)
  - [Soft Radio Buttons with Dynamic State Model](#soft-radio-buttons-with-dynamic-state-model)
  - [Soft Radio Buttons with External Model](#soft-radio-buttons-with-external-model)
- [API](#api)
  - [Class Properties](#class-properties)
  - [Initialization Options](#initialization-options)
  - [Methods](#methods)

## Examples

### Soft Radio Buttons with Dynamic State Model

This example demonstrates software implemented radio buttons obeying the following logic:

- Each radio button is either selected or not selected
- Only one radio button may be selected at a time

Each radio buttons in turn triggers the following events:

- 'select' advertising it has been selected

A radio button state service must detect a select event and set its state depending on whether the select event targets itself or another radio button:

- If the select target is itself, set state selected to true
- If the select target is not itself, set state selected to false

By separating concerns, business logic is discretely maintained within a state service.  Further, by separating transient view state from the data, non-persistent attributes will not complicate the core data models.

```js
// Option model
var Option = Backbone.Model.extend({
  defaults: {
    label: undefined // Data attribute
  }
});

// Options collection
var Options = Backbone.Collection.extend({
  model: Option
});

// Radio button state service
var RadioState = Marionette.StateService.extend({
  defaultState: {
    selected: false
  },

  events: {
    'select': 'onSelect'
  },

  radioButton: undefined,

  initialize: function (options) {
    options = options || {};
    this.radioButton = this.boundTo();
    this.bindEntityEvents(options.emitter, this.events)
  },

  onSelect: function (radioButton) {
    this.stateSet({
      selected: radioButton === this.radioButton
    });
  }
});

// Individual radio button
var RadioButton = Marionette.ItemView.extend({
  template: '<%- label %>',
  tagName: 'a',
  className: 'radio-button',
  attributes: {
    tabIndex: 0
  },
  
  // Convert DOM events to business events
  events: {
    'click': function () {
      this.emitter.trigger('select', this);
    }
  },

  // React to state changes
  stateEvents: {
    'change:selected': 'onChangeSelected'
  },

  // React to data changes
  modelEvents: {
    'change': 'render'
  },

  // Component event emitter
  emitter: undefined,

  initialize: function (options) {
    options = options || {};
    this.emitter = options.emitter;
    this.state = options.state;

    var radioService = new Marionette.StateService({
      emitter: this.emitter,
      // "Binding" has the effect of cleaning up the service on view destroy
      bindTo: this
    });
    var state = radioService.getState();

    this.bindEntityEvents(state, this.stateEvents);
  },

  // Initialize rendering from state
  onRender: function () {
    this.onChangeSelected(state, this.state.get('selected'));
  },

  // State change
  onChangeSelected: function (state, selected) {
    if (selected) this.$el.addClass('selected')
    else this.$el.removeClass('selected');
  }
});

var RadioButtons = Marionette.CollectionView.extend({
  childView: RadioButton,

  initialize: function () {
    // Component event emitter uniting the child views
    var emitter = _.extend({}, Backbone.Events);
    this.childViewOptions = { emitter: emitter };
  }
});

var options = new Options([{
  label: 'One'
}, {
  label: 'Two' 
}, {
  label: 'Three'
}])

var radioButtons = new RadioButtons() {
  collection: options
};

someRegion.show(radioButtons);
```

While this architecture may seem overkill for this tiny example, consider the following ways state management may grow:

- Dependencies on application state, not only internal events
- Multiple state attributes
- Multiple internal events
- Complex business logic
- Any combination of the above

By building an application and its components around state services, state management can scale as complexity grows.

### Soft Radio Buttons with External Model

By making a small change, the first example can be modified to leverage an external model rather than using a dynamic state model for each state service.

This is fine for simple use cases, but view state will also be transmitted to the server on sync unless measures are taken to filter out the state attributes.  In more complex cases, it may not be desirable to write view state to the core data models.  Regardless, Marionette.StateService can handle either.

```js
// Option model
var Option = Backbone.Model.extend({
  defaults: {
    label: undefined, // Data attribute
    selected: false   // State attribute
  }
});

// Options collection
var Options = Backbone.Collection.extend({
  model: Option
});

// Radio button state service
var RadioState = Marionette.StateService.extend({
  events: {
    'select': 'onSelect'
  },

  radioButton: undefined,

  initialize: function (options) {
    options = options || {};
    this.radioButton = this.boundTo();
    this.bindEntityEvents(options.emitter, this.events)
  },

  onSelect: function (radioButton) {
    this.stateSet({
      selected: radioButton === this.radioButton
    });
  }
});

// Individual radio button
var RadioButton = Marionette.ItemView.extend({
  template: '<%- label %>',
  tagName: 'a',
  className: 'radio-button',
  attributes: {
    tabIndex: 0
  },
  
  // Convert DOM events to business events
  events: {
    'click': function () {
      this.emitter.trigger('select', this);
    }
  },

  // React to data and state changes
  modelEvents: {
    'change:label': 'render',
    'change:selected': 'onChangeSelected'
  },

  // Component event emitter
  emitter: undefined,

  initialize: function (options) {
    options = options || {};
    this.emitter = options.emitter;

    var radioService = new Marionette.StateService({
      emitter: this.emitter,
      // Leverage the view's model for state
      state: this.model,
      // "Binding" has the effect of cleaning up the service on view destroy
      bindTo: this
    });
  },

  // Initialize rendering from state on model
  onRender: function () {
    this.onChangeSelected(state, this.model.get('selected'));
  },

  // State change
  onChangeSelected: function (state, selected) {
    if (selected) this.$el.addClass('selected')
    else this.$el.removeClass('selected');
  }
});

var RadioButtons = Marionette.CollectionView.extend({
  childView: RadioButton,

  initialize: function () {
    // Component event emitter uniting the child views
    var emitter = _.extend({}, Backbone.Events);
    this.childViewOptions = { emitter: emitter };
  }
});

var options = new Options([{
  label: 'One'
}, {
  label: 'Two' 
}, {
  label: 'Three'
}])

var radioButtons = new RadioButtons() {
  collection: options
};

someRegion.show(radioButtons);
```

## API

### Class Properties

#### `stateModel`

Optional state model class to instantiate, otherwise a pure Backbone.Model

#### `defaultState`

Optional default state attributes hash.  This will act as defaults no matter how state is set: 1. created internally, 2. external model is passed, 3. attributes hash is passed.

### Initialization Options

#### `bindTo`

Marionette.Object to which to bind lifetime.  When target is destroyed, the StateServer instance is also destroyed.  This is useful when a state service is instantiated from a view.

#### `state`

Either an attributes hash initializing state or a model instance.  A model instance will become the state model.  In both cases defaultState is applied.

#### `stateModel`

In the case a model instance is not supplied, a staste model will be created from this class (overrides the class property of the same name).

### Methods

#### `setState(state)`

`state` may be either a model instance or an attributes hash.  In the model instance case, `setState()` replaces the state model.  In attributes case, it hard resets (`{unset: true}`) the exisiting model.  In either case, the internal "initial state" used by `resetState()` is updated.

#### `getState()`

Returns the state model.

#### `resetState()`

Resets the state model to its value as of initialization or the last `setState()`.

#### `stateSet(...)`

Proxy to state model `set()`.

#### `stateGet(...)`

Proxy to state model `get()`.

#### `bindTo(mnObject)`

Bind lifetime to another Marionette object.  When object is destroyed, state service will be destroyed in turn.

#### `boundTo()`

Return last object bound to.
