(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('underscore'), require('backbone'), require('backbone.marionette')) : typeof define === 'function' && define.amd ? define(['underscore', 'backbone', 'backbone.marionette'], factory) : global.Marionette.State = factory(global._, global.Backbone, global.Mn);
})(this, function (_, Backbone, Mn) {
  'use strict';

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
    //   bindLifecycle: {Mn object} Optionally bind lifecycle to object.
    //   initialState: {attrs} Optional initial state (defaultState will still be applied)
    constructor: function constructor() {
      var options = arguments[0] === undefined ? {} : arguments[0];

      if (options.bindLifecycle) {
        this.bindLifecycle(options.bindLifecycle);
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
        this._proxyModelEvents(this._model);
      }

      return this;
    },

    // Returns the initiate state, which is reverted to by reset()
    getInitialState: function getInitialState() {
      return _.clone(this._initialState);
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
      return this;
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
      return this;
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

    syncComponent: function syncComponent(component, stateEvents, syncEvent) {
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

    stopSyncingComponent: function stopSyncingComponent(component, stateEvents, syncEvent) {
      if (this.componentEvents) {
        this.unbindEntityEvents(component, this.componentEvents);
      }
      State.stopSyncingEntityEvents(component, this, stateEvents, syncEvent);
      return this;
    },

    bindLifecycle: function bindLifecycle(component) {
      if (!this._boundDestroy) {
        this.boundDestroy = this.destroy.bind(this);
      }
      this.listenTo(component, 'destroy', this._boundDestroy);
      return this;
    },

    unbindLifecycle: function unbindLifecycle(component) {
      this.stopListening(component, 'destroy', this._boundDestroy);
    },

    // Proxy to StateFunctions#syncEntityEvents.
    syncEntityEvents: function syncEntityEvents(entity, entityEvents, event) {
      State.syncEntityEvents(this, entity, entityEvents, event);
      return this;
    },

    _proxyModelEvents: function _proxyModelEvents(other) {
      this.listenTo(other, 'all', (function () {
        if (arguments.length > 1 && arguments[1] === this._model) {
          arguments[1] = this;
        }
        this.trigger.apply(this, arguments);
      }).bind(this));
    }
  });

  var state = State;

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
    } else if ((entity instanceof Backbone.Model || entity instanceof state) && (changeMatch = event.match(changeMatcher))) {
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
    this.target.listenTo(this.eventObj, this.event, this.handler);
    return this;
  };

  Syncing.prototype.now = function () {
    sync(this.target, this.entity, this.bindings);
    return this;
  };

  Syncing.stop = function () {
    this.target.stopListening(this.eventObj, this.event, this.handler);
  };

  var stateFunctions = {

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
    syncEntityEvents: function syncEntityEvents(target, entity, bindings, event) {
      Mn.bindEntityEvents(target, entity, bindings);
      var syncing = new Syncing(target, entity, bindings);
      if (event) {
        syncing.when(event);
      } else {
        syncing.now();
      }
    },

    // Ceases syncing entity events.
    // TODO
    stopSyncingEntityEvents: function stopSyncingEntityEvents(target, entity, bindings, event) {
      target = entity = bindings = event; // Suppress unused
    }
  };

  var state_functions = stateFunctions;

  _.extend(state, state_functions);

  var index = state;

  return index;
});
//# sourceMappingURL=./marionette.state.js.map