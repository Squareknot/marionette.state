describe('State', () => {
  describe('when `modelClass` is defined on the class', () => {
    var FooModel;
    var fooState;

    beforeEach(() => {
      FooModel = Bb.Model.extend();
      var FooState = Mn.State.extend({
        modelClass: FooModel
      });
      fooState = new FooState();
    });

    it('should use `modelClass` for underlying model', () => {
      expect(fooState.getModel()).to.be.instanceof(FooModel);
    });
  });

  describe('when `defaultState` is defined on the class', () => {
    var fooState;

    beforeEach(() => {
      var FooState = Mn.State.extend({
        defaultState: {
          foo: 1
        }
      });
      fooState = new FooState();
    });

    it('should reflect default state', () => {
      expect(fooState.get('foo')).to.equal(1);
    });
  });

  describe('when initialized with `initialState`', () => {
    var fooState;

    beforeEach(() => {
      fooState = new Mn.State({
        initialState: {
          foo: 1
        }
      });
    });

    it('should reflect initial state', () => {
      expect(fooState.attributes).to.deep.equal({ foo: 1 });
    });
  });

  describe('when `defaultState` and `initialState` are both supplied', () => {
    var fooState;
    var initialState;

    beforeEach(() => {
      var FooState = Mn.State.extend({
        defaultState: {
          foo: 1,
          bar: 2
        }
      });
      fooState = new FooState({
        initialState: {
          bar: -2,
          baz: 3
        }
      });
      initialState = fooState.getInitialState();
    });

    it('initial state should reflect both defaultState and initialState', () => {
      expect(fooState.attributes).to.deep.equal({
        foo: 1,
        bar: -2,
        baz: 3
      });
    });

    it('`getInitialState()` should reflect both defaultState and initialState', () => {
      expect(initialState).to.deep.equal({
        foo: 1,
        bar: -2,
        baz: 3
      });
    });

    describe('when changing a value and then resetting', () => {
      var newInitialState;

      beforeEach(() => {
        fooState.set('baz', -3);
        fooState.reset();
        newInitialState = fooState.getInitialState();
      });

      it('`getInitialState()` should return the initial state', () => {
        expect(newInitialState).to.deep.equal(initialState);
      });
    });

    describe('when resetting with an attribute override', () => {
      var updatedState;
      var newInitialState;

      beforeEach(() => {
        updatedState = _.extend(fooState.getInitialState(), { foo: -1 });
        fooState.reset({ foo: -1 });
        newInitialState = fooState.getInitialState();
      });

      it('`getInitialState()` should return the initial state', () => {
        expect(newInitialState).to.deep.equal(initialState);
      });

      it('should reflect the overriden attribute', () => {
        expect(fooState.attributes).to.deep.equal(updatedState);
      });
    });
  });

  describe('when initialized with `component`', () => {
    var fooState;

    beforeEach(() => {
      var eventedObj = _.extend({}, Bb.Events);
      var FooState = Mn.State.extend({
        componentEvents: {
          'do:foo': 'onDoFoo'
        },
        onDoFoo: stub()
      });
      spy(FooState.prototype, 'destroy');
      fooState = new FooState({
        component: eventedObj
      });
      eventedObj.trigger('do:foo', 1, 2, 3);
      eventedObj.trigger('destroy');
    });

    it('should call event handlers on `component` events', () => {
      expect(fooState.onDoFoo)
        .to.have.been.calledOnce
        .and.to.have.been.calledWith(1, 2, 3)
        .and.to.have.been.calledOn(fooState);
    });

    it('should destroy when `component` emits "destroy"', () => {
      expect(fooState.destroy)
        .to.have.been.calledOnce
        .and.to.have.been.calledOn(fooState);
    });
  });

  describe('when initialized with `component` and the component is unbound', () => {
    var fooState;

    beforeEach(() => {
      var eventedObj = _.extend({}, Bb.Events);
      var FooState = Mn.State.extend({
        componentEvents: {
          'do:foo': 'onDoFoo'
        },
        onDoFoo: stub()
      });
      spy(FooState.prototype, 'destroy');
      fooState = new FooState({
        component: eventedObj
      });
      fooState.unbindComponent(eventedObj);
      eventedObj.trigger('do:foo', 1, 2, 3);
      eventedObj.trigger('destroy');
    });

    it('should not call event handlers on `component` events', () => {
      expect(fooState.onDoFoo).to.not.have.been.called;
    });

    it('should not destroy when `component` emits "destroy"', () => {
      expect(fooState.destroy).to.not.have.been.called;
    });
  });

  describe('when initialized with `component` and `preventDestroy: false', () => {
    var fooState;

    beforeEach(() => {
      var eventedObj = _.extend({}, Bb.Events);
      spy(Mn.State.prototype, 'destroy');
      fooState = new Mn.State({
        component:      eventedObj,
        preventDestroy: true
      });
      eventedObj.trigger('destroy');
    });

    it('should not destroy when `component` emits "destroy"', () => {
      expect(fooState.destroy).to.not.have.been.called;
    });
  });

  describe('when binding a component', () => {
    var fooState;

    beforeEach(() => {
      var eventedObj = _.extend({}, Bb.Events);
      spy(Mn.State.prototype, 'destroy');
      fooState = new Mn.State();
      fooState.bindComponent(eventedObj);
      eventedObj.trigger('destroy');
    });

    it('should destroy when `component` emits "destroy"', () => {
      expect(fooState.destroy)
        .to.have.been.calledOnce
        .and.to.have.been.calledOn(fooState);
    });
  });

  describe('when setting a value', () => {
    var fooState;

    beforeEach(() => {
      fooState = new Mn.State();
      fooState.set('foo', 1);
    });

    it('should reflect the set value', () => {
      expect(fooState.get('foo')).to.equal(1);
    });

    describe('when setting a new value', () => {
      beforeEach(() => {
        fooState.set('foo', 2);
      });

      it('should reflect the change in `changedAttributes()`', () => {
        expect(fooState.changedAttributes()).to.deep.equal({ foo: 2 });
      });

      it('should reflect the change in `previousAttributes()`', () => {
        expect(fooState.previousAttributes()).to.deep.equal({ foo: 1 });
      });

      it('should reflect the change in `previous()`', () => {
        expect(fooState.previous('foo')).to.equal(1);
      });

      it('should reflect the change in `hasAnyChanged()`', () => {
        expect(fooState.hasAnyChanged('foo')).to.equal(true);
      });
    });
  });

  describe('when updating attributes proxy property', () => {
    var fooState;
    var fooStateAttributes = { foo: 'bar' };

    beforeEach(() => {
      fooState = new Mn.State();
      fooState.attributes = fooStateAttributes;
    });

    it('model should reflect change', () => {
      expect(fooState.getModel().attributes).to.deep.equal(fooStateAttributes);
    });
  });

  describe('when updating model attributes property', () => {
    var fooState;
    var fooStateAttributes = { foo: 'bar' };

    beforeEach(() => {
      fooState = new Mn.State();
      fooState.getModel().attributes = fooStateAttributes;
    });

    it('attributes proxy should reflect change', () => {
      expect(fooState.attributes).to.deep.equal(fooStateAttributes);
    });
  });

  describe('when syncing with another entity', () => {
    var fooState;
    var barModel;

    beforeEach(() => {
      barModel = new Bb.Model({ foo: 1 });
      var FooState = Mn.State.extend({
        barModelEvents: {
          'change:foo': 'onChangeFoo'
        },
        initialize(options={}) {
          this.syncEntityEvents(options.barModel, this.barModelEvents);
        },
        onChangeFoo: stub()
      });
      fooState = new FooState({ barModel });
    });

    it('entity change handler should be called', () => {
      expect(fooState.onChangeFoo)
        .to.have.been.calledOnce
        .and.to.have.been.calledWith(barModel, 1)
        .and.to.have.been.calledOn(fooState);
    });

    describe('when synced attribute changes', () => {
      beforeEach(() => {
        barModel.set('foo', 2);
      });

      it('entity change handler should be called again', () => {
        expect(fooState.onChangeFoo)
          .to.have.been.calledTwice
          .and.to.have.been.calledWith(barModel, 2)
          .and.to.have.been.calledOn(fooState);
      });
    });
  });

  describe('when underlying model emits events', () => {
    var fooState;
    var changeHandler;
    var customHandler;

    beforeEach(() => {
      fooState = new Mn.State();
      var fooModel = fooState.getModel();
      changeHandler = stub();
      customHandler = stub();
      fooState.on('change:foo', changeHandler);
      fooState.on('custom', customHandler);
      fooModel.set('foo', 1);
      fooModel.trigger('custom', 1, 2, 3);
    });

    it('should proxy standard model events, substituting State instance for Model argument', () => {
      expect(changeHandler)
        .to.have.been.calledOnce
        .and.to.have.been.calledWith(fooState, 1);
    });

    it('should proxy custom model events', () => {
      expect(customHandler)
        .to.have.been.calledOnce
        .and.to.have.been.calledWith(1, 2, 3);
    });
  });

  describe('when calling toJSON', () => {
    var fooState;
    var modelJson;
    var stateJson;

    beforeEach(() => {
      fooState = new Mn.State({
        initialState: {
          foo: 1,
          bar: 2
        }
      });

      modelJson = fooState.getModel().toJSON();
      stateJson = fooState.toJSON();
    });

    it('should equal result of underlying model toJSON()', () => {
      expect(stateJson).to.deep.equal(modelJson);
    });
  });
});
