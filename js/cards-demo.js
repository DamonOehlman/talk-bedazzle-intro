var deck = new Deck({ shuffle: true }),
    html = '';

$('#deck').html(_.reduce(deck.cards, function(memo, card) {
    return memo + card.html();
}, ''));

$('#deck .card').click(function() {
    var cardWidth = parseInt(stylar(this).get('width'), 10);
    
    $('#deck').append(this);

    bedazzle(this)
        .frame.ry(180).x(cardWidth).z(100)
        .frame.ry(90).x(cardWidth)
        .frame.ry(90).x(cardWidth).z(-100);
});