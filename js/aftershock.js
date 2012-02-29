var box = $('.box')[0],
    boxStyle = stylar(box);

aftershock(box, function(evt) {
    // get the transform value (non-computed)
    var transformText = boxStyle.get('transform', true),
        transform = ratchet(transformText);

    // toggle between 100 and 0 for the transform x
    transform.translate.x.value = 
        transform.translate.x ^ 100;
    
    // update the box transform
    boxStyle.set(
        'transform', 
        transform.toString({ all: true })
    );
});

boxStyle.set('transform', 'translateX(100px)');