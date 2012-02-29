var deck = new Deck({ shuffle: true }),
    html = '';

$('#deck').html(_.reduce(deck.cards, function(memo, card) {
    return memo + card.html();
}, ''));

$('#deck .card').click(function() {
    $('#deck').append(this);

    bedazzle(this)
        .frame.ry(180).x(125).z(100)
        .frame.ry(90).x(125)
        .frame.ry(90).x(125).z(-100);
});