var transform = new ratchet.Transform({
    translate: { x: 50 },
    rotate: { z: 360 }
});

stylar(
    '.box',              // selector
    'transform',         // property
    transform.toString() // value
);

$('.current textarea').html(transform.toString());