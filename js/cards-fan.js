var deck = new Deck({ shuffle: true }),
    html = '',
    index = deck.cards.length;

$('#deck').html(_.reduce(deck.cards, function(memo, card) {
    return memo + card.html();
}, ''));

stylar('#deck', 'transform', 'translateY(180px)');
stylar('.card')
    .set('transition', 'all linear 0.05s');

function deal() {
    if (index <= 0) {
        return;
    }
    
    var xOffset = (deck.cards.length - index) * 9;
    
    bedazzle('.card:nth-child(' + index + ')')
        .frame
            .set('z-index', 100 - index)
            .y(-180).rotate(360)
            .x(xOffset)
            .end(deal);
        
    // decrement the index
    index--;
}

deal();