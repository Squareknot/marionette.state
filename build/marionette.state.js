(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('underscore'), require('backbone'), require('backbone.marionette')) : typeof define === 'function' && define.amd ? define(['underscore', 'backbone', 'backbone.marionette'], factory) : global.Marionette.State = factory(global._, global.Backbone, global.Mn);
})(this, function (_, Backbone, Mn) {
  'use strict';

  var changeMatcher = /^change:(.+)/;
  var spaceMatcher = /\s+/;

  // Call all handlers optionally with a value (given a named attribute 'attr')
  function callHandlers(target, entity, handlers, attr) {
    var value = attr ? entity.get(attr) : undefined;

    if (_.isFunction(handlers)) {
      handlers.call(target, entity, value);
    } else {
      var handlerKeys = handlers.split(spaceMatcher);
      _.each(handlerKeys, function (handlerKey) {
        target[handlerKey](entity, value);
      });
    }
  }

  // Sync 'target' with event 'event1' and its handlers 'handler1 handler2', depending on event
  // and entity type.  Call value handlers for Backbone.Model 'change:attr' events, and call generic
  // handlers for Backbone.Model 'change', 'all' or Backbone.Collection 'change', 'all', or 'reset'.
  function syncBinding(target, entity, event, handlers) {
    var changeMatch;
    if (event === 'change' || event === 'all' || entity instanceof Backbone.Collection && event === 'reset') {
      callHandlers(target, entity, handlers);
    } else if ((entity instanceof Backbone.Model || entity instanceof _state) && (changeMatch = event.match(changeMatcher))) {
      var attr = changeMatch[1];
      callHandlers(target, entity, handlers, attr);
    }
  }

  // Sync 'target' with an array of events ['event1', 'event2'] and their handlers
  // 'handler1 handler2'.
  function syncBindings(target, entity, events, handlers) {
    _.each(events, function (event) {
      syncBinding(target, entity, event, handlers);
    });
  }

  // Sync 'target' with the bindings hash { 'event1 event 2': 'handler1 handler2' }.
  function sync(target, entity, bindings) {
    _.each(bindings, function (handlers, eventStr) {
      var events = eventStr.split(spaceMatcher);
      syncBindings(target, entity, events, handlers);
    });
  }

  function Syncing(target, entity, bindings) {
    this.target = target;
    this.entity = entity;
    this.bindings = bindings;
  }

  Syncing.prototype.when = function (eventObj, event) {
    var _this = this;

    if (!event) {
      event = eventObj;
      eventObj = this.target;
    }
    this.eventObj = eventObj;
    this.event = event;
    this.handler = function () {
      sync(_this.target, _this.entity, _this.bindings);
    };

    this.target.__syncingEntityEvents = this.target.__syncingEntityEvents || [];
    this.target.__syncingEntityEvents.push(this);
    this.target.listenTo(this.eventObj, this.event, this.handler);
    return this;
  };

  Syncing.prototype.now = function () {
    sync(this.target, this.entity, this.bindings);
    return this;
  };

  // Binds 'bindings' handlers located on 'target' to 'entity' using
  // Marionette.bindEntityEvents, but then initializes state by calling handlers:
  //   Backbone.Model
  //     'all'          (model)
  //     'change'       (model)
  //     'change:value' (model, value)
  //   Backbone.Collection
  //     'all'          (collection)
  //     'reset'        (collection)
  //     'change'       (collection)
  //
  // Handlers are called immediately unless 'event' is supplied, in which case handlers will be
  // called every time 'target' triggers 'event'. Views will automatically sync on 'render'
  // unless this argument is supplied.
  //
  // For event mappings with multiple matching events, all handlers are called for each event.
  // For example, the following mapping:
  //   { 'change:foo change:bar': 'doSomething doSomethingElse' }
  // will call:
  //   doSomething(model, model.get('foo'))
  //   doSomethingElse(model, model.get('foo'))
  //   doSomething(model, model.get('bar'))
  //   doSomethingElse(model, model.get('bar'))
  function _syncEntityEvents(target, entity, bindings, event) {
    Mn.bindEntityEvents(target, entity, bindings);
    var syncing = new Syncing(target, entity, bindings);
    if (event) {
      syncing.when(event);
    } else {
      syncing.now();
    }
  }

  // Ceases syncing entity events.
  function stopSyncingEntityEvents(target, entity, bindings) {
    Mn.unbindEntityEvents(target, entity, bindings);
    if (target.__syncingEntityEvents) {
      _.each(target.__syncingEntityEvents, function (syncing) {
        target.stopListening(syncing.eventObj, syncing.event, syncing.handler);
      });
    }
  }

  var State = Mn.Object.extend({

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
    constructor: function constructor(options) {
      options = options || {};
      // Bind to component
      if (options.component) {
        this.setComponent(options.component);
      }

      // State model class is either passed in, on the class, or a standard Backbone model
      this.modelClass = options.modelClass || this.modelClass || Backbone.Model;

      // Initialize state
      this.initState(options.initialState);

      State.__super__.constructor.apply(this, arguments);
    },

    // Initialize model with attrs or reset it, destructively, to conform to attrs.
    initState: function initState(attrs, options) {
      // Set initial state.
      this._initialState = _.extend({}, this.defaultState, attrs);

      if (this._model) {
        // Reset existing model with initial state.
        this.reset(null, options);
      } else {
        // Create new model with initial state.
        /* eslint-disable new-cap */
        this._model = new this.modelClass(this._initialState);
        this._proxyEvents(this._model);
      }
    },

    // Bind lifetime and component events to an object initialized with Backbone.Events, such as
    // a Backbone model or a Marionette object.
    setComponent: function setComponent(eventedObj) {
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

    // Returns the initiate state, which is reverted to by reset()
    getInitialState: function getInitialState() {
      return _.clone(this._initialState);
    },

    // Marionette object bound to
    getComponent: function getComponent() {
      return this._component;
    },

    // Return the state model.
    getModel: function getModel() {
      return this._model;
    },

    // Proxy to model set().
    set: function set() {
      if (!this._model) {
        throw new Mn.Error('Initialize state first.');
      }
      this._model.set.apply(this._model, arguments);
    },

    // Proxy to model get().
    get: function get() {
      if (!this._model) {
        throw new Mn.Error('Initialize state first.');
      }
      return this._model.get.apply(this._model, arguments);
    },

    // Return state to its initial value.
    // If `attrs` is provided, they will override initial values for a "partial" reset.
    reset: function reset(attrs, options) {
      var resetAttrs = _.extend({}, this._initialState, attrs);
      this._model.set(resetAttrs, options);
    },

    // Proxy to model changedAttributes().
    getChanged: function getChanged() {
      return this._model.changedAttributes();
    },

    // Proxy to model previousAttributes().
    getPrevious: function getPrevious() {
      return this._model.previousAttributes();
    },

    // Determine if any of the passed attributes were changed during the last modification.
    hasAnyChanged: function hasAnyChanged() {
      for (var _len = arguments.length, attrs = Array(_len), _key = 0; _key < _len; _key++) {
        attrs[_key] = arguments[_key];
      }

      return !!_.chain(this._model.changed).keys().intersection(attrs).size().value();
    },

    // Proxy to StateFunctions#syncEntityEvents.
    syncEntityEvents: function syncEntityEvents(entity, entityEvents, event) {
      return _syncEntityEvents(this, entity, entityEvents, event);
    },

    _proxyEvents: function _proxyEvents(other) {
      this.listenTo(other, 'all', (function () {
        if (arguments.length > 1 && arguments[1] === this._model) {
          arguments[1] = this;
        }
        this.trigger.apply(this, arguments);
      }).bind(this));
    }
  });

  var _state = State;

  var StateBehavior = Mn.Behavior.extend({

    // options {
    //   stateClass:   {Marionette.StateService class} Type of Marionette.State to instantiate
    //   syncEvent:    {String} View event on which to call state handlers, keeping the DOM in
    //                   sync with state. Defaults to 'render'.
    //   initialState: {object} Optional initial state attrs
    //   stateOptions: {object} Options to pass to Marionette.State
    //   mapOptions:   {object} Map view options to Marionette.State options
    //     - { stateOption: 'viewOption' }          viewOption will be passed as stateOption
    //     - { stateOption: 'viewOption.property' } viewOption.property will be passed
    //     - { stateOption: true }                  viewOption named 'stateOption' will be passed
    //     - { stateOption: function(viewOptions) } return value of function will be passed
    //   serialize:    {boolean} Whether to serialize state into template (default false)
    // }
    initialize: function initialize(options) {
      options = options || {};
      if (!options.stateClass) {
        throw new Mn.Error('Must provide \'stateClass\'.');
      }
      var StateClass = options.stateClass;
      var syncEvent = options.syncEvent || 'render';

      // Compose State options and create State object
      var stateOptions = _.extend({
        initialState: options.initialState,
        component: this.view
      }, options.stateOptions, this._mapOptions(options.mapOptions));
      var state = new StateClass(stateOptions);

      // Give view access to the state model, but not the state object directly in order to
      // encourage decoupling; i.e., using view event triggers -> Marionette.State componentEvents.
      if (this.view.stateModel) {
        throw new Error('View already contains a stateModel attribute.');
      }
      this.view.stateModel = state.getModel();

      // Bind state events as well as call change handlers onRender to keep DOM in sync with state.
      if (this.view.stateEvents) {
        _syncEntityEvents(this.view, this.view.stateModel, this.view.stateEvents, syncEvent);
      }

      // Optionally set up serialization of state attributes to view template as 'state.attribute'
      if (options.serialize) {
        this._wrapSerializeData();
      }
    },

    // Convert view options into Marionette.State options
    _mapOptions: function _mapOptions(mappings) {
      if (!mappings) {
        return {};
      }
      return _.object(_.map(mappings, this._mapOption, this));
    },

    _mapOption: function _mapOption(viewOptionKey, stateOptionKey) {
      var stateOptionValue;

      if (viewOptionKey === true) {
        // Identity transformation; e.g., { stateOption: 'stateOption' }
        stateOptionValue = this.view.options[stateOptionKey];
      } else if (_.isString(viewOptionKey)) {
        // Unwind nested keys; e.g., 'value.property.subproperty'
        stateOptionValue = _.reduce(viewOptionKey.split('.'), function (memo, key) {
          return memo[key];
        }, this.view.options);
      } else if (_.isFunction(viewOptionKey)) {
        // Evaluate function in the view context and pass the view options
        stateOptionValue = viewOptionKey.call(this.view, this.view.options);
      } else {
        throw new Mn.Error('Invalid mapOption value. Expecting true, String, or Function.');
      }

      return [stateOptionKey, stateOptionValue];
    },

    // Safe wrapping of serialize data. Calls existing serializeData method then merges in state
    // attributes.
    _wrapSerializeData: function _wrapSerializeData() {
      var _this2 = this;

      var serializeData = this.view.serializeData;
      var state = this.view.state;

      this.view.serializeData = function () {
        var data = serializeData.call(_this2); // 'this' is the view
        var stateAttrs = _.clone(state.attributes);

        // If existing attributes do NOT contain 'state', drop stateAttribute right in.
        if (_.isUndefined(data.state)) {
          data.state = stateAttrs;
        }
        // If existing attribute DO contain 'state', attempt a safe merge.
        else if (_.isObject(data.state)) {
          _this2._mergeAttrs(data.state, stateAttrs);
        } else {
          throw new Mn.Error('\'state\' already defined and not extensible.');
        }

        return data;
      };
    },

    // Assign attributes into target, throwing Error rather than overwriting any existing.
    _mergeAttrs: function _mergeAttrs(target, attrs) {
      for (var attr in attrs) {
        if (_.isUndefined(target[attr])) {
          target[attr] = attrs[attr];
        } else {
          throw new Mn.Error('Attribute \'' + attr + '\' already defined.');
        }
      }
    }
  });

  var state_behavior = StateBehavior;

  _state.Behavior = state_behavior;
  _state.syncEntityEvents = _syncEntityEvents;
  _state.stopSyncingEntityEvents = stopSyncingEntityEvents;

  var index = _state;

  return index;
});
//# sourceMappingURL=./marionette.state.js.map