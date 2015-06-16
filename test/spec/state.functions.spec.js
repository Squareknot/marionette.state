/*jscs:disable maximumLineLength */
var AbstractStateful;

describe('State.syncEntityEvents', () => {
  beforeEach(() => {
    var State = Mn.State.extend({
      defaultState: {
        foo: 1,
        bar: 2,
        baz: 3
      }
    });

    var Model = Bb.Model.extend({
      defaults: {
        foo: 1,
        bar: 2,
        baz: 3
      }
    });

    var Collection = Bb.Collection;

    AbstractStateful = Mn.Object.extend({
      stateEvents: {
        'all':                              'onAll',
        'change':                           'onChange onChange2',
        'change:foo':                       'onChangeFoo',
        'reset':                            'onReset',
        'change:foo change:bar change:baz': 'onChangeFooBarBaz'
      },
      modelEvents: {
        'all':                              'onAll',
        'change':                           'onChange onChange2',
        'change:foo':                       'onChangeFoo',
        'reset':                            'onReset',
        'change:foo change:bar change:baz': 'onChangeFooBarBaz'
      },
      collectionEvents: {
        'all':        'onCollectionAll',
        'reset':      'onCollectionReset onCollectionReset2',
        'all reset':  'onCollectionAllReset',
        'add':        'onCollectionAdd',
        'remove':     'onCollectionRemove',
        'change':     'onCollectionChange',
        'change:foo': 'onCollectionChangeFoo'
      },
      constructor() {
        this.state = new State();
        this.model = new Model();
        this.collection = new Collection();
        AbstractStateful.__super__.constructor.apply(this, arguments);
      },
      onAll:                 stub(),
      onChange:              stub(),
      onChange2:             stub(),
      onChangeFoo:           stub(),
      onChangeFooBarBaz:     stub(),
      onReset:               stub(),
      onCollectionAll:       stub(),
      onCollectionReset:     stub(),
      onCollectionReset2:    stub(),
      onCollectionAllReset:  stub(),
      onCollectionAdd:       stub(),
      onCollectionRemove:    stub(),
      onCollectionChange:    stub(),
      onCollectionChangeFoo: stub()
    });
  });

  describe('when syncing', () => {
    var stateful;
    var onInlineChange;
    var onInlineReset;

    beforeEach(() => {
      onInlineChange = stub();
      onInlineReset = stub();
      var Stateful = AbstractStateful.extend({
        inlineEvents: {
          'change': onInlineChange,
          'reset':  onInlineReset
        },
        initialize() {
          Mn.State.syncEntityEvents(this, this.state, this.stateEvents);
          Mn.State.syncEntityEvents(this, this.model, this.modelEvents);
          Mn.State.syncEntityEvents(this, this.collection, this.collectionEvents);

          Mn.State.syncEntityEvents(this, this.state, this.inlineEvents);
          Mn.State.syncEntityEvents(this, this.model, this.inlineEvents);
          Mn.State.syncEntityEvents(this, this.collection, this.inlineEvents);
        }
      });
      stateful = new Stateful();
    });

    it('should call handlers for Model or State {change|change:value|all} events', () => {
      expect(stateful.onAll).to.have.been.calledTwice;
      expect(stateful.onChange).to.have.been.calledTwice;
      expect(stateful.onChangeFoo).to.have.been.calledTwice;
    });

    it('should not call handlers for Model or State events besides {change|change:value|all}', () => {
      expect(stateful.onReset).to.not.have.been.calledTwice;
    });

    it('should call handlers for Collection {all|reset} events', () => {
      expect(stateful.onCollectionAll).to.have.been.calledOnce;
      expect(stateful.onCollectionReset).to.have.been.calledOnce;
    });

    it('should not call handlers for Collection events besides {all|reset}', () => {
      expect(stateful.onCollectionAdd).to.not.have.been.called;
      expect(stateful.onCollectionRemove).to.not.have.been.called;
      expect(stateful.onCollectionChange).to.not.have.been.called;
      expect(stateful.onCollectionChangeFoo).to.not.have.been.called;
    });

    it('should call handlers with the target object as context', () => {
      expect(stateful.onAll).to.always.have.been.calledOn(stateful);
      expect(stateful.onCollectionAll).to.always.have.been.calledOn(stateful);
    });

    it('should call handlers with standard Backbone event arguments', () => {
      expect(stateful.onChange).to.have.been.calledTwice
        .to.have.been.calledTwice
        .and.to.have.been.calledWith(stateful.model)
        .and.to.have.been.calledWith(stateful.state);
      expect(stateful.onChangeFoo).to.have.been.calledTwice
        .to.have.been.calledTwice
        .and.to.have.been.calledWith(stateful.model, 1)
        .and.to.have.been.calledWith(stateful.state, 1);
      expect(stateful.onCollectionReset)
        .to.have.been.calledOnce
        .and.to.have.been.calledWith(stateful.collection);
    });

    it('should call handler for multiple inlined events', () => {
      expect(stateful.onChangeFooBarBaz.callCount).to.equal(6);
      expect(stateful.onCollectionAllReset.callCount).to.equal(2);
    });

    it('should call multiple handlers for a single event', () => {
      expect(stateful.onChange).to.have.been.calledTwice;
      expect(stateful.onChange2).to.have.been.calledTwice;
      expect(stateful.onCollectionReset).to.have.been.calledOnce;
      expect(stateful.onCollectionReset2).to.have.been.calledOnce;
    });

    it('should call inline function handlers', () => {
      expect(onInlineChange)
        .to.have.been.calledTwice
        .and.to.have.been.calledWith(stateful.model)
        .and.to.have.been.calledWith(stateful.state)
        .and.to.always.have.been.calledOn(stateful);
      expect(onInlineReset)
        .to.have.been.calledOnce
        .and.to.have.been.calledWith(stateful.collection)
        .and.to.always.have.been.calledOn(stateful);
    });
  });

  describe('when syncing on a target event', () => {
    var stateful;

    beforeEach(() => {
      var Stateful = AbstractStateful.extend({
        initialize() {
          this.stateSyncing =
            Mn.State.syncEntityEvents(this, this.state, this.stateEvents, 'render');
          this.modelSyncing =
            Mn.State.syncEntityEvents(this, this.model, this.stateEvents, 'render');
          this.collectionSyncing =
            Mn.State.syncEntityEvents(this, this.collection, this.collectionEvents, 'render');
        },
        render() {
          this.trigger('render');
        }
      });
      stateful = new Stateful();
    });

    it('should not sync immediately', () => {
      expect(stateful.onChange).to.not.have.been.called;
      expect(stateful.onChangeFoo).to.not.have.been.called;
      expect(stateful.onCollectionReset).to.not.have.been.called;
    });

    it('should sync on target event', () => {
      stateful.render();

      expect(stateful.onChange)
        .to.have.been.calledTwice
        .and.to.have.been.calledWith(stateful.model)
        .and.to.have.been.calledWith(stateful.state);
      expect(stateful.onChangeFoo)
        .to.have.been.calledTwice
        .and.to.have.been.calledWith(stateful.model, 1)
        .and.to.have.been.calledWith(stateful.state, 1);
      expect(stateful.onCollectionReset)
        .to.have.been.calledOnce
        .and.to.have.been.calledWith(stateful.collection);
    });

    describe('when calling stop on the Syncing instance', () => {
      beforeEach(() => {
        stateful.stateSyncing.stop();
        stateful.modelSyncing.stop();
        stateful.collectionSyncing.stop();
      });

      it('should not sync on target event', () => {
        stateful.render();
        expect(stateful.onChange).to.not.have.been.called;
        expect(stateful.onChangeFoo).to.not.have.been.called;
        expect(stateful.onCollectionReset).to.not.have.been.called;
      });

      it('should not fire change handlers for future change events', () => {
      });
    });
  });
});
