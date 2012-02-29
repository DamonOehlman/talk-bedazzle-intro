function TransformDemo(container, opts) {
    opts = opts || {};
    
    this.container = container;
    this.bedazzle = null;
    this.commands = opts.commands || [];
    this.history = [];
    this.commandIndex = -1;
    this._back = false;
    
    this.editor = CodeMirror.fromTextArea($('#code textarea')[0], { 
        mode: 'javascript',
        theme: 'monokai'
    });
}

TransformDemo.prototype = {
    _flip: function(targetDoc, opts, callback) {
        var $items = $('#items'),
            $current = $('.current', $items);
        
        if (typeof opts == 'function') {
            callback = opts;
            opts = {};
        }
        
        // initialise opts
        opts = opts || {};

        if ($current[0]) {
            $current.bedazzle().ry(this._back ? 360 : -180).end(function() {
                $current.remove();
            });
        }
        
        $.ajax({
            url: targetDoc,
            dataType: 'html', 
            success: function(data) {
                var items = 
                
                // add a new div to the items
                $items.append('<section>' + data + '</section>');
                
                $('section:last', $items)
                    .addClass(opts.className)
                    .bedazzle().ry(demo._back ? 360 : 0).end(function(elements) {
                        $(elements).addClass('current');
                        
                        setTimeout(function() {
                            $('#items').focus();
                        }, 50);
                    
                        if (callback) {
                            callback();
                        }
                    });
            }
        });
    },
    
    addBox: function(count) {
        var html = '';
        
        for (var ii = 0; ii < (count || 1); ii++) {
            html += '<div class="box"></div>';
        }
        
        $(this.container).append(html);
        this.bedazzle = bedazzle('.box');
    },
    
    load: function(requestedDemo) {
        this._flip('snippets/' + requestedDemo + '.html', function() {
            $.ajax({
                url: 'js/' + requestedDemo + '.js',
                dataType: 'text',
                success: function(data) {
                    var codeBlock = $('#code');

                    $('h2', codeBlock).html(requestedDemo);
                    demo.editor.setValue(data);
                }
            });
        });
    },
    
    back: function() {
        var command;
        
        if (this.commandIndex > 0) {
            this.commandIndex -= 1;
            
            command = this.commands[this.commandIndex];

            this._back = true;
            if (! sandbox.specialCommands(command)) {
                sandbox.model.evaluate(command);
            }
        }
    },
    
    next: function() {
        var command;
        
        if (this.commandIndex < this.commands.length) {
            this.commandIndex += 1;

            command = this.commands[this.commandIndex];

            this._back = false;
            if (! sandbox.specialCommands(command)) {
                sandbox.model.evaluate(command);
            }
        }
    },
    
    run: function() {
        eval(demo.editor.getValue());
    },
    
    slide: function(name) {
        demo.editor.setValue('');
        $('#code h2').html('');
        this._flip('slides/' + name + '.html', { className: 'slide' });
    },
    
    transform: function(text) {
        stylar(this.elements).set('transform', text);
    }
};

jQuery(document).ready(function($) {
    demo.next();
    
    $(sandbox.textarea).keydown(function(evt) {
        if ($(sandbox.textarea).val() === '') {
            switch (evt.which) {
                case 39: {
                    demo.next();
                    break;
                }
                
                case 37:  {
                    demo.back();
                    break;
                }
                
                case 13: {
                    demo.run();
                    break;
                }
            }
        }
    });
    
    $('nav a').click(function() {
        var action = this.href.replace(/^.*\#(.*)$/, '$1'),
            handler = demo[action];
            
        if (handler) {
            handler.call(demo);
        }
    });
});


key('right,left,enter', function(evt, handler) {
    if ($(sandbox.textarea).val() === '') {
        switch (handler.shortcut) {
            case 'right': {
                demo.next();
                break;
            }
            
            case 'left': {
                demo.back();
                break;
            }
            
            case 'enter': {
                demo.run();
                break;
            }
        }
    }
});

var demo = new TransformDemo(document.getElementById('items'), {
    commands: [
        ':slide title',
        ':slide why',
        ':slide technique',
        ':slide libraries',
        ':slide bedazzle-intro',
        ':slide bedazzle-family',
        ':demo stylar',
        ':demo ratchet',
        ':demo ratchet-parsing',
        ':demo aftershock',
        ':demo simple',
        ':demo simple-update',
        ':demo events',
        ':demo parallel',
        ':demo cards-demo',
        ':demo cards-fan',
        ':slide thanks'
    ]
});

