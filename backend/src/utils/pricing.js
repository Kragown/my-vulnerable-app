const { TICKET_PRICES } = require('../db/seed');

function getTicketPrice(ticketType) {
  return TICKET_PRICES[ticketType] ?? TICKET_PRICES.adulte;
}

module.exports = { getTicketPrice, TICKET_PRICES };
