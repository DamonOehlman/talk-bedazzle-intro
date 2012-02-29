var interleave = require('interleave');

task('deps', function() {
    interleave(['src/js/deps', 'src/css/deps'], {
        path: 'lib',
        aliases: {
            console: 'github://josscrowcroft/javascript-sandbox-console/'
        }
    });
});

task('default', function() {
    interleave('src/js', {
        path: 'js'
    });
    
    interleave('src/css', {
        path: 'css', 
        stylus: {
            plugins: {
                nib: require('nib')
            },

            urlEmbed: true
        }
    });
});