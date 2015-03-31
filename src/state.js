// Manage state for a component.
Mn.State = Mn.Object.extend({

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
  //   component:    {Marionette object} An arbitrary object for lifetime and event binding.
  //     May be any Marionette object, so long as it has a destroy() method.
  //   initialState: {attrs} Optional initial state (defaultState will still be applied)
  constructor: function (options) {
    options = options || {};
    // Bind to component
    if (options.component) this.setComponent(options.component);

    // State model class is either passed in, on the class, or a standard Backbone model
    this.modelClass = options.modelClass || this.modelClass || Bb.Model;

    this.setState(options.initialState);

    Mn.State.__super__.constructor.apply(this, arguments);
  },

  // Initialize model with attrs or reset it, destructively, to conform to attrs.
  setState: function (attrs, options) {
    this._initialState = _.extend({}, this.defaultState, attrs);

    // If model is set, reset it. Otherwise, create it.
    if (this._model) {
      this.reset(options);
    } else {
      this._model = new this.modelClass(this._initialState);
    }
  },

  // Return the state model.
  getModel: function () {
    return this._model;
  },

  // Returns the initiate state, which is reverted to by reset()
  getInitialState: function () {
    return _.clone(this._initialState);
  },

  // Return state to its initial value, destructively (uses {unset:true}).
  reset: function (options) {
    options = _.extend({ unset: true }, options);
    this._model.set(this._initialState, options);
  },

  // Proxy to model set().
  set: function () {
    if (!this._model) throw new Mn.Error('Initialize state first.');
    this._model.set.apply(this._model, arguments);
  },

  // Proxy to model get().
  get: function () {
    if (!this._model) throw new Mn.Error('Initialize state first.');
    return this._model.get.apply(this._model, arguments);
  },

  // Bind lifetime and component events to an object initialized with Backbone.Events, such as
  // a Backbone model or a Marionette object.
  setComponent: function (eventedObj) {
    this.stopListening(this._component, 'destroy');
    if (this.componentEvents) {
      this.unbindEntityEvents(this._component, this.componentEvents);
    }
    this._component = eventedObj;
    this.listenToOnce(this._component, 'destroy', this.destroy);
    if (this.componentEvents) {
      this.bindEntityEvents(this._component, this.componentEvents);
    }
  },

  // Marionette object bound to
  getComponent: function () {
    return this._component;
  },

  // Binds entityEvents to entity exactly like Marionette.bindEntityEvents, but also
  // calls certain handlers immediately for the purpose of initializing state.
  // See StateFunctions#syncEntityEvents.
  syncEntityEvents: function (entity, entityEvents) {
    Mn.State.syncEntityEvents(this, entity, entityEvents);
  }
});
