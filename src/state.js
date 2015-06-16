import _ from 'underscore';
import Backbone from 'backbone';
import Mn from 'backbone.marionette';

// Manage state for a component.
const State = Mn.Object.extend({

  // State model class to instantiate
  modelClass: undefined,

  // Default state attributes hash
  defaultState: undefined,

  // Events from my component
  componentEvents: undefined,

  // State model instance
  _model: undefined,

  // My component, facilitating lifecycle management and event bindings
  _component: undefined,

  // Initial state attributes hash after 'initialState' option and defaults are applied
  _initialState: undefined,

  // options {
  //   bindLifecycle: {Mn object} Optionally bind lifecycle to object.
  //   initialState: {attrs} Optional initial state (defaultState will still be applied)
  constructor(options={}) {
    if (options.bindLifecycle) { this.bindLifecycle(options.bindLifecycle); }

    // State model class is either passed in, on the class, or a standard Backbone model
    this.modelClass = options.modelClass || this.modelClass || Backbone.Model;

    // Initialize state
    this.initState(options.initialState);

    State.__super__.constructor.apply(this, arguments);
  },

  // Initialize model with attrs or reset it, destructively, to conform to attrs.
  initState(attrs, options) {
    // Set initial state.
    this._initialState = _.extend({}, this.defaultState, attrs);

    if (this._model) {
      // Reset existing model with initial state.
      this.reset(null, options);
    } else {
      // Create new model with initial state.
      /* eslint-disable new-cap */
      this._model = new this.modelClass(this._initialState);
      this._proxyModelEvents(this._model);
    }

    return this;
  },

  // Returns the initiate state, which is reverted to by reset()
  getInitialState() {
    return _.clone(this._initialState);
  },

  // Return the state model.
  getModel() {
    return this._model;
  },

  // Proxy to model set().
  set() {
    if (!this._model) { throw new Mn.Error('Initialize state first.'); }
    this._model.set.apply(this._model, arguments);
    return this;
  },

  // Proxy to model get().
  get() {
    if (!this._model) { throw new Mn.Error('Initialize state first.'); }
    return this._model.get.apply(this._model, arguments);
  },

  // Return state to its initial value.
  // If `attrs` is provided, they will override initial values for a "partial" reset.
  reset(attrs, options) {
    var resetAttrs = _.extend({}, this._initialState, attrs);
    this._model.set(resetAttrs, options);
    return this;
  },

  // Proxy to model changedAttributes().
  getChanged() {
    return this._model.changedAttributes();
  },

  // Proxy to model previousAttributes().
  getPrevious() {
    return this._model.previousAttributes();
  },

  // Determine if any of the passed attributes were changed during the last modification.
  hasAnyChanged(...attrs) {
    return !!_.chain(this._model.changed)
      .keys()
      .intersection(attrs)
      .size()
      .value();
  },

  syncComponent(component, stateEvents, syncEvent) {
    if (_.isString(stateEvents)) {
      syncEvent = stateEvents;
    } else {
      stateEvents = stateEvents || component.stateEvents;
    }

    if (this.componentEvents) {
      this.bindEntityEvents(component, this.componentEvents);
    }
    if (stateEvents) {
      State.syncEntityEvents(component, this, stateEvents, syncEvent);
    }
    return this;
  },

  stopSyncingComponent(component, stateEvents, syncEvent) {
    if (this.componentEvents) {
      this.unbindEntityEvents(component, this.componentEvents);
    }
    State.stopSyncingEntityEvents(component, this, stateEvents, syncEvent);
    return this;
  },

  bindLifecycle(component) {
    if (!this._boundDestroy) { this.boundDestroy = this.destroy.bind(this); }
    this.listenTo(component, 'destroy', this._boundDestroy);
    return this;
  },

  unbindLifecycle(component) {
    this.stopListening(component, 'destroy', this._boundDestroy);
  },

  // Proxy to StateFunctions#syncEntityEvents.
  syncEntityEvents(entity, entityEvents, event) {
    State.syncEntityEvents(this, entity, entityEvents, event);
    return this;
  },

  _proxyModelEvents: function (other) {
    this.listenTo(other, 'all', function () {
      if (arguments.length > 1 && arguments[1] === this._model) {
        arguments[1] = this;
      }
      this.trigger.apply(this, arguments);
    }.bind(this));
  }
});

export default State;
