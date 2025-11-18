// Test pour voir quels items ont encore "dice"
const items = game.items.filter(i => i.type === 'feat');
const itemsWithDice = items.filter(i => {
  const s = i.system;
  return s.meleeRange === 'dice' || s.shortRange === 'dice' || s.mediumRange === 'dice' || s.longRange === 'dice';
});
console.log('Items avec "dice":', itemsWithDice.length);
itemsWithDice.forEach(item => {
  console.log(`- ${item.name}:`, {
    melee: item.system.meleeRange,
    short: item.system.shortRange, 
    medium: item.system.mediumRange,
    long: item.system.longRange
  });
});
