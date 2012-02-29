//= console!src/libs/underscore.min.js
//= console!src/libs/backbone.min.js
//= console!src/libs/backbone-localStorage.min.js

//= console!src/libs/jquery.min.js

//= console!src/sandbox-console.js

jQuery(document).ready(function($) {
    var specialCommands,
        reCommand = /^\:(\w+)\s?(.*)$/;
    
    // Create the sandbox:
    window.sandbox = new Sandbox.View({
        el : $('#sandbox'),
        model : new Sandbox.Model()
    });
    
    // save a reference to the special commands
    specialCommands = window.sandbox.specialCommands;

    // override the special commands implementation
    window.sandbox.specialCommands = function(command) {
        if (command.indexOf(':demo') >= 0) {
            return this.model.addHistory({
                command : command,
                result : demo.load( command.slice(6) )
            });
        }
        else {
            var match = reCommand.exec(command), handler;
            
            if (match) {
                handler = demo[match[1]];
                if (handler) {
                    handler.apply(demo, match[2].split(/\s/));
                    window.sandbox.setValue('');
                    return true;
                }
            }
        }

        return specialCommands.call(window.sandbox, command);
    };
});