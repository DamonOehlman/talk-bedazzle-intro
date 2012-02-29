bedazzle('.box')
    .frame.x(200).y(200).rotate(-45)
    .frame.x(-200).opacity(0.2)
    .frame.x(200).y(50).rotate(315)
    .end(function(elements) {
        stylar(elements)
            .set('transform', '')
            .set('opacity', 1);
    });