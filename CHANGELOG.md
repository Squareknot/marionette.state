v0.4.1 [Commit Log](https://github.com/Squareknot/marionette.state/compare/v0.4.0...v0.4.1)

- Bumped dependencies to latest Backbone and Underscore
- Fixed Backbone global import not resolving when including Marionette.State via script tag

v0.4.0 [Commit Log](https://github.com/Squareknot/marionette.state/compare/v0.3.0...v0.4.0)

- `syncEnityEvents()` passes `{ syncing: true }` option to change handlers when called during a sync.
- `#attributes` method returns clone of State attributes.
- `#previous` proxies to underlying model `#previous`
- `#getChanged`/`#getPrevious` underlying model proxy methods renamed to `#changedAttributes`/`#previousAttributes` (**breaking**)
- 100% test coverage

v0.3.0 [Commit Log](https://github.com/Squareknot/marionette.state/compare/v0.2.3...v0.3.0)

- API Improvements
  - Ability to override values in `State#reset`
  - `preventDestroy` option in initialization options
  - Renamed/privatized `setState` => `_initState` (**breaking**).
  - `#getChanged` proxies to model `#changedAttributes`.
  - `#getPrevious` proxies to model `#previousAttributes`.
  - `#hasAnyChanged` tests whether any of a list of attributes exists in model `changed`.
  - `#bindComponent` adds an additional component binding similar to initial option `component`.
  - `#unbindComponent` reverses component binding.
  - State now proxies model events.
  - `#syncEntityEvents` returns a syncing handle with "stop syncing" ability.
- Removed State.Behavior in favor of simpler, more explicit API (**breaking**)
- Documentation overhaul
  - Expanded examples dealing with increasing levels of architectural complexity
  - More concise API documentation
- Reduced call stack for `#syncEntityEvents`.
- Tests for `#syncEntityEvents`
- Converted build stack to babel+browserify.

v0.2.3 [Commit Log](https://github.com/Squareknot/marionette.state/compare/v0.2.2...v0.2.3)

- Fixed 'true' not working with mapOption

v0.2.2 [Commit Log](https://github.com/Squareknot/marionette.state/compare/v0.2.1...v0.2.2)

- Fixed require dependency issue

v0.2.1 [Commit Log](https://github.com/Squareknot/marionette.state/compare/v0.2.0...v0.2.1)

- Fixed npm dependency issue

v0.2.0 [Commit Log](https://github.com/Squareknot/marionette.state/compare/v0.1.0...v0.2.0)

- Renamed to concise Marionette.State
- API changes and improvements, especially to initialization options
- Introduced State.Behavior to seamlessly integrate state management with a view
- Introduced State.syncEntityEvents to powerfully synchronize state with other enities

v0.1.0 [Commit Log](https://github.com/Squareknot/marionette.state/commits/v0.1.0)

- Initial release
- Marionette.StateService
  - Container for component state logic
  - Maintains a state model to be used within component
