var transform = ratchet(
    'translate(50, 10) scale(0.5)'
);

stylar(
    '.box',               
    'transform', 
    transform.toString()
);

$('.current textarea').html(transform.toString());