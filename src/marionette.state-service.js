/* global Bb, Mn, _ */

var StateService = Mn.Object.extend({

  // Optional Model class to instantiate
  stateModel: undefined,

  // Default state attributes hash overridable by constructor 'state' option
  defaultState: undefined,

  // State model instance
  _state: undefined,

  // Last object my lifecycle was bound to
  _boundTo: undefined,

  // Initial state attributes hash after defaults and constructor 'state' option are applied
  _initialState: undefined,

  // options {
  //   bindTo:     {Marionette.Object} An arbitrary object for lifetime binding
  //   state:      {Model|attrs} Optional initial state (defaultState will still be applied)
  //   stateModel: {Model class} Model class to represent state
  // }
  constructor: function (options) {
    options = options || {};
    // Bind lifetime to object
    if (options.bindTo) this.bindTo(options.bindTo);

    // State model class is either passed in, on the class, or a standard Backbone model
    this.stateModel = options.stateModel || this.stateModel || Bb.Model;

    // Optionally set state, otherwise state will be initialized lazily on getState()
    this.setState(options.state, { silent: true });

    StateService.__super__.constructor.apply(this, arguments);
  },

  // state: {Model|attrs} Set current state and overwrite initial state
  setState: function (state, options) {
    var attrs;

    if (state instanceof Bb.Model) {
      this._state = state;
      attrs = state.attributes;
    } else {
      attrs = state;
    }

    this._initialState = _.extend({}, this.defaultState, attrs);

    // If state model is set, reset it. Otherwise, create it.
    if (this._state) {
      this.resetState(options);
    } else {
      this._state = new this.stateModel(this._initialState);
    }
  },

  // Return state model
  getState: function () {
    return this._state;
  },

  // Return state to its value at instantiation time
  resetState: function (options) {
    options = _.extend({}, options, { unset: true });
    this._state.set(this._initialState, options);
  },

  // Proxy to state model set()
  stateSet: function () {
    if (!this._state) throw new Error('Initialize state first');
    this._state.set.apply(this._state, arguments);
  },

  // Proxy to state model get()
  stateGet: function () {
    if (!this._state) throw new Error('Initialize state first');
    return this._state.get.apply(this._state, arguments);
  },

  // Bind lifetime to another Marionette object
  bindTo: function (mnObj) {
    if (!mnObj.destroy) throw new Error('Must provide a Marionette object for binding');
    this.listenToOnce(mnObj, 'destroy', this.destroy);
    this._boundTo = mnObj;
  },

  boundTo: function () {
    return this._boundTo;
  }
});

Mn.StateService = StateService;
