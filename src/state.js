import _ from 'underscore';
import Bb from 'backbone';
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
  //   initialState: {object} Attributes that will override `defaultState`.  The result of
  //     defaultState + initialState is the state reverted to by `#reset`.
  //   component: {Mn object} Object to which to bind `componentEvents` and also lifecycle;
  //     i.e., when `component` fires 'destroy', then destroy myself.
  //   preventDestroy: {boolean} If true, then this will not destroy on `component` destroy.
  // }
  constructor({ initialState, component, preventDestroy }={}) {
    Object.defineProperty(this, 'attributes', {
      get: function () {
        return this._model.attributes;
      },
      set: function (attributes) {
        this._model.attributes = attributes;
      }
    });

    // State model class is either passed in, on the class, or a standard Backbone model
    this.modelClass = this.modelClass || Bb.Model;

    // Initialize state
    this._initState(initialState);

    if (component) {
      this.bindComponent(component, { preventDestroy });
    }

    State.__super__.constructor.apply(this, arguments);
  },

  // Initialize model with attrs or reset it, destructively, to conform to attrs.
  _initState(attrs) {
    // Set initial state.
    this._initialState = _.extend({}, this.defaultState, attrs);

    // Create new model with initial state.
    /* eslint-disable new-cap */
    this._model = new this.modelClass(this._initialState);
    this._proxyModelEvents(this._model);
  },

  // Return the state model.
  getModel() {
    return this._model;
  },

  // Returns the initiate state, which is reverted to by reset()
  getInitialState() {
    return _.clone(this._initialState);
  },

  // Proxy to model get().
  get(attr) {
    return this._model.get(attr);
  },

  // Proxy to model set().
  set(key, val, options) {
    this._model.set(key, val, options);
    return this;
  },

  // Return state to its initial value.
  // If `attrs` is provided, they will override initial values for a "partial" reset.
  // Initial state will remain unchanged regardless of override attributes.
  reset(attrs, options) {
    var resetAttrs = _.extend({}, this._initialState, attrs);
    this._model.set(resetAttrs, options);
    return this;
  },

  // Proxy to model changedAttributes().
  changedAttributes() {
    return this._model.changedAttributes();
  },

  // Proxy to model previous().
  previous(attr) {
    return this._model.previous(attr);
  },

  // Proxy to model previousAttributes().
  previousAttributes() {
    return this._model.previousAttributes();
  },

  // Whether any of the passed attributes were changed during the last modification
  hasAnyChanged(...attrs) {
    return State.hasAnyChanged(this, ...attrs);
  },

  // Bind `componentEvents` to `component` and cascade destroy to self when component fires
  // 'destroy'.  To prevent self-destroy behavior, pass `preventDestroy: true` as an option.
  bindComponent(component, { preventDestroy }={}) {
    this.bindEntityEvents(component, this.componentEvents);
    if (!preventDestroy) {
      this.listenTo(component, 'destroy', this.destroy);
    }
  },

  // Unbind `componentEvents` from `component` and stop listening to component 'destroy' event.
  unbindComponent(component) {
    this.unbindEntityEvents(component, this.componentEvents);
    this.stopListening(component, 'destroy', this.destroy);
  },

  // Proxy to StateFunctions#syncEntityEvents.
  syncEntityEvents(entity, entityEvents, event) {
    State.syncEntityEvents(this, entity, entityEvents, event);
    return this;
  },

  // Convert model events to state events
  _proxyModelEvents(other) {
    this.listenTo(other, 'all', function () {
      if (arguments.length > 1 && arguments[1] === this._model) {
        // Replace model argument with State
        arguments[1] = this;
      }
      this.trigger.apply(this, arguments);
    });
  }
});

export default State;
