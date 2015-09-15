import _ from 'underscore';
import State from './state';
import * as stateFunctions from './state.functions';

_.extend(State, stateFunctions);

export default State;
