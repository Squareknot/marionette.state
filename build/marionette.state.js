// Marionette.State v0.2.0
/* global define */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([
      'backbone',
      'backbone.marionette',
      'underscore'
    ], function (Backbone, Marionette, _) {
      return factory(Backbone, Marionette, _);
    });
  }
  else if (typeof exports !== 'undefined') {
    var Backbone = require('backbone');
    var Marionette = require('backbone.marionette');
    var _ = require('underscore');
    module.exports = factory(Backbone, Marionette, _);
  }
  else {
    factory(root.Backbone, root.Backbone.Marionette, root._);
  }
}(this, function (Bb, Mn, _) {
  'use strict';

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
      options = _.extend({unset: true}, options);
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
  
  // Augment a view with state.
  // - view.state is the model managed by Marionette.State
  // - view.stateEvents hash defines state change handlers. onRender, change handlers are called
  //     in order to initialize state on the fresh DOM tree. See Marionette.State#syncEntityEvents.
  // - Marionette.State is created behind the scenes with options 'stateOptions' and 'mapOptions'
  // - State attributes are optionally serialized to the view template
  Mn.State.Behavior = Mn.Behavior.extend({
  
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
    initialize: function (options) {
      options = options || {};
      if (!options.stateClass) throw new Mn.Error('Must provide \'stateClass\'.');
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
      if (this.view.state) throw new Error('View already contains a state attribute.');
      this.view.state = state.getModel();
  
      // Bind state events as well as call change handlers onRender to keep DOM in sync with state.
      if (this.view.stateEvents) {
        Mn.State.syncEntityEvents(this.view, this.view.state, this.view.stateEvents, syncEvent);
      }
  
      // Optionally set up serialization of state attributes to view template as 'state.attribute'
      if (options.serialize) this._wrapSerializeData();
    },
  
    // Convert view options into Marionette.State options
    _mapOptions: function (mappings) {
      if (!mappings) {
        return {};
      }
      return _.object(_.map(mappings, this._mapOption, this));
    },
  
    _mapOption: function (viewOptionKey, stateOptionKey) {
      var stateOptionValue;
  
      // Boolean true is an identity transformation; e.g., { stateOption: 'stateOption' }
      if (stateOptionKey === true) {
        stateOptionValue = this.view.options[stateOptionKey];
      }
      // Unwind nested keys; e.g., 'value.property.subproperty'
      else if (_.isString(viewOptionKey)) {
        stateOptionValue = _.reduce(viewOptionKey.split('.'), function (memo, key) {
          return memo[key];
        }, this.view.options);
      }
      // Functions are evaluated in the view context and passed the view options
      else if (_.isFunction(viewOptionKey)) {
        stateOptionValue = viewOptionKey.call(this.view, this.view.options);
      }
      else {
        throw new Mn.Error('Invalid mapOption type');
      }
  
      return [stateOptionKey, stateOptionValue];
    },
  
    // Safe wrapping of serialize data. Calls existing serializeData method then merges in state
    // attributes.
    _wrapSerializeData: function () {
      var serializeData = this.view.serializeData;
      var state = this.view.state;
  
      this.view.serializeData = function () {
        var data = serializeData.call(this); // 'this' is the view
        var stateAttrs = _.clone(state.attributes);
  
        // If existing attributes do not contain 'state', drop stateAttribute right in.
        if (_.isUndefined(data.state)) {
          data.state = stateAttrs;
        }
        // If existing attribute DO contain 'state', attempt a safe merge.
        else if (_.isObject(data.state)) {
          this._mergeAttrs(data.state, stateAttrs);
        }
        else {
          throw new Mn.Error('\'state\' already defined and not extensible.');
        }
  
        return data;
      };
    },
  
    // Assign attributes into target, throwing Error rather than overwriting any existing.
    _mergeAttrs: function (target, attrs) {
      for (var attr in attrs) {
        if (_.isUndefined(target[attr])) {
          target[attr] = attrs[attr];
        } else {
          throw new Mn.Error('Attribute \'' + attr + '\' already defined.');
        }
      }
    }
  });
  
  ;(function (Bb, Mn, _) {
    var changeMatcher = /^change:(.+)/;
    var spaceMatcher = /\s+/;
  
    // Call all handlers optionally with a value (given a named attribute 'attr')
    function callHandlers(target, entity, handlers, attr) {
      var value = attr ? entity.get(attr) : undefined;
  
      if (_.isFunction(handlers)) {
        handlers.call(target, entity, value);
      }
      else {
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
      if (event === 'change' || event === 'all'
          || (entity instanceof Bb.Collection && event === 'reset')) {
        callHandlers(target, entity, handlers);
      }
      else if (entity instanceof Bb.Model && (changeMatch = event.match(changeMatcher))) {
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
    function syncBindingsHash(target, entity, bindings) {
      _.each(bindings, function (handlers, eventStr) {
        var events = eventStr.split(spaceMatcher);
        syncBindings(target, entity, events, handlers);
      }, this);
    }
  
    _.extend(Mn.State, {
  
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
      syncEntityEvents: function (target, entity, bindings, event) {
        Mn.bindEntityEvents(target, entity, bindings);
        if (event) {
          var handler = _.partial(syncBindingsHash, target, entity, bindings);
          var syncing = {
            entity: entity,
            bindings: bindings,
            event: event,
            handler: handler
          };
          target.__syncingEntityEvents = target.__syncingEntityEvents || [];
          target.__syncingEntityEvents.push(syncing);
          target.on(event, handler);
        } else {
          syncBindingsHash(target, entity, bindings);
        }
      },
  
      // Ceases syncing entity events.
      stopSyncingEntityEvents: function (target, entity, bindings) {
        Mn.unbindEntityEvents(target, entity, bindings);
        if (target.render && target.__syncingEntityEvents) {
          _.each(target.__syncingEntityEvents, function (syncing) {
            if (entity === syncing.entity && bindings === syncing.bindings) {
              target.off(syncing.event, syncing.handler);
            }
          });
        }
      }
    });
  })(Bb, Mn, _);
  

  return Mn.State;
}));
