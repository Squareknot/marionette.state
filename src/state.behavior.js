import _ from 'underscore';
import Mn from 'backbone.marionette';
import {syncEntityEvents} from './state.functions';

// Augment a view with state.
// - view.state is the model managed by Marionette.State
// - view.stateEvents hash defines state change handlers. onRender, change handlers are called
//     in order to initialize state on the fresh DOM tree. See Marionette.State#syncEntityEvents.
// - Marionette.State is created behind the scenes with options 'stateOptions' and 'mapOptions'
// - State attributes are optionally serialized to the view template
const StateBehavior = Mn.Behavior.extend({

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
  initialize(options) {
    options = options || {};
    if (!options.stateClass) { throw new Mn.Error('Must provide \'stateClass\'.'); }
    var StateClass = options.stateClass;
    var syncEvent = options.syncEvent || 'render';

    // Compose State options and create State object
    var stateOptions = _.extend({
      initialState: options.initialState,
      component:    this.view
    }, options.stateOptions, this._mapOptions(options.mapOptions));
    var state = new StateClass(stateOptions);

    // Give view access to the state model, but not the state object directly in order to
    // encourage decoupling; i.e., using view event triggers -> Marionette.State componentEvents.
    if (this.view.stateModel) { throw new Error('View already contains a stateModel attribute.'); }
    this.view.stateModel = state.getModel();

    // Bind state events as well as call change handlers onRender to keep DOM in sync with state.
    if (this.view.stateEvents) {
      syncEntityEvents(this.view, this.view.stateModel, this.view.stateEvents, syncEvent);
    }

    // Optionally set up serialization of state attributes to view template as 'state.attribute'
    if (options.serialize) { this._wrapSerializeData(); }
  },

  // Convert view options into Marionette.State options
  _mapOptions(mappings) {
    if (!mappings) {
      return {};
    }
    return _.object(_.map(mappings, this._mapOption, this));
  },

  _mapOption(viewOptionKey, stateOptionKey) {
    var stateOptionValue;

    // Boolean true is an identity transformation; e.g., { stateOption: 'stateOption' }
    if (viewOptionKey === true) {
      stateOptionValue = this.view.options[stateOptionKey];
    }
    // Unwind nested keys; e.g., 'value.property.subproperty'
    else if (_.isString(viewOptionKey)) {
      stateOptionValue = _.reduce(viewOptionKey.split('.'), (memo, key) => {
        return memo[key];
      }, this.view.options);
    }
    // Functions are evaluated in the view context and passed the view options
    else if (_.isFunction(viewOptionKey)) {
      stateOptionValue = viewOptionKey.call(this.view, this.view.options);
    }
    else {
      throw new Mn.Error('Invalid mapOption value. Expecting true, String, or Function.');
    }

    return [stateOptionKey, stateOptionValue];
  },

  // Safe wrapping of serialize data. Calls existing serializeData method then merges in state
  // attributes.
  _wrapSerializeData() {
    var serializeData = this.view.serializeData;
    var state = this.view.state;

    this.view.serializeData = () => {
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
  _mergeAttrs(target, attrs) {
    for (var attr in attrs) {
      if (_.isUndefined(target[attr])) {
        target[attr] = attrs[attr];
      } else {
        throw new Mn.Error('Attribute \'' + attr + '\' already defined.');
      }
    }
  }
});

export default StateBehavior;
