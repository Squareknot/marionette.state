import State from './state';
import StateBehavior from './state.behavior';
import {syncEntityEvents, stopSyncingEntityEvents} from './state.functions';

State.Behavior = StateBehavior;
State.syncEntityEvents = syncEntityEvents;
State.stopSyncingEntityEvents = stopSyncingEntityEvents;

export default State;
