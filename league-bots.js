/* Prepline league bots: fill the monthly league up to `fillTo` rows while there are few real players.
   Every bot is shown with a "bot" tag. They switch off by themselves once `offWhenPlayers` real players
   are in the season.

   To rename the bots: change the names in the list below, save, and push. Order does not matter;
   each name gets its own level, which stays the same all month. */
window.PREPLINE_BOTS = {
  fillTo: 10,             // the league shows at least this many rows
  offWhenPlayers: 30,     // no bots once this many real players are in the season
  names: [
    'Aruzhan', 'Dias', 'Madina', 'Nursultan', 'Aigerim',
    'Temirlan', 'Dana', 'Alikhan', 'Kamila', 'Yerlan'
  ]
};

/* builds the bot rows for a season: start, end = Date; elapsed share of the month sets their points */
window.preplineBotRows = function (realCount, start, end, prev) {
  var B = window.PREPLINE_BOTS;
  var n = realCount >= B.offWhenPlayers ? 0 : Math.max(0, Math.min(B.names.length, B.fillTo - realCount));
  if (!n) return [];
  var share = prev ? 1 : Math.max(0.04, Math.min(1, (Date.now() - start) / (end - start)));
  function rnd(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }  // stable per bot and month
  var month = start.getUTCFullYear() * 12 + start.getUTCMonth();
  return B.names.slice(0, n).map(function (name, i) {
    var r1 = rnd(month * 31 + i + 1), r2 = rnd(month * 17 + i + 7);
    var full = Math.round(35 + r1 * 185);              // points by the end of the month: 35–220
    var points = Math.max(1, Math.round(full * share * (0.85 + 0.3 * r2)));
    var accuracy = Math.round(68 + r2 * 26);           // 68–94%
    var games = Math.max(1, Math.round(points / (16 + r1 * 10)));
    var tier = points >= 150 ? (accuracy >= 88 ? '210+ Club' : 'Gold') : points >= 50 ? 'Silver' : 'Bronze';
    return { name: name, points: points, accuracy: accuracy, games: games, duel_wins: Math.round(games * r2 * 0.4),
             tier: tier, me: false, bot: true };
  });
};
