var ratchet = (function() {
    
    function TransformValue(value, units) {
        var parsedVal = parseFloat(value);
        
        this.value = isNaN(parsedVal) ? value : parsedVal;
        this.units = units || '';
    }
    
    TransformValue.prototype.valueOf = function() {
        return this.value;
    };
    
    TransformValue.prototype.toString = function() {
        return this.value + this.units;
    };
    
    TransformValue.prototype.matchingUnits = function() {
        var match = true;
        for (var ii = arguments.length; ii--; ) {
            match = arguments[ii].units === this.units;
        }
        
        return match;
    };

    function XYZ(type, opts) {
        var defaultUnits;
        
        opts = opts || {};
        
        this.type = type;
        this.defaultValue = opts.defaultValue || 0;
        
        // look for the default units
        defaultUnits = (opts.x || {}).units || (opts.y || {}).units || (opts.z || {}).units || opts.units;
        
        // initialise the units
        this.units = typeof defaultUnits != 'undefined' ? defaultUnits : 'px';
        
        this.x = new TransformValue(typeof opts.x != 'undefined' ? opts.x : this.defaultValue, this.units);
        this.y = new TransformValue(typeof opts.y != 'undefined' ? opts.y : this.defaultValue, this.units);
        this.z = new TransformValue(typeof opts.z != 'undefined' ? opts.z : this.defaultValue, this.units);
    }
    
    XYZ.prototype.add = function(value) {
        var x = this.x.valueOf(), 
            y = this.y.valueOf(),
            z = this.z.valueOf();
        
        if (typeof value == 'number') {
            x += value;
            y += value;
            z = z ? z + value : 0;
        }
        else {
            for (var ii = arguments.length; ii--; ) {
                x += arguments[ii].x || 0;
                y += arguments[ii].y || 0;
                z = (z || arguments[ii].z) ? z + (arguments[ii].z || 0) : 0;
            }
        }
        
        return new XYZ(this.type, { x: x, y: y, z: z, units: this.units });
    };
    
    XYZ.prototype.mul = function(value) {
        var x = this.x.valueOf(), 
            y = this.y.valueOf(),
            z = this.z ? this.z.valueOf() : 0;
        
        if (typeof value == 'number') {
            x *= value;
            y *= value;
            z = typeof this.z != 'undefined' ? z * value : 0;
        }
        else {
            for (var ii = arguments.length; ii--; ) {
                x *= arguments[ii].x;
                y *= arguments[ii].y;
                z *= arguments[ii].z;
            }
        }
        
        return new XYZ(this.type, { x: x, y: y, z: z, units: this.units });
    };
    
    ['sub', 'div'].forEach(function(op) {
        var isSub = op === 'sub',
            mappedKey = isSub ? 'add' : 'mul';
        
        XYZ.prototype[op] = function(value) {
            if (typeof value == 'number') {
                return this[mappedKey](isSub ? -value : 1 / value);
            }
            else {
                var args = Array.prototype.map.call(arguments, function(item) {
                    var inverted = new XYZ(this.type, item);
                    
                    if (isSub) {
                        inverted.x = -inverted.x;
                        inverted.y = -inverted.y;
                        inverted.z = -inverted.z;
                    }
                    else {
                        inverted.x = 1 / inverted.x;
                        inverted.y = 1 / inverted.y;
                        inverted.z = inverted.z ? 1 / inverted.z : 0;
                    }
                    
                    return inverted;
                });
    
                return this[mappedKey].apply(this, args);
            }
        };
    });
    
    XYZ.prototype.toString = function(opts) {
        var output = [];
        
        // ensure options are defined
        opts = opts || {};
        
        if (opts.all || (this.x.value != this.defaultValue)) {
            output[output.length] = this.type + 'X(' + this.x.value + this.x.units + ')';
        }
        
        if (opts.all || (this.y.value != this.defaultValue)) {
            output[output.length] = this.type + 'Y(' + this.y.value + this.y.units + ')';
        }
        
        if (opts.all || (this.z.value != this.defaultValue)) {
            output[output.length] = this.type + 'Z(' + this.z.value + this.z.units + ')';
        }
        
        return output.join(' ');
    };

    var scaleOps = {
        add: 'mul',
        sub: 'div'
    };
    
    function RatchetTransform(opts) {
        opts = opts || {};
        
        // ensure the scale units are set to an empty string
        opts.scale = opts.scale || {};
        opts.scale.units = '';
        opts.scale.defaultValue = 1;
        
        // set the rotation units
        opts.rotate = opts.rotate || {};
        opts.rotate.units = 'deg';
        
        // create new translation rotation and scale values, duplicating the value provided 
        this.translate = new XYZ('translate', opts.translate);
        this.rotate = new XYZ('rotate', opts.rotate);
        this.scale = new XYZ('scale', opts.scale);
    }
    
    RatchetTransform.prototype = {
        clone: function() {
            return new RatchetTransform({
                translate: this.translate,
                scale: this.scale,
                rotate: this.rotate
            });
        },
        
        toString: function(opts) {
            var output = this.translate.toString(opts),
                rotate = this.rotate.toString(opts),
                scale = this.scale.toString(opts);
                
            if (rotate) {
                output += (output ? ' ' : '') + rotate;
            }
            
            if (scale) {
                output += (output ? ' ' : '') + scale;
            }
            
            return output;
        }
    };
    
    ['add', 'sub'].forEach(function(op) {
        RatchetTransform.prototype[op] = function() {
            // create new values to receive target values
            var newTransform = new RatchetTransform();
            
            // calculate the translation change
            newTransform.translate = XYZ.prototype[op].apply(
                this.translate,
                Array.prototype.map.call(arguments, function(item) { return item.translate; })
            );
            
            // calculate the scale change (mapping add to mul)
            newTransform.scale = XYZ.prototype[scaleOps[op]].apply(
                this.scale,
                Array.prototype.map.call(arguments, function(item) { return item.scale; })
            );
            
            // calculate the rotation update
            newTransform.rotate = XYZ.prototype[op].apply(
                this.rotate,
                Array.prototype.map.call(arguments, function(item) { return item.rotate; })
            );
            
            return newTransform;
        };
    });


    function _extractVal(index, expectUnits) {
        return function(match) {
            var units = '', value;
            if (typeof expectUnits == 'undefined' || expectUnits) {
                // get the units
                // default to undefined if an empty string which means the 
                // default units for the XYZ value type will be used
                units = match[index + 1] || undefined;
            }
    
            // create the transform value
            return new TransformValue(match[index], units);
        };
    } // _extractVal
    
    function _makeRegex(fnName, params) {
        var regex = fnName + '\\(';
        
        (params || '').split(/\s/).forEach(function(param) {
            regex += matchers[param];
        });
        
        // return the regex
        return new RegExp(regex + '\\)');
    }
    
    var matchers = {
            val: '(\\-?[\\d\\.]+)',
            unit: '([^\\s]*)',
            ',': '\\,\\s*'
        },
        
        unitTypes = {
            translate: 'px',
            rotate: 'deg',
            scale: ''
        },
        
        transformParsers = {
            translate: [
                // standard 2d translation
                {
                    regex: _makeRegex('translate', 'val unit , val unit'),
                    x: _extractVal(1),
                    y: _extractVal(3)
                },
                
                // 2d/3d translation on a specific axis
                {
                    regex: _makeRegex('translate(X|Y|Z)', 'val unit'),
                    extract: function(match, data) {
                        data[match[1].toLowerCase()] = _extractVal(2)(match);
                    },
                    multi: true
                },
                
                // 3d translation as the specific translate3d prop
                {
                    regex: _makeRegex('translate', 'val unit , val unit , val unit'),
                    x: _extractVal(1),
                    y: _extractVal(3),
                    z: _extractVal(5)
                }
            ],
            
            rotate: [
                // standard 2d rotation
                {
                    regex: _makeRegex('rotate', 'val unit'),
                    z: _extractVal(1)
                },
                
                // 3d rotations on a specific axis
                {
                    regex:  _makeRegex('rotate(X|Y|Z)', 'val unit'),
                    extract: function(match, data) {
                        data[match[1].toLowerCase()] = _extractVal(2)(match);
                    },
                    multi: true
                }
            ],
            
            scale: [
                // standard 2d scaling (single parameter version)
                {
                    regex: _makeRegex('scale', 'val'),
                    x: _extractVal(1, false),
                    y: _extractVal(1, false)
                },
                
                // standard 2d scaling (two parameter version)
                {
                    regex: _makeRegex('scale', 'val , val'),
                    x: _extractVal(1, false),
                    y: _extractVal(2, false)
                },
                
                // 2d/3d translation on a specific axis
                {
                    regex: _makeRegex('scale(X|Y|Z)', 'val'),
                    extract: function(match, data) {
                        data[match[1].toLowerCase()] = _extractVal(2, false)(match);
                    },
                    multi: true
                }
            ]
        };

    
    function fromString(inputString) {
        var props = new RatchetTransform(), key, match, data, section, value, testString;
        
        // iterate through the parsers
        for (key in transformParsers) {
            transformParsers[key].forEach(function(rule) {
                // reset the test string to the input string
                testString = inputString;
                
                // get the initial match
                match = rule.regex.exec(testString);
                
                while (match) {
                    // ensure data has been initialized
                    data = data || {};
                    
                    if (typeof rule.extract == 'function') {
                        rule.extract(match, data);
                    }
                    else {
                        for (section in rule) {
                            if (section !== 'regex' && typeof rule[section] == 'function') {
                                data[section] = rule[section](match);
                            }
                        }
                    }
                    
                    // update the data units
                    data.units = unitTypes[key];
                    
                    // remove the match component from the input string
                    testString = testString.slice(0, match.index) + testString.slice(match.index + match[0].length);
                    
                    // if this is a multimatch rule, then run the regex again
                    if (rule.multi) {
                        match = rule.regex.exec(testString);
                    }
                    // otherwise, clear the match to break the loop
                    else {
                        match = null;
                    }
                }
                
                // initialise the properties (if we have data)
                if (data) {
                    props[key] = new XYZ(key, data);
                    
                    // reset the data
                    data = undefined;
                }
            });
        }
        
        return props;
    } // fromString
    
    function _ratchet(input) {
        if (typeof input == 'string' || (input instanceof String)) {
            return fromString(input);
        }
    }
    
    // bind the internal helpers so we can test 
    _ratchet.fromString = fromString;
    _ratchet.Transform = RatchetTransform;
    
    return _ratchet;
})();

var stylar = (function() {
    var prefixes = ['ms', 'o', 'Moz', 'webkit', ''],
        knownKeys = {},
        getComputed = null,
        reDash = /^(\w+)\-(\w)/,
        reVendorPrefixes = /^\-\w+\-/;
        
    if (document.defaultView && typeof document.defaultView.getComputedStyle == 'function') {
        getComputed = document.defaultView.getComputedStyle;
    }
        
    function sniffProperty(element, attribute) {
        var dashMatch, ii, prefix, prefixedAttr;
        
        // strip off css vendor prefixes
        attribute = attribute.replace(reVendorPrefixes, '');
        
        // convert delimiting dashes into camel case ids
        dashMatch = reDash.exec(attribute);
        while (dashMatch) {
            attribute = dashMatch[1] + dashMatch[2].toUpperCase() + attribute.slice(dashMatch[0].length);
            dashMatch = reDash.exec(attribute);
        }
        
        // search the known prefix
        for (ii = prefixes.length; ii--; ) {
            prefix = prefixes[ii];
            prefixedAttr = prefix ? (prefix + attribute[0].toUpperCase() + attribute.slice(1)) : attribute;
                
            if (typeof element.style[prefixedAttr] != 'undefined') {
                return knownKeys[attribute] = prefixedAttr;
            }
        }
        
        return attribute;
    }
    
    function _stylar(elements, attribute, value) {
        var helpers = { get: getter, set: setter };
        
        if (typeof elements == 'string' || elements instanceof String) {
            elements = document.querySelectorAll(elements);
        }
        // if we don't have a splice function, then we don't have an array
        // make it one
        else if (typeof elements.length == 'undefined') {
            elements = [elements];
        } // if..else
        
        function getter(attr, ignoreComputed) {
            var readKey, style;
            
            // get the read key
            readKey = knownKeys[attr] || sniffProperty(elements[0], attr);

            // if we have the get computed function defined, and the opts.ignoreComputed is not set
            // then get the computed style fot eh element
            if (getComputed && (! ignoreComputed)) {
                style = getComputed.call(document.defaultView, elements[0]);
            }
            // otherwise, just return the style element 
            else {
                style = elements[0].style;
            }
                
            return style ? style[readKey] : '';
        }
        
        function setter(attr, val) {
            if (typeof attr == 'object' && (! (attr instanceof String))) {
                // if we have been passed an object, then iterate through the keys and update
                // each of the found values
                for (var key in attr) {
                    setter(key, attr[key]);
                }
            }
            else {
                var styleKey = knownKeys[attr] || sniffProperty(elements[0], attr);

                for (var ii = elements.length; ii--; ) {
                    elements[ii].style[styleKey] = val;
                }
            }
            
            return helpers;
        }
        
        // iterate through the elements
        
        // if we are in set mode, then update the attribute with the value
        if (typeof attribute == 'undefined') {
            return helpers;
        }
        else if (typeof value != 'undefined') {
            return setter(attribute, value);
        }
        else {
            return getter(attribute);
        }
    }
    
    _stylar.sniffProperty = sniffProperty;
    
    return _stylar;
})();

// Aftershock function provides a cross-browser wrapper to transitionEnd events.
//
//      aftershock(elements, opts*, callback)
// 
// ### Parameters:
// 
// - elements - the elements (or single element) that we will bind the event listener to
// - opts - aftershock options, which can be omitted
// - callback - the handler to fire when a transitionEnd event is detected
// 
// ### Options
// 
// The following options are supported by aftershock:
// 
// - mindiff (default: 10ms) - The amount of time between events on elements to be considered
//     a discrete transitionEnd event for the group of elements being watched.  In my normal usage
//     I really only want to know when the group of elements transitioning have finished not each
//     discrete element
// 
// - perProperty (default: false) - Whether or not discrete events should be fired when different
//     properties have been transitioned.
// 
var aftershock = (function() {
    var transEndEventNames = {
            '-webkit-transition' : 'webkitTransitionEnd',
            '-moz-transition'    : 'transitionend',
            '-o-transition'      : 'oTransitionEnd',
            'transition'         : 'transitionEnd'
        },
        transEndEvent;
        
    /*
     * ## getBrowserProp(propName, testElement, customMappings)
     * 
     * This function is used to return the current vendor specific property for the requested
     * property. The property is determined by iterating through dom prefixes on the element
     * and looking for support of the property on the elements style attribute.  If the version
     * of the browser has support for the property in it's raw form then that will be returned
     * first (as it is tested first).
     */
    var getBrowserProp = (function() {
        var knownProps = {},
            prefixes = ['', '-webkit-', '-moz-', '-o-'],
            domPrefixes = ['', 'Webkit', 'Moz', 'O'],
            prefixCount = prefixes.length;
            
        
        return function(propName, testEl, mappings) {
            var ii, testProps = [], browserProp;
            
            // if we already know the property mapping, then return it
            if (knownProps[propName]) return knownProps[propName];
            
            // ensure the mappings are valid
            mappings = mappings || {};
            
            // initialise the browser property to the default property, run through the custom mappings
            browserProp = {
                css: mappings[propName] || propName,
                dom: mappings[propName] || propName
            };
            
            // create the test properties
            for (ii = 0; ii < prefixCount; ii++) {
                testProps.push({
                    css: prefixes[ii] + propName,
                    dom: ii === 0 ? propName : domPrefixes[ii] + propName.slice(0, 1).toUpperCase() + propName.slice(1)
                });
            } // for
            
            // check for the existence of the property on the element
            for (ii = 0; ii < testProps.length; ii++) {
                if (typeof testEl.style[testProps[ii].dom] != 'undefined') {
                    browserProp = testProps[ii];
                    break;
                }
            }
            
            // update the known props and return the property
            return knownProps[propName] = browserProp;
        };
    })();

    
    function _aftershock(elements, opts, callback) {
        
        var ii,
            firedTick = {},
            timeoutId;
        
        function delegator(evt) {
            var tick = new Date().getTime(),
                evtName = (opts.perProperty ? evt.propertyName : null) || 'transition',
                tickDiff = tick - (firedTick[evtName] || 0);
                
            // clear the timeout
            clearTimeout(timeoutId);
                
            // if the tick difference is great enough, then we have a discrete event, so fire.
            if (tickDiff >= opts.mindiff) {
                if (callback) {
                    callback.call(this, evt);
                }
                
                // update the fired tick
                firedTick[evtName] = tick;
            }
        } // delegator
        
        function stop() {
            for (ii = elements.length; ii--; ) {
                elements[ii].removeEventListener(transEndEvent, delegator);
            }
        }
        
        // if we don't have elements, return
        if (! elements) return null;
        
        // if the opts is a function, then it's probably the callback
        if (typeof opts == 'function' && arguments.length == 2) {
            callback = opts;
            opts = {};
        }
        
        // ensure we have options
        opts = opts || {};
        opts.mindiff = opts.mindiff || 10;

        // elements is not an array, then make it one
        if (elements && (typeof elements.length == 'undefined')) {
            elements = [elements];
        }

        // if we have at least one element and no transEndEvent name, find it
        if (elements.length > 0 && (! transEndEvent)) {
            transEndEvent = transEndEventNames[getBrowserProp('transition', elements[0]).css];
        }
        
        // add the listener to each of the elements
        for (ii = elements.length; ii--;  ) {
            elements[ii].addEventListener(transEndEvent, delegator);
        }
        
        // if a timeout was set, then run a function in the specified amount of time
        if (opts.timeout) {
            timeoutId = setTimeout(function() {
                // stop monitoring for events
                stop();
                
                // run the delegator
                delegator();
            }, opts.timeout);
        }
        
        return {
            stop: stop
        };
    };
    
    if (typeof jQuery != 'undefined') {
        jQuery.fn.aftershock = function(opts, callback) {
            return _aftershock.apply(this, [this].concat(Array.prototype.slice.apply(arguments)));
        };
    }

    // export the get browser prop utility function for other libraries to use
    _aftershock.getBrowserProp = getBrowserProp;
    
    return _aftershock;
})();

//+ ratchet
//+ stylar

var bedazzle = (function() {
    
    var parseProps = (function() {
        var rePropValue = /^([a-z]+|[a-z\-]+(?=\:))([\d\%\.\-\!]+|\:[\"\'].*?[\"\']|\:[^\s]+)(\s|\,|$)/i,
            reQuotes = /(^[\"\']|[\"\']$)/g,
            reLeadingColon = /^\:/,
            reTrailingPerc = /\%$/;
    
        return function(text) {
            // first tokenize
            var match, propValue, props;
    
            // check for a property value
            match = rePropValue.exec(text);
            while (match) {
                // extract the property value
                propValue = match[2].replace(reLeadingColon, '').replace(reQuotes, '');
    
                // initialise the properties
                props = props || {};
    
                // define the property
                props[match[1]] = reTrailingPerc.test(propValue) ? propValue : parseFloat(propValue) || propValue;
    
                // remove the match
                text = text.slice(match[0].length);
    
                // find the next match
                match = rePropValue.exec(text);
            }
    
            return props;
        };
    })();

    
    var transforms = typeof ratchet != 'undefined',
        transforms3d = typeof Modernizr != 'undefined' && Modernizr.csstransforms3d,
        reStripValue = /^\-?\d+/,
        
        // define the property map
        transformProps = transforms ? [
            'x',
            'y',
            'z',
            'rotate',
            'rx',
            'ry',
            'rz',
            'scale'
        ] : [],
        
        percentageProps = [
            'opacity'
        ],
        
        standardProps = [
            'height',
            'width'
        ].concat(transforms ? [] : ['x', 'y']);    

    function Bedazzler(elements) {
        this.elements = elements;
        this.rtid = 0;
        this.state = {};
        this.done = [];
        this.queued = [];
    
        // set some configurable options
        this._opts = {
            frameDelay: 1000 / 60,
            immediate: false
        };
    }
    
    Bedazzler.prototype = {
        _applyChanges: function() {
            var ii, element, key, styleKey,
                props = this.queued.shift(),
                bedazzler = this,
                transitionDuration, transitioners = [],
                timeout = 0;
                
            // if we don't have properties to apply, return
            if (! props) {
                return;
            }
            
            // if we have manual helpers, then run then now
            props.manualHelpers.forEach(function(helper) {
                helper.call(bedazzler, bedazzler.elements);
            });
            
            // iterate through the elements and update
            for (ii = this.elements.length; ii--; ) {
                // get a stylar reference for the target element
                element = stylar(this.elements[ii]);
                
                // determine whether the current element has a transition on it
                transitionDuration = parseFloat(element.get('transition-duration'));
                
                // determine whether we have a transition on the element or not
                if (transitionDuration) {
                    timeout = Math.max(timeout, transitionDuration * 1000);
                    transitioners.push(this.elements[ii]);
                }
                
                // if we have a general transform apply that
                if (props.transform) {
                    // read the transform
                    var currentTransform = element.get('transform', true),
                        newTransform = currentTransform ? ratchet(currentTransform).add(props.transform) : props.transform;
                    
                    // update the transform taking into account the current transform
                    element.set('transform', newTransform.toString({ all: true }));
                }
                
                // iterate through the values and apply then to the element
                element.set(props.elements[ii]);
            }
            
            this.rtid = 0;
            this.done.push(props);
            this._next(transitioners, timeout, props.callbacks || []);
        },
        
        _changed: function() {
            var bedazzler = this;
            
            if (this._opts.immediate) {
                this._applyChanges();
            }
            else {
                if (! this.rtid) {
                    this.rtid = setTimeout(function() {
                        bedazzler._applyChanges();
                    }, this._opts.frameDelay || 0);
                }
            }
            
            return this;
        },
        
        _next: function(transitioners, timeout, callbacks) {
            var transitionsRemaining = transitioners.length,
                bedazzler = this,
                listener;
                
            function runNext() {
                if (listener) {
                    listener.stop();
                }
                
                // trigger the callbacks
                _.each(callbacks, function(callback) {
                    if (typeof callback == 'function') {
                        callback.call(bedazzler, bedazzler.elements);
                    }
                });
                
                // trigger the next update cycle
                bedazzler._applyChanges();
            }
            
            /*
            // if we have a transition, then on transition end, apply the changes
            if (transitionsRemaining > 0 && typeof aftershock == 'function') {
                listener = aftershock(transitioners, { timeout: timeout + 20 }, function() {
                    runNext();
                });
            }
            else */
            if (transitionsRemaining > 0) {
                setTimeout(runNext, timeout || 0);
            }
            else if (this.queued.length > 0) {
                runNext();
            }
                
        },
        
        end: function(callback) {
            this.props.callbacks.push(callback);
            
            return this;
        },
        
        loop: function() {
            var bedazzler = this;
            
            this.end(function() {
                bedazzler.queued = bedazzler.done;
                bedazzler.done = [];
            });
        },
        
        manual: function(helper) {
            this.props.manualHelpers.push(helper);
            
            return this._changed();
        },
        
        opts: function(opts) {
            _.extend(this._opts, opts);
            
            return this;
        },
        
        set: function(name, value) {
            var props = this.props;
            
            if (arguments.length === 1) {
                this.update(name, true);
            }
            else if (_.include(transformProps, name)) {
                this[name].call(this, value, true);
            }
            else if (name == 'transform') {
                props.transform = ratchet(value);
            }
            else {
                // iterate through the elements and set the values for the named property
                for (var ii = this.elements.length; ii--; ) {
                    props.elements[ii][name] = value;
                }
            }
            
            return this._changed();
        },
        
        update: function(props, absolute) {
            if (typeof props == 'string' || props instanceof String) {
                props = parseProps(props);
            }
    
            // update the state of each of the properties
            if (props) {
                for (var key in props) {
                    if (this[key]) {
                        this[key](parseInt(props[key], 10) || props[key], absolute);
                    }
                }
            }
            
            return this;
        }
    };
    
    Object.defineProperty(Bedazzler.prototype, 'frame', { 
        get: function () {
            var props = {
                elements: [],
                manualHelpers: [],
                callbacks: []
            }, key, ii, currentTransform;
            
            if (transforms) {
                // currentTransform = stylar(this.elements[0]).get('transform', true);
                props.transform = new ratchet.Transform(); // ratchet(currentTransform);
            }
            
            // if we have current properties, then clone the values
            if (this._props) {
                // copy each of the elements
                for (ii = this.elements.length; ii--; ) {
                    props.elements[ii] = _.clone(this._props.elements[ii]) || {};
                }
            }
            // otherwise create the new properties
            else {
                for (ii = this.elements.length; ii--; ) {
                    props.elements[ii] = {};
                }
            }
            
            // initialise the current properties that we are modifying
            this.queued.push(this._props = props);
    
            return this;
        },
        
        set: function(value) {
            console.log(value);
            
            return this;
        },
        
        configurable: true
    });
    
    Object.defineProperty(Bedazzler.prototype, 'props', {
        get: function() {
            if (this.queued.length === 0) {
                this.frame;
            }
            
            return this._props;
        }
    });
    
    // create the prototype methods for each of the identified
    // transform functions
    _.each(transformProps, function(key) {
        var targetKeys = [key],
            targetSection = 'translate',
            reRotate = /^r(\w)?(?:otate)?$/,
            reScale = /^scale(X|Y|Z)?$/;
        
        if (reRotate.test(key)) {
            targetKeys = [RegExp.$1 || 'z'];
            targetSection = 'rotate';
        }
        
        if (reScale.test(key)) {
            if (RegExp.$1) {
                targetKeys = RegExp.$1.toLowerCase();
            }
            else {
                targetKeys = ['x', 'y'];
            }
            
            targetSection = 'scale';
        }
        
        Bedazzler.prototype[key] = function(value, absolute) {
            var xyz = this.props.transform[targetSection], currentVal;
            
            targetKeys.forEach(function(targetKey) {
                currentVal = xyz[targetKey].value || 0;
    
                // if we are applying an absolute value, then 
                if (absolute) {
                    xyz[targetKey].value = value - currentVal;
                }
                else {
                    xyz[targetKey].value = currentVal + value;
                }
            });
    
            return this._changed();
        };
    });
    
    // implement the non-transform percentage (opacity, etc) properties
    _.each(percentageProps, function(key) {
        Bedazzler.prototype[key] = function(value) {
            for (var ii = this.elements.length; ii--; ) {
                var targetProp = this.props.elements[ii],
                    // get the current value, if not defined default to 1 / 100%
                    currentVal = targetProp[key] || stylar(this.elements[ii], key) || 1;
    
                // multiply the current value by the new value
                targetProp[key] = currentVal * value;
            }
            
            return this._changed();
        };
    });
    
    // implement prototype method for the standard properties
    _.each(standardProps, function(key) {
        Bedazzler.prototype[key] = function(value) {
            for (var ii = this.elements.length; ii--; ) {
                var targetProp = this.props.elements[ii],
                    currentVal = targetProp[key] || 
                        stylar(this.elements[ii], key) || 
                        '0px',
    
                    actualValue = parseFloat(currentVal) || 0,
    
                    units = value.toString().replace(reStripValue, '') || 
                        currentVal.toString().replace(reStripValue, '') || 
                        'px';
    
                targetProp[key] = (actualValue + parseFloat(value)) + units;
            }
            
            return this._changed();
        };
    });
    

    
    var _bedazzle = function(elements, scope) {

        // check the elements
        if (typeof elements == 'string' || elements instanceof String) {
            elements = (scope || document).querySelectorAll(elements);
        }
        // if we don't have a splice function, then we don't have an array
        // make it one
        else if (! elements.splice) {
            elements = [elements];
        } // if..else

        return new Bedazzler(elements);
    };
    
    if (typeof jQuery != 'undefined') {
        $.fn.bedazzle = function() {
            return _bedazzle(this);
        };
    }
    
    return _bedazzle;
})();
