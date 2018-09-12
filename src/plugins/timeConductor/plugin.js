/*****************************************************************************
 * Open MCT, Copyright (c) 2014-2018, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/

import Conductor from './Conductor.vue';
import Vue from 'vue';

function isTruthy(a) {
    return !!a;
}

function validateMenuOption(menuOption, index) {
    if (menuOption.clock && !menuOption.clockOffsets) {
        return "clock-based menuOption at index " + index + " is " +
            "missing required property 'clockOffsets'.";
    }
    if (!menuOption.timeSystem) {
        return "menuOption at index " + index + " is missing " +
            "required property 'timeSystem'.";
    }
    if (!menuOption.bounds && !menuOption.clock) {
        return "fixed-bounds menuOption at index " + index + " is " +
            "missing required property 'bounds'";
    }
}

function validateConfiguration(config) {
    if (config === undefined ||
        config.menuOptions === undefined ||
        config.menuOptions.length === 0) {
        return "You must specify one or more 'menuOptions'.";
    }
    if (config.menuOptions.some(validateMenuOption)) {
        return config.menuOptions.map(validateMenuOption)
            .filter(isTruthy)
            .join('\n');
    }
    return undefined;
}

function validateRuntimeConfiguration(config, openmct) {
    var systems = openmct.time.getAllTimeSystems()
        .reduce(function (m, ts) {
            m[ts.key] = ts;
            return m;
        }, {});
    var clocks = openmct.time.getAllClocks()
        .reduce(function (m, c) {
            m[c.key] = c;
            return m;
        }, {});

    return config.menuOptions.map(function (menuOption, index) {
        if (menuOption.timeSystem && !systems[menuOption.timeSystem]) {
            return "menuOption at index " + index + " specifies a " +
                    "timeSystem that does not exist: " + menuOption.timeSystem;
        }
        if (menuOption.clock && !clocks[menuOption.clock]) {
            return "menuOption at index " + index + " specifies a " +
                    "clock that does not exist: " + menuOption.clock;
        }
    })
        .filter(isTruthy)
        .join('\n');
}

function throwIfError(configResult) {
    if (configResult) {
        throw new Error("Invalid Time Conductor Configuration: \n" +
            configResult + '\n' +
            "https://github.com/nasa/openmct/blob/master/API.md#the-time-conductor");
    }
}

function mountComponent(openmct, configuration) {
    let conductorComponent = new Vue({
        mixins: [Conductor],
        provide: {
            openmct: openmct,
            configuration: configuration
        }
    });
    let conductorParent = Document.querySelector('.js-conductor-holder');
    conductorParent.appendChild(conductorComponent.$mount().$el);
}

export default function (config){

    let configResult = validateConfiguration(config);
    throwIfError(configResult);

    return function (openmct) {

        openmct.on('start', function () {
            configResult = validateRuntimeConfiguration(config, openmct);
            throwIfError(configResult);

            var defaults = config.menuOptions[0];
            if (defaults.clock) {
                openmct.time.clock(defaults.clock, defaults.clockOffsets);
                openmct.time.timeSystem(defaults.timeSystem, openmct.time.bounds());
            } else {
                openmct.time.timeSystem(defaults.timeSystem, defaults.bounds);
            }

            mountComponent(openmct, config);

        });
    };
};
